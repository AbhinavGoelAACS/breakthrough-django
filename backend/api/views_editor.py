from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Count, Q

from .models import User, Paper, OnlineReview, ReviewerInvitation, Journal, ReviewSubmission, PaperPublished, UserRole, Editor, PaperVersion, CopyrightForm


def _is_admin(user):
    return (getattr(user, 'role', '') or '').lower() == 'admin'


def check_editor_role(user):
    if _is_admin(user):
        return True
    if (user.role or '').lower() == 'editor':
        return True
    if UserRole.objects.filter(user=user, role="editor", status="approved").exists():
        return True
    return False

def get_editor_journal_ids(user):
    if _is_admin(user):
        return list(Journal.objects.values_list('fld_id', flat=True))
    return list(UserRole.objects.filter(
        user=user, 
        role="editor", 
        status="approved", 
        journal_id__isnull=False
    ).values_list('journal_id', flat=True).distinct())

def get_editor_journal_info(user):
    if _is_admin(user):
        journals = Journal.objects.all()
        return [
            {
                "journal_id": j.fld_id,
                "journal_name": j.fld_journal_name,
                "short_form": j.short_form,
                "editor_type": "chief_editor",
                "description": j.description,
                "issn_online": j.issn_ol,
                "issn_print": j.issn_prt,
                "chief_editor": j.cheif_editor,
                "journal_logo": j.journal_logo
            } for j in journals
        ]
        
    user_roles = UserRole.objects.filter(
        user=user,
        role="editor",
        status="approved",
        journal_id__isnull=False
    )
    
    seen_ids = set()
    journals_info = []
    
    for ur in user_roles:
        jid = ur.journal_id
        if jid in seen_ids:
            continue
        seen_ids.add(jid)
        
        j = Journal.objects.filter(fld_id=jid).first()
        if j:
            journals_info.append({
                "journal_id": j.fld_id,
                "journal_name": j.fld_journal_name,
                "short_form": j.short_form,
                "editor_type": ur.editor_type or "section_editor",
                "user_role_id": ur.id,
                "description": j.description,
                "issn_online": j.issn_ol,
                "issn_print": j.issn_prt,
                "chief_editor": j.cheif_editor,
                "journal_logo": j.journal_logo
            })
    return journals_info

class MyJournalsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not check_editor_role(request.user):
            return Response({"detail": "Editor access required"}, status=status.HTTP_403_FORBIDDEN)
            
        journals = get_editor_journal_info(request.user)
        
        if not journals:
            return Response({"message": "No journals assigned to this editor", "journals": []})
            
        for journal in journals:
            journal_id = journal["journal_id"]
            total_papers = Paper.objects.filter(journal=journal_id).count()
            pending_papers = Paper.objects.filter(journal=journal_id, status="submitted").count()
            under_review = Paper.objects.filter(journal=journal_id, status="under_review").count()
            
            journal["paper_stats"] = {
                "total": total_papers,
                "pending": pending_papers,
                "under_review": under_review
            }
            
        return Response({
            "total": len(journals),
            "journals": journals
        }, status=status.HTTP_200_OK)


class EditorJournalDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, journal_id):
        if not check_editor_role(request.user):
            return Response({"detail": "Editor access required"}, status=status.HTTP_403_FORBIDDEN)
            
        allowed_journals = get_editor_journal_ids(request.user)
        if journal_id not in allowed_journals:
            return Response({"detail": "You don't have access to edit this journal"}, status=status.HTTP_403_FORBIDDEN)
            
        ur = UserRole.objects.filter(user=request.user, journal_id=journal_id, role="editor", status="approved").first()
        is_chief_editor = ur and ur.editor_type == "chief_editor"
        if _is_admin(request.user):
            is_chief_editor = True
            
        journal = Journal.objects.filter(fld_id=journal_id).first()
        if not journal:
            return Response({"detail": "Journal not found"}, status=status.HTTP_404_NOT_FOUND)
            
        data = request.data
        if "description" in data:
            journal.description = data["description"]
        if "co_editor" in data:
            journal.co_editor = data["co_editor"]
        if "journal_logo" in data:
            journal.journal_logo = data["journal_logo"]
        if "guidelines" in data:
            journal.guidelines = data["guidelines"]
            
        if is_chief_editor:
            if "fld_journal_name" in data:
                journal.fld_journal_name = data["fld_journal_name"]
            if "freq" in data:
                journal.freq = data["freq"]
            if "issn_ol" in data:
                journal.issn_ol = data["issn_ol"]
            if "issn_prt" in data:
                journal.issn_prt = data["issn_prt"]
            if "cheif_editor" in data:
                journal.cheif_editor = data["cheif_editor"]
        else:
            restricted_keys = ["fld_journal_name", "freq", "issn_ol", "issn_prt", "cheif_editor"]
            if any(k in data for k in restricted_keys):
                return Response({
                    "detail": "Section editors cannot update journal name, frequency, ISSN, or chief editor fields"
                }, status=status.HTTP_403_FORBIDDEN)
                
        journal.save()
        
        return Response({
            "id": journal.fld_id,
            "name": journal.fld_journal_name,
            "description": journal.description,
            "co_editor": journal.co_editor,
            "journal_logo": journal.journal_logo,
            "guidelines": journal.guidelines,
            "frequency": journal.freq,
            "issn_online": journal.issn_ol,
            "issn_print": journal.issn_prt,
            "chief_editor": journal.cheif_editor,
            "short_form": journal.short_form,
            "editor_type": ur.editor_type if ur else "chief_editor",
            "message": "Journal updated successfully"
        }, status=status.HTTP_200_OK)


class EditorDashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not check_editor_role(request.user):
            return Response({"detail": "Editor access required"}, status=status.HTTP_403_FORBIDDEN)
            
        allowed_journals = get_editor_journal_ids(request.user)
        
        if not allowed_journals:
            return Response({
                "total_papers": 0,
                "pending_review": 0,
                "under_review": 0,
                "ready_publish": 0,
                "journals_access": []
            }, status=status.HTTP_200_OK)
            
        base_query = Paper.objects.filter(journal__in=allowed_journals)
        
        total_papers = base_query.count()
        pending_review = base_query.filter(status="submitted").count()
        under_review = base_query.filter(status="under_review").count()
        ready_publish = base_query.filter(status="accepted").count()
        
        return Response({
            "total_papers": total_papers,
            "pending_review": pending_review,
            "under_review": under_review,
            "ready_publish": ready_publish,
            "journals_access": allowed_journals
        }, status=status.HTTP_200_OK)


class EditorPendingActionsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not check_editor_role(request.user):
            return Response({"detail": "Editor access required"}, status=status.HTTP_403_FORBIDDEN)
            
        allowed_journals = get_editor_journal_ids(request.user)
        base_query = Paper.objects.filter(journal__in=allowed_journals) if allowed_journals else Paper.objects.none()
        
        pending_assignments = base_query.filter(status="submitted").count()
        
        # Papers under review
        overdue_reviews = base_query.filter(status="under_review").count() 
        ready_for_publication = base_query.filter(status="accepted").count()
        
        return Response({
            "pending_assignments": pending_assignments,
            "assigned_reviews": overdue_reviews,
            "ready_for_publication": ready_for_publication
        }, status=status.HTTP_200_OK)


class EditorPaperQueueView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not check_editor_role(request.user):
            return Response({"detail": "Editor access required"}, status=status.HTTP_403_FORBIDDEN)
            
        allowed_journals = get_editor_journal_ids(request.user)
        if not allowed_journals:
            return Response({"total": 0, "skip": 0, "limit": 20, "papers": []}, status=status.HTTP_200_OK)
            
        skip = int(request.query_params.get("skip", 0))
        limit = int(request.query_params.get("limit", 20))
        status_filter = request.query_params.get("status_filter")
        journal_id = request.query_params.get("journal_id")
        
        if journal_id:
            journal_id = int(journal_id)
            if not _is_admin(request.user) and journal_id not in allowed_journals:
                return Response({"detail": f"You don't have access to journal {journal_id}"}, status=status.HTTP_403_FORBIDDEN)
                
        base_query = Paper.objects.all()
        if journal_id:
            base_query = base_query.filter(journal=journal_id)
        elif not _is_admin(request.user):
            base_query = base_query.filter(journal__in=allowed_journals)
            
        if status_filter:
            base_query = base_query.filter(status=status_filter)
            
        total = base_query.count()
        papers = base_query.order_by("-added_on")[skip:skip+limit]
        
        papers_list = []
        for paper in papers:
            journal_name = Journal.objects.filter(fld_id=paper.journal).values_list('fld_journal_name', flat=True).first() if paper.journal else "Unknown"
            
            author_name = paper.author or "Unknown"
            author_email = None
            if paper.added_by and paper.added_by.isdigit():
                author = User.objects.filter(id=int(paper.added_by)).first()
                if author:
                    author_name = f"{author.fname} {author.lname or ''}".strip()
                    author_email = author.email
                    
            # Review stats
            total_invitations = ReviewerInvitation.objects.filter(paper_id=paper.id).count()
            accepted_invitations = ReviewerInvitation.objects.filter(paper_id=paper.id, status="accepted").count()
            legacy_assignments = OnlineReview.objects.filter(paper_id=str(paper.id)).count()
            completed_reviews = ReviewSubmission.objects.filter(paper_id=paper.id, status="submitted").count()
            
            if total_invitations == 0 and legacy_assignments == 0:
                review_status = "not_assigned"
            elif accepted_invitations == 0 and legacy_assignments == 0:
                review_status = "invited"
            elif completed_reviews == 0:
                review_status = "pending"
            elif completed_reviews < accepted_invitations or completed_reviews < legacy_assignments:
                review_status = "partial"
            else:
                review_status = "reviewed"
                
            papers_list.append({
                "id": paper.id,
                "paper_code": paper.paper_code,
                "title": paper.title,
                "abstract": paper.abstract,
                "keywords": paper.keyword,
                "author": author_name,
                "author_email": author_email,
                "journal": journal_name,
                "journal_id": paper.journal,
                "submitted_date": paper.added_on.isoformat() if paper.added_on else None,
                "status": paper.status,
                "file": paper.file,
                "review_status": review_status,
                "total_invitations": total_invitations,
                "accepted_invitations": accepted_invitations,
                "total_reviewers": max(total_invitations, legacy_assignments),
                "completed_reviews": completed_reviews,
                "version_number": paper.version_number,
                "revision_count": paper.revision_count,
                "research_area": paper.research_area
            })
            
        return Response({
            "total": total,
            "skip": skip,
            "limit": limit,
            "papers": papers_list
        }, status=status.HTTP_200_OK)


class EditorPapersPendingDecisionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not check_editor_role(request.user):
            return Response({"detail": "Editor access required"}, status=status.HTTP_403_FORBIDDEN)
            
        allowed_journals = get_editor_journal_ids(request.user)
        if not allowed_journals:
            return Response({"papers": [], "total": 0, "skip": 0, "limit": 20}, status=status.HTTP_200_OK)
            
        skip = int(request.query_params.get("skip", 0))
        limit = int(request.query_params.get("limit", 20))
        
        base_query = Paper.objects.filter(
            status__in=["under_review", "correction", "resubmitted"],
            journal__in=allowed_journals
        )
        
        total = base_query.count()
        papers = base_query.order_by("-added_on")[skip:skip+limit]
        
        papers_with_reviews = []
        for paper in papers:
            journal_name = Journal.objects.filter(fld_id=paper.journal).values_list('fld_journal_name', flat=True).first() if paper.journal else "Unknown"
            
            author_name = paper.author or "Unknown"
            if paper.added_by and paper.added_by.isdigit():
                author = User.objects.filter(id=int(paper.added_by)).first()
                if author:
                    author_name = f"{author.fname} {author.lname or ''}".strip()
                    
            papers_with_reviews.append({
                "id": paper.id,
                "title": paper.title,
                "author": author_name,
                "journal": journal_name,
                "status": paper.status,
                "submitted_date": paper.added_on.isoformat() if paper.added_on else None,
                "added_by": paper.added_by
            })
            
        return Response({
            "papers": papers_with_reviews,
            "total": total,
            "skip": skip,
            "limit": limit
        }, status=status.HTTP_200_OK)


class EditorPaperDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, paper_id):
        if not check_editor_role(request.user):
            return Response({"detail": "Editor access required"}, status=status.HTTP_403_FORBIDDEN)
            
        paper = Paper.objects.filter(id=paper_id).first()
        if not paper:
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)
            
        allowed_journals = get_editor_journal_ids(request.user)
        if not _is_admin(request.user) and (not allowed_journals or paper.journal not in allowed_journals):
            return Response({"detail": "You don't have access to papers from this journal"}, status=status.HTTP_403_FORBIDDEN)
            
        journal = Journal.objects.filter(fld_id=paper.journal).first() if paper.journal else None
        
        author = None
        if paper.added_by and paper.added_by.isdigit():
            author = User.objects.filter(id=int(paper.added_by)).first()
            
        # Simplified review stats for detail view
        assignments = OnlineReview.objects.filter(paper_id=str(paper.id))
        completed_reviews = ReviewSubmission.objects.filter(paper_id=paper.id, status="submitted").count()
        total_assignments = assignments.count()
        
        if total_assignments == 0:
            review_status = "not_assigned"
        elif completed_reviews == 0:
            review_status = "pending"
        elif completed_reviews < total_assignments:
            review_status = "partial"
        else:
            review_status = "reviewed"
            
        # Optional: Load co_authors if models.PaperCoAuthor exists (FastAPI uses PaperCoAuthor)
        # Assuming minimal detail return suitable for editors
        
        return Response({
            "id": paper.id,
            "paper_code": paper.paper_code,
            "title": paper.title,
            "abstract": paper.abstract,
            "keywords": paper.keyword.split(",") if paper.keyword else [],
            "file": paper.file,
            "status": paper.status,
            "submitted_date": paper.added_on.isoformat() if paper.added_on else None,
            "author": {
                "id": author.id if author else None,
                "name": f"{author.fname} {author.lname or ''}".strip() if author else (paper.author or "Unknown"),
                "email": author.email if author else None,
                "affiliation": author.affiliation if author else None
            },
            "journal": {
                "id": journal.fld_id if journal else None,
                "name": journal.fld_journal_name if journal else "Unknown"
            },
            "review_status": review_status,
            "total_reviewers": total_assignments,
            "completed_reviews": completed_reviews,
            "version_number": paper.version_number,
            "revision_count": paper.revision_count,
            "revision_deadline": paper.revision_deadline.isoformat() if paper.revision_deadline else None,
            "revision_notes": paper.revision_notes,
            "editor_comments": paper.editor_comments,
            "research_area": paper.research_area
        }, status=status.HTTP_200_OK)


class EditorInviteReviewerView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, paper_id):
        if not check_editor_role(request.user):
            return Response({"detail": "Editor access required"}, status=status.HTTP_403_FORBIDDEN)
            
        paper = Paper.objects.filter(id=paper_id).first()
        if not paper:
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)
            
        # Check journal access
        allowed_journals = get_editor_journal_ids(request.user)
        if not _is_admin(request.user) and (not allowed_journals or paper.journal not in allowed_journals):
            return Response({"detail": "You don't have access to papers from this journal"}, status=status.HTTP_403_FORBIDDEN)
            
        if paper.added_by == str(request.user.id):
            return Response({"detail": "You cannot invite reviewers to papers you submitted"}, status=status.HTTP_403_FORBIDDEN)
            
        reviewer_email = request.data.get("reviewer_email") or request.query_params.get("reviewer_email")
        if not reviewer_email:
            return Response({"detail": "reviewer_email is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        import uuid
        from datetime import datetime, timedelta
        
        reviewer = User.objects.filter(email=reviewer_email).first()
        is_external = reviewer is None
        
        if reviewer:
            if reviewer.id == request.user.id or str(reviewer.id) == paper.added_by:
                return Response({"detail": "Cannot invite the author or yourself as a reviewer"}, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if reviewer is already assigned (has an OnlineReview record)
            existing_assignment = OnlineReview.objects.filter(paper_id=str(paper.id), reviewer_id=str(reviewer.id)).first()
            if existing_assignment:
                return Response({
                    "detail": "This reviewer is already assigned to this paper"
                }, status=status.HTTP_400_BAD_REQUEST)
                
            existing = ReviewerInvitation.objects.filter(paper_id=paper.id, reviewer_id=reviewer.id).exclude(status__in=["declined", "expired"]).first()
            if existing:
                return Response({
                    "detail": f"This reviewer already has a {existing.status} invitation for this paper"
                }, status=status.HTTP_400_BAD_REQUEST)
        else:
            # External reviewer — check by email
            existing = ReviewerInvitation.objects.filter(paper_id=paper.id, reviewer_email=reviewer_email).exclude(status__in=["declined", "expired"]).first()
            if existing:
                return Response({
                    "detail": f"An invitation for {reviewer_email} already exists with status: {existing.status}"
                }, status=status.HTTP_400_BAD_REQUEST)
            
        reviewer_name_param = request.data.get("reviewer_name") or request.query_params.get("reviewer_name", "")
        
        token = str(uuid.uuid4())
        due_days = int(request.data.get("due_days", 0) or request.query_params.get("due_days", 14))
        expires_at = datetime.now() + timedelta(days=7)  # 7 days to accept
        
        reviewer_name = ""
        if reviewer:
            reviewer_name = f"{reviewer.fname or ''} {reviewer.lname or ''}".strip() or reviewer_email
        else:
            reviewer_name = reviewer_name_param or reviewer_email
        
        invitation = ReviewerInvitation.objects.create(
            paper_id=paper.id,
            reviewer_id=reviewer.id if reviewer else None,
            reviewer_email=reviewer_email,
            reviewer_name=reviewer_name,
            journal_id=str(paper.journal) if paper.journal else None,
            invitation_token=token,
            token_expiry=expires_at,
            status="pending",
            invited_on=datetime.now(),
            is_external=is_external,
        )
        
        # Send invitation email
        from .services.email_service import send_reviewer_invitation_email
        journal = Journal.objects.filter(fld_id=paper.journal).first()
        journal_name = journal.fld_journal_name if journal else "BreakThrough Publishers"
        email_sent = send_reviewer_invitation_email(
            invitation=invitation,
            paper=paper,
            journal_name=journal_name,
            is_external=is_external,
        )
        
        message = f"Invitation sent to {reviewer_email}"
        if not email_sent:
            message = f"Invitation created for {reviewer_email}, but the notification email could not be sent. Please check SMTP configuration."
        
        return Response({
            "success": True,
            "message": message,
            "invitation_id": invitation.id,
            "is_external": is_external,
            "email_sent": email_sent,
        }, status=status.HTTP_200_OK)


class EditorPaperInvitationsView(APIView):
    """List all reviewer invitations for a paper (editor/admin only)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, paper_id):
        if not check_editor_role(request.user):
            return Response({"detail": "Editor access required"}, status=status.HTTP_403_FORBIDDEN)

        paper = Paper.objects.filter(id=paper_id).first()
        if not paper:
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)

        invitations = ReviewerInvitation.objects.filter(paper_id=paper.id).order_by('-invited_on')

        invitations_list = []
        for inv in invitations:
            reviewer_name = inv.reviewer_name or ""
            if not reviewer_name and inv.reviewer_id:
                reviewer = User.objects.filter(id=inv.reviewer_id).first()
                if reviewer:
                    reviewer_name = f"{reviewer.fname} {reviewer.lname or ''}".strip()

            invitations_list.append({
                "id": inv.id,
                "reviewer_email": inv.reviewer_email,
                "reviewer_name": reviewer_name,
                "reviewer_id": inv.reviewer_id,
                "status": inv.status,
                "is_external": inv.is_external,
                "invited_on": inv.invited_on.isoformat() if inv.invited_on else None,
                "accepted_on": inv.accepted_on.isoformat() if inv.accepted_on else None,
                "declined_on": inv.declined_on.isoformat() if inv.declined_on else None,
                "decline_reason": inv.decline_reason,
                "token_expiry": inv.token_expiry.isoformat() if inv.token_expiry else None,
            })

        return Response({
            "paper_id": paper.id,
            "invitations": invitations_list,
            "total": len(invitations_list),
            "summary": {
                "pending": sum(1 for i in invitations_list if i["status"] == "pending"),
                "accepted": sum(1 for i in invitations_list if i["status"] == "accepted"),
                "declined": sum(1 for i in invitations_list if i["status"] == "declined"),
                "expired": sum(1 for i in invitations_list if i["status"] == "expired"),
            }
        }, status=status.HTTP_200_OK)

    def delete(self, request, paper_id):
        """Delete/cancel a pending invitation."""
        if not check_editor_role(request.user):
            return Response({"detail": "Editor access required"}, status=status.HTTP_403_FORBIDDEN)

        invitation_id = request.query_params.get("invitation_id")
        if not invitation_id:
            return Response({"detail": "invitation_id query parameter is required"}, status=status.HTTP_400_BAD_REQUEST)

        invitation = ReviewerInvitation.objects.filter(id=invitation_id, paper_id=paper_id).first()
        if not invitation:
            return Response({"detail": "Invitation not found"}, status=status.HTTP_404_NOT_FOUND)

        if invitation.status not in ("pending", "expired"):
            return Response({"detail": f"Cannot delete an invitation that has been {invitation.status}"}, status=status.HTTP_400_BAD_REQUEST)

        invitation.delete()
        return Response({"success": True, "message": "Invitation deleted successfully"}, status=status.HTTP_200_OK)


class EditorAssignReviewerView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, paper_id):
        if not check_editor_role(request.user):
            return Response({"detail": "Editor access required"}, status=status.HTTP_403_FORBIDDEN)
            
        paper = Paper.objects.filter(id=paper_id).first()
        if not paper:
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)
            
        if paper.added_by == str(request.user.id):
            return Response({"detail": "You cannot assign reviewers to papers you submitted"}, status=status.HTTP_403_FORBIDDEN)
            
        reviewer_id = request.data.get("reviewer_id")
        if not reviewer_id:
            return Response({"detail": "reviewer_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        reviewer = User.objects.filter(id=reviewer_id).first()
        if not reviewer:
            return Response({"detail": "Reviewer not found"}, status=status.HTTP_404_NOT_FOUND)
            
        has_reviewer_role = False
        if "reviewer" in (reviewer.role or "").lower():
            has_reviewer_role = True
        elif UserRole.objects.filter(user=reviewer, role="reviewer", status="approved").exists():
            has_reviewer_role = True
            
        if not has_reviewer_role:
            return Response({"detail": "User does not have reviewer role"}, status=status.HTTP_400_BAD_REQUEST)
            
        existing_assignment = OnlineReview.objects.filter(paper_id=str(paper.id), reviewer_id=str(reviewer.id)).first()
        if existing_assignment:
            return Response({"detail": "Reviewer is already assigned to this paper"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Create assignment
        from datetime import date, timedelta
        new_review = OnlineReview.objects.create(
            paper_id=str(paper.id),
            reviewer_id=str(reviewer.id),
            review_status="pending",
            assigned_on=date.today(),
            due_date=date.today() + timedelta(days=14)
        )
        
        paper.status = "under_review"
        paper.save()
        
        return Response({
            "message": "Reviewer assigned successfully",
            "review_id": new_review.id,
            "paper_id": paper.id,
            "reviewer_id": reviewer.id
        }, status=status.HTTP_200_OK)


class EditorPaperReviewsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, paper_id):
        if not check_editor_role(request.user):
            return Response({"detail": "Editor access required"}, status=status.HTTP_403_FORBIDDEN)
            
        paper = Paper.objects.filter(id=paper_id).first()
        if not paper:
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)
            
        author_name = paper.author or "Unknown"
        if paper.added_by and paper.added_by.isdigit():
            author_user = User.objects.filter(id=int(paper.added_by)).first()
            if author_user:
                author_name = f"{author_user.fname} {author_user.lname or ''}".strip()
                
        review_submissions = ReviewSubmission.objects.filter(paper_id=paper.id)
        
        reviews_list = []
        total_rating = 0
        rating_count = 0
        accept_count = 0
        minor_count = 0
        major_count = 0
        reject_count = 0
        
        for review in review_submissions:
            reviewer = User.objects.filter(id=review.reviewer_id).first()
            reviewer_name = "Anonymous Reviewer"
            reviewer_email = None
            if reviewer:
                reviewer_name = f"{reviewer.fname} {reviewer.lname or ''}".strip() or reviewer.email
                reviewer_email = reviewer.email
                
            rating = review.overall_rating or 0
            if rating:
                total_rating += rating
                rating_count += 1
                
            recommendation = review.recommendation or ""
            if recommendation == "accept":
                accept_count += 1
            elif recommendation == "minor_revision":
                minor_count += 1
            elif recommendation == "major_revision":
                major_count += 1
            elif recommendation == "reject":
                reject_count += 1
                
            reviews_list.append({
                "review_id": review.id,
                "reviewer_id": review.reviewer_id,
                "reviewer_name": reviewer_name,
                "reviewer_email": reviewer_email,
                "rating": rating,
                "recommendation": recommendation,
                "author_comments": review.author_comments,
                "editor_comments": review.confidential_comments,
                "submitted_date": review.submitted_at.isoformat() if review.submitted_at else None
            })
            
        statistics = {
            "total_reviews": len(reviews_list),
            "average_rating": total_rating / rating_count if rating_count > 0 else 0,
            "accept_count": accept_count,
            "minor_revisions_count": minor_count,
            "major_revisions_count": major_count,
            "reject_count": reject_count
        }
        
        return Response({
            "paper_id": paper.id,
            "paper_name": paper.title,
            "paper_code": paper.paper_code,
            "author": author_name,
            "abstract": paper.abstract,
            "keywords": paper.keyword,
            "status": paper.status,
            "submitted_date": paper.added_on.isoformat() if paper.added_on else None,
            "reviews": reviews_list,
            "statistics": statistics
        }, status=status.HTTP_200_OK)


class ListAvailableReviewersView(APIView):
    """
    GET /api/v1/editor/reviewers/?paper_id=X&search=...&skip=0&limit=50
    
    Returns list of reviewers with NLP-based recommendation scores when paper_id is provided.
    Recommendations are based on:
    - Profile matching: Paper content vs reviewer specialization
    - History matching: Paper content vs reviewer's past reviewed papers
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        if not check_editor_role(request.user):
            return Response({"detail": "Editor access required"}, status=status.HTTP_403_FORBIDDEN)
            
        skip = int(request.query_params.get("skip", 0))
        limit = int(request.query_params.get("limit", 50))
        search = request.query_params.get("search")
        paper_id = request.query_params.get("paper_id")
        
        # Get users with role containing 'reviewer' or having an approved UserRole 'reviewer'
        reviewer_user_ids = list(UserRole.objects.filter(role="reviewer", status="approved").values_list('user_id', flat=True))
        
        query = User.objects.filter(Q(role__icontains="reviewer") | Q(id__in=reviewer_user_ids))
        
        if search:
            query = query.filter(
                Q(email__icontains=search) | 
                Q(fname__icontains=search) | 
                Q(lname__icontains=search)
            )
            
        total = query.count()
        reviewers = query.distinct()[skip:skip+limit]
        
        reviewers_list = []
        for reviewer in reviewers:
            reviewers_list.append({
                "id": reviewer.id,
                "name": f"{reviewer.fname} {reviewer.lname or ''}".strip(),
                "email": reviewer.email,
                "specialization": getattr(reviewer, 'specialization', None),
                "affiliation": getattr(reviewer, 'affiliation', None),
                "is_recommended": False,
                "recommendation_score": 0.0,
                "profile_score": 0.0,
                "history_score": 0.0,
                "match_reason": ""
            })
        
        # If paper_id provided, enrich with NLP recommendation scores
        if paper_id:
            try:
                from .services.recommendation_service import RecommendationService
                service = RecommendationService()
                reviewers_list = service.enrich_reviewers_with_recommendations(int(paper_id), reviewers_list)
            except Exception as e:
                # Log but don't fail - return reviewers without recommendations
                import logging
                logging.getLogger(__name__).warning(f"Reviewer recommendation failed: {e}")
            
        return Response({
            "total": total,
            "skip": skip,
            "limit": limit,
            "reviewers": reviewers_list
        }, status=status.HTTP_200_OK)


class EditorPaperStatusUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, paper_id):
        if not check_editor_role(request.user):
            return Response({"detail": "Editor access required"}, status=status.HTTP_403_FORBIDDEN)
            
        status_val = request.data.get("status")
        comments = request.data.get("comments")
        revision_deadline = request.data.get("revision_deadline")
        
        allowed_statuses = ["accepted", "rejected", "under_review", "pending", "correction", "published"]
        if status_val not in allowed_statuses:
            return Response({"detail": f"Invalid status. Allowed: {allowed_statuses}"}, status=status.HTTP_400_BAD_REQUEST)
            
        paper = Paper.objects.filter(id=paper_id).first()
        if not paper:
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)
            
        old_status = paper.status
        paper.status = status_val
        
        from datetime import datetime
        if revision_deadline and status_val == "correction":
            try:
                # Basic parsing string to aware datetime
                from django.utils.dateparse import parse_datetime, parse_date
                parsed_dt = parse_datetime(revision_deadline)
                if not parsed_dt:
                    parsed_d = parse_date(revision_deadline)
                    if parsed_d:
                        from django.utils.timezone import make_aware
                        parsed_dt = make_aware(datetime.combine(parsed_d, datetime.min.time()))
                
                if parsed_dt:
                    paper.revision_deadline = parsed_dt
                    from django.utils import timezone
                    paper.revision_requested_date = timezone.now()
                    paper.revision_notes = comments
            except Exception:
                pass
                
        paper.save()
        
        # Send status update email to author
        email_sent = False
        try:
            author = None
            if paper.added_by and paper.added_by.isdigit():
                author = User.objects.filter(id=int(paper.added_by)).first()
            if author:
                from .services.email_service import send_status_update_notification
                email_sent = send_status_update_notification(paper, old_status, status_val, author)
        except Exception:
            pass

        return Response({
            "id": paper.id,
            "title": paper.title,
            "status": paper.status,
            "previous_status": old_status,
            "email_notification_queued": email_sent
        }, status=status.HTTP_200_OK)


class EditorPaperDecisionView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, paper_id):
        if not check_editor_role(request.user):
            return Response({"detail": "Editor access required"}, status=status.HTTP_403_FORBIDDEN)
            
        paper = Paper.objects.filter(id=paper_id).first()
        if not paper:
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)
            
        author = None
        if paper.added_by and paper.added_by.isdigit():
            author = User.objects.filter(id=int(paper.added_by)).first()
            
        return Response({
            "paper_id": paper.id,
            "title": paper.title,
            "status": paper.status,
            "editor_comments": getattr(paper, 'editor_comments', None),
            "revision_type": getattr(paper, 'revision_type', None),
            "revision_notes": getattr(paper, 'revision_notes', None),
            "revision_deadline": paper.revision_deadline.isoformat() if getattr(paper, 'revision_deadline', None) else None,
            "revision_requested_date": paper.revision_requested_date.isoformat() if getattr(paper, 'revision_requested_date', None) else None,
            "author": {
                "id": author.id if author else None,
                "name": f"{author.fname} {author.lname or ''}".strip() if author else None,
                "email": author.email if author else None
            } if author else None
        }, status=status.HTTP_200_OK)
        
    def post(self, request, paper_id):
        if not check_editor_role(request.user):
            return Response({"detail": "Editor access required"}, status=status.HTTP_403_FORBIDDEN)
            
        decision = request.data.get("decision")
        editor_comments = request.data.get("editor_comments")
        revision_type = request.data.get("revision_type")
        
        allowed_decisions = ["accepted", "correction", "rejected"]
        if decision not in allowed_decisions:
            return Response({"detail": f"Invalid decision. Allowed: {allowed_decisions}"}, status=status.HTTP_400_BAD_REQUEST)
            
        if not editor_comments or len(editor_comments.strip()) < 50:
            return Response({"detail": "Editor comments must be at least 50 characters"}, status=status.HTTP_400_BAD_REQUEST)
            
        if decision == "correction" and revision_type and revision_type not in ["minor", "major"]:
            return Response({"detail": "Invalid revision type. Allowed: minor, major"}, status=status.HTTP_400_BAD_REQUEST)
            
        paper = Paper.objects.filter(id=paper_id).first()
        if not paper:
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)
            
        old_status = paper.status
        paper.status = decision
        paper.editor_comments = editor_comments.strip()
        
        from django.utils import timezone
        from datetime import timedelta
        
        if decision == "correction":
            paper.revision_requested_date = timezone.now()
            if revision_type == "major":
                paper.revision_deadline = timezone.now() + timedelta(days=30)
            else:
                paper.revision_deadline = timezone.now() + timedelta(days=14)
            paper.revision_notes = editor_comments.strip()
            paper.revision_type = revision_type or "minor"
            
        paper.save()
        
        # Send decision notification email to author
        email_sent = False
        try:
            author = None
            if paper.added_by and paper.added_by.isdigit():
                author = User.objects.filter(id=int(paper.added_by)).first()
            if author:
                from .services.email_service import send_decision_notification
                email_sent = send_decision_notification(paper, decision, editor_comments, author)
        except Exception:
            pass

        # Auto-create copyright form and send email when paper is accepted
        copyright_created = False
        if decision == "accepted":
            try:
                author = None
                if paper.added_by and paper.added_by.isdigit():
                    author = User.objects.filter(id=int(paper.added_by)).first()
                if author:
                    from .models import CopyrightForm as CopyrightFormModel
                    existing = CopyrightFormModel.objects.filter(paper_id=paper.id, author_id=author.id).first()
                    if not existing or existing.status != "completed":
                        deadline = timezone.now() + timedelta(hours=48)
                        if existing:
                            existing.status = "pending"
                            existing.deadline = deadline
                            existing.reminder_count = 0
                            existing.save()
                        else:
                            CopyrightFormModel.objects.create(
                                paper_id=paper.id,
                                author_id=author.id,
                                status="pending",
                                deadline=deadline,
                                author_name=f"{author.fname or ''} {author.lname or ''}".strip(),
                                author_affiliation=author.affiliation or "",
                                created_at=timezone.now(),
                            )
                        copyright_created = True
                        # Send copyright form email
                        try:
                            from .services.email_service import send_copyright_form_email
                            send_copyright_form_email(paper, author, deadline)
                        except Exception:
                            pass
            except Exception:
                pass

        return Response({
            "success": True,
            "paper_id": paper.id,
            "title": paper.title,
            "decision": decision,
            "previous_status": old_status,
            "editor_comments": paper.editor_comments,
            "revision_type": revision_type if decision == "correction" else None,
            "revision_deadline": paper.revision_deadline.isoformat() if getattr(paper, 'revision_deadline', None) else None,
            "email_notification_queued": email_sent,
            "copyright_form_created": copyright_created
        }, status=status.HTTP_200_OK)


class EditorPublishPaperView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, paper_id):
        if not check_editor_role(request.user):
            return Response({"detail": "Editor access required"}, status=status.HTTP_403_FORBIDDEN)
            
        paper = Paper.objects.filter(id=paper_id).first()
        if not paper:
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)
            
        if (request.user.role or "").lower() == "editor":
            allowed_journals = get_editor_journal_ids(request.user)
            if allowed_journals and paper.journal and int(paper.journal) not in allowed_journals:
                return Response({"detail": "You don't have access to publish papers from this journal"}, status=status.HTTP_403_FORBIDDEN)
                
        if paper.status != "accepted":
            return Response({"detail": f"Only accepted papers can be published. Current status: {paper.status}"}, status=status.HTTP_400_BAD_REQUEST)

        # Check copyright form is completed
        copyright_form = CopyrightForm.objects.filter(paper_id=paper.id, status="completed").first()
        if not copyright_form:
            return Response({"detail": "Cannot publish: Copyright transfer form has not been completed by the author."}, status=status.HTTP_400_BAD_REQUEST)
            
        existing_published = PaperPublished.objects.filter(paper_submission_id=paper.id).first()
        if existing_published:
            return Response({"detail": f"Paper already published with ID {existing_published.id}"}, status=status.HTTP_400_BAD_REQUEST)
            
        journal = Journal.objects.filter(fld_id=paper.journal).first() if paper.journal else None
        if not journal:
            return Response({"detail": "Journal not found for this paper"}, status=status.HTTP_400_BAD_REQUEST)
            
        volume = request.data.get("volume")
        issue = request.data.get("issue")
        publication_date = request.data.get("publication_date")
        
        if not volume or not issue:
            return Response({"detail": "volume and issue are required"}, status=status.HTTP_400_BAD_REQUEST)
            
        from django.utils import timezone
        try:
            from django.utils.dateparse import parse_date
            pub_date = parse_date(publication_date) if publication_date else timezone.now().date()
            if not pub_date:
                pub_date = timezone.now().date()
        except:
            pub_date = timezone.now().date()
            
        existing_count = PaperPublished.objects.filter(
            journal_id=journal.fld_id,
            volume=volume,
            issue=issue
        ).count()
        paper_num = existing_count + 1
        
        # Simple DOI generation logic matching FastAPI version
        doi = f"10.58517/{journal.short_form}.{pub_date.year}.{volume}{issue}{paper_num}"

        page_start = request.data.get("page_start", "")
        page_end = request.data.get("page_end", "")
        pages = f"{page_start}-{page_end}" if page_start and page_end else str(page_start or page_end or "")

        author_user = User.objects.filter(id=int(paper.added_by)).first() if paper.added_by else None

        # Publish Paper
        published = PaperPublished.objects.create(
            paper_submission_id=paper.id,
            title=paper.title or "",
            abstract=paper.abstract or "",
            author=paper.author or "",
            journal=journal.fld_journal_name or "",
            journal_id=journal.fld_id,
            volume=str(volume),
            issue=str(issue),
            date=pub_date,
            pages=pages,
            keyword=paper.keyword or "",
            language="English",
            access_type="subscription",
            doi=doi,
            doi_status="pending",
            email=author_user.email if author_user else "",
            affiliation=author_user.affiliation if author_user else "",
        )
        
        paper.status = "published"
        paper.save()
        
        return Response({
            "success": True,
            "message": "Paper published successfully",
            "published_paper": {
                "id": published.id,
                "title": paper.title,
                "doi": published.doi
            }
        }, status=status.HTTP_200_OK)


class EditorAcceptedPapersView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not check_editor_role(request.user):
            return Response({"detail": "Editor access required"}, status=status.HTTP_403_FORBIDDEN)
            
        allowed_journals = get_editor_journal_ids(request.user)
        if not allowed_journals and not _is_admin(request.user):
            return Response({"papers": []}, status=status.HTTP_200_OK)
            
        skip = int(request.query_params.get("skip", 0))
        limit = int(request.query_params.get("limit", 20))
        journal_id = request.query_params.get("journal_id")
        
        query = Paper.objects.filter(status="accepted")
        
        if journal_id:
            journal_id = int(journal_id)
            if not _is_admin(request.user) and journal_id not in allowed_journals:
                return Response({"detail": f"You don't have access to journal {journal_id}"}, status=status.HTTP_403_FORBIDDEN)
            query = query.filter(journal=journal_id)
        elif not _is_admin(request.user):
            query = query.filter(journal__in=allowed_journals)
            
        total = query.count()
        papers = query.order_by("-added_on")[skip:skip+limit]
        
        papers_list = []
        for paper in papers:
            journal_name = Journal.objects.filter(fld_id=paper.journal).values_list('fld_journal_name', flat=True).first() if paper.journal else "Unknown"
            author_name = paper.author or "Unknown"
            if paper.added_by and paper.added_by.isdigit():
                author = User.objects.filter(id=int(paper.added_by)).first()
                if author:
                    author_name = f"{author.fname} {author.lname or ''}".strip()
                    
            papers_list.append({
                "id": paper.id,
                "paper_code": paper.paper_code,
                "title": paper.title,
                "author": author_name,
                "journal": journal_name,
                "journal_id": paper.journal,
                "accepted_date": paper.added_on.isoformat() if paper.added_on else None,
            })
            
        return Response({
            "total": total,
            "skip": skip,
            "limit": limit,
            "papers": papers_list
        }, status=status.HTTP_200_OK)


class EditorReadyToPublishView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Functionally similar to accepted-papers but might have additional checks in the future
        # Currently tracking FastAPI's `ready-to-publish` endpoint logic
        if not check_editor_role(request.user):
            return Response({"detail": "Editor access required"}, status=status.HTTP_403_FORBIDDEN)
            
        allowed_journals = get_editor_journal_ids(request.user)
        if not allowed_journals and not _is_admin(request.user):
            return Response({"papers": []}, status=status.HTTP_200_OK)
            
        skip = int(request.query_params.get("skip", 0))
        limit = int(request.query_params.get("limit", 20))
        journal_id = request.query_params.get("journal_id")
        
        query = Paper.objects.filter(status="accepted")
        
        if journal_id:
            journal_id = int(journal_id)
            if not _is_admin(request.user) and journal_id not in allowed_journals:
                return Response({"detail": f"You don't have access to journal {journal_id}"}, status=status.HTTP_403_FORBIDDEN)
            query = query.filter(journal=journal_id)
        elif not _is_admin(request.user):
            query = query.filter(journal__in=allowed_journals)
            
        total = query.count()
        papers = query.order_by("-added_on")[skip:skip+limit]
        
        papers_list = []
        for paper in papers:
            journal_name = Journal.objects.filter(fld_id=paper.journal).values_list('fld_journal_name', flat=True).first() if paper.journal else "Unknown"
            author_name = paper.author or "Unknown"
            author_id = None
            if paper.added_by and paper.added_by.isdigit():
                author_id = int(paper.added_by)
                author_obj = User.objects.filter(id=author_id).first()
                if author_obj:
                    author_name = f"{author_obj.fname} {author_obj.lname or ''}".strip()

            # Check copyright form status
            copyright_status = "not_created"
            if author_id:
                copyright_form = CopyrightForm.objects.filter(paper_id=paper.id, author_id=author_id).first()
                if copyright_form:
                    copyright_status = copyright_form.status

            papers_list.append({
                "id": paper.id,
                "paper_code": paper.paper_code,
                "title": paper.title,
                "abstract": paper.abstract or "",
                "author": author_name,
                "authorName": author_name,
                "journal": journal_name,
                "journalName": journal_name,
                "journal_id": paper.journal,
                "submitted_date": paper.added_on.isoformat() if paper.added_on else None,
                "accepted_date": paper.added_on.isoformat() if paper.added_on else None,
                "copyright_status": copyright_status,
            })
            
        return Response({
            "total": total,
            "skip": skip,
            "limit": limit,
            "papers": papers_list
        }, status=status.HTTP_200_OK)


# --- Document View Endpoints ---
def _get_editor_paper_file(request, paper_id: int, file_field: str):
    """Helper method to handle file viewing checks and responses"""
    if not check_editor_role(request.user):
        return Response({"detail": "Editor access required"}, status=status.HTTP_403_FORBIDDEN)

    paper = Paper.objects.filter(id=paper_id).first()
    if not paper:
        return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)

    allowed_journals = get_editor_journal_ids(request.user)
    if not _is_admin(request.user) and (not allowed_journals or paper.journal not in allowed_journals):
        return Response({"detail": "You don't have access to papers from this journal"}, status=status.HTTP_403_FORBIDDEN)

    file_path = getattr(paper, file_field, None)
    if not file_path:
        return Response({"detail": f"No {file_field.replace('_', ' ')} uploaded for this paper"}, status=status.HTTP_404_NOT_FOUND)

    from django.conf import settings
    import os
    import mimetypes
    from django.http import FileResponse
    if file_path.startswith('/'):
        file_path = file_path[1:]
    full_path = os.path.join(settings.BASE_DIR.parent, file_path)
    if not os.path.exists(full_path):
        return Response({"detail": "File not found on server"}, status=status.HTTP_404_NOT_FOUND)

    content_type, _ = mimetypes.guess_type(full_path)
    content_type = content_type or 'application/octet-stream'
    response = FileResponse(open(full_path, 'rb'), content_type=content_type)
    response['Content-Disposition'] = f'inline; filename="{os.path.basename(full_path)}"'
    # Allow this response to be embedded in iframes (exempt from XFrameOptionsMiddleware)
    response.xframe_options_exempt = True
    return response


class EditorPaperViewTitlePage(APIView):
    from api.auth import JWTQueryParamAuthentication
    authentication_classes = [JWTQueryParamAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, paper_id: int):
        return _get_editor_paper_file(request, paper_id, "title_page")


class EditorPaperViewFile(APIView):
    """View the main paper file (paper.file field)."""
    from api.auth import JWTQueryParamAuthentication
    authentication_classes = [JWTQueryParamAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, paper_id: int):
        return _get_editor_paper_file(request, paper_id, "file")


class EditorPaperViewBlindedManuscript(APIView):
    from api.auth import JWTQueryParamAuthentication
    authentication_classes = [JWTQueryParamAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, paper_id: int):
        return _get_editor_paper_file(request, paper_id, "blinded_manuscript")


class EditorPaperViewTrackChanges(APIView):
    from api.auth import JWTQueryParamAuthentication
    authentication_classes = [JWTQueryParamAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, paper_id: int):
        return _get_editor_paper_file(request, paper_id, "revised_track_changes")


class EditorPaperViewCleanRevision(APIView):
    from api.auth import JWTQueryParamAuthentication
    authentication_classes = [JWTQueryParamAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, paper_id: int):
        return _get_editor_paper_file(request, paper_id, "revised_clean")


class EditorPaperViewResponseToReviewer(APIView):
    from api.auth import JWTQueryParamAuthentication
    authentication_classes = [JWTQueryParamAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, paper_id: int):
        return _get_editor_paper_file(request, paper_id, "response_to_reviewer")


# --- New Publishing Endpoints ---
class EditorPublishPaperWithFileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, paper_id: int):
        if not check_editor_role(request.user):
            return Response({"detail": "Editor access required"}, status=status.HTTP_403_FORBIDDEN)
            
        paper = Paper.objects.filter(id=paper_id).first()
        if not paper:
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)
            
        if (request.user.role or "").lower() == "editor":
            allowed_journals = get_editor_journal_ids(request.user)
            if allowed_journals and paper.journal and int(paper.journal) not in allowed_journals:
                return Response({"detail": "You don't have access to publish papers from this journal"}, status=status.HTTP_403_FORBIDDEN)
                
        if paper.status != "accepted":
            return Response({"detail": f"Only accepted papers can be published. Current status: {paper.status}"}, status=status.HTTP_400_BAD_REQUEST)

        # Check copyright form is completed
        copyright_form = CopyrightForm.objects.filter(paper_id=paper.id, status="completed").first()
        if not copyright_form:
            return Response({"detail": "Cannot publish: Copyright transfer form has not been completed by the author."}, status=status.HTTP_400_BAD_REQUEST)
            
        existing_published = PaperPublished.objects.filter(paper_submission_id=paper.id).first()
        if existing_published:
            return Response({"detail": f"Paper already published with ID {existing_published.id}"}, status=status.HTTP_400_BAD_REQUEST)
            
        journal = Journal.objects.filter(fld_id=paper.journal).first() if paper.journal else None
        if not journal:
            return Response({"detail": "Journal not found for this paper"}, status=status.HTTP_400_BAD_REQUEST)

        # In a real Django view handling file uploads, we'd use request.FILES
        # For this translation, mimicking the required fields
        if 'final_paper' not in request.FILES:
             return Response({"detail": "Final paper file is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        volume = request.data.get("volume")
        issue = request.data.get("issue")
        publication_date = request.data.get("publication_date")
        
        if not volume or not issue:
            return Response({"detail": "volume and issue are required"}, status=status.HTTP_400_BAD_REQUEST)
            
        from django.utils import timezone
        try:
            from django.utils.dateparse import parse_date
            pub_date = parse_date(publication_date) if publication_date else timezone.now().date()
            if not pub_date:
                pub_date = timezone.now().date()
        except:
            pub_date = timezone.now().date()
            
        existing_count = PaperPublished.objects.filter(
            journal_id=journal.fld_id,
            volume=volume,
            issue=issue
        ).count()
        paper_num = existing_count + 1
        
        doi = f"10.58517/{journal.short_form}.{pub_date.year}.{volume}{issue}{paper_num}"

        final_paper = request.FILES['final_paper']
        import os
        from django.conf import settings
        from datetime import datetime
        
        publish_dir = os.path.join(settings.MEDIA_ROOT, 'published', str(journal.fld_id))
        os.makedirs(publish_dir, exist_ok=True)
        filename = f"paper_{paper.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        file_path = os.path.join(publish_dir, filename)
        
        with open(file_path, 'wb+') as destination:
            for chunk in final_paper.chunks():
                destination.write(chunk)
                
        relative_path = f"published/{journal.fld_id}/{filename}"

        page_start = request.data.get("page_start", "")
        page_end = request.data.get("page_end", "")
        pages = f"{page_start}-{page_end}" if page_start and page_end else str(page_start or page_end or "")

        author_user = User.objects.filter(id=int(paper.added_by)).first() if paper.added_by else None

        published = PaperPublished.objects.create(
            paper_submission_id=paper.id,
            title=paper.title or "",
            abstract=paper.abstract or "",
            author=paper.author or "",
            journal=journal.fld_journal_name or "",
            journal_id=journal.fld_id,
            volume=str(volume),
            issue=str(issue),
            date=pub_date,
            pages=pages,
            keyword=paper.keyword or "",
            language="English",
            access_type="subscription",
            doi=doi,
            doi_status="pending",
            paper=relative_path,
            email=author_user.email if author_user else "",
            affiliation=author_user.affiliation if author_user else "",
        )
        
        paper.status = "published"
        paper.save()
        
        return Response({
            "success": True,
            "message": "Paper published successfully with file",
            "published_paper": {
                "id": published.id,
                "title": paper.title,
                "doi": published.doi,
                "paper_file": published.paper
            }
        }, status=status.HTTP_200_OK)


class EditorCheckDOIStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, paper_id: int):
        if not check_editor_role(request.user):
            return Response({"detail": "Editor access required"}, status=status.HTTP_403_FORBIDDEN)
            
        published = PaperPublished.objects.filter(paper_submission_id=paper_id).first()
        if not published:
            return Response({"detail": "Published paper not found"}, status=status.HTTP_404_NOT_FOUND)
            
        # Mocking Crossref check
        status_result = {
            "status": "completed",
            "message": "Mock Crossref DOI Status"
        }
        
        return Response({
            "paper_id": paper_id,
            "published_id": published.id,
            "doi": published.doi,
            "doi_url": f"https://doi.org/{published.doi}" if published.doi else None,
            "doi_status": published.doi_status,
            "batch_id": published.crossref_batch_id,
            "registered_at": published.doi_registered_at.isoformat() if published.doi_registered_at else None,
            "crossref_check": status_result
        }, status=status.HTTP_200_OK)


# --- Invitation Endpoints ---
class InvitationStatusView(APIView):
    permission_classes = [] # Public endpoint
    
    def get(self, request, token: str):
        invitation = ReviewerInvitation.objects.filter(invitation_token=token).first()
        if not invitation:
            return Response({"detail": "Invitation not found. The token may be invalid."}, status=status.HTTP_404_NOT_FOUND)
            
        from django.utils import timezone
        is_expired = invitation.token_expiry < timezone.now() if invitation.token_expiry else False
        
        paper = Paper.objects.filter(id=invitation.paper_id).first()
        paper_title = paper.title if paper else "Unknown Paper"
        
        return Response({
            "id": invitation.id,
            "paper_id": invitation.paper_id,
            "paper_title": paper_title,
            "reviewer_email": invitation.reviewer_email,
            "reviewer_name": invitation.reviewer_name,
            "paper_abstract": paper.abstract if paper else None,
            "status": invitation.status,
            "is_expired": is_expired,
            "token_expiry": invitation.token_expiry.isoformat() if invitation.token_expiry else None,
            "is_external": invitation.is_external,
        }, status=status.HTTP_200_OK)


class AcceptInvitationView(APIView):
    permission_classes = [] # Handled mostly by token

    def post(self, request, token: str):
        invitation = ReviewerInvitation.objects.filter(invitation_token=token).first()
        if not invitation:
            return Response({"detail": "Invitation not found."}, status=status.HTTP_404_NOT_FOUND)
            
        if invitation.status != "pending":
            return Response({"detail": f"Invitation has already been {invitation.status}"}, status=status.HTTP_400_BAD_REQUEST)
            
        from django.utils import timezone
        if invitation.token_expiry and invitation.token_expiry < timezone.now():
            invitation.status = "expired"
            invitation.save()
            return Response({"detail": "Invitation has expired."}, status=status.HTTP_410_GONE)
            
        user = None
        if request.user.is_authenticated:
             user = request.user
        elif invitation.reviewer_id:
             user = User.objects.filter(id=invitation.reviewer_id).first()
             
        if not user:
            return Response({
                "status": "registration_required",
                "message": "Please log in or register to accept",
                "requires_registration": True
            }, status=status.HTTP_200_OK)
            
        existing_review = OnlineReview.objects.filter(
            paper_id=str(invitation.paper_id),
            reviewer_id=str(user.id)
        ).first()
        
        if existing_review:
            return Response({"detail": "You are already assigned as a reviewer."}, status=status.HTTP_409_CONFLICT)
            
        invitation.status = "accepted"
        invitation.reviewer_id = user.id
        invitation.save()
        
        from datetime import date, timedelta
        online_review = OnlineReview.objects.create(
            paper_id=str(invitation.paper_id),
            reviewer_id=str(user.id),
            review_status="pending",
            assigned_on=date.today(),
            due_date=date.today() + timedelta(days=14)
        )
        
        return Response({
            "status": "accepted",
            "message": "You have been assigned as a reviewer",
            "invitation_id": invitation.id,
            "review_id": online_review.id
        }, status=status.HTTP_200_OK)


class DeclineInvitationView(APIView):
    permission_classes = []

    def post(self, request, token: str):
        invitation = ReviewerInvitation.objects.filter(invitation_token=token).first()
        if not invitation:
            return Response({"detail": "Invitation not found."}, status=status.HTTP_404_NOT_FOUND)
            
        if invitation.status != "pending":
             return Response({"detail": f"Invitation already {invitation.status}"}, status=status.HTTP_400_BAD_REQUEST)
             
        reason = request.data.get("reason", "")
        invitation.status = "declined"
        invitation.save()
        
        return Response({
            "status": "declined",
            "message": "You have declined this review invitation",
            "invitation_id": invitation.id
        }, status=status.HTTP_200_OK)


class RegisterAcceptInvitationView(APIView):
    permission_classes = []

    def post(self, request, token: str):
        invitation = ReviewerInvitation.objects.filter(invitation_token=token).first()
        if not invitation:
            return Response({"detail": "Invitation not found."}, status=status.HTTP_404_NOT_FOUND)

        if invitation.status != "pending":
            return Response({"detail": f"Invitation already {invitation.status}"}, status=status.HTTP_400_BAD_REQUEST)

        # Read from both request.data (POST body) and query_params
        fname = request.data.get("fname") or request.query_params.get("fname")
        lname = request.data.get("lname") or request.query_params.get("lname", "")
        password = request.data.get("password") or request.query_params.get("password")
        organization = request.data.get("organization") or request.query_params.get("organization", "")
        # Use email from invitation — do not trust client-supplied email
        email = invitation.reviewer_email

        if not fname or not password or not email:
            return Response({"detail": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST)

        from .jwt_utils import hash_password, validate_password_policy
        from django.utils import timezone as tz

        policy_error = validate_password_policy(password)
        if policy_error:
            return Response({"detail": policy_error}, status=status.HTTP_400_BAD_REQUEST)

        existing_user = User.objects.filter(email=email).first()
        if existing_user:
            # User already exists — update their credentials and link to this invitation
            existing_user.password = hash_password(password)
            existing_user.fname = fname
            existing_user.lname = lname
            if organization:
                existing_user.organisation = organization
            if existing_user.role != "reviewer":
                existing_user.role = "reviewer"
            existing_user.save()

            # Ensure reviewer role exists
            from django.utils import timezone as tz2
            if not UserRole.objects.filter(user=existing_user, role="reviewer").exists():
                UserRole.objects.create(
                    user=existing_user,
                    role="reviewer",
                    status="approved",
                    requested_at=tz2.now(),
                )

            new_user = existing_user
        else:
            new_user = User.objects.create(
                fname=fname,
                lname=lname,
                email=email,
                password=hash_password(password),
                role="reviewer",
                organisation=organization,
                added_on=tz.now(),
            )

            UserRole.objects.create(
                user=new_user,
                role="reviewer",
                status="approved",
                requested_at=tz.now(),
            )
        
        # Check for duplicate review assignment
        existing_review = OnlineReview.objects.filter(
            paper_id=str(invitation.paper_id),
            reviewer_id=str(new_user.id)
        ).first()

        invitation.status = "accepted"
        invitation.reviewer_id = new_user.id
        invitation.save()
        
        from datetime import date, timedelta
        if not existing_review:
            online_review = OnlineReview.objects.create(
                paper_id=str(invitation.paper_id),
                reviewer_id=str(new_user.id),
                review_status="pending",
                assigned_on=date.today(),
                due_date=date.today() + timedelta(days=14)
            )
        
        return Response({
            "status": "registered_and_accepted",
            "user_id": new_user.id,
            "user_email": new_user.email,
            "invitation_id": invitation.id,
        }, status=status.HTTP_200_OK)


# --- Submission History Endpoints ---

class EditorPaperSubmissionHistoryView(APIView):
    """Return all file versions for a paper (editor/admin access)."""
    from api.auth import JWTAuthentication
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, paper_id: int):
        if not check_editor_role(request.user):
            return Response({"detail": "Editor access required"}, status=status.HTTP_403_FORBIDDEN)

        paper = Paper.objects.filter(id=paper_id).first()
        if not paper:
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)

        allowed_journals = get_editor_journal_ids(request.user)
        if not _is_admin(request.user) and (not allowed_journals or paper.journal not in allowed_journals):
            return Response({"detail": "You don't have access to papers from this journal"}, status=status.HTTP_403_FORBIDDEN)

        versions = PaperVersion.objects.filter(paper_id=paper_id).order_by("-version_number")
        version_list = []
        for v in versions:
            version_list.append({
                "id": v.id,
                "version_number": v.version_number,
                "file": v.file,
                "file_size": v.file_size,
                "uploaded_on": v.uploaded_on.isoformat() if v.uploaded_on else None,
                "revision_reason": v.revision_reason,
                "change_summary": v.change_summary,
                "uploaded_by": v.uploaded_by,
            })

        return Response({
            "paper_id": paper.id,
            "paper_title": paper.title,
            "paper_status": paper.status,
            "current_version": paper.version_number,
            "revision_count": paper.revision_count,
            "versions": version_list,
        }, status=status.HTTP_200_OK)


class EditorPaperVersionFileView(APIView):
    """Serve a specific historical version file for editor viewing."""
    from api.auth import JWTQueryParamAuthentication
    authentication_classes = [JWTQueryParamAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, paper_id: int, version_id: int):
        if not check_editor_role(request.user):
            return Response({"detail": "Editor access required"}, status=status.HTTP_403_FORBIDDEN)

        paper = Paper.objects.filter(id=paper_id).first()
        if not paper:
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)

        allowed_journals = get_editor_journal_ids(request.user)
        if not _is_admin(request.user) and (not allowed_journals or paper.journal not in allowed_journals):
            return Response({"detail": "You don't have access to papers from this journal"}, status=status.HTTP_403_FORBIDDEN)

        version = PaperVersion.objects.filter(id=version_id, paper_id=paper_id).first()
        if not version:
            return Response({"detail": "Version not found"}, status=status.HTTP_404_NOT_FOUND)

        file_path = version.file
        if not file_path:
            return Response({"detail": "No file associated with this version"}, status=status.HTTP_404_NOT_FOUND)

        from django.conf import settings
        import os
        import mimetypes
        from django.http import FileResponse
        if file_path.startswith('/'):
            file_path = file_path[1:]
        full_path = os.path.join(settings.BASE_DIR.parent, file_path)
        if not os.path.exists(full_path):
            return Response({"detail": "File not found on server"}, status=status.HTTP_404_NOT_FOUND)

        content_type, _ = mimetypes.guess_type(full_path)
        content_type = content_type or 'application/octet-stream'
        response = FileResponse(open(full_path, 'rb'), content_type=content_type)
        response['Content-Disposition'] = f'inline; filename="{os.path.basename(full_path)}"'
        return response
