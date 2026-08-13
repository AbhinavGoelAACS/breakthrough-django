"""Endpoints for the Books and Conference Proceedings pages.

The catalogue, series and downloads are public — they back public pages.
The two proposal endpoints require sign-in, so every proposal is tied to an
account. The admin queue at the bottom is admin/editor only.
"""

import os
import uuid

from django.conf import settings
from django.db.models import Count, Prefetch, Q
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from .models import (
    Book,
    BookContributor,
    BookProposal,
    BookSeries,
    DownloadAsset,
    ProceedingsProposal,
)
from .serializers import (
    BookDetailSerializer,
    BookListSerializer,
    BookProposalSerializer,
    BookSeriesSerializer,
    DownloadAssetSerializer,
    ProceedingsProposalSerializer,
)
from .serializers import _build_media_url
from .views_admin import check_admin_or_editor_role
from .services.email_service import (
    _proposal_reference,
    notify_editorial_new_proposal,
    queue_email_task,
    send_proposal_confirmation,
)

# Proposal attachments are optional, but they are still user-supplied files
# written to disk, so both extension and size are checked.
ALLOWED_PROPOSAL_EXTENSIONS = {".pdf", ".doc", ".docx", ".odt", ".rtf"}
MAX_PROPOSAL_FILE_BYTES = 10 * 1024 * 1024  # 10 MB


class ProposalRateThrottle(UserRateThrottle):
    """Proposals are authenticated, so throttle per account rather than per IP."""

    scope = "proposal"


PROPOSAL_FILE_FIELDS = ("cv_file", "sample_chapter_file", "outline_file")


def validate_proposal_files(request):
    """Check every attachment before anything is written.

    Returns a field-keyed error dict, empty when all files are acceptable.
    Run before the proposal row is created, so a rejected attachment cannot
    leave an orphan proposal behind.
    """
    errors = {}
    for field_name in PROPOSAL_FILE_FIELDS:
        uploaded = request.FILES.get(field_name)
        if not uploaded:
            continue
        ext = os.path.splitext(uploaded.name)[1].lower()
        if ext not in ALLOWED_PROPOSAL_EXTENSIONS:
            errors[field_name] = [
                f"Invalid file type '{ext}'. Allowed: "
                f"{', '.join(sorted(ALLOWED_PROPOSAL_EXTENSIONS))}"
            ]
        elif uploaded.size > MAX_PROPOSAL_FILE_BYTES:
            errors[field_name] = ["File is larger than 10 MB."]
    return errors


def save_proposal_file(file, proposal_id, field_name):
    """Persist an already-validated attachment and return its relative path.

    Mirrors save_journal_image() in views_journals.py.
    """
    if not file:
        return ""

    ext = os.path.splitext(file.name)[1].lower()
    upload_dir = os.path.join(settings.MEDIA_ROOT, "proposals", str(proposal_id))
    os.makedirs(upload_dir, exist_ok=True)

    filename = f"{field_name}_{uuid.uuid4().hex[:8]}{ext}"
    with open(os.path.join(upload_dir, filename), "wb+") as dest:
        for chunk in file.chunks():
            dest.write(chunk)

    return f"proposals/{proposal_id}/{filename}"


def _contributor_prefetch():
    return Prefetch(
        "contributors",
        queryset=BookContributor.objects.order_by("order", "id"),
    )


class BookListView(APIView):
    """GET /api/v1/books/ — the public catalogue.

    Optional query params: kind, series (abbreviation), open_access=true,
    q (title/subtitle search), skip, limit.
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        queryset = (
            Book.objects.filter(is_published=True)
            .select_related("series")
            .prefetch_related(_contributor_prefetch())
        )

        kind = request.query_params.get("kind")
        if kind and kind != "all":
            queryset = queryset.filter(kind=kind)

        series = request.query_params.get("series")
        if series:
            queryset = queryset.filter(series__abbreviation__iexact=series)

        if request.query_params.get("open_access") == "true":
            queryset = queryset.filter(is_open_access=True)

        search = request.query_params.get("q")
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(subtitle__icontains=search)
            )

        # skip/limit to match JournalListView and ArticleListView
        try:
            skip = max(int(request.query_params.get("skip", 0)), 0)
        except (TypeError, ValueError):
            skip = 0
        try:
            limit = min(max(int(request.query_params.get("limit", 24)), 1), 100)
        except (TypeError, ValueError):
            limit = 24

        books = queryset[skip:skip + limit]
        serializer = BookListSerializer(books, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class BookDetailView(APIView):
    """GET /api/v1/books/<slug> — a single title with chapters."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        try:
            book = (
                Book.objects.filter(is_published=True)
                .select_related("series")
                .prefetch_related(_contributor_prefetch(), "chapters")
                .get(slug=slug)
            )
        except Book.DoesNotExist:
            return Response(
                {"detail": "Book not found."}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = BookDetailSerializer(book, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class BookSeriesListView(APIView):
    """GET /api/v1/book-series/ — series with published-volume counts."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        # annotate() introduces a GROUP BY that drops Meta.ordering, so the
        # sort has to be restated explicitly here.
        series = (
            BookSeries.objects.filter(is_active=True)
            .annotate(book_count=Count("books", filter=Q(books__is_published=True)))
            .order_by("name")
        )
        serializer = BookSeriesSerializer(series, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class DownloadAssetListView(APIView):
    """GET /api/v1/proceedings/downloads/ — templates, guidelines and forms."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        assets = DownloadAsset.objects.filter(is_active=True)

        audience = request.query_params.get("audience")
        if audience:
            assets = assets.filter(audience=audience)

        serializer = DownloadAssetSerializer(assets, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


def _require_consent(request):
    """Consent checkbox must be ticked. Accepts JSON bool or multipart string."""
    raw = request.data.get("consent_given")
    if raw in (True, "true", "True", "on", "1", 1):
        return None
    return Response(
        {"consent_given": ["You must agree before submitting."]},
        status=status.HTTP_400_BAD_REQUEST,
    )


class ProceedingsProposalCreateView(APIView):
    """POST /api/v1/proceedings/proposals/ — a conference chair's proposal.

    Sign-in required, so the proposal is always tied to an account.
    """

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ProposalRateThrottle]

    def post(self, request):
        consent_error = _require_consent(request)
        if consent_error:
            return consent_error

        serializer = ProceedingsProposalSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        proposal = serializer.save(submitted_by=request.user, consent_given=True)

        # Queued so a slow SMTP host cannot make the form appear to hang.
        queue_email_task(send_proposal_confirmation, proposal, "proceedings")
        queue_email_task(notify_editorial_new_proposal, proposal, "proceedings")

        return Response(
            ProceedingsProposalSerializer(proposal).data,
            status=status.HTTP_201_CREATED,
        )


class BookProposalCreateView(APIView):
    """POST /api/v1/books/proposals/ — an author's book proposal.

    Sign-in required. Accepts multipart so the optional CV and sample chapter
    can be attached.
    """

    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    throttle_classes = [ProposalRateThrottle]

    def post(self, request):
        consent_error = _require_consent(request)
        if consent_error:
            return consent_error

        serializer = BookProposalSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Validated up front so a bad attachment cannot leave an orphan row.
        file_errors = validate_proposal_files(request)
        if file_errors:
            return Response(file_errors, status=status.HTTP_400_BAD_REQUEST)

        proposal = serializer.save(submitted_by=request.user, consent_given=True)

        # Attachments are optional; the proposal id names their directory, so
        # they are written once the row exists.
        updated = []
        for field_name in PROPOSAL_FILE_FIELDS:
            uploaded = request.FILES.get(field_name)
            if uploaded:
                setattr(proposal, field_name, save_proposal_file(uploaded, proposal.id, field_name))
                updated.append(field_name)
        if updated:
            proposal.save(update_fields=updated)

        queue_email_task(send_proposal_confirmation, proposal, "book")
        queue_email_task(notify_editorial_new_proposal, proposal, "book")

        return Response(
            BookProposalSerializer(proposal).data,
            status=status.HTTP_201_CREATED,
        )


# ---------------------------------------------------------------------------
# Editorial queue — admins and editors review incoming proposals
# ---------------------------------------------------------------------------

PROPOSAL_KINDS = {
    "book": (BookProposal, BookProposalSerializer),
    "proceedings": (ProceedingsProposal, ProceedingsProposalSerializer),
}


def _queue_row(proposal, kind):
    """Compact shape for the queue list — enough to triage without opening."""
    submitter = proposal.submitted_by
    row = {
        "id": proposal.id,
        "kind": kind,
        "reference": _proposal_reference(proposal, kind),
        "status": proposal.status,
        "status_label": proposal.get_status_display(),
        "contact_name": proposal.contact_name,
        "contact_email": proposal.contact_email,
        "account_email": submitter.email if submitter else None,
        "submitted_on": proposal.submitted_on,
        "decided_on": proposal.decided_on,
    }
    if kind == "book":
        row["title"] = proposal.title
        row["subtitle"] = proposal.get_kind_display()
        row["has_attachments"] = bool(
            proposal.cv_file or proposal.sample_chapter_file or proposal.outline_file
        )
    else:
        row["title"] = proposal.conference_name
        row["subtitle"] = proposal.get_conference_type_display() if proposal.conference_type else ""
        row["has_attachments"] = False
    return row


class AdminProposalListView(APIView):
    """GET /api/v1/admin/proposals/ — both kinds in one triage queue.

    Query params: status, kind (book|proceedings), skip, limit.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not check_admin_or_editor_role(request.user):
            return Response(
                {"detail": "Admin or editor access required"},
                status=status.HTTP_403_FORBIDDEN,
            )

        status_filter = request.query_params.get("status")
        kind_filter = request.query_params.get("kind")

        rows = []
        counts = {"book": 0, "proceedings": 0, "submitted": 0, "total": 0}

        for kind, (model, _serializer) in PROPOSAL_KINDS.items():
            queryset = model.objects.select_related("submitted_by").all()
            counts[kind] = queryset.count()
            counts["submitted"] += queryset.filter(status="submitted").count()

            if kind_filter and kind_filter != kind:
                continue
            if status_filter:
                queryset = queryset.filter(status=status_filter)
            rows.extend(_queue_row(p, kind) for p in queryset)

        counts["total"] = counts["book"] + counts["proceedings"]
        # Newest first across both kinds
        rows.sort(key=lambda r: r["submitted_on"], reverse=True)

        try:
            skip = max(int(request.query_params.get("skip", 0)), 0)
        except (TypeError, ValueError):
            skip = 0
        try:
            limit = min(max(int(request.query_params.get("limit", 25)), 1), 100)
        except (TypeError, ValueError):
            limit = 25

        return Response(
            {"proposals": rows[skip:skip + limit], "counts": counts},
            status=status.HTTP_200_OK,
        )


class AdminProposalDetailView(APIView):
    """GET / PATCH /api/v1/admin/proposals/<kind>/<id> — read and decide."""

    permission_classes = [permissions.IsAuthenticated]

    def _load(self, kind, proposal_id):
        entry = PROPOSAL_KINDS.get(kind)
        if not entry:
            return None, None
        model, serializer_class = entry
        try:
            return model.objects.select_related("submitted_by").get(id=proposal_id), serializer_class
        except model.DoesNotExist:
            return None, serializer_class

    def get(self, request, kind, proposal_id):
        if not check_admin_or_editor_role(request.user):
            return Response(
                {"detail": "Admin or editor access required"},
                status=status.HTTP_403_FORBIDDEN,
            )

        proposal, serializer_class = self._load(kind, proposal_id)
        if serializer_class is None:
            return Response({"detail": "Unknown proposal type."}, status=status.HTTP_404_NOT_FOUND)
        if proposal is None:
            return Response({"detail": "Proposal not found."}, status=status.HTTP_404_NOT_FOUND)

        data = serializer_class(proposal, context={"request": request}).data
        data["kind_slug"] = kind
        data["reference"] = _proposal_reference(proposal, kind)
        data["status_label"] = proposal.get_status_display()
        data["decision_note"] = proposal.decision_note
        data["decided_on"] = proposal.decided_on
        data["decided_by_email"] = proposal.decided_by.email if proposal.decided_by else None
        data["account_email"] = proposal.submitted_by.email if proposal.submitted_by else None

        data["converted_book_id"] = proposal.converted_book_id

        if kind == "book":
            data["attachments"] = {
                field: _build_media_url(getattr(proposal, field), request)
                for field in ("cv_file", "sample_chapter_file", "outline_file")
                if getattr(proposal, field)
            }

        return Response(data, status=status.HTTP_200_OK)

    def patch(self, request, kind, proposal_id):
        if not check_admin_or_editor_role(request.user):
            return Response(
                {"detail": "Admin or editor access required"},
                status=status.HTTP_403_FORBIDDEN,
            )

        proposal, serializer_class = self._load(kind, proposal_id)
        if serializer_class is None:
            return Response({"detail": "Unknown proposal type."}, status=status.HTTP_404_NOT_FOUND)
        if proposal is None:
            return Response({"detail": "Proposal not found."}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get("status")
        valid = [choice[0] for choice in proposal.STATUS_CHOICES]
        if new_status and new_status not in valid:
            return Response(
                {"status": [f"Must be one of: {', '.join(valid)}"]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        updated = []
        if new_status and new_status != proposal.status:
            proposal.status = new_status
            proposal.decided_by = request.user
            proposal.decided_on = timezone.now()
            updated += ["status", "decided_by", "decided_on"]

        if "decision_note" in request.data:
            proposal.decision_note = request.data.get("decision_note") or None
            updated.append("decision_note")

        if updated:
            proposal.save(update_fields=updated)

        return Response(
            {
                "id": proposal.id,
                "kind": kind,
                "reference": _proposal_reference(proposal, kind),
                "status": proposal.status,
                "status_label": proposal.get_status_display(),
                "decision_note": proposal.decision_note,
                "decided_on": proposal.decided_on,
                "decided_by_email": proposal.decided_by.email if proposal.decided_by else None,
            },
            status=status.HTTP_200_OK,
        )
