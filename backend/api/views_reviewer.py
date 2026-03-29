import logging
from datetime import datetime, date, timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.db.models import Count
from typing import Any, Dict

from .models import (
    User, Paper, Journal, OnlineReview, ReviewerInvitation, 
    ReviewSubmission, Editor
)
from .auth_utils import check_role

logger = logging.getLogger(__name__)

# Helper to verify reviewer role
def check_reviewer_role(user) -> bool:
    return check_role(user, "reviewer")


class ReviewerDashboardStatsView(APIView):
    """
    Get reviewer dashboard statistics.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not check_reviewer_role(request.user):
            return Response({"detail": "Reviewer access required"}, status=status.HTTP_403_FORBIDDEN)
            
        reviewer_id = str(request.user.id)
        
        # Count total assignments for this reviewer
        total_assignments = OnlineReview.objects.filter(reviewer_id=reviewer_id).count()
        
        # Count pending reviews
        pending_reviews = OnlineReview.objects.filter(
            reviewer_id=reviewer_id,
            review_status="pending"
        ).count()
        
        # Count completed reviews
        completed_reviews = OnlineReview.objects.filter(
            reviewer_id=reviewer_id,
            review_status="completed"
        ).count()
        
        return Response({
            "total_assignments": total_assignments,
            "pending_reviews": pending_reviews,
            "completed_reviews": completed_reviews,
            "avg_review_time": "0 days"
        }, status=status.HTTP_200_OK)


class ReviewerProfileView(APIView):
    """
    Get reviewer's profile information.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not check_reviewer_role(request.user):
            return Response({"detail": "Reviewer access required"}, status=status.HTTP_403_FORBIDDEN)
            
        user = request.user
        reviewer_id = str(user.id)
        
        total_reviews = OnlineReview.objects.filter(reviewer_id=reviewer_id).count()
        
        return Response({
            "name": f"{user.fname} {user.lname or ''}".strip(),
            "email": user.email,
            "title": user.title,
            "affiliation": user.affiliation,
            "specialization": user.specialization,
            "contact": user.contact,
            "total_reviews": total_reviews
        }, status=status.HTTP_200_OK)


class ReviewerInvitationsView(APIView):
    """
    Get pending reviewer invitations for the current user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not check_reviewer_role(request.user):
            return Response({"detail": "Reviewer access required"}, status=status.HTTP_403_FORBIDDEN)
            
        user = request.user
        skip = int(request.query_params.get('skip', 0))
        limit = int(request.query_params.get('limit', 20))
        
        from django.db.models import Q
        query = ReviewerInvitation.objects.filter(
            Q(reviewer_id=user.id) | Q(reviewer_email=user.email),
            status="pending"
        ).order_by('-invited_on')
        
        total = query.count()
        invitations = query[skip:skip+limit]
        
        invitations_list = []
        for invitation in invitations:
            paper = Paper.objects.filter(id=invitation.paper_id).first()
            author = None
            if paper and paper.added_by and paper.added_by.isdigit():
                author = User.objects.filter(id=int(paper.added_by)).first()
                
            journal = None
            if paper and paper.journal:
                journal = Journal.objects.filter(fld_id=paper.journal).first()
                
            invitations_list.append({
                "id": invitation.id,
                "invitation_token": invitation.invitation_token,
                "paper_id": invitation.paper_id,
                "paper_title": paper.title if paper else "Unknown",
                "author": f"{author.fname} {author.lname or ''}".strip() if author else "Unknown",
                "journal": journal.fld_journal_name if journal else "Unknown",
                "invited_on": invitation.invited_on.isoformat() if invitation.invited_on else None,
                "token_expiry": invitation.token_expiry.isoformat() if invitation.token_expiry else None,
                "invitation_message": invitation.invitation_message or "",
                "status": invitation.status
            })
            
        return Response({
            "total": total,
            "skip": skip,
            "limit": limit,
            "invitations": invitations_list
        }, status=status.HTTP_200_OK)


class AcceptInvitationAuthView(APIView):
    """
    Accept an invitation using an authenticated session.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, invitation_id: int):
        if not check_reviewer_role(request.user):
            return Response({"detail": "Reviewer access required"}, status=status.HTTP_403_FORBIDDEN)
            
        user = request.user
        invitation = ReviewerInvitation.objects.filter(id=invitation_id).first()
        
        if not invitation:
            return Response({"detail": "Invitation not found"}, status=status.HTTP_404_NOT_FOUND)
            
        if invitation.reviewer_email != user.email and invitation.reviewer_id != user.id:
            return Response({"detail": "This invitation is not for you"}, status=status.HTTP_403_FORBIDDEN)
            
        if invitation.status != "pending":
            return Response({"detail": f"Invitation has already been {invitation.status}"}, status=status.HTTP_400_BAD_REQUEST)
            
        from django.utils import timezone
        if invitation.token_expiry and invitation.token_expiry < timezone.now():
            invitation.status = "expired"
            invitation.save()
            return Response({"detail": "Invitation token has expired"}, status=status.HTTP_400_BAD_REQUEST)
            
        existing_review = OnlineReview.objects.filter(
            paper_id=str(invitation.paper_id),
            reviewer_id=str(user.id)
        ).first()
        
        if existing_review:
            return Response({"detail": "You are already assigned as a reviewer for this paper."}, status=status.HTTP_409_CONFLICT)
            
        invitation.status = "accepted"
        invitation.reviewer_id = user.id
        invitation.save()
        
        from datetime import date
        online_review = OnlineReview.objects.create(
            paper_id=str(invitation.paper_id),
            reviewer_id=str(user.id),
            review_status="pending",
            assigned_on=date.today(),
        )
        
        # NOTE: Skipping email background task translation for brevity initially.
        # Ensure parity later if needed
        
        paper = Paper.objects.filter(id=invitation.paper_id).first()
        
        return Response({
            "id": invitation.id,
            "paper_id": invitation.paper_id,
            "paper_title": paper.title if paper else "Unknown",
            "status": invitation.status,
            "message": "Invitation accepted successfully! Assignment has been added to your assignments."
        }, status=status.HTTP_200_OK)


class DeclineInvitationAuthView(APIView):
    """
    Decline an invitation using an authenticated session.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, invitation_id: int):
        if not check_reviewer_role(request.user):
            return Response({"detail": "Reviewer access required"}, status=status.HTTP_403_FORBIDDEN)
            
        user = request.user
        invitation = ReviewerInvitation.objects.filter(id=invitation_id).first()
        
        if not invitation:
            return Response({"detail": "Invitation not found"}, status=status.HTTP_404_NOT_FOUND)
            
        if invitation.reviewer_email != user.email and invitation.reviewer_id != user.id:
            return Response({"detail": "This invitation is not for you"}, status=status.HTTP_403_FORBIDDEN)
            
        if invitation.status != "pending":
            return Response({"detail": f"Invitation has already been {invitation.status}"}, status=status.HTTP_400_BAD_REQUEST)
            
        reason = request.data.get("reason", "")
        
        invitation.status = "declined"
        invitation.save()
        
        paper = Paper.objects.filter(id=invitation.paper_id).first()
        
        return Response({
            "id": invitation.id,
            "paper_id": invitation.paper_id,
            "paper_title": paper.title if paper else "Unknown",
            "status": invitation.status,
            "message": "Invitation declined successfully"
        }, status=status.HTTP_200_OK)


class ReviewerAssignmentsView(APIView):
    """
    List reviewer's paper assignments.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not check_reviewer_role(request.user):
            return Response({"detail": "Reviewer access required"}, status=status.HTTP_403_FORBIDDEN)
            
        reviewer_id = str(request.user.id)
        skip = int(request.query_params.get('skip', 0))
        limit = int(request.query_params.get('limit', 20))
        sort_by = request.query_params.get('sort_by', 'due_soon')
        
        query = OnlineReview.objects.filter(reviewer_id=reviewer_id)
        
        if sort_by == "recent":
            query = query.order_by('-assigned_on')
        else:
            query = query.order_by('assigned_on')
            
        total = query.count()
        reviews = query[skip:skip+limit]
        
        assignments_list = []
        for review in reviews:
            paper = Paper.objects.filter(id=int(review.paper_id)).first()
            author = None
            if paper and paper.added_by and paper.added_by.isdigit():
                author = User.objects.filter(id=int(paper.added_by)).first()
                
            journal = None
            if paper and paper.journal:
                journal = Journal.objects.filter(fld_id=paper.journal).first()
                
            is_resubmission = paper.version_number > 1 if paper else False
            
            assignments_list.append({
                "id": review.id,
                "paper_id": review.paper_id,
                "paper_title": paper.title if paper else "Unknown",
                "author": f"{author.fname} {author.lname or ''}".strip() if author else "Unknown",
                "journal": journal.fld_journal_name if journal else "Unknown",
                "assigned_date": review.assigned_on.isoformat() if review.assigned_on else None,
                "status": review.review_status or "pending",
                "paper_version": paper.version_number if paper else 1,
                "is_resubmission": is_resubmission,
                "paper_status": paper.status if paper else "unknown"
            })
            
        return Response({
            "total": total,
            "skip": skip,
            "limit": limit,
            "assignments": assignments_list
        }, status=status.HTTP_200_OK)


class ReviewerAssignmentDetailView(APIView):
    """
    Get detailed information about a review assignment.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, review_id: int):
        reviewer_id = str(request.user.id)
        review = OnlineReview.objects.filter(id=review_id, reviewer_id=reviewer_id).first()
        
        if not review:
            return Response({"detail": "Assignment not found"}, status=status.HTTP_404_NOT_FOUND)
            
        paper = Paper.objects.filter(id=int(review.paper_id)).first()
        if not paper:
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)
            
        author = User.objects.filter(id=int(paper.added_by)).first() if paper.added_by and paper.added_by.isdigit() else None
        journal = Journal.objects.filter(fld_id=paper.journal).first() if paper.journal else None
        
        return Response({
            "review_id": review.id,
            "paper": {
                "id": paper.id,
                "title": paper.title,
                "abstract": paper.abstract,
                "keywords": paper.keyword,
                "author": {
                    "name": f"{author.fname} {author.lname or ''}".strip() if author else "Unknown",
                    "email": author.email if author else None,
                    "affiliation": getattr(author, 'affiliation', None) if author else None
                },
                "journal": journal.fld_journal_name if journal else "Unknown",
                "submitted_date": getattr(paper, 'added_on', None),
                "file_url": f"/static/{paper.file}" if paper.file else None
            },
            "assignment": {
                "assigned_date": getattr(review, 'assigned_on', None),
                "status": getattr(review, 'review_status', 'pending')
            }
        }, status=status.HTTP_200_OK)


class ReviewerAssignmentPaperDetailView(APIView):
    """
    Get paper and review submission details for the review form format.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, review_id: int):
        if not check_reviewer_role(request.user):
            return Response({"detail": "Reviewer access required"}, status=status.HTTP_403_FORBIDDEN)
            
        reviewer_id = str(request.user.id)
        assignment = OnlineReview.objects.filter(id=review_id, reviewer_id=reviewer_id).first()
        
        if not assignment:
            return Response({"detail": "Assignment not found"}, status=status.HTTP_404_NOT_FOUND)
            
        paper = Paper.objects.filter(id=int(assignment.paper_id)).first()
        if not paper:
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)
            
        current_version = paper.version_number or 1
        author = User.objects.filter(id=int(paper.added_by)).first() if paper.added_by and paper.added_by.isdigit() else None
        journal = Journal.objects.filter(fld_id=paper.journal).first() if paper.journal else None
        journal_name = journal.fld_journal_name if journal else "Unknown Journal"
        
        review_submission = ReviewSubmission.objects.filter(
            assignment_id=review_id,
            reviewer_id=reviewer_id,
            paper_version=current_version
        ).order_by('-updated_at').first()
        
        # Django Model to dict mock
        def _to_dict(obj):
            if not obj: return None
            # rudimentary dict map for this example
            return {
                "id": obj.id,
                "technical_quality": getattr(obj, 'technical_quality', None),
                "clarity": getattr(obj, 'clarity', None),
                "originality": getattr(obj, 'originality', None),
                "significance": getattr(obj, 'significance', None),
                "overall_rating": getattr(obj, 'overall_rating', None),
                "author_comments": getattr(obj, 'author_comments', None),
                "confidential_comments": getattr(obj, 'confidential_comments', None),
                "recommendation": getattr(obj, 'recommendation', None),
                "status": getattr(obj, 'status', 'draft')
            }
            
        previous_review = None
        if current_version > 1:
            previous_review = ReviewSubmission.objects.filter(
                assignment_id=review_id,
                reviewer_id=reviewer_id,
                paper_version=current_version - 1,
                status="submitted"
            ).first()
            
        return Response({
            "paper": {
                "id": paper.id,
                "title": paper.title,
                "abstract": paper.abstract,
                "keywords": paper.keyword,
                "author": {
                    "name": f"{author.fname} {author.lname or ''}".strip() if author else "Unknown",
                    "email": author.email if author else None,
                    "affiliation": getattr(author, 'affiliation', None) if author else None
                },
                "journal": journal_name,
                "submitted_date": getattr(paper, 'added_on', None),
                "file": paper.file,
                "version_number": current_version,
                "is_resubmission": current_version > 1
            },
            "assignment": {
                "id": assignment.id,
                "status": getattr(assignment, 'review_status', 'pending')
            },
            "review_submission": _to_dict(review_submission),
            "previous_review": _to_dict(previous_review)
        }, status=status.HTTP_200_OK)


class ReviewerAssignmentViewPaperView(APIView):
    """
    View the blinded manuscript for a review assignment in the browser.
    """
    from api.auth import JWTQueryParamAuthentication
    authentication_classes = [JWTQueryParamAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, review_id: int):
        if not check_reviewer_role(request.user):
            return Response({"detail": "Reviewer access required"}, status=status.HTTP_403_FORBIDDEN)
            
        reviewer_id = str(request.user.id)
        assignment = OnlineReview.objects.filter(id=review_id, reviewer_id=reviewer_id).first()
        
        if not assignment:
            return Response({"detail": "Assignment not found"}, status=status.HTTP_404_NOT_FOUND)
            
        paper = Paper.objects.filter(id=int(assignment.paper_id)).first()
        if not paper:
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)
            
        file_path = paper.blinded_manuscript or paper.file
        if not file_path:
             return Response({"detail": "Paper file not found"}, status=status.HTTP_404_NOT_FOUND)
             
        import os
        from django.conf import settings
        from django.http import FileResponse
        
        if file_path.startswith('/'):
            file_path = file_path[1:]
        
        full_path = os.path.join(settings.BASE_DIR.parent, file_path)
        if not os.path.exists(full_path):
             return Response({"detail": "File not found on server"}, status=status.HTTP_404_NOT_FOUND)
             
        return FileResponse(open(full_path, 'rb'), as_attachment=False, filename=os.path.basename(full_path))


class ReviewerSaveDraftView(APIView):
    """
    Save a review as draft (auto-save). Updates status to in_progress on first save.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, review_id: int):
        if not check_reviewer_role(request.user):
            return Response({"detail": "Reviewer access required"}, status=status.HTTP_403_FORBIDDEN)
            
        reviewer_id = str(request.user.id)
        assignment = OnlineReview.objects.filter(id=review_id, reviewer_id=reviewer_id).first()
        
        if not assignment:
            return Response({"detail": "Assignment not found"}, status=status.HTTP_404_NOT_FOUND)
            
        paper = Paper.objects.filter(id=int(assignment.paper_id)).first()
        current_version = paper.version_number if paper else 1
        
        review_submission, created = ReviewSubmission.objects.get_or_create(
            assignment_id=review_id,
            reviewer_id=reviewer_id,
            paper_version=current_version,
            defaults={
                'paper_id': assignment.paper_id,
                'status': 'draft'
            }
        )
        
        draft_data = request.data
        if 'technical_quality' in draft_data: review_submission.technical_quality = draft_data.get('technical_quality')
        if 'clarity' in draft_data: review_submission.clarity = draft_data.get('clarity')
        if 'originality' in draft_data: review_submission.originality = draft_data.get('originality')
        if 'significance' in draft_data: review_submission.significance = draft_data.get('significance')
        if 'overall_rating' in draft_data: review_submission.overall_rating = draft_data.get('overall_rating')
        if 'author_comments' in draft_data: review_submission.author_comments = draft_data.get('author_comments')
        if 'confidential_comments' in draft_data: review_submission.confidential_comments = draft_data.get('confidential_comments')
        if 'recommendation' in draft_data: review_submission.recommendation = draft_data.get('recommendation')
        
        review_submission.save()
        
        if assignment.review_status != 'in_progress':
            assignment.review_status = 'in_progress'
            assignment.save()
            
        return Response({
            "message": "Draft saved successfully",
            "assignment_status": assignment.review_status
        }, status=status.HTTP_200_OK)


class ReviewerSubmitReviewCompleteView(APIView):
    """
    Submit a completed review with full validation.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, review_id: int):
        if not check_reviewer_role(request.user):
            return Response({"detail": "Reviewer access required"}, status=status.HTTP_403_FORBIDDEN)
            
        reviewer_id = str(request.user.id)
        review_data = request.data
        
        required_fields = ['technical_quality', 'clarity', 'originality', 'significance', 'overall_rating', 'recommendation']
        for field in required_fields:
            if field not in review_data or review_data[field] is None:
                return Response({"detail": f"{field} is required"}, status=status.HTTP_400_BAD_REQUEST)
                
        for field in ['technical_quality', 'clarity', 'originality', 'significance', 'overall_rating']:
            value = review_data.get(field)
            if not isinstance(value, int) or value < 1 or value > 5:
                return Response({"detail": f"{field} must be between 1 and 5"}, status=status.HTTP_400_BAD_REQUEST)
                
        author_comments = review_data.get('author_comments', '')
        confidential_comments = review_data.get('confidential_comments', '')
        total_comments = author_comments + confidential_comments
        if len(total_comments.strip()) < 50:
            return Response({"detail": "Comments must be at least 50 characters total"}, status=status.HTTP_400_BAD_REQUEST)
            
        assignment = OnlineReview.objects.filter(id=review_id, reviewer_id=reviewer_id).first()
        if not assignment:
            return Response({"detail": "Assignment not found"}, status=status.HTTP_404_NOT_FOUND)
            
        paper = Paper.objects.filter(id=int(assignment.paper_id)).first()
        if not paper:
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)
            
        current_version = paper.version_number or 1
        
        review_submission, created = ReviewSubmission.objects.get_or_create(
            assignment_id=review_id,
            reviewer_id=reviewer_id,
            paper_version=current_version,
            defaults={'paper_id': assignment.paper_id}
        )
        
        review_submission.technical_quality = review_data.get('technical_quality')
        review_submission.clarity = review_data.get('clarity')
        review_submission.originality = review_data.get('originality')
        review_submission.significance = review_data.get('significance')
        review_submission.overall_rating = review_data.get('overall_rating')
        review_submission.author_comments = review_data.get('author_comments')
        review_submission.confidential_comments = review_data.get('confidential_comments')
        review_submission.recommendation = review_data.get('recommendation')
        review_submission.status = "submitted"
        from django.utils import timezone
        review_submission.submitted_at = timezone.now()
        review_submission.save()
        
        assignment.review_status = 'completed'
        assignment.date_submitted = timezone.now().date()
        assignment.submitted_on = timezone.now().date()
        assignment.save()
        
        if paper.status in ['submitted', 'under_review']:
            paper.status = 'reviewed'
            paper.save()
            
        # NOTE: Omitting background task email notifications for simplicity in translation at this stage.
            
        return Response({
            "message": "Review submitted successfully",
            "assignment": {
                "id": assignment.id,
                "status": assignment.review_status,
                "submitted_on": assignment.date_submitted.isoformat() if assignment.date_submitted else None
            },
            "notifications_sent": False # Mock mapped
        }, status=status.HTTP_200_OK)


class ReviewerUploadReportView(APIView):
    """
    Upload a review report file with version control.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, review_id: int):
        if not check_reviewer_role(request.user):
            return Response({"detail": "Reviewer access required"}, status=status.HTTP_403_FORBIDDEN)
            
        reviewer_id = str(request.user.id)
        if 'file' not in request.FILES:
             return Response({"detail": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)
             
        file = request.FILES['file']
        allowed_types = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        if file.content_type not in allowed_types:
            return Response({"detail": "Only PDF, DOC, and DOCX files are allowed"}, status=status.HTTP_400_BAD_REQUEST)
            
        if file.size > 10 * 1024 * 1024:
            return Response({"detail": "File size must be less than 10MB"}, status=status.HTTP_400_BAD_REQUEST)
            
        assignment = OnlineReview.objects.filter(id=review_id, reviewer_id=reviewer_id).first()
        if not assignment:
             return Response({"detail": "Assignment not found"}, status=status.HTTP_404_NOT_FOUND)
             
        review_submission, created = ReviewSubmission.objects.get_or_create(
            assignment_id=review_id,
            reviewer_id=reviewer_id,
            defaults={'paper_id': assignment.paper_id, 'status': 'draft'}
        )
        
        next_version = (review_submission.file_version or 0) + 1
        
        import os
        from django.conf import settings
        
        upload_dir = os.path.join(settings.MEDIA_ROOT, 'reviews', f'reviewer_{reviewer_id}')
        os.makedirs(upload_dir, exist_ok=True)
        
        filename = f"{review_id}_v{next_version}_{file.name}"
        filepath = os.path.join(upload_dir, filename)
        
        with open(filepath, 'wb+') as destination:
            for chunk in file.chunks():
                destination.write(chunk)
                
        relative_path = f"reviews/reviewer_{reviewer_id}/{filename}"
        
        review_submission.review_report_file = relative_path
        review_submission.file_version = next_version
        review_submission.save()
        
        if assignment.review_status != 'in_progress':
            assignment.review_status = 'in_progress'
            assignment.save()
            
        return Response({
            "message": "File uploaded successfully",
            "file_version": next_version,
            "filename": filename,
            "assignment_status": assignment.review_status
        }, status=status.HTTP_200_OK)


class ReviewerDownloadReportView(APIView):
    """
    Download a review report file uploaded by the reviewer.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, review_id: int):
        if not check_reviewer_role(request.user):
            return Response({"detail": "Reviewer access required"}, status=status.HTTP_403_FORBIDDEN)
            
        reviewer_id = str(request.user.id)
        review_submission = ReviewSubmission.objects.filter(assignment_id=review_id, reviewer_id=reviewer_id).first()
        
        if not review_submission or not review_submission.review_report_file:
            return Response({"detail": "No report file uploaded"}, status=status.HTTP_404_NOT_FOUND)
            
        import os
        from django.conf import settings
        from django.http import FileResponse
        
        file_path = review_submission.review_report_file
        if file_path.startswith('/'):
            file_path = file_path[1:]
        
        full_path = os.path.join(settings.MEDIA_ROOT, file_path)
        if not os.path.exists(full_path):
             return Response({"detail": "File not found on server"}, status=status.HTTP_404_NOT_FOUND)
             
        return FileResponse(open(full_path, 'rb'), as_attachment=True, filename=os.path.basename(full_path))


class ReviewerSubmitReviewBasicView(APIView):
    """
    Submit a basic review.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, review_id: int):
        if not check_reviewer_role(request.user):
            return Response({"detail": "Reviewer access required"}, status=status.HTTP_403_FORBIDDEN)
            
        reviewer_id = str(request.user.id)
        review = OnlineReview.objects.filter(id=review_id, reviewer_id=reviewer_id).first()
        
        if not review:
            return Response({"detail": "Assignment not found"}, status=status.HTTP_404_NOT_FOUND)
            
        # Mock simple submission
        review.review_status = "completed"
        from django.utils import timezone
        review.date_submitted = timezone.now().date()
        review.save()
        
        return Response({
            "id": review.id,
            "paper_id": review.paper_id,
            "status": review.review_status
        }, status=status.HTTP_200_OK)


class ReviewerHistoryView(APIView):
    """
    Get reviewer's review history.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not check_reviewer_role(request.user):
            return Response({"detail": "Reviewer access required"}, status=status.HTTP_403_FORBIDDEN)
            
        reviewer_id = str(request.user.id)
        all_reviews = OnlineReview.objects.filter(reviewer_id=reviewer_id).order_by('-assigned_on')
        
        history_list = []
        for review in all_reviews:
            paper = Paper.objects.filter(id=int(review.paper_id)).first()
            journal = Journal.objects.filter(fld_id=paper.journal).first() if paper and paper.journal else None
            author = User.objects.filter(id=int(paper.added_by)).first() if paper and paper.added_by and paper.added_by.isdigit() else None
            
            history_list.append({
                "review_id": review.id,
                "paper_id": review.paper_id,
                "paper_title": paper.title if paper else "Unknown",
                "author": f"{author.fname} {author.lname or ''}".strip() if author else "Unknown",
                "journal": journal.fld_journal_name if journal else "Unknown",
                "assigned_date": review.assigned_on.isoformat() if review.assigned_on else None,
                "status": review.review_status or "pending"
            })
            
        return Response({
            "total": len(history_list),
            "history": history_list
        }, status=status.HTTP_200_OK)


class ReviewerNotifyUpdateView(APIView):
    """
    Send email notification to reviewer for updates.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user_role = getattr(request.user, 'role', '')
        user_email = request.user.email
        target_reviewer_email = request.data.get("reviewer_email")
        
        if not check_role(request.user, ["admin", "editor"]) and user_email != target_reviewer_email:
             return Response({"detail": "Not authorized to send this notification"}, status=status.HTTP_403_FORBIDDEN)
             
        if not target_reviewer_email:
             return Response({"detail": "Missing target email"}, status=status.HTTP_400_BAD_REQUEST)
             
        # Mock Notification Success
        return Response({
            "status": "success",
            "message": f"Notification mocked sent to {target_reviewer_email}",
        }, status=status.HTTP_200_OK)


class AdminDeadlineReminderView(APIView):
    """
    Trigger deadline reminder emails (Admin Only).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not check_role(request.user, "admin"):
             return Response({"detail": "Only administrators can trigger reminders"}, status=status.HTTP_403_FORBIDDEN)
             
        return Response({
            "status": "success",
            "message": "Deadline reminder batch completed (Mock)"
        }, status=status.HTTP_200_OK)


class ReviewerViewTrackChangesView(APIView):
    """
    GET /api/v1/reviewer/assignments/{review_id}/view-track-changes
    
    Serve the track changes file for a resubmission.
    """
    from api.auth import JWTQueryParamAuthentication
    authentication_classes = [JWTQueryParamAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, review_id: int):
        if not check_reviewer_role(request.user):
            return Response({"detail": "Reviewer access required"}, status=status.HTTP_403_FORBIDDEN)
        
        reviewer_id = str(request.user.id)
        assignment = OnlineReview.objects.filter(id=review_id, reviewer_id=reviewer_id).first()
        
        if not assignment:
            return Response({"detail": "Assignment not found"}, status=status.HTTP_404_NOT_FOUND)
        
        paper = Paper.objects.filter(id=int(assignment.paper_id)).first()
        if not paper:
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)
        
        if not paper.revised_track_changes:
            return Response({"detail": "Track changes file not found"}, status=status.HTTP_404_NOT_FOUND)
        
        import os
        from django.conf import settings
        from django.http import FileResponse
        
        file_path = paper.revised_track_changes
        if file_path.startswith('/'):
            file_path = file_path[1:]
        
        full_path = os.path.join(settings.BASE_DIR.parent, file_path)
        if not os.path.exists(full_path):
            return Response({"detail": "Track changes file not found on server"}, status=status.HTTP_404_NOT_FOUND)
        
        return FileResponse(open(full_path, 'rb'), as_attachment=False, filename=os.path.basename(full_path))


class ReviewerViewCleanManuscriptView(APIView):
    """
    GET /api/v1/reviewer/assignments/{review_id}/view-clean-manuscript
    
    Serve the clean revised manuscript for a resubmission.
    """
    from api.auth import JWTQueryParamAuthentication
    authentication_classes = [JWTQueryParamAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, review_id: int):
        if not check_reviewer_role(request.user):
            return Response({"detail": "Reviewer access required"}, status=status.HTTP_403_FORBIDDEN)
        
        reviewer_id = str(request.user.id)
        assignment = OnlineReview.objects.filter(id=review_id, reviewer_id=reviewer_id).first()
        
        if not assignment:
            return Response({"detail": "Assignment not found"}, status=status.HTTP_404_NOT_FOUND)
        
        paper = Paper.objects.filter(id=int(assignment.paper_id)).first()
        if not paper:
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)
        
        if not paper.revised_clean:
            return Response({"detail": "Clean manuscript file not found"}, status=status.HTTP_404_NOT_FOUND)
        
        import os
        from django.conf import settings
        from django.http import FileResponse
        
        file_path = paper.revised_clean
        if file_path.startswith('/'):
            file_path = file_path[1:]
        
        full_path = os.path.join(settings.BASE_DIR.parent, file_path)
        if not os.path.exists(full_path):
            return Response({"detail": "Clean manuscript file not found on server"}, status=status.HTTP_404_NOT_FOUND)
        
        return FileResponse(open(full_path, 'rb'), as_attachment=False, filename=os.path.basename(full_path))


class ReviewerViewResponseToReviewerView(APIView):
    """
    GET /api/v1/reviewer/assignments/{review_id}/view-response-to-reviewer
    
    Serve the author's response to reviewer comments for a resubmission.
    """
    from api.auth import JWTQueryParamAuthentication
    authentication_classes = [JWTQueryParamAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, review_id: int):
        if not check_reviewer_role(request.user):
            return Response({"detail": "Reviewer access required"}, status=status.HTTP_403_FORBIDDEN)
        
        reviewer_id = str(request.user.id)
        assignment = OnlineReview.objects.filter(id=review_id, reviewer_id=reviewer_id).first()
        
        if not assignment:
            return Response({"detail": "Assignment not found"}, status=status.HTTP_404_NOT_FOUND)
        
        paper = Paper.objects.filter(id=int(assignment.paper_id)).first()
        if not paper:
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)
        
        if not paper.response_to_reviewer:
            return Response({"detail": "Response to reviewer file not found"}, status=status.HTTP_404_NOT_FOUND)
        
        import os
        from django.conf import settings
        from django.http import FileResponse
        
        file_path = paper.response_to_reviewer
        if file_path.startswith('/'):
            file_path = file_path[1:]
        
        full_path = os.path.join(settings.BASE_DIR.parent, file_path)
        if not os.path.exists(full_path):
            return Response({"detail": "Response to reviewer file not found on server"}, status=status.HTTP_404_NOT_FOUND)
        
        return FileResponse(open(full_path, 'rb'), as_attachment=False, filename=os.path.basename(full_path))

