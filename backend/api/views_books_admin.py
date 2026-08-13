"""Staff endpoints for managing the books & proceedings catalogue.

Everything here is admin/editor only. The public read endpoints live in
views_books.py; this module is the write side — creating and editing titles,
chapters, series and the proceedings download assets, plus turning an accepted
proposal into a catalogue title.
"""

import os
import re
import uuid

from django.conf import settings
from django.db.models import Count, Q
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import permissions, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Book,
    BookChapter,
    BookContributor,
    BookProposal,
    BookSeries,
    DownloadAsset,
)
from .serializers import (
    AdminBookChapterSerializer,
    AdminBookSerializer,
    AdminBookSeriesSerializer,
    AdminDownloadAssetSerializer,
)
from .views_admin import check_admin_or_editor_role

ALLOWED_DOWNLOAD_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".odt", ".rtf", ".zip", ".tex", ".xlsx", ".xls", ".csv",
}
ALLOWED_COVER_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB — LaTeX bundles get large


def _forbidden():
    return Response(
        {"detail": "Admin or editor access required"},
        status=status.HTTP_403_FORBIDDEN,
    )


def _save_upload(file, subdir, allowed_extensions, field_name="file"):
    """Write an uploaded file under MEDIA_ROOT/<subdir>/ and return its path.

    Raises ValueError with a message safe to show the user.
    """
    ext = os.path.splitext(file.name)[1].lower()
    if ext not in allowed_extensions:
        raise ValueError(
            f"Invalid file type '{ext}'. Allowed: {', '.join(sorted(allowed_extensions))}"
        )
    if file.size > MAX_UPLOAD_BYTES:
        raise ValueError("File is larger than 25 MB.")

    upload_dir = os.path.join(settings.MEDIA_ROOT, subdir)
    os.makedirs(upload_dir, exist_ok=True)

    # Keep a readable stem so editors can recognise files on disk
    stem = slugify(os.path.splitext(file.name)[0])[:40] or field_name
    filename = f"{stem}_{uuid.uuid4().hex[:8]}{ext}"
    with open(os.path.join(upload_dir, filename), "wb+") as dest:
        for chunk in file.chunks():
            dest.write(chunk)

    return f"{subdir}/{filename}", ext.lstrip(".").upper(), file.size


def unique_slug(title, exclude_id=None):
    """Slug from a title, suffixed until unique."""
    base = slugify(title)[:200] or "untitled"
    candidate = base
    index = 2
    while True:
        qs = Book.objects.filter(slug=candidate)
        if exclude_id:
            qs = qs.exclude(id=exclude_id)
        if not qs.exists():
            return candidate
        candidate = f"{base}-{index}"
        index += 1


# ---------------------------------------------------------------------------
# Series
# ---------------------------------------------------------------------------


class AdminBookSeriesListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not check_admin_or_editor_role(request.user):
            return _forbidden()
        series = (
            BookSeries.objects.annotate(annotated_count=Count("books"))
            .order_by("abbreviation")
        )
        return Response(
            AdminBookSeriesSerializer(series, many=True, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        if not check_admin_or_editor_role(request.user):
            return _forbidden()
        serializer = AdminBookSeriesSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminBookSeriesDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, series_id):
        if not check_admin_or_editor_role(request.user):
            return _forbidden()
        try:
            series = BookSeries.objects.get(id=series_id)
        except BookSeries.DoesNotExist:
            return Response({"detail": "Series not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = AdminBookSeriesSerializer(series, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, series_id):
        if not check_admin_or_editor_role(request.user):
            return _forbidden()
        try:
            series = BookSeries.objects.get(id=series_id)
        except BookSeries.DoesNotExist:
            return Response({"detail": "Series not found."}, status=status.HTTP_404_NOT_FOUND)

        # Titles reference the series; deleting would orphan them silently.
        in_use = series.books.count()
        if in_use:
            return Response(
                {
                    "detail": (
                        f"{in_use} title(s) still belong to this series. "
                        "Reassign them first, or deactivate the series instead."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        series.delete()
        return Response({"detail": "Series deleted."}, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Books
# ---------------------------------------------------------------------------


class AdminBookListView(APIView):
    """GET  /api/v1/admin/books/  — every title, including unpublished.
    POST /api/v1/admin/books/  — create a title.
    """

    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        if not check_admin_or_editor_role(request.user):
            return _forbidden()

        queryset = (
            Book.objects.select_related("series", "managing_editor")
            .prefetch_related("contributors", "chapters")
            .all()
        )

        production = request.query_params.get("production_status")
        if production and production != "all":
            queryset = queryset.filter(production_status=production)

        kind = request.query_params.get("kind")
        if kind and kind != "all":
            queryset = queryset.filter(kind=kind)

        visibility = request.query_params.get("visibility")
        if visibility == "published":
            queryset = queryset.filter(is_published=True)
        elif visibility == "hidden":
            queryset = queryset.filter(is_published=False)

        search = request.query_params.get("q")
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(isbn__icontains=search)
                | Q(conference_name__icontains=search)
            )

        counts = {
            "total": Book.objects.count(),
            "published": Book.objects.filter(is_published=True).count(),
            "in_production": Book.objects.exclude(production_status="published").count(),
        }

        try:
            skip = max(int(request.query_params.get("skip", 0)), 0)
        except (TypeError, ValueError):
            skip = 0
        try:
            limit = min(max(int(request.query_params.get("limit", 50)), 1), 200)
        except (TypeError, ValueError):
            limit = 50

        data = AdminBookSerializer(
            queryset[skip:skip + limit], many=True, context={"request": request}
        ).data
        return Response({"books": data, "counts": counts}, status=status.HTTP_200_OK)

    def post(self, request):
        if not check_admin_or_editor_role(request.user):
            return _forbidden()

        payload = request.data.copy()
        if not payload.get("slug") and payload.get("title"):
            payload["slug"] = unique_slug(payload["title"])

        serializer = AdminBookSerializer(data=payload)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        cover = request.FILES.get("cover_image")
        if cover:
            try:
                path, _fmt, _size = _save_upload(cover, "books/covers", ALLOWED_COVER_EXTENSIONS)
            except ValueError as exc:
                return Response({"cover_image": [str(exc)]}, status=status.HTTP_400_BAD_REQUEST)
            book = serializer.save(cover_image=path)
        else:
            book = serializer.save()

        return Response(
            AdminBookSerializer(book, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class AdminBookDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _get(self, book_id):
        try:
            return Book.objects.select_related("series", "managing_editor").prefetch_related(
                "contributors", "chapters"
            ).get(id=book_id)
        except Book.DoesNotExist:
            return None

    def get(self, request, book_id):
        if not check_admin_or_editor_role(request.user):
            return _forbidden()
        book = self._get(book_id)
        if not book:
            return Response({"detail": "Book not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(
            AdminBookSerializer(book, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    def patch(self, request, book_id):
        if not check_admin_or_editor_role(request.user):
            return _forbidden()
        book = self._get(book_id)
        if not book:
            return Response({"detail": "Book not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = AdminBookSerializer(
            book, data=request.data, partial=True, context={"request": request}
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        cover = request.FILES.get("cover_image")
        if cover:
            try:
                path, _fmt, _size = _save_upload(cover, "books/covers", ALLOWED_COVER_EXTENSIONS)
            except ValueError as exc:
                return Response({"cover_image": [str(exc)]}, status=status.HTTP_400_BAD_REQUEST)
            book = serializer.save(cover_image=path)
        else:
            book = serializer.save()

        # Publishing a title implies production is finished.
        if book.is_published and book.production_status != "published":
            book.production_status = "published"
            book.save(update_fields=["production_status"])

        return Response(
            AdminBookSerializer(book, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    def delete(self, request, book_id):
        if not check_admin_or_editor_role(request.user):
            return _forbidden()
        book = self._get(book_id)
        if not book:
            return Response({"detail": "Book not found."}, status=status.HTTP_404_NOT_FOUND)

        if book.is_published:
            return Response(
                {"detail": "Unpublish this title before deleting it."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Clear the proposal's forward link so it can be converted again.
        BookProposal.objects.filter(converted_book=book).update(converted_book=None)
        book.delete()
        return Response({"detail": "Title deleted."}, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Contributors & chapters
# ---------------------------------------------------------------------------


class AdminBookContributorsView(APIView):
    """PUT /api/v1/admin/books/<id>/contributors — replace the whole list.

    Contributors are an ordered list, so replacing wholesale is simpler and less
    error-prone than per-row edits.
    """

    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, book_id):
        if not check_admin_or_editor_role(request.user):
            return _forbidden()
        try:
            book = Book.objects.get(id=book_id)
        except Book.DoesNotExist:
            return Response({"detail": "Book not found."}, status=status.HTTP_404_NOT_FOUND)

        rows = request.data.get("contributors")
        if not isinstance(rows, list):
            return Response(
                {"contributors": ["Send a list of contributors."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cleaned = []
        for index, row in enumerate(rows):
            name = (row.get("name") or "").strip()
            if not name:
                continue
            role = row.get("role") or BookContributor.ROLE_AUTHOR
            if role not in dict(BookContributor.ROLE_CHOICES):
                role = BookContributor.ROLE_AUTHOR
            cleaned.append(
                BookContributor(
                    book=book,
                    name=name,
                    affiliation=(row.get("affiliation") or "").strip() or None,
                    role=role,
                    order=index,
                )
            )

        book.contributors.all().delete()
        BookContributor.objects.bulk_create(cleaned)
        return Response(
            AdminBookSerializer(book, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


class AdminBookChapterListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, book_id):
        if not check_admin_or_editor_role(request.user):
            return _forbidden()
        try:
            book = Book.objects.get(id=book_id)
        except Book.DoesNotExist:
            return Response({"detail": "Book not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = AdminBookChapterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        next_order = book.chapters.count()
        chapter = serializer.save(book=book, order=request.data.get("order", next_order))
        return Response(
            AdminBookChapterSerializer(chapter).data, status=status.HTTP_201_CREATED
        )


class AdminBookChapterDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _get(self, book_id, chapter_id):
        try:
            return BookChapter.objects.get(id=chapter_id, book_id=book_id)
        except BookChapter.DoesNotExist:
            return None

    def patch(self, request, book_id, chapter_id):
        if not check_admin_or_editor_role(request.user):
            return _forbidden()
        chapter = self._get(book_id, chapter_id)
        if not chapter:
            return Response({"detail": "Chapter not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = AdminBookChapterSerializer(chapter, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, book_id, chapter_id):
        if not check_admin_or_editor_role(request.user):
            return _forbidden()
        chapter = self._get(book_id, chapter_id)
        if not chapter:
            return Response({"detail": "Chapter not found."}, status=status.HTTP_404_NOT_FOUND)
        chapter.delete()
        return Response({"detail": "Chapter deleted."}, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Proceedings download assets
# ---------------------------------------------------------------------------


class AdminDownloadListView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        if not check_admin_or_editor_role(request.user):
            return _forbidden()
        assets = DownloadAsset.objects.all()
        return Response(
            AdminDownloadAssetSerializer(assets, many=True, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        if not check_admin_or_editor_role(request.user):
            return _forbidden()

        uploaded = request.FILES.get("file")
        if not uploaded:
            return Response(
                {"file": ["Choose a file to upload."]}, status=status.HTTP_400_BAD_REQUEST
            )

        serializer = AdminDownloadAssetSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            path, fmt, size = _save_upload(uploaded, "proceedings", ALLOWED_DOWNLOAD_EXTENSIONS)
        except ValueError as exc:
            return Response({"file": [str(exc)]}, status=status.HTTP_400_BAD_REQUEST)

        asset = serializer.save(
            file=path, file_format=fmt, size_bytes=size,
            revised_on=timezone.now().date(),
        )
        return Response(
            AdminDownloadAssetSerializer(asset, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class AdminDownloadDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _get(self, asset_id):
        try:
            return DownloadAsset.objects.get(id=asset_id)
        except DownloadAsset.DoesNotExist:
            return None

    def patch(self, request, asset_id):
        if not check_admin_or_editor_role(request.user):
            return _forbidden()
        asset = self._get(asset_id)
        if not asset:
            return Response({"detail": "Download not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = AdminDownloadAssetSerializer(
            asset, data=request.data, partial=True, context={"request": request}
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        uploaded = request.FILES.get("file")
        if uploaded:
            try:
                path, fmt, size = _save_upload(uploaded, "proceedings", ALLOWED_DOWNLOAD_EXTENSIONS)
            except ValueError as exc:
                return Response({"file": [str(exc)]}, status=status.HTTP_400_BAD_REQUEST)
            # Replacing the file is a new revision, so stamp the date.
            asset = serializer.save(
                file=path, file_format=fmt, size_bytes=size,
                revised_on=timezone.now().date(),
            )
        else:
            asset = serializer.save()

        return Response(
            AdminDownloadAssetSerializer(asset, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    def delete(self, request, asset_id):
        if not check_admin_or_editor_role(request.user):
            return _forbidden()
        asset = self._get(asset_id)
        if not asset:
            return Response({"detail": "Download not found."}, status=status.HTTP_404_NOT_FOUND)
        asset.delete()
        return Response({"detail": "Download deleted."}, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Accepted proposal → catalogue title
# ---------------------------------------------------------------------------


class AdminProposalConvertView(APIView):
    """POST /api/v1/admin/proposals/book/<id>/convert

    Turns an accepted book proposal into a draft catalogue title. This is the
    step that connects the proposal queue to the catalogue — without it an
    accepted proposal is a dead end.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, proposal_id):
        if not check_admin_or_editor_role(request.user):
            return _forbidden()

        try:
            proposal = BookProposal.objects.select_related("series", "submitted_by").get(
                id=proposal_id
            )
        except BookProposal.DoesNotExist:
            return Response({"detail": "Proposal not found."}, status=status.HTTP_404_NOT_FOUND)

        if proposal.status != "accepted":
            return Response(
                {"detail": "Accept the proposal before turning it into a title."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if proposal.converted_book_id:
            return Response(
                {
                    "detail": "This proposal has already been converted.",
                    "book_id": proposal.converted_book_id,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        book = Book.objects.create(
            title=proposal.title,
            slug=unique_slug(proposal.title),
            series=proposal.series,
            kind=proposal.kind,
            abstract=proposal.synopsis,
            pages=proposal.estimated_pages,
            managing_editor=request.user,
            source_proposal_id=proposal.id,
            production_status="commissioned",
            is_published=False,   # a commissioned title is not public yet
        )

        if proposal.contact_name:
            BookContributor.objects.create(
                book=book,
                user=proposal.submitted_by,
                name=proposal.contact_name,
                affiliation=proposal.affiliation,
                role=(
                    BookContributor.ROLE_EDITOR
                    if proposal.kind in (Book.KIND_EDITED, Book.KIND_PROCEEDINGS)
                    else BookContributor.ROLE_AUTHOR
                ),
                order=0,
            )

        proposal.converted_book = book
        proposal.save(update_fields=["converted_book"])

        return Response(
            AdminBookSerializer(book, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )
