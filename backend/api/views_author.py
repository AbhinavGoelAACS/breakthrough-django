from datetime import datetime
import json
import uuid
from pathlib import Path

from django.http import FileResponse
from django.db import transaction
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser

from .models import (
    User,
    Paper,
    PaperComment,
    OnlineReview,
    ReviewSubmission,
    ReviewerInvitation,
    PaperCoAuthor,
    Journal,
    PaperCorrespondence,
    PaperVersion,
)
from .auth import JWTAuthentication
from .jwt_utils import hash_password
from django.db.models import Q


def _generate_paper_code(journal_id):
    """Generate paper code like BAMJ-26-03001 (INITIALS-YY-MMSEQ)."""
    journal = Journal.objects.filter(fld_id=journal_id).first()
    initials = (journal.short_form or "PAPER").strip().upper() if journal else "PAPER"

    now = datetime.utcnow()
    yy = now.strftime("%y")    # e.g. "26"
    mm = now.strftime("%m")    # e.g. "03"

    # Count existing papers in this journal for the same year+month
    prefix = f"{initials}-{yy}-{mm}"
    existing_count = Paper.objects.filter(paper_code__startswith=prefix).count()
    seq = existing_count + 1

    return f"{prefix}{seq:03d}"


def _ensure_author(user) -> None:
    # Any authenticated user can access author portal
    if not user.is_authenticated:
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied("Authentication required")


class AuthorPaperRevisionsView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, paper_id: int):
        _ensure_author(request.user)
        user_id = str(request.user.id)

        try:
            paper = Paper.objects.get(id=paper_id, added_by=user_id)
        except Paper.DoesNotExist:
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)

        versions = PaperVersion.objects.filter(paper_id=paper_id).order_by("-version_number")
        version_list = []
        for v in versions:
            version_list.append({
                "id": v.id,
                "version_number": v.version_number,
                "file": v.file,
                "uploaded_on": v.uploaded_on.isoformat() if v.uploaded_on else None,
                "revision_reason": v.revision_reason,
                "change_summary": v.change_summary
            })

        return Response({
            "paper_id": paper.id,
            "current_version": paper.version_number,
            "revision_count": paper.revision_count,
            "versions": version_list
        }, status=status.HTTP_200_OK)


class AuthorPaperResubmitView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, paper_id: int):
        _ensure_author(request.user)
        user_id = str(request.user.id)
        user = User.objects.get(id=user_id)

        try:
            paper = Paper.objects.get(id=paper_id, added_by=user_id)
        except Paper.DoesNotExist:
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)

        if paper.status not in ["correction", "resubmitted"]:
            return Response({"detail": "Paper is not in a status that allows resubmission"}, status=status.HTTP_400_BAD_REQUEST)

        change_summary = request.data.get("change_summary", "")
        clean_revision_file = request.FILES.get("clean_revision") or request.FILES.get("clean_file")
        track_changes_file = request.FILES.get("track_changes") or request.FILES.get("track_changes_file")
        response_to_reviewer_file = request.FILES.get("response_to_reviewer") or request.FILES.get("response_file")
        title_page_file = request.FILES.get("title_page")

        if not clean_revision_file:
            return Response({"detail": "Clean revision manuscript is required"}, status=status.HTTP_400_BAD_REQUEST)

        backend_root = Path(__file__).resolve().parent.parent.parent
        upload_dir = backend_root / "uploads" / "papers" / f"user_{user.id}"
        upload_dir.mkdir(parents=True, exist_ok=True)

        def _save_file(django_file, p_id: int, kind: str) -> str:
            if not django_file:
                return ""
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            ext = Path(django_file.name).suffix
            filename = f"{p_id}_{kind}_v{paper.version_number + 1}_{timestamp}{ext}"
            dest = upload_dir / filename
            with dest.open("wb") as f:
                for chunk in django_file.chunks():
                    f.write(chunk)
            return str(Path("uploads") / "papers" / f"user_{user.id}" / filename)

        with transaction.atomic():
            # Save old version into history
            PaperVersion.objects.create(
                paper_id=paper.id,
                version_number=paper.version_number,
                file=paper.blinded_manuscript or paper.file,
                uploaded_on=paper.added_on,
                revision_reason="Previous version before resubmission",
                change_summary=None,
                uploaded_by=str(user.id)
            )

            # Update Paper with new files and bump versions
            paper.version_number += 1
            paper.revision_count += 1
            paper.status = "resubmitted"

            clean_path = _save_file(clean_revision_file, paper.id, "clean_revision")
            paper.blinded_manuscript = clean_path
            paper.revised_clean = clean_path
            
            if track_changes_file:
                paper.revised_track_changes = _save_file(track_changes_file, paper.id, "track_changes")
            
            if response_to_reviewer_file:
                paper.response_to_reviewer = _save_file(response_to_reviewer_file, paper.id, "response_to_reviewer")
            
            if title_page_file:
                paper.title_page = _save_file(title_page_file, paper.id, "title_page_revised")
                
            paper.save()

            # Record final version in history
            PaperVersion.objects.create(
                paper_id=paper.id,
                version_number=paper.version_number,
                file=clean_path,
                uploaded_on=datetime.utcnow(),
                revision_reason="Author resubmission",
                change_summary=change_summary,
                uploaded_by=str(user.id)
            )

        return Response({
            "message": "Paper resubmitted successfully",
            "paper_id": paper.id,
            "new_version": paper.version_number,
            "status": paper.status
        }, status=status.HTTP_200_OK)


class AuthorStatsView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        _ensure_author(request.user)
        user_id = str(request.user.id)

        qs = Paper.objects.filter(added_by=user_id)
        total = qs.count()
        accepted = qs.filter(status="accepted").count()
        rejected = qs.filter(status="rejected").count()
        under_review = qs.filter(status="under_review").count()

        return Response(
            {
                "total_submissions": total,
                "accepted_papers": accepted,
                "rejected_papers": rejected,
                "under_review": under_review,
            },
            status=status.HTTP_200_OK,
        )


class AuthorSubmissionsView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        _ensure_author(request.user)
        user_id = str(request.user.id)

        skip = int(request.query_params.get("skip", 0))
        limit = int(request.query_params.get("limit", 20))
        status_filter = request.query_params.get("status_filter")

        qs = Paper.objects.filter(added_by=user_id)
        if status_filter:
            qs = qs.filter(status=status_filter)

        total = qs.count()
        papers = qs.order_by("-added_on")[skip : skip + limit]

        papers_list = []
        for paper in papers:
            journal_name = "Unknown"
            if paper.journal:
                journal = Journal.objects.filter(fld_id=paper.journal).first()
                if journal:
                    journal_name = journal.fld_journal_name

            papers_list.append(
                {
                    "id": paper.id,
                    "paper_code": paper.paper_code,
                    "title": paper.title,
                    "abstract": paper.abstract,
                    "status": paper.status,
                    "submitted_date": paper.added_on.isoformat()
                    if paper.added_on
                    else None,
                    "journal": journal_name,
                    "journal_id": paper.journal,
                    "author": paper.author or "",
                    "keyword": paper.keyword or "",
                    "version_number": paper.version_number,
                    "revision_count": paper.revision_count,
                }
            )

        return Response(
            {
                "total": total,
                "skip": skip,
                "limit": limit,
                "papers": papers_list,
            },
            status=status.HTTP_200_OK,
        )


class AuthorSubmissionDetailView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, paper_id: int):
        _ensure_author(request.user)
        user_id = str(request.user.id)

        try:
            paper = Paper.objects.get(id=paper_id, added_by=user_id)
        except Paper.DoesNotExist:
            return Response(
                {"detail": "Paper not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Reviews visible to author
        reviews_qs = ReviewSubmission.objects.filter(
            paper_id=paper_id,
            status="submitted",
        )
        reviews_list = []
        for review in reviews_qs:
            reviewer_name = "Anonymous Reviewer"
            invitation = ReviewerInvitation.objects.filter(
                paper_id=paper_id,
                reviewer_id=int(review.reviewer_id)
                if str(review.reviewer_id).isdigit()
                else None,
            ).first()
            if invitation and invitation.reviewer_name:
                reviewer_name = invitation.reviewer_name

            reviews_list.append(
                {
                    "id": review.id,
                    "reviewer_name": reviewer_name,
                    "comments": review.author_comments,
                    "recommendation": review.recommendation,
                    "overall_rating": review.overall_rating,
                    "date": review.submitted_at.isoformat()
                    if review.submitted_at
                    else None,
                    "review_report_file": review.review_report_file,
                    "technical_quality": review.technical_quality,
                    "clarity": review.clarity,
                    "originality": review.originality,
                    "significance": review.significance,
                }
            )

        journal_name = "Unknown"
        if paper.journal:
            journal = Journal.objects.filter(fld_id=paper.journal).first()
            if journal:
                journal_name = journal.fld_journal_name

        assignments = OnlineReview.objects.filter(paper_id=str(paper.id))
        assigned_reviewers = []
        for assignment in assignments:
            review_submission = ReviewSubmission.objects.filter(
                assignment_id=assignment.id
            ).first()
            assigned_reviewers.append(
                {
                    "assigned_on": assignment.assigned_on.isoformat()
                    if assignment.assigned_on
                    else None,
                    "has_submitted": review_submission.status == "submitted"
                    if review_submission
                    else False,
                    "submitted_at": review_submission.submitted_at.isoformat()
                    if review_submission and review_submission.submitted_at
                    else None,
                }
            )

        author_info = None
        if paper.added_by and str(paper.added_by).isdigit():
            author = User.objects.filter(id=int(paper.added_by)).first()
            if author:
                author_info = {
                    "id": author.id,
                    "name": f"{author.fname or ''} {author.lname or ''}".strip()
                    or "Unknown",
                    "email": author.email,
                    "affiliation": author.affiliation or "",
                    "organisation": author.organisation or "",
                    "department": author.department or "",
                    "designation": author.designation or "",
                }

        co_authors_qs = PaperCoAuthor.objects.filter(paper_id=paper.id).defer('user_id', 'invitation_token')
        co_authors_list = []
        for ca in co_authors_qs:
            co_authors_list.append(
                {
                    "id": ca.id,
                    "first_name": ca.first_name,
                    "middle_name": ca.middle_name,
                    "last_name": ca.last_name,
                    "email": ca.email,
                    "affiliation": ca.organisation,
                    "is_corresponding": ca.is_corresponding,
                }
            )

        return Response(
            {
                "id": paper.id,
                "paper_code": paper.paper_code,
                "title": paper.title,
                "abstract": paper.abstract,
                "keywords": paper.keyword,
                "status": paper.status,
                "submitted_date": paper.added_on.isoformat()
                if paper.added_on
                else None,
                "journal": journal_name,
                "file": paper.file,
                "reviews": reviews_list,
                "assigned_reviewers": assigned_reviewers,
                "version_number": paper.version_number,
                "revision_count": paper.revision_count,
                "revision_deadline": paper.revision_deadline.isoformat()
                if paper.revision_deadline
                else None,
                "revision_notes": paper.revision_notes,
                "revision_requested_date": paper.revision_requested_date.isoformat()
                if paper.revision_requested_date
                else None,
                "revision_type": paper.revision_type,
                "editor_comments": paper.editor_comments,
                "author": author_info,
                "co_authors": co_authors_list,
            },
            status=status.HTTP_200_OK,
        )


class AuthorProfileView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        _ensure_author(request.user)
        user = User.objects.filter(id=request.user.id).first()
        if not user:
            return Response(
                {"detail": "User not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(
            {
                "id": user.id,
                "email": user.email,
                "fname": user.fname,
                "lname": user.lname,
                "mname": user.mname,
                "title": user.title,
                "affiliation": user.affiliation,
                "specialization": user.specialization,
                "contact": user.contact,
                "address": user.address,
                "salutation": user.salutation,
                "designation": user.designation,
                "department": user.department,
                "organisation": user.organisation,
            },
            status=status.HTTP_200_OK,
        )


class SubmitPaperView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        _ensure_author(request.user)

        title = request.data.get("title")
        abstract = request.data.get("abstract")
        keywords = request.data.get("keywords")
        journal_id = request.data.get("journal_id")
        research_area = request.data.get("research_area") or ""
        message_to_editor = request.data.get("message_to_editor") or ""
        paper_references = request.data.get("paper_references") or ""
        terms_accepted = request.data.get("terms_accepted")
        authors_raw = request.data.get("authors", "[]")
        title_page_file = request.FILES.get("title_page")
        blinded_file = request.FILES.get("blinded_manuscript")

        if not all([title, abstract, keywords, journal_id, title_page_file, blinded_file]):
            return Response(
                {"detail": "Missing required fields"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if str(terms_accepted).lower() not in ("true", "1", "yes", "on"):
            return Response(
                {"detail": "You must accept the terms and conditions"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            authors_data = json.loads(authors_raw)
            if not isinstance(authors_data, list):
                authors_data = []
        except json.JSONDecodeError:
            return Response(
                {"detail": "Invalid authors format - must be valid JSON array"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(authors_data) == 0:
            return Response(
                {"detail": "At least one author is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        has_corresponding = any(a.get("is_corresponding", False) for a in authors_data)
        if not has_corresponding:
            return Response(
                {"detail": "At least one corresponding author must be selected"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(id=request.user.id).first()
        if not user:
            return Response(
                {"detail": "User not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        backend_root = Path(__file__).resolve().parent.parent.parent
        upload_dir = backend_root / "uploads" / "papers" / f"user_{user.id}"
        upload_dir.mkdir(parents=True, exist_ok=True)

        from django.utils import timezone as tz

        def _save_file(django_file, paper_id: int, kind: str) -> str:
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            ext = Path(django_file.name).suffix
            filename = f"{paper_id}_{kind}_{timestamp}{ext}"
            dest = upload_dir / filename
            with dest.open("wb") as f:
                for chunk in django_file.chunks():
                    f.write(chunk)
            # store relative to backend root
            rel = Path("uploads") / "papers" / f"user_{user.id}" / filename
            return str(rel)

        with transaction.atomic():
            # Use first author's email as the paper author, or fallback to submitter
            first_author = authors_data[0] if authors_data else {}
            paper_author = (first_author.get("email") or "").strip().lower() or user.email

            paper = Paper.objects.create(
                title=title,
                abstract=abstract,
                keyword=keywords,
                journal=int(journal_id),
                author=paper_author,
                added_by=str(user.id),
                status="submitted",
                mailstatus="0",
                added_on=tz.now(),
                research_area=research_area or None,
                message_to_editor=message_to_editor or None,
                paper_references=paper_references or None,
                terms_accepted=True,
            )

            # Generate paper code: e.g. BAMJ-26-03001
            paper.paper_code = _generate_paper_code(paper.journal)

            title_page_path = _save_file(title_page_file, paper.id, "title_page")
            blinded_path = _save_file(blinded_file, paper.id, "blinded_manuscript")

            paper.title_page = title_page_path
            paper.blinded_manuscript = blinded_path
            paper.file = title_page_path
            paper.save()

            for idx, ca in enumerate(authors_data):
                ca_email = (ca.get("email") or "").strip().lower()
                ca_user_id = None
                invitation_token = None
                is_new_user = False

                if ca_email:
                    # Check if user already exists
                    existing_user = User.objects.filter(email=ca_email).first()
                    if existing_user:
                        ca_user_id = existing_user.id
                    else:
                        # Auto-register co-author with a random unusable password
                        random_password = uuid.uuid4().hex
                        new_user = User.objects.create(
                            email=ca_email,
                            password=hash_password(random_password),
                            fname=ca.get("first_name", ""),
                            lname=ca.get("last_name", ""),
                            mname=ca.get("middle_name") or "",
                            salutation=ca.get("salutation") or "",
                            designation=ca.get("designation") or "",
                            department=ca.get("department") or "",
                            organisation=ca.get("organisation") or "",
                            role="author",
                            added_on=tz.now(),
                        )
                        ca_user_id = new_user.id
                        is_new_user = True

                    # Generate invitation token for profile completion link
                    invitation_token = uuid.uuid4().hex

                coauthor_kwargs = dict(
                    paper_id=paper.id,
                    salutation=ca.get("salutation"),
                    first_name=ca.get("first_name", ""),
                    middle_name=ca.get("middle_name"),
                    last_name=ca.get("last_name", ""),
                    email=ca_email or ca.get("email"),
                    designation=ca.get("designation"),
                    department=ca.get("department"),
                    organisation=ca.get("organisation"),
                    author_order=ca.get("author_order", idx + 1),
                    is_corresponding=ca.get("is_corresponding", False),
                    created_at=tz.now(),
                )
                # Add new fields if the DB migration has been applied
                try:
                    PaperCoAuthor.objects.create(
                        **coauthor_kwargs,
                        user_id=ca_user_id,
                        invitation_token=invitation_token,
                    )
                except TypeError:
                    # Fallback: migration not yet applied, create without new fields
                    PaperCoAuthor.objects.create(**coauthor_kwargs)

        # Send author notification emails (best-effort, outside transaction)
        try:
            from .services.email_service import send_coauthor_notification_email
            for ca in authors_data:
                ca_email = (ca.get("email") or "").strip().lower()
                if ca_email:
                    coauthor_record = PaperCoAuthor.objects.filter(
                        paper_id=paper.id, email=ca_email
                    ).first()
                    if coauthor_record and coauthor_record.invitation_token:
                        send_coauthor_notification_email(
                            coauthor_record, paper, user
                        )
        except Exception:
            pass

        # Send submission confirmation email (best-effort)
        email_sent = False
        try:
            from .services.email_service import send_submission_confirmation, notify_editors_new_submission
            email_sent = send_submission_confirmation(paper, user)
            # Notify editors of the journal about the new submission
            journal = Journal.objects.filter(fld_id=paper.journal).first()
            notify_editors_new_submission(paper, user, journal)
        except Exception:
            pass

        return Response(
            {
                "id": paper.id,
                "paper_code": paper.paper_code,
                "title": paper.title,
                "status": paper.status,
                "file": paper.file,
                "title_page": paper.title_page,
                "blinded_manuscript": paper.blinded_manuscript,
                "submitted_date": paper.added_on.isoformat()
                if paper.added_on
                else None,
                "co_authors_count": len(authors_data),
                "email_notification_queued": email_sent,
            },
            status=status.HTTP_201_CREATED,
        )


class AuthorCorrespondenceListView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, paper_id: int):
        _ensure_author(request.user)
        user_id = str(request.user.id)

        try:
            paper = Paper.objects.get(id=paper_id, added_by=user_id)
        except Paper.DoesNotExist:
            return Response(
                {"detail": "Paper not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        entries = PaperCorrespondence.objects.filter(paper_id=paper_id).order_by("-created_at")
        
        corr_list = []
        for entry in entries:
            corr_list.append({
                "id": entry.id,
                "paper_id": entry.paper_id,
                "recipient_email": entry.recipient_email,
                "recipient_name": entry.recipient_name,
                "subject": entry.subject,
                "body": entry.body,
                "email_type": entry.email_type,
                "status_at_send": entry.status_at_send,
                "delivery_status": entry.delivery_status,
                "webhook_id": entry.webhook_id,
                "webhook_received_at": entry.webhook_received_at.isoformat() if entry.webhook_received_at else None,
                "error_message": entry.error_message,
                "retry_count": entry.retry_count,
                "created_at": entry.created_at.isoformat() if entry.created_at else None,
                "sent_at": entry.sent_at.isoformat() if entry.sent_at else None,
                "is_read": entry.is_read
            })

        return Response({
            "total": len(corr_list),
            "paper_id": paper_id,
            "paper_title": paper.title,
            "correspondence": corr_list
        }, status=status.HTTP_200_OK)


class AuthorCorrespondenceReadView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, paper_id: int, correspondence_id: int):
        _ensure_author(request.user)
        user_id = str(request.user.id)

        try:
            Paper.objects.get(id=paper_id, added_by=user_id)
        except Paper.DoesNotExist:
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            corr = PaperCorrespondence.objects.get(id=correspondence_id, paper_id=paper_id)
        except PaperCorrespondence.DoesNotExist:
            return Response({"detail": "Correspondence not found"}, status=status.HTTP_404_NOT_FOUND)

        if not corr.is_read:
            corr.is_read = True
            corr.read_at = datetime.utcnow()
            corr.save()

        return Response({
            "message": "Correspondence marked as read",
            "id": corr.id,
            "is_read": corr.is_read,
            "read_at": corr.read_at.isoformat() if corr.read_at else None
        }, status=status.HTTP_200_OK)


class AuthorContactEditorialView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, paper_id: int):
        _ensure_author(request.user)
        user_id = str(request.user.id)
        user = User.objects.get(id=user_id)
        
        subject = request.data.get("subject")
        message = request.data.get("message")
        inquiry_type = request.data.get("inquiry_type", "general")

        if not subject or not message:
            return Response({"detail": "Subject and message are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            paper = Paper.objects.get(id=paper_id, added_by=user_id)
        except Paper.DoesNotExist:
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)

        journal = Journal.objects.filter(fld_id=paper.journal).first()
        from .models import Editor
        editors = Editor.objects.filter(journal_id=paper.journal).order_by('-role', 'id')
        
        recipient_emails = []
        recipient_names = []
        for ed in editors[:3]:
            if ed.editor_email:
                recipient_emails.append(ed.editor_email)
                recipient_names.append(ed.editor_name or "Editor")
                
        if not recipient_emails:
            recipient_emails = ["info@breakthroughpublishers.com"]
            recipient_names = ["Editorial Office"]

        corr = PaperCorrespondence.objects.create(
            paper_id=paper_id,
            sender_id=int(user_id),
            sender_role='author',
            recipient_email=recipient_emails[0],
            recipient_name=recipient_names[0],
            subject=subject,
            body=message,
            email_type=inquiry_type,
            status_at_send=paper.status,
            is_read=False,
            delivery_status='pending',
            created_at=datetime.utcnow()
        )

        from .services.email_service import send_correspondence_email
        email_sent = send_correspondence_email(corr)

        return Response({
            "success": True,
            "message": "Your message has been sent to the editorial office",
            "correspondence_id": corr.id,
            "email_sent": email_sent,
            "recipient": recipient_names[0]
        }, status=status.HTTP_200_OK)


class AuthorUnreadCorrespondenceCountView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, paper_id: int):
        _ensure_author(request.user)
        user_id = str(request.user.id)

        if not Paper.objects.filter(id=paper_id, added_by=user_id).exists():
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)

        count = PaperCorrespondence.objects.filter(paper_id=paper_id, is_read=False).count()

        return Response({
            "paper_id": paper_id,
            "unread_count": count
        }, status=status.HTTP_200_OK)


class AuthorPaperCommentsView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, paper_id: int):
        _ensure_author(request.user)
        user_id = str(request.user.id)

        if not Paper.objects.filter(id=paper_id, added_by=user_id).exists():
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)

        comments = PaperComment.objects.filter(paper_id=paper_id).order_by('-added_on')
        comments_list = [
            {
                "id": c.id,
                "author": c.comment_by,
                "text": c.comment_text,
                "date": c.added_on.isoformat() if c.added_on else None
            } for c in comments
        ]
        return Response(comments_list, status=status.HTTP_200_OK)


class AuthorPaperDecisionView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, paper_id: int):
        _ensure_author(request.user)
        user_id = str(request.user.id)

        try:
            paper = Paper.objects.get(id=paper_id, added_by=user_id)
        except Paper.DoesNotExist:
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            "paper_id": paper.id,
            "status": paper.status,
            "decision": paper.status,
            "editor_comments": paper.editor_comments,
            "revision_requested_date": paper.revision_requested_date.isoformat() if paper.revision_requested_date else None,
            "revision_deadline": paper.revision_deadline.isoformat() if paper.revision_deadline else None,
            "revision_notes": paper.revision_notes,
            "revision_type": paper.revision_type
        }, status=status.HTTP_200_OK)


# --- File View/Download Endpoints ---

class AuthorPaperDownloadView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, paper_id: int):
        _ensure_author(request.user)
        user_id = str(request.user.id)

        try:
            paper = Paper.objects.get(id=paper_id, added_by=user_id)
        except Paper.DoesNotExist:
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)

        file_path = paper.file
        if not file_path:
            return Response({"detail": "No file uploaded for this paper"}, status=status.HTTP_404_NOT_FOUND)

        from django.conf import settings
        import os
        if file_path.startswith('/'):
            file_path = file_path[1:]
        full_path = os.path.join(settings.BASE_DIR.parent, file_path)
        if not os.path.exists(full_path):
            return Response({"detail": "File not found on server"}, status=status.HTTP_404_NOT_FOUND)

        return FileResponse(open(full_path, 'rb'), as_attachment=True, filename=os.path.basename(full_path))


class AuthorPaperView(APIView):
    from api.auth import JWTQueryParamAuthentication
    authentication_classes = [JWTQueryParamAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, paper_id: int):
        _ensure_author(request.user)
        user_id = str(request.user.id)

        try:
            paper = Paper.objects.get(id=paper_id, added_by=user_id)
        except Paper.DoesNotExist:
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)

        file_path = paper.file
        if not file_path:
            return Response({"detail": "No file uploaded for this paper"}, status=status.HTTP_404_NOT_FOUND)

        from django.conf import settings
        import os
        import mimetypes
        if file_path.startswith('/'):
            file_path = file_path[1:]
        full_path = os.path.join(settings.BASE_DIR.parent, file_path)
        if not os.path.exists(full_path):
            return Response({"detail": "File not found on server"}, status=status.HTTP_404_NOT_FOUND)

        content_type, _ = mimetypes.guess_type(full_path)
        content_type = content_type or 'application/octet-stream'
        response = FileResponse(open(full_path, 'rb'), content_type=content_type)
        response['Content-Disposition'] = f'inline; filename="{os.path.basename(full_path)}"'
        response.xframe_options_exempt = True
        return response


class AuthorPaperTitlePageView(APIView):
    from api.auth import JWTQueryParamAuthentication
    authentication_classes = [JWTQueryParamAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, paper_id: int):
        _ensure_author(request.user)
        user_id = str(request.user.id)

        try:
            paper = Paper.objects.get(id=paper_id, added_by=user_id)
        except Paper.DoesNotExist:
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)

        file_path = paper.title_page
        if not file_path:
            return Response({"detail": "No title page uploaded for this paper"}, status=status.HTTP_404_NOT_FOUND)

        from django.conf import settings
        import os
        import mimetypes
        if file_path.startswith('/'):
            file_path = file_path[1:]
        full_path = os.path.join(settings.BASE_DIR.parent, file_path)
        if not os.path.exists(full_path):
            return Response({"detail": "File not found on server"}, status=status.HTTP_404_NOT_FOUND)

        content_type, _ = mimetypes.guess_type(full_path)
        content_type = content_type or 'application/octet-stream'
        response = FileResponse(open(full_path, 'rb'), content_type=content_type)
        response['Content-Disposition'] = f'inline; filename="{os.path.basename(full_path)}"'
        response.xframe_options_exempt = True
        return response


class AuthorPaperBlindedManuscriptView(APIView):
    from api.auth import JWTQueryParamAuthentication
    authentication_classes = [JWTQueryParamAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, paper_id: int):
        _ensure_author(request.user)
        user_id = str(request.user.id)

        try:
            paper = Paper.objects.get(id=paper_id, added_by=user_id)
        except Paper.DoesNotExist:
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)

        file_path = paper.blinded_manuscript
        if not file_path:
            return Response({"detail": "No blinded manuscript uploaded"}, status=status.HTTP_404_NOT_FOUND)

        from django.conf import settings
        import os
        import mimetypes
        if file_path.startswith('/'):
            file_path = file_path[1:]
        full_path = os.path.join(settings.BASE_DIR.parent, file_path)
        if not os.path.exists(full_path):
            return Response({"detail": "File not found on server"}, status=status.HTTP_404_NOT_FOUND)

        content_type, _ = mimetypes.guess_type(full_path)
        content_type = content_type or 'application/octet-stream'
        response = FileResponse(open(full_path, 'rb'), content_type=content_type)
        response['Content-Disposition'] = f'inline; filename="{os.path.basename(full_path)}"'
        response.xframe_options_exempt = True
        return response


class AuthorReviewReportView(APIView):
    from api.auth import JWTQueryParamAuthentication
    authentication_classes = [JWTQueryParamAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, paper_id: int, review_id: int):
        _ensure_author(request.user)
        user_id = str(request.user.id)

        try:
            Paper.objects.get(id=paper_id, added_by=user_id)
        except Paper.DoesNotExist:
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            review = ReviewSubmission.objects.get(id=review_id, paper_id=paper_id, status="submitted")
        except ReviewSubmission.DoesNotExist:
            return Response({"detail": "Review not found or not submitted"}, status=status.HTTP_404_NOT_FOUND)

        file_path = review.review_report_file
        if not file_path:
            return Response({"detail": "No report file attached to this review"}, status=status.HTTP_404_NOT_FOUND)

        from django.conf import settings
        import os
        if file_path.startswith('/'):
            file_path = file_path[1:]
        full_path = os.path.join(settings.BASE_DIR.parent, file_path)
        if not os.path.exists(full_path):
            return Response({"detail": "File not found on server"}, status=status.HTTP_404_NOT_FOUND)

        attachment = request.query_params.get("download", "false").lower() == "true"
        return FileResponse(open(full_path, 'rb'), as_attachment=attachment, filename=os.path.basename(full_path))


class AuthorRequestReviewersView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, paper_id: int):
        _ensure_author(request.user)
        user_id = str(request.user.id)
        
        try:
            paper = Paper.objects.get(id=paper_id, added_by=user_id)
        except Paper.DoesNotExist:
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)
            
        reviewers_data = request.data.get("reviewers", [])
        if not reviewers_data:
            return Response({"detail": "No reviewers provided"}, status=status.HTTP_400_BAD_REQUEST)
            
        from .models import Editor
        editors = Editor.objects.filter(journal_id=paper.journal).order_by('-role', 'id')
        
        recipient_emails = []
        for ed in editors[:3]:
            if ed.editor_email:
                recipient_emails.append(ed.editor_email)
                
        if not recipient_emails:
            recipient_emails = ["info@breakthroughpublishers.com"]
            
        suggestion_text = "\n\n".join([
            f"Name: {r.get('name', 'N/A')}\nEmail: {r.get('email', 'N/A')}\nAffiliation: {r.get('affiliation', 'N/A')}\nReason: {r.get('reason', 'N/A')}"
            for r in reviewers_data
        ])
        
        body = f"I would like to suggest the following reviewers for my paper (Code: {paper.paper_code}):\n\n{suggestion_text}"
        
        corr = PaperCorrespondence.objects.create(
            paper_id=paper_id,
            sender_id=int(user_id),
            sender_role='author',
            recipient_email=recipient_emails[0],
            recipient_name="Editorial Office",
            subject=f"Reviewer Suggestions for {paper.paper_code}",
            body=body,
            email_type="general",
            status_at_send=paper.status,
            is_read=False,
            delivery_status='pending',
            created_at=datetime.utcnow()
        )
        
        return Response({
            "success": True,
            "message": f"Successfully submitted {len(reviewers_data)} reviewer recommendations",
            "correspondence_id": corr.id
        }, status=status.HTTP_200_OK)

