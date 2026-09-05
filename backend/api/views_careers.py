import json
import os
import re
from datetime import datetime

from django.conf import settings
from django.core.files.storage import default_storage
from django.db import transaction
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import JobApplication, JobPosting, InterviewInvitation
from .services.career_screening import screen_candidate_for_job
from .services.email_service import send_email

# A resume is a user-supplied file written to disk, so extension and size are
# both checked before anything is saved — the same rule the proposal
# attachments follow in views_books.py.
ALLOWED_RESUME_EXTENSIONS = {".pdf", ".doc", ".docx"}
MAX_RESUME_BYTES = 10 * 1024 * 1024  # 10 MB

RESUME_DIR = "careers/resumes"


def resume_url(request, application):
    """Absolute URL for a stored resume, or None when there is no file.

    Built server-side because the admin portal is served from a different
    origin than the API, so a relative /media/... path would 404 against the
    frontend. Rows written before the storage path was recorded hold a bare
    filename; those are resolved against the resume directory.
    """
    stored = (application.resume_file or "").strip()
    if not stored:
        return None
    path = stored if "/" in stored else f"{RESUME_DIR}/{stored}"
    return request.build_absolute_uri(f"/media/{path}")


class CareerJobsListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        jobs = JobPosting.objects.filter(is_active=True).order_by("-created_at")
        data = []
        for job in jobs:
            data.append({
                "id": job.id,
                "title": job.title,
                "slug": job.slug,
                "location": job.location,
                "employment_type": job.employment_type,
                "department": job.department,
                "experience_level": job.experience_level,
                "description": job.description,
                "responsibilities": job.responsibilities,
                "requirements": job.requirements,
                "required_skills": job.required_skills,
                "created_at": job.created_at.isoformat(),
            })
        return Response({"jobs": data}, status=status.HTTP_200_OK)


class CareerJobDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        job = JobPosting.objects.filter(slug=slug, is_active=True).first()
        if not job:
            return Response({"detail": "Job not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            "id": job.id,
            "title": job.title,
            "slug": job.slug,
            "location": job.location,
            "employment_type": job.employment_type,
            "department": job.department,
            "experience_level": job.experience_level,
            "description": job.description,
            "responsibilities": job.responsibilities,
            "requirements": job.requirements,
            "required_skills": job.required_skills,
            "created_at": job.created_at.isoformat(),
        }, status=status.HTTP_200_OK)


class JobApplicationCreateView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        job_id = request.data.get("job_id")
        job = JobPosting.objects.filter(id=job_id, is_active=True).first()
        if not job:
            return Response({"detail": "Job not found"}, status=status.HTTP_404_NOT_FOUND)

        candidate_name = (request.data.get("candidate_name") or "").strip()
        email = (request.data.get("email") or "").strip()
        phone = (request.data.get("phone") or "").strip()
        cover_letter = (request.data.get("cover_letter") or "").strip()
        portfolio_link = (request.data.get("portfolio_link") or "").strip()
        github_link = (request.data.get("github_link") or "").strip()
        linkedin_link = (request.data.get("linkedin_link") or "").strip()

        if not candidate_name or not email:
            return Response({"detail": "Candidate name and email are required"}, status=status.HTTP_400_BAD_REQUEST)

        resume_file = request.FILES.get("resume")
        resume_text = request.data.get("resume_text") or ""

        if not resume_file and not resume_text:
            return Response({"detail": "Resume is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Checked before the application row exists, so a rejected file cannot
        # leave an orphan record behind.
        if resume_file:
            extension = os.path.splitext(resume_file.name)[1].lower()
            if extension not in ALLOWED_RESUME_EXTENSIONS:
                return Response({
                    "detail": f"Invalid file type '{extension}'. Allowed: "
                              f"{', '.join(sorted(ALLOWED_RESUME_EXTENSIONS))}",
                }, status=status.HTTP_400_BAD_REQUEST)
            if resume_file.size > MAX_RESUME_BYTES:
                return Response({"detail": "Resume is larger than 10 MB."}, status=status.HTTP_400_BAD_REQUEST)

        extracted_resume_text = resume_text
        stored_resume_path = None
        if resume_file:
            # Storage may rename on collision, so keep what it actually wrote —
            # the original filename alone cannot locate the file again.
            stored_resume_path = default_storage.save(f"{RESUME_DIR}/{resume_file.name}", resume_file)
            extracted_resume_text = self._extract_resume_text(stored_resume_path, resume_file)

        screening = screen_candidate_for_job({
            "title": job.title,
            "required_skills": job.required_skills,
            "experience_level": job.experience_level,
        }, extracted_resume_text)

        application = JobApplication.objects.create(
            job=job,
            candidate_name=candidate_name,
            email=email,
            phone=phone,
            resume_file=stored_resume_path,
            resume_text=extracted_resume_text,
            cover_letter=cover_letter,
            portfolio_link=portfolio_link,
            github_link=github_link,
            linkedin_link=linkedin_link,
            ai_score=screening["score"],
            ai_summary=screening["summary"],
            matched_skills=screening["matched_skills"],
            missing_skills=screening["missing_skills"],
            screening_status="new",
        )

        return Response({
            "id": application.id,
            "job_id": job.id,
            "candidate_name": application.candidate_name,
            "email": application.email,
            "ai_score": application.ai_score,
            "ai_summary": application.ai_summary,
            "matched_skills": application.matched_skills,
            "missing_skills": application.missing_skills,
            "message": "Application submitted successfully",
        }, status=status.HTTP_201_CREATED)

    def _extract_resume_text(self, file_name, file_obj):
        file_extension = os.path.splitext(file_name)[1].lower()
        text = ""

        try:
            if file_extension == ".pdf":
                try:
                    import pypdf
                    pdf_path = default_storage.path(file_name)
                    reader = pypdf.PdfReader(pdf_path)
                    pages = []
                    for page in reader.pages:
                        pages.append(page.extract_text() or "")
                    text = "\n".join(pages)
                except Exception:
                    text = ""
            elif file_extension in [".doc", ".docx"]:
                try:
                    from docx import Document
                    file_path = default_storage.path(file_name)
                    doc = Document(file_path)
                    paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]
                    text = "\n".join(paragraphs)
                except Exception:
                    text = ""
            else:
                text = ""
        except Exception:
            text = ""

        if not text:
            return "Resume uploaded. Manual review required."
        return text


class AdminCareerJobsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user or (getattr(request.user, 'role', '') or '').lower() != 'admin':
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)

        jobs = JobPosting.objects.all().order_by("-created_at")
        result = []
        for job in jobs:
            result.append({
                "id": job.id,
                "title": job.title,
                "slug": job.slug,
                "location": job.location,
                "employment_type": job.employment_type,
                "department": job.department,
                "experience_level": job.experience_level,
                "is_active": job.is_active,
                "required_skills": job.required_skills,
                "application_count": job.applications.count(),
            })
        return Response({"jobs": result}, status=status.HTTP_200_OK)

    def post(self, request):
        if not request.user or (getattr(request.user, 'role', '') or '').lower() != 'admin':
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)

        title = (request.data.get("title") or "").strip()
        slug = (request.data.get("slug") or "").strip()
        description = (request.data.get("description") or "").strip()
        if not title or not description:
            return Response({"detail": "Title and description are required"}, status=status.HTTP_400_BAD_REQUEST)

        slug = slug or re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")

        job = JobPosting.objects.create(
            title=title,
            slug=slug,
            location=(request.data.get("location") or "").strip(),
            employment_type=(request.data.get("employment_type") or "full_time"),
            department=(request.data.get("department") or "").strip(),
            description=description,
            responsibilities=(request.data.get("responsibilities") or "").strip(),
            requirements=(request.data.get("requirements") or "").strip(),
            required_skills=request.data.get("required_skills") or [],
            experience_level=(request.data.get("experience_level") or "").strip(),
            is_active=request.data.get("is_active", True),
        )

        return Response({"id": job.id, "slug": job.slug, "message": "Job posting created successfully"}, status=status.HTTP_201_CREATED)


class AdminCareerApplicationsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user or (getattr(request.user, 'role', '') or '').lower() != 'admin':
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)

        applications = JobApplication.objects.select_related("job").all().order_by("-created_at")
        data = []
        for application in applications:
            data.append({
                "id": application.id,
                "job_id": application.job.id,
                "job_title": application.job.title,
                "candidate_name": application.candidate_name,
                "email": application.email,
                "phone": application.phone,
                "ai_score": application.ai_score,
                "ai_summary": application.ai_summary,
                "matched_skills": application.matched_skills,
                "missing_skills": application.missing_skills,
                "screening_status": application.screening_status,
                "has_resume": bool(application.resume_file),
                "created_at": application.created_at.isoformat(),
            })
        return Response({"applications": data}, status=status.HTTP_200_OK)


class AdminCareerApplicationDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, application_id):
        if not request.user or (getattr(request.user, 'role', '') or '').lower() != 'admin':
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)

        application = JobApplication.objects.select_related("job").filter(id=application_id).first()
        if not application:
            return Response({"detail": "Application not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            "id": application.id,
            "candidate_name": application.candidate_name,
            "email": application.email,
            "phone": application.phone,
            "portfolio_link": application.portfolio_link,
            "github_link": application.github_link,
            "linkedin_link": application.linkedin_link,
            "cover_letter": application.cover_letter,
            "resume_text": application.resume_text,
            "ai_score": application.ai_score,
            "ai_summary": application.ai_summary,
            "matched_skills": application.matched_skills,
            "missing_skills": application.missing_skills,
            "screening_status": application.screening_status,
            "resume_url": resume_url(request, application),
            "job": {
                "id": application.job.id,
                "title": application.job.title,
                "required_skills": application.job.required_skills,
            },
            "invitations": [
                {
                    "id": invitation.id,
                    "subject": invitation.subject,
                    "status": invitation.status,
                    "sent_at": invitation.sent_at.isoformat() if invitation.sent_at else None,
                }
                for invitation in application.interview_invitations.all()
            ],
            "created_at": application.created_at.isoformat(),
        }, status=status.HTTP_200_OK)

    def patch(self, request, application_id):
        if not request.user or (getattr(request.user, 'role', '') or '').lower() != 'admin':
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)

        application = JobApplication.objects.filter(id=application_id).first()
        if not application:
            return Response({"detail": "Application not found"}, status=status.HTTP_404_NOT_FOUND)

        status_value = request.data.get("screening_status")
        if status_value:
            valid_statuses = {choice for choice, _ in JobApplication.STATUS_CHOICES}
            if status_value not in valid_statuses:
                return Response({
                    "detail": f"Unknown status '{status_value}'. Allowed: {', '.join(sorted(valid_statuses))}",
                }, status=status.HTTP_400_BAD_REQUEST)
            application.screening_status = status_value
            application.save(update_fields=["screening_status", "updated_at"])

        return Response({"message": "Application updated successfully", "screening_status": application.screening_status}, status=status.HTTP_200_OK)


class AdminCareerSendInviteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, application_id):
        if not request.user or (getattr(request.user, 'role', '') or '').lower() != 'admin':
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)

        application = JobApplication.objects.select_related("job").filter(id=application_id).first()
        if not application:
            return Response({"detail": "Application not found"}, status=status.HTTP_404_NOT_FOUND)

        subject = (request.data.get("subject") or f"Interview Invitation for {application.job.title}").strip()
        body = (request.data.get("body") or "").strip()
        meeting_link = (request.data.get("meeting_link") or "").strip()
        test_link = (request.data.get("test_link") or "").strip()
        template_name = (request.data.get("template_name") or "Interview Invite").strip()

        if not subject or not body:
            return Response({"detail": "Subject and body are required"}, status=status.HTTP_400_BAD_REQUEST)

        final_body = body
        if meeting_link:
            final_body += f"\n\nInterview link: {meeting_link}"
        if test_link:
            final_body += f"\n\nAssessment link: {test_link}"

        success, error = send_email(
            recipient_email=application.email,
            subject=subject,
            plain_body=final_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
        )

        invitation = InterviewInvitation.objects.create(
            application=application,
            template_name=template_name,
            subject=subject,
            body=final_body,
            meeting_link=meeting_link,
            test_link=test_link,
            status="sent" if success else "failed",
            sent_at=timezone.now() if success else None,
        )

        if success:
            application.screening_status = "interview"
            application.save()
            return Response({
                "message": "Interview invitation sent successfully",
                "invitation_id": invitation.id,
                "status": "sent",
            }, status=status.HTTP_200_OK)

        return Response({"detail": error or "Failed to send interview invitation"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
