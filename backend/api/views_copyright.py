"""
Copyright Form API endpoints for author copyright transfer workflow.
"""
from datetime import datetime, timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .models import CopyrightForm, Paper, Journal, User
from .auth import JWTAuthentication


def calculate_time_remaining(deadline):
    """Calculate human-readable time remaining until deadline"""
    if not deadline:
        return None
    
    now = datetime.now()
    # Handle timezone-aware datetime
    if hasattr(deadline, 'tzinfo') and deadline.tzinfo:
        from django.utils import timezone
        now = timezone.now()
    
    remaining = deadline - now
    
    if remaining.total_seconds() <= 0:
        return "Expired"
    
    hours = int(remaining.total_seconds() // 3600)
    minutes = int((remaining.total_seconds() % 3600) // 60)
    
    if hours > 24:
        days = hours // 24
        hours = hours % 24
        return f"{days}d {hours}h remaining"
    elif hours > 0:
        return f"{hours}h {minutes}m remaining"
    else:
        return f"{minutes}m remaining"


def format_form_response(form, paper=None, journal=None):
    """Convert CopyrightForm to response dict with paper details"""
    return {
        "id": form.id,
        "paper_id": form.paper_id,
        "author_id": form.author_id,
        "status": form.status,
        "deadline": form.deadline.isoformat() if form.deadline else None,
        "time_remaining": calculate_time_remaining(form.deadline),
        "reminder_count": form.reminder_count,
        "author_name": form.author_name,
        "author_affiliation": form.author_affiliation,
        "co_authors_consent": form.co_authors_consent,
        "copyright_agreed": form.copyright_agreed,
        "signature": form.signature,
        "signed_date": form.signed_date.isoformat() if form.signed_date else None,
        "original_work": form.original_work,
        "no_conflict": form.no_conflict,
        "rights_transfer": form.rights_transfer,
        "created_at": form.created_at.isoformat() if form.created_at else None,
        "completed_at": form.completed_at.isoformat() if form.completed_at else None,
        "paper_title": paper.title if paper else None,
        "paper_code": paper.paper_code if paper else None,
        "journal_name": journal.fld_journal_name if journal else None,
    }


class CopyrightPendingView(APIView):
    """
    GET /api/v1/copyright/pending
    
    Get all pending copyright forms for the current author.
    Returns list of pending copyright forms with paper details.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        user_id = user.id
        
        # Get all pending copyright forms for this author
        pending_forms = CopyrightForm.objects.filter(
            author_id=user_id,
            status="pending"
        )
        
        forms_response = []
        for form in pending_forms:
            paper = None
            journal = None
            
            try:
                paper = Paper.objects.get(id=form.paper_id)
                if paper.journal:
                    try:
                        journal = Journal.objects.get(fld_id=paper.journal)
                    except Journal.DoesNotExist:
                        pass
            except Paper.DoesNotExist:
                pass
            
            forms_response.append(format_form_response(form, paper, journal))
        
        return Response({
            "pending_count": len(forms_response),
            "forms": forms_response
        }, status=status.HTTP_200_OK)


class CopyrightDetailView(APIView):
    """
    GET /api/v1/copyright/{paper_id}
    
    Get copyright form details for a specific paper.
    Only the author of the paper can access this.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request, paper_id):
        user = request.user
        user_id = user.id
        
        # Find the copyright form
        try:
            form = CopyrightForm.objects.get(
                paper_id=paper_id,
                author_id=user_id
            )
        except CopyrightForm.DoesNotExist:
            return Response(
                {"detail": "Copyright form not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get paper and journal details
        paper = None
        journal = None
        
        try:
            paper = Paper.objects.get(id=paper_id)
            if paper.journal:
                try:
                    journal = Journal.objects.get(fld_id=paper.journal)
                except Journal.DoesNotExist:
                    pass
        except Paper.DoesNotExist:
            pass
        
        return Response(format_form_response(form, paper, journal), status=status.HTTP_200_OK)


class CopyrightSubmitView(APIView):
    """
    POST /api/v1/copyright/{paper_id}/submit
    
    Submit the copyright transfer form for a paper.
    All agreements must be accepted for successful submission.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request, paper_id):
        user = request.user
        user_id = user.id
        
        # Find the copyright form
        try:
            form = CopyrightForm.objects.get(
                paper_id=paper_id,
                author_id=user_id
            )
        except CopyrightForm.DoesNotExist:
            return Response(
                {"detail": "Copyright form not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if already submitted
        if form.status == "completed":
            return Response(
                {"detail": "Copyright form already submitted"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if expired
        if form.status == "expired":
            return Response(
                {"detail": "Copyright form deadline has expired"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check deadline
        if form.deadline:
            now = datetime.now()
            if hasattr(form.deadline, 'tzinfo') and form.deadline.tzinfo:
                from django.utils import timezone
                now = timezone.now()
            
            if form.deadline < now:
                form.status = "expired"
                form.save()
                return Response(
                    {"detail": "Copyright form deadline has expired"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Validate request data
        data = request.data
        required_fields = [
            'author_name', 'author_affiliation', 'co_authors_consent',
            'copyright_agreed', 'signature', 'original_work',
            'no_conflict', 'rights_transfer'
        ]
        
        for field in required_fields:
            if field not in data:
                return Response(
                    {"detail": f"Missing required field: {field}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Validate all agreements are True
        agreement_fields = [
            'co_authors_consent', 'copyright_agreed',
            'original_work', 'no_conflict', 'rights_transfer'
        ]
        
        for field in agreement_fields:
            if not data.get(field):
                return Response(
                    {"detail": "All agreements must be accepted to submit the copyright form"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Validate author_name and signature
        if not data.get('author_name', '').strip():
            return Response(
                {"detail": "Author name is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not data.get('signature', '').strip():
            return Response(
                {"detail": "Signature is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not data.get('author_affiliation', '').strip():
            return Response(
                {"detail": "Author affiliation is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update the form
        from django.utils import timezone
        now = timezone.now()
        
        form.author_name = data['author_name'].strip()
        form.author_affiliation = data['author_affiliation'].strip()
        form.co_authors_consent = data['co_authors_consent']
        form.copyright_agreed = data['copyright_agreed']
        form.signature = data['signature'].strip()
        form.signed_date = now
        form.original_work = data['original_work']
        form.no_conflict = data['no_conflict']
        form.rights_transfer = data['rights_transfer']
        form.status = "completed"
        form.completed_at = now
        form.save()
        
        # Get paper and journal for response
        paper = None
        journal = None
        
        try:
            paper = Paper.objects.get(id=paper_id)
            if paper.journal:
                try:
                    journal = Journal.objects.get(fld_id=paper.journal)
                except Journal.DoesNotExist:
                    pass
        except Paper.DoesNotExist:
            pass
        
        return Response(format_form_response(form, paper, journal), status=status.HTTP_200_OK)
