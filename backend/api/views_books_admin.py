"""Staff endpoints for managing the books & proceedings catalogue.

Everything here is admin/editor only. The public read endpoints live in
views_books.py; this module is the write side — creating and editing titles,
chapters, series and the proceedings download assets, plus turning an accepted
proposal into a catalogue title.
"""

import os
import re
import uuid
from datetime import timedelta

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
    BookGuestEditor,
    BookProposal,
    BookSeries,
    DownloadAsset,
    ProceedingsProposal,
    User,
)
from .serializers import (
    AdminBookChapterSerializer,
    BookGuestEditorSerializer,
    AdminBookSerializer,
    AdminBookSeriesSerializer,
    AdminDownloadAssetSerializer,
)
from .views_admin import check_admin_or_editor_role
from .services.email_service import (
    notify_guest_editor_response,
    queue_email_task,
    send_guest_editor_invitation,
)

ALLOWED_DOWNLOAD_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".odt", ".rtf", ".zip", ".tex", ".xlsx", ".xls", ".csv",
}
ALLOWED_COVER_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB — LaTeX bundles get large


def _forbidden(message="Admin or editor access required"):
    return Response({"detail": message}, status=status.HTTP_403_FORBIDDEN)


def is_guest_editor_of(user, book_id):
    """True when this user is an accepted guest editor of that specific volume."""
    if not user or not getattr(user, "is_authenticated", False):
        return False
    return BookGuestEditor.objects.filter(
        book_id=book_id, user=user, status=BookGuestEditor.STATUS_ACTIVE
    ).exists()


def can_manage_book(user, book_id):
    """Staff can manage any title; a guest editor only their own volume."""
    return check_admin_or_editor_role(user) or is_guest_editor_of(user, book_id)


# Publishing, deleting and reassigning a title are the publisher's calls, not
# the guest editor's. Guest editors compile content; staff decide what ships.
STAFF_ONLY_BOOK_FIELDS = {
    "is_published",
    "production_status",
    "managing_editor",
    "series",
    "slug",
}


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
        is_staff = check_admin_or_editor_role(request.user)
        queryset = (
            Book.objects.select_related("series", "managing_editor")
            .prefetch_related("contributors", "chapters")
            .all()
        )

        if not is_staff:
            # A guest editor sees only the volumes they were invited to.
            guest_ids = BookGuestEditor.objects.filter(
                user=request.user, status=BookGuestEditor.STATUS_ACTIVE
            ).values_list("book_id", flat=True)
            if not guest_ids:
                return _forbidden()
            queryset = queryset.filter(id__in=list(guest_ids))

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

        scope = Book.objects.all() if is_staff else Book.objects.filter(id__in=list(guest_ids))
        counts = {
            "total": scope.count(),
            "published": scope.filter(is_published=True).count(),
            "in_production": scope.exclude(production_status="published").count(),
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
        if not can_manage_book(request.user, book_id):
            return _forbidden()
        book = self._get(book_id)
        if not book:
            return Response({"detail": "Book not found."}, status=status.HTTP_404_NOT_FOUND)
        data = AdminBookSerializer(book, context={"request": request}).data
        data["warnings"] = proceedings_warnings(book)
        return Response(data, status=status.HTTP_200_OK)

    def patch(self, request, book_id):
        if not can_manage_book(request.user, book_id):
            return _forbidden()
        book = self._get(book_id)
        if not book:
            return Response({"detail": "Book not found."}, status=status.HTTP_404_NOT_FOUND)

        # Guest editors compile content; they do not decide what ships.
        if not check_admin_or_editor_role(request.user):
            attempted = STAFF_ONLY_BOOK_FIELDS.intersection(request.data.keys())
            if attempted:
                return _forbidden(
                    "Only the publishing team can change: "
                    + ", ".join(sorted(attempted)).replace("_", " ")
                    + "."
                )

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

        data = AdminBookSerializer(book, context={"request": request}).data
        data["warnings"] = proceedings_warnings(book)
        return Response(data, status=status.HTTP_200_OK)

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
        if not can_manage_book(request.user, book_id):
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

        if not all(isinstance(row, dict) for row in rows):
            return Response(
                {"contributors": ["Each contributor must be an object with a name."]},
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
        if not can_manage_book(request.user, book_id):
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
        if not can_manage_book(request.user, book_id):
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
        if not can_manage_book(request.user, book_id):
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


# Editorial bounds published on the public /proceedings page. Warnings, not
# errors — editorial can knowingly publish outside them.
PROCEEDINGS_MIN_PAGES = 120
PROCEEDINGS_MAX_PAGES = 500
OPEN_CHOICE_CEILING = 0.40


def proceedings_warnings(book):
    """Advisory checks for a proceedings volume, matching what the public
    proceedings page promises. Returns a list of human-readable strings."""
    if book.kind != Book.KIND_PROCEEDINGS:
        return []

    warnings = []

    if book.pages:
        if book.pages < PROCEEDINGS_MIN_PAGES:
            warnings.append(
                f"This volume is {book.pages} pages. The proceedings page states a "
                f"minimum of {PROCEEDINGS_MIN_PAGES}; consider merging it with another volume."
            )
        elif book.pages > PROCEEDINGS_MAX_PAGES:
            warnings.append(
                f"This volume is {book.pages} pages. The maximum that fits in one volume "
                f"is {PROCEEDINGS_MAX_PAGES}; consider splitting it into parts."
            )

    total = book.chapters.count()
    if total and not book.is_open_access:
        open_papers = book.chapters.filter(is_open_access=True).count()
        share = open_papers / total
        if share > OPEN_CHOICE_CEILING:
            warnings.append(
                f"{open_papers} of {total} papers ({share:.0%}) are open access, above the "
                f"{OPEN_CHOICE_CEILING:.0%} open-choice ceiling. Publish the whole volume "
                "open access instead."
            )

    if not book.conference_name:
        warnings.append(
            "No conference name recorded. Crossref requires it to register this as a "
            "proceedings volume rather than a book."
        )

    return warnings


class AdminProposalConvertView(APIView):
    """POST /api/v1/admin/proposals/<kind>/<id>/convert

    Turns an accepted proposal into a draft catalogue title. This is the step
    that connects the proposal queue to the catalogue — without it an accepted
    proposal is a dead end. Handles both book and proceedings proposals.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, kind, proposal_id):
        if not check_admin_or_editor_role(request.user):
            return _forbidden()

        if kind not in ("book", "proceedings"):
            return Response(
                {"detail": "Unknown proposal type."}, status=status.HTTP_404_NOT_FOUND
            )

        model = BookProposal if kind == "book" else ProceedingsProposal
        try:
            proposal = model.objects.select_related("submitted_by").get(id=proposal_id)
        except model.DoesNotExist:
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

        # Book.title is CharField(max_length=500); a derived title can overflow it.
        TITLE_MAX = Book._meta.get_field("title").max_length

        if kind == "book":
            title = proposal.title
            if len(title) > TITLE_MAX:
                return Response(
                    {"detail": f"The proposal title is longer than {TITLE_MAX} characters. "
                               "Shorten it on the proposal before converting."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            book = Book.objects.create(
                title=title,
                slug=unique_slug(title),
                series=proposal.series,
                kind=proposal.kind,
                abstract=proposal.synopsis,
                pages=proposal.estimated_pages,
                managing_editor=request.user,
                source_proposal_id=proposal.id,
                production_status="commissioned",
                is_published=False,
            )
            contributor_role = (
                BookContributor.ROLE_EDITOR
                if proposal.kind in (Book.KIND_EDITED, Book.KIND_PROCEEDINGS)
                else BookContributor.ROLE_AUTHOR
            )
            affiliation = proposal.affiliation
        else:
            # Carry every piece of conference metadata across — it is the whole
            # reason the proposal form collects it.
            title = f"Proceedings of {proposal.conference_name}"
            if len(title) > TITLE_MAX:
                # Prefer trimming the prefix over truncating the conference name
                title = proposal.conference_name[:TITLE_MAX]
            book = Book.objects.create(
                title=title,
                slug=unique_slug(title),
                series=BookSeries.objects.filter(abbreviation="BCP").first(),
                kind=Book.KIND_PROCEEDINGS,
                abstract=proposal.message,
                managing_editor=request.user,
                source_proposal_id=proposal.id,
                production_status="commissioned",
                is_published=False,
                conference_name=proposal.conference_name,
                conference_start=proposal.conference_start,
                conference_end=proposal.conference_end,
                conference_venue=proposal.venue,
                conference_organiser=proposal.organising_body,
                conference_url=proposal.website or proposal.announcement_url,
            )
            # Whoever proposed the volume is its volume editor.
            contributor_role = BookContributor.ROLE_EDITOR
            affiliation = proposal.contact_designation

        if proposal.contact_name:
            BookContributor.objects.create(
                book=book,
                user=proposal.submitted_by,
                name=proposal.contact_name,
                affiliation=affiliation,
                role=contributor_role,
                order=0,
            )

        proposal.converted_book = book
        proposal.save(update_fields=["converted_book"])

        data = AdminBookSerializer(book, context={"request": request}).data
        data["warnings"] = proceedings_warnings(book)
        return Response(data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Guest editors
# ---------------------------------------------------------------------------

GUEST_INVITE_VALID_DAYS = 30


class AdminBookGuestEditorListView(APIView):
    """GET  /api/v1/admin/books/<id>/guest-editors  — who is on this volume.
    POST /api/v1/admin/books/<id>/guest-editors  — invite someone.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, book_id):
        if not can_manage_book(request.user, book_id):
            return _forbidden()
        editors = BookGuestEditor.objects.select_related("user", "invited_by").filter(
            book_id=book_id
        ).exclude(status=BookGuestEditor.STATUS_REMOVED)
        return Response(
            BookGuestEditorSerializer(editors, many=True, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    def post(self, request, book_id):
        # Guest editors may invite co-editors onto their own volume — an edited
        # collection is normally assembled by several people.
        if not can_manage_book(request.user, book_id):
            return _forbidden()
        try:
            book = Book.objects.get(id=book_id)
        except Book.DoesNotExist:
            return Response({"detail": "Book not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = BookGuestEditorSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data["email"].strip().lower()
        existing = BookGuestEditor.objects.filter(book_id=book_id, email=email).first()
        if existing and existing.status != BookGuestEditor.STATUS_REMOVED:
            return Response(
                {"email": [f"{email} has already been invited to this volume."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Link an existing account straight away so they see the volume on sign-in.
        account = User.objects.filter(email__iexact=email).first()

        defaults = {
            "user": account,
            "name": serializer.validated_data["name"],
            "affiliation": serializer.validated_data.get("affiliation"),
            "invitation_message": serializer.validated_data.get("invitation_message"),
            "invitation_token": uuid.uuid4().hex,
            "token_expiry": timezone.now() + timedelta(days=GUEST_INVITE_VALID_DAYS),
            "status": BookGuestEditor.STATUS_INVITED,
            "invited_by": request.user,
            "decline_reason": None,
            "responded_on": None,
            "order": BookGuestEditor.objects.filter(book_id=book_id).count(),
        }

        if existing:      # previously removed — reissue rather than duplicate
            for field, value in defaults.items():
                setattr(existing, field, value)
            existing.save()
            guest = existing
        else:
            guest = BookGuestEditor.objects.create(book=book, email=email, **defaults)

        queue_email_task(send_guest_editor_invitation, guest, book)
        return Response(
            BookGuestEditorSerializer(guest, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class AdminBookGuestEditorDetailView(APIView):
    """DELETE removes someone's access. POST re-sends the invitation."""

    permission_classes = [permissions.IsAuthenticated]

    def _get(self, book_id, guest_id):
        try:
            return BookGuestEditor.objects.select_related("book").get(id=guest_id, book_id=book_id)
        except BookGuestEditor.DoesNotExist:
            return None

    def post(self, request, book_id, guest_id):
        if not can_manage_book(request.user, book_id):
            return _forbidden()
        guest = self._get(book_id, guest_id)
        if not guest:
            return Response({"detail": "Guest editor not found."}, status=status.HTTP_404_NOT_FOUND)
        if guest.status == BookGuestEditor.STATUS_ACTIVE:
            return Response(
                {"detail": "They have already accepted."}, status=status.HTTP_400_BAD_REQUEST
            )

        guest.invitation_token = uuid.uuid4().hex
        guest.token_expiry = timezone.now() + timedelta(days=GUEST_INVITE_VALID_DAYS)
        guest.status = BookGuestEditor.STATUS_INVITED
        guest.save(update_fields=["invitation_token", "token_expiry", "status"])

        queue_email_task(send_guest_editor_invitation, guest, guest.book)
        return Response(
            BookGuestEditorSerializer(guest, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    def delete(self, request, book_id, guest_id):
        if not can_manage_book(request.user, book_id):
            return _forbidden()
        guest = self._get(book_id, guest_id)
        if not guest:
            return Response({"detail": "Guest editor not found."}, status=status.HTTP_404_NOT_FOUND)

        # A guest editor cannot remove themselves and lock the volume by accident.
        if guest.user_id and guest.user_id == request.user.id:
            return Response(
                {"detail": "You cannot remove your own access."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        guest.status = BookGuestEditor.STATUS_REMOVED
        guest.responded_on = timezone.now()
        guest.save(update_fields=["status", "responded_on"])
        return Response({"detail": "Access removed."}, status=status.HTTP_200_OK)


class GuestEditorInvitationView(APIView):
    """GET  /api/v1/guest-editor/<token>          — what the invitation is for.
    POST /api/v1/guest-editor/<token>/respond     — accept or decline.

    Reading the invitation is public so the recipient can see what they were
    asked before signing in; responding requires an account.
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        try:
            guest = BookGuestEditor.objects.select_related("book", "invited_by").get(
                invitation_token=token
            )
        except BookGuestEditor.DoesNotExist:
            return Response(
                {"detail": "This invitation link is not valid."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "name": guest.name,
                "email": guest.email,
                "status": guest.status,
                "status_label": guest.get_status_display(),
                "message": guest.invitation_message,
                "expired": guest.token_expiry < timezone.now(),
                "expires_on": guest.token_expiry,
                "book": {
                    "title": guest.book.title,
                    "kind": guest.book.kind,
                    "kind_label": guest.book.get_kind_display(),
                    "conference_name": guest.book.conference_name,
                },
                "invited_by_email": guest.invited_by.email if guest.invited_by else None,
            },
            status=status.HTTP_200_OK,
        )


class GuestEditorRespondView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, token):
        try:
            guest = BookGuestEditor.objects.select_related("book").get(invitation_token=token)
        except BookGuestEditor.DoesNotExist:
            return Response(
                {"detail": "This invitation link is not valid."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if guest.status in (BookGuestEditor.STATUS_ACTIVE, BookGuestEditor.STATUS_DECLINED):
            return Response(
                {"detail": f"This invitation was already {guest.get_status_display().lower()}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if guest.status == BookGuestEditor.STATUS_REMOVED:
            return Response(
                {"detail": "This invitation is no longer available."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if guest.token_expiry < timezone.now():
            return Response(
                {"detail": "This invitation has expired. Ask the editor to send a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # The invitation belongs to an email address, not to whoever holds the link.
        if (request.user.email or "").strip().lower() != guest.email.strip().lower():
            return Response(
                {
                    "detail": f"This invitation was sent to {guest.email}. "
                              "Sign in with that address to respond."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        action = (request.data.get("action") or "").lower()
        if action not in ("accept", "decline"):
            return Response(
                {"action": ["Send either 'accept' or 'decline'."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        guest.user = request.user
        guest.responded_on = timezone.now()

        if action == "accept":
            guest.status = BookGuestEditor.STATUS_ACTIVE
            guest.save(update_fields=["user", "status", "responded_on"])
            # Keep the public byline in step without anyone retyping the name.
            BookContributor.objects.get_or_create(
                book=guest.book,
                name=guest.name,
                role=BookContributor.ROLE_EDITOR,
                defaults={
                    "user": request.user,
                    "affiliation": guest.affiliation,
                    "order": guest.book.contributors.count(),
                },
            )
        else:
            guest.status = BookGuestEditor.STATUS_DECLINED
            guest.decline_reason = request.data.get("reason") or None
            guest.save(update_fields=["user", "status", "responded_on", "decline_reason"])

        queue_email_task(notify_guest_editor_response, guest, guest.book, action == "accept")
        return Response(
            BookGuestEditorSerializer(guest, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


class MyVolumesView(APIView):
    """GET /api/v1/my-volumes — volumes the signed-in user guest-edits."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        rows = BookGuestEditor.objects.select_related("book", "book__series").filter(
            user=request.user
        ).exclude(status=BookGuestEditor.STATUS_REMOVED)

        volumes = []
        for row in rows:
            volumes.append(
                {
                    "guest_editor_id": row.id,
                    "status": row.status,
                    "status_label": row.get_status_display(),
                    "invitation_token": (
                        row.invitation_token if row.status == BookGuestEditor.STATUS_INVITED else None
                    ),
                    "book": AdminBookSerializer(row.book, context={"request": request}).data,
                }
            )
        return Response(volumes, status=status.HTTP_200_OK)
