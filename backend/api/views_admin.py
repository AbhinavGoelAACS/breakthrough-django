from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Count, Q
from django.utils import timezone
from datetime import datetime, timedelta

from .models import (
    User, Paper, Journal, PaperPublished, UserRole, PaperCorrespondence,
    CopyrightForm, News, EmailTemplate, OnlineReview, ReviewSubmission, Editor,
    PaperCoAuthor, PaperComment, PaperVersion, ReviewerInvitation
)


def check_admin_role(user):
    return (user.role or '').lower() == "admin"

class AdminDashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
            
        total_users = User.objects.count()
        total_journals = Journal.objects.count()
        total_submissions = Paper.objects.count()
        pending_papers = Paper.objects.filter(status__in=["submitted", "under_review"]).count()
        published_papers = PaperPublished.objects.count()
        
        return Response({
            "total_users": total_users,
            "total_journals": total_journals,
            "total_submissions": total_submissions,
            "pending_papers": pending_papers,
            "published_papers": published_papers
        }, status=status.HTTP_200_OK)


class AdminRecentActivityView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
            
        limit = int(request.query_params.get("limit", 20))
        half_limit = max(1, limit // 2)
        
        activities = []
        
        recent_users = User.objects.order_by("-added_on")[:half_limit]
        for user in recent_users:
            if user.added_on:
                activities.append({
                    "type": "user_registration",
                    "description": f"New user registered: {user.email}",
                    "timestamp": user.added_on.isoformat()
                })
                
        recent_papers = Paper.objects.order_by("-added_on")[:half_limit]
        for paper in recent_papers:
            if paper.added_on:
                activities.append({
                    "type": "paper_submission",
                    "description": f"New paper submitted: {paper.title or 'Untitled'}",
                    "timestamp": paper.added_on.isoformat()
                })
                
        activities.sort(key=lambda x: x["timestamp"], reverse=True)
        return Response(activities[:limit], status=status.HTTP_200_OK)


class AdminPapersByStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
            
        statuses = ["submitted", "under_review", "reviewed", "accepted", "rejected", "correction", "under_publication", "published", "resubmitted"]
        stats = {}
        
        for st in statuses:
            count = Paper.objects.filter(status=st).count()
            if count > 0:
                stats[st] = count
                
        return Response(stats, status=status.HTTP_200_OK)


class AdminUsersListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
            
        skip = int(request.query_params.get("skip", 0))
        limit = int(request.query_params.get("limit", 20))
        search = request.query_params.get("search")
        role_filter = request.query_params.get("role")
        
        query = User.objects.all()
        
        if search:
            query = query.filter(
                Q(email__icontains=search) |
                Q(fname__icontains=search) |
                Q(lname__icontains=search)
            )
            
        if role_filter:
            query = query.filter(role__iexact=role_filter)
            
        total = query.count()
        users = query.order_by("-added_on")[skip:skip+limit]
        
        user_ids = [u.id for u in users]
        user_roles = UserRole.objects.filter(user_id__in=user_ids, status="approved")
        
        roles_map = {}
        for ur in user_roles:
            if ur.user_id not in roles_map:
                roles_map[ur.user_id] = []
            roles_map[ur.user_id].append(ur.role)
            
        users_data = []
        for user in users:
            uid = user.id
            u_dict = {
                "id": uid,
                "email": user.email,
                "fname": user.fname,
                "lname": user.lname,
                "role": user.role,
                "status": user.status,
                "added_on": user.added_on.isoformat() if user.added_on else None,
            }
            all_roles = roles_map.get(uid, [])
            if not all_roles and user.role:
                all_roles = [user.role]
            u_dict["all_roles"] = all_roles
            users_data.append(u_dict)
            
        return Response({
            "total": total,
            "skip": skip,
            "limit": limit,
            "users": users_data
        }, status=status.HTTP_200_OK)


class AdminUserRoleUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_id):
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
            
        role = request.data.get("role")
        user = User.objects.filter(id=user_id).first()
        if not user:
            return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)
            
        allowed_roles = ["admin", "author", "editor", "reviewer"]
        if role not in allowed_roles:
            return Response({"detail": f"Invalid role. Allowed: {allowed_roles}"}, status=status.HTTP_400_BAD_REQUEST)
            
        user.role = role
        user.save()
        
        return Response({
            "id": user.id,
            "email": user.email,
            "role": user.role
        }, status=status.HTTP_200_OK)


class AdminUserRolesDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, user_id):
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
            
        user = User.objects.filter(id=user_id).first()
        if not user:
            return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)
            
        user_roles = UserRole.objects.filter(user_id=user_id, status="approved")
        
        return Response({
            "user_id": user_id,
            "primary_role": user.role,
            "roles": [
                {
                    "id": ur.id,
                    "role": ur.role,
                    "status": ur.status,
                    "journal_id": ur.journal_id,
                    "editor_type": ur.editor_type
                } for ur in user_roles
            ]
        }, status=status.HTTP_200_OK)

    def put(self, request, user_id):
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
            
        roles = request.data.get("roles", [])
        user = User.objects.filter(id=user_id).first()
        if not user:
            return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)
            
        allowed_roles = ["admin", "author", "editor", "reviewer"]
        invalid_roles = [r for r in roles if r not in allowed_roles]
        if invalid_roles:
            return Response({"detail": f"Invalid roles: {invalid_roles}. Allowed: {allowed_roles}"}, status=status.HTTP_400_BAD_REQUEST)
            
        if not roles:
            return Response({"detail": "At least one role is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        existing_roles = UserRole.objects.filter(user_id=user_id, status="approved")
        existing_role_names = set(ur.role for ur in existing_roles)
        
        new_roles = set(roles)
        roles_to_add = new_roles - existing_role_names
        roles_to_remove = existing_role_names - new_roles
        
        if roles_to_remove:
            UserRole.objects.filter(user_id=user_id, role__in=roles_to_remove).delete()
            
        for r in roles_to_add:
            UserRole.objects.create(
                user_id=user_id,
                role=r,
                status="approved",
                requested_at=timezone.now(),
                approved_by=request.user.id,
                approved_at=timezone.now()
            )
            
        role_priority = {"admin": 4, "editor": 3, "reviewer": 2, "author": 1}
        primary_role = max(roles, key=lambda r: role_priority.get(r, 0))
        user.role = primary_role
        user.save()
        
        updated_roles = UserRole.objects.filter(user_id=user_id, status="approved")
        
        return Response({
            "success": True,
            "message": "User roles updated successfully",
            "user": {
                "id": user.id,
                "email": user.email,
                "role": user.role
            },
            "roles": [
                {
                    "id": ur.id,
                    "role": ur.role
                } for ur in updated_roles
            ]
        }, status=status.HTTP_200_OK)


class AdminUserDeleteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, user_id):
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
            
        user = User.objects.filter(id=user_id).first()
        if not user:
            return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)
            
        user.delete()
        return Response({"message": f"User {user_id} deleted successfully"}, status=status.HTTP_200_OK)


class AdminPapersListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not check_admin_role(request.user) and getattr(request.user, 'role', '') != 'editor':
            return Response({"detail": "Admin or Editor access required"}, status=status.HTTP_403_FORBIDDEN)
            
        skip = int(request.query_params.get("skip", 0))
        limit = int(request.query_params.get("limit", 50))
        status_filter = request.query_params.get("status")
        
        query = Paper.objects.all()
        
        if status_filter:
            query = query.filter(status=status_filter)
            
        total = query.count()
        papers = query.order_by("-added_on")[skip:skip+limit]
        
        from .models import OnlineReview, ReviewSubmission
        
        paper_list = []
        for paper in papers:
            paper_dict = {
                "id": paper.id,
                "title": paper.title,
                "status": paper.status,
                "added_on": paper.added_on.isoformat() if paper.added_on else None,
                "paper_code": paper.paper_code
            }
            if paper.journal:
                journal = Journal.objects.filter(fld_id=paper.journal).first()
                if journal:
                    paper_dict['journal_name'] = journal.fld_journal_name
                    
            if paper.added_by and paper.added_by.isdigit():
                author = User.objects.filter(id=int(paper.added_by)).first()
                if author:
                    paper_dict['author_name'] = f"{author.fname} {author.lname or ''}".strip()
                    
            total_assignments = OnlineReview.objects.filter(paper_id=str(paper.id)).count()
            completed_reviews = ReviewSubmission.objects.filter(paper_id=paper.id, status="submitted").count()
            
            if total_assignments == 0:
                review_status = "not_assigned"
            elif completed_reviews == 0:
                review_status = "pending"
            elif completed_reviews < total_assignments:
                review_status = "partial"
            else:
                review_status = "reviewed"
                
            paper_dict['review_status'] = review_status
            paper_dict['total_reviewers'] = total_assignments
            paper_dict['completed_reviews'] = completed_reviews
            
            paper_list.append(paper_dict)
            
        return Response({
            "total": total,
            "skip": skip,
            "limit": limit,
            "papers": paper_list
        }, status=status.HTTP_200_OK)


class AdminPaperDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, paper_id):
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
            
        paper = Paper.objects.filter(id=paper_id).first()
        if not paper:
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)
            
        journal = Journal.objects.filter(fld_id=paper.journal).first() if paper.journal else None
        
        author = None
        if paper.added_by and paper.added_by.isdigit():
            author = User.objects.filter(id=int(paper.added_by)).first()
            
        co_authors_list = []
        # Fallback empty list since PaperCoAuthor model might not be in Django yet, or fetch if it is
        # from .models import PaperCoAuthor
        # for ca in PaperCoAuthor.objects.filter(paper_id=paper_id):
        #    ...
            
        from .models import OnlineReview, ReviewSubmission
        assignments = OnlineReview.objects.filter(paper_id=str(paper.id))
        
        assigned_reviewers = []
        for assignment in assignments:
            reviewer = User.objects.filter(id=assignment.reviewer_id).first() if assignment.reviewer_id else None
            review_submission = ReviewSubmission.objects.filter(assignment_id=assignment.id).first()
            
            reviewer_info = {
                "assignment_id": assignment.id,
                "reviewer_id": assignment.reviewer_id,
                "reviewer_name": f"{reviewer.fname} {reviewer.lname or ''}".strip() if reviewer else "Unknown",
                "reviewer_email": reviewer.email if reviewer else None,
                "specialization": getattr(reviewer, 'specialization', None) if reviewer else None,
                "affiliation": getattr(reviewer, 'affiliation', None) if reviewer else None,
                "assigned_on": assignment.assigned_on.isoformat() if getattr(assignment, 'assigned_on', None) else None,
                "due_date": assignment.due_date.isoformat() if getattr(assignment, 'due_date', None) else None,
                "review_status": assignment.review_status,
                "has_submitted": False,
                "submitted_at": None,
                "review": None
            }
            
            if review_submission:
                reviewer_info["has_submitted"] = review_submission.status == "submitted"
                reviewer_info["submitted_at"] = review_submission.submitted_at.isoformat() if getattr(review_submission, 'submitted_at', None) else None
                if review_submission.status == "submitted":
                    reviewer_info["review"] = {
                        "id": review_submission.id,
                        "overall_rating": review_submission.overall_rating,
                        "recommendation": review_submission.recommendation
                    }
            assigned_reviewers.append(reviewer_info)
            
        total_assignments = len(assigned_reviewers)
        completed_reviews = sum(1 for r in assigned_reviewers if r["has_submitted"])
        
        if total_assignments == 0:
            review_status = "not_assigned"
        elif completed_reviews == 0:
            review_status = "pending"
        elif completed_reviews < total_assignments:
            review_status = "partial"
        else:
            review_status = "reviewed"
            
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
                "affiliation": getattr(author, 'affiliation', None) if author else None
            },
            "co_authors": co_authors_list,
            "journal": {
                "id": journal.fld_id if journal else None,
                "name": journal.fld_journal_name if journal else "Unknown"
            },
            "review_status": review_status,
            "total_reviewers": total_assignments,
            "completed_reviews": completed_reviews,
            "assigned_reviewers": assigned_reviewers,
            "version_number": getattr(paper, 'version_number', 1),
            "revision_count": getattr(paper, 'revision_count', 0),
            "revision_deadline": paper.revision_deadline.isoformat() if getattr(paper, 'revision_deadline', None) else None,
            "revision_notes": getattr(paper, 'revision_notes', None),
            "research_area": getattr(paper, 'research_area', None)
        }, status=status.HTTP_200_OK)

    def delete(self, request, paper_id):
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)

        paper = Paper.objects.filter(id=paper_id).first()
        if not paper:
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)

        from django.db import transaction
        import os, shutil
        from pathlib import Path

        paper_title = paper.title
        paper_code = paper.paper_code

        with transaction.atomic():
            # Delete related records
            ReviewSubmission.objects.filter(
                assignment_id__in=OnlineReview.objects.filter(paper_id=str(paper.id)).values_list('id', flat=True)
            ).delete()
            OnlineReview.objects.filter(paper_id=str(paper.id)).delete()
            ReviewerInvitation.objects.filter(paper_id=paper.id).delete()
            PaperCoAuthor.objects.filter(paper_id=paper.id).delete()
            PaperComment.objects.filter(paper_id=paper.id).delete()
            PaperCorrespondence.objects.filter(paper_id=paper.id).delete()
            PaperVersion.objects.filter(paper_id=paper.id).delete()
            CopyrightForm.objects.filter(paper_id=paper.id).delete()

            # Delete uploaded files
            backend_root = Path(__file__).resolve().parent.parent
            if paper.added_by:
                upload_dir = backend_root.parent / "uploads" / "papers" / f"user_{paper.added_by}"
                if upload_dir.exists():
                    for f in upload_dir.glob(f"{paper.id}_*"):
                        f.unlink(missing_ok=True)

            paper.delete()

        return Response({
            "detail": f"Paper '{paper_title}' ({paper_code}) deleted successfully"
        }, status=status.HTTP_200_OK)


class AdminJournalsListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
            
        skip = int(request.query_params.get("skip", 0))
        limit = int(request.query_params.get("limit", 20))
        search = request.query_params.get("search")
        
        query = Journal.objects.all()
        if search:
            query = query.filter(
                Q(fld_journal_name__icontains=search) |
                Q(short_form__icontains=search)
            )
            
        total = query.count()
        journals = query[skip:skip+limit]
        
        return Response({
            "total": total,
            "skip": skip,
            "limit": limit,
            "journals": [
                {
                    "id": j.fld_id,
                    "name": j.fld_journal_name,
                    "short_form": j.short_form,
                    "issn_online": j.issn_ol,
                    "issn_print": j.issn_prt
                } for j in journals
            ]
        }, status=status.HTTP_200_OK)


class AdminPaperFileView(APIView):
    from api.auth import JWTQueryParamAuthentication
    authentication_classes = [JWTQueryParamAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, paper_id):
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
            
        paper = Paper.objects.filter(id=paper_id).first()
        if not paper or not paper.file:
            return Response({"detail": "Paper file not found"}, status=status.HTTP_404_NOT_FOUND)
            
        import os
        from django.conf import settings
        from django.http import FileResponse, Http404
        
        raw_path = paper.file
        if raw_path.startswith('/'):
            raw_path = raw_path[1:]
        file_path = os.path.join(settings.BASE_DIR.parent, raw_path)
        if not os.path.exists(file_path):
            raise Http404("File not found on server")
            
        import mimetypes
        content_type, _ = mimetypes.guess_type(file_path)
        if not content_type:
            content_type = 'application/octet-stream'
            
        response = FileResponse(open(file_path, 'rb'), content_type=content_type)
        response['Content-Disposition'] = f'inline; filename="{os.path.basename(file_path)}"'
        return response


class AdminPaperAccessUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, paper_id):
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
            
        access_type = request.data.get("access_type")
        if access_type not in ["subscription", "open"]:
            return Response({"detail": "Invalid access type"}, status=status.HTTP_400_BAD_REQUEST)
            
        published_paper = PaperPublished.objects.filter(id=paper_id).first()
        if not published_paper:
            return Response({"detail": "Published paper not found"}, status=status.HTTP_404_NOT_FOUND)
            
        old_access = published_paper.access_type
        published_paper.access_type = access_type
        published_paper.save()
        
        return Response({
            "success": True,
            "message": f"Access type updated from '{old_access}' to '{access_type}'",
            "paper": {
                "id": published_paper.id,
                "access_type": published_paper.access_type,
                "doi": published_paper.doi
            }
        }, status=status.HTTP_200_OK)


class AdminBulkAccessUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
            
        paper_ids = request.data.get("paper_ids", [])
        access_type = request.data.get("access_type")
        
        if not paper_ids or access_type not in ["subscription", "open"]:
            return Response({"detail": "Invalid parameters"}, status=status.HTTP_400_BAD_REQUEST)
            
        updated_count = PaperPublished.objects.filter(id__in=paper_ids).update(access_type=access_type)
        
        return Response({
            "success": True,
            "updated_count": updated_count,
            "message": f"Successfully updated {updated_count} papers to {access_type} access"
        }, status=status.HTTP_200_OK)


# =============================================================================
# EDITOR MANAGEMENT ENDPOINTS
# =============================================================================

class AdminEditorsListView(APIView):
    """
    GET /api/v1/admin/editors - List all editor assignments
    POST /api/v1/admin/editors - Create new editor assignment
    
    Uses user_role + user tables for the multi-role system.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        skip = int(request.query_params.get("skip", 0))
        limit = int(request.query_params.get("limit", 50))
        journal_id = request.query_params.get("journal_id")
        editor_type = request.query_params.get("editor_type")
        search = request.query_params.get("search")
        
        # ---- Source 1: user_role table (multi-role system) ----
        ur_query = UserRole.objects.filter(
            role="editor",
            status="approved"
        ).select_related('user')
        
        if journal_id:
            ur_query = ur_query.filter(journal_id=journal_id)
        if editor_type:
            ur_query = ur_query.filter(editor_type=editor_type)
        if search:
            ur_query = ur_query.filter(
                Q(user__fname__icontains=search) |
                Q(user__lname__icontains=search) |
                Q(user__email__icontains=search)
            )
        
        # Build editor list from user_role
        editor_list = []
        seen_emails = set()
        
        for user_role in ur_query.order_by('-requested_at'):
            user = user_role.user
            email_lower = (user.email or '').lower()
            seen_emails.add(email_lower)
            
            editor_dict = {
                "id": user_role.id,
                "user_id": user.id,
                "editor_name": f"{user.fname or ''} {user.lname or ''}".strip() or user.email,
                "editor_email": user.email,
                "journal_id": user_role.journal_id,
                "role": "Editor",
                "editor_type": user_role.editor_type or "section_editor",
                "editor_affiliation": user.affiliation,
                "editor_department": user.department,
                "editor_college": user.organisation,
                "editor_contact": user.contact,
                "added_on": user_role.requested_at.isoformat() if user_role.requested_at else None,
                "source": "user_role",
            }
            
            # Enrich with journal information
            if user_role.journal_id:
                try:
                    journal = Journal.objects.get(fld_id=user_role.journal_id)
                    editor_dict["journal_name"] = journal.fld_journal_name
                    editor_dict["journal_short_form"] = journal.short_form
                except Journal.DoesNotExist:
                    pass
            
            editor_list.append(editor_dict)
        
        # ---- Source 2: legacy editor table ----
        legacy_query = Editor.objects.all()
        
        if journal_id:
            legacy_query = legacy_query.filter(journal_id=journal_id)
        if editor_type:
            legacy_query = legacy_query.filter(editor_type=editor_type)
        if search:
            legacy_query = legacy_query.filter(
                Q(editor_name__icontains=search) |
                Q(editor_email__icontains=search)
            )
        
        for editor in legacy_query.order_by('-added_on'):
            email_lower = (editor.editor_email or '').lower()
            # Skip if already included from user_role (avoid duplicates)
            if email_lower and email_lower in seen_emails:
                continue
            seen_emails.add(email_lower)
            
            editor_dict = {
                "id": f"legacy_{editor.id}",
                "user_id": None,
                "editor_name": editor.editor_name or editor.editor_email or "",
                "editor_email": editor.editor_email,
                "journal_id": editor.journal_id,
                "role": editor.role or "Editor",
                "editor_type": editor.editor_type or "section_editor",
                "editor_affiliation": editor.editor_affiliation,
                "editor_department": editor.editor_department,
                "editor_college": editor.editor_college,
                "editor_contact": editor.editor_contact,
                "added_on": editor.added_on.isoformat() if editor.added_on else None,
                "source": "legacy",
            }
            
            if editor.journal_id:
                try:
                    journal = Journal.objects.get(fld_id=editor.journal_id)
                    editor_dict["journal_name"] = journal.fld_journal_name
                    editor_dict["journal_short_form"] = journal.short_form
                except Journal.DoesNotExist:
                    pass
            
            editor_list.append(editor_dict)
        
        # ---- Paginate the merged list ----
        total = len(editor_list)
        paginated = editor_list[skip:skip + limit]
        
        return Response({
            "total": total,
            "skip": skip,
            "limit": limit,
            "editors": paginated
        }, status=status.HTTP_200_OK)

    def post(self, request):
        """Create a new editor assignment for a journal."""
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        editor_name = request.data.get("editor_name")
        editor_email = request.data.get("editor_email")
        journal_id = request.data.get("journal_id")
        editor_type = request.data.get("editor_type", "section_editor")
        editor_affiliation = request.data.get("editor_affiliation")
        editor_department = request.data.get("editor_department")
        editor_college = request.data.get("editor_college")
        editor_contact = request.data.get("editor_contact")
        
        # Validate required fields
        if not editor_email:
            return Response({"detail": "editor_email is required"}, status=status.HTTP_400_BAD_REQUEST)
        if not journal_id:
            return Response({"detail": "journal_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate editor_type
        if editor_type not in ["chief_editor", "section_editor"]:
            return Response(
                {"detail": "Invalid editor_type. Must be 'chief_editor' or 'section_editor'"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify journal exists
        try:
            journal = Journal.objects.get(fld_id=journal_id)
        except Journal.DoesNotExist:
            return Response(
                {"detail": f"Journal with ID {journal_id} not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Find or create user account
        user = User.objects.filter(email=editor_email).first()
        
        if not user:
            # Create new user account
            from api.jwt_utils import hash_password
            name_parts = editor_name.split(' ', 1) if editor_name else ['', '']
            user = User.objects.create(
                email=editor_email,
                password=hash_password("TempPassword123!"),
                role="Editor",
                fname=name_parts[0] if name_parts else None,
                lname=name_parts[1] if len(name_parts) > 1 else None,
                affiliation=editor_affiliation,
                department=editor_department,
                organisation=editor_college,
                contact=editor_contact,
                added_on=timezone.now()
            )
        
        # Check if this user is already an editor for this journal
        existing_role = UserRole.objects.filter(
            user_id=user.id,
            role="editor",
            journal_id=journal_id
        ).exists()
        
        if existing_role:
            return Response(
                {"detail": f"Editor {editor_email} is already assigned to this journal"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # If assigning as chief_editor, check if journal already has one
        if editor_type == "chief_editor":
            existing_chief = UserRole.objects.filter(
                journal_id=journal_id,
                role="editor",
                editor_type="chief_editor",
                status="approved"
            ).select_related('user').first()
            
            if existing_chief:
                chief_user = existing_chief.user
                chief_name = f"{chief_user.fname or ''} {chief_user.lname or ''}".strip() or chief_user.email
                return Response(
                    {"detail": f"Journal already has a chief editor ({chief_name}). Remove them first or assign as section_editor."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Create user_role entry for editor
        new_role = UserRole.objects.create(
            user_id=user.id,
            role="editor",
            status="approved",
            requested_at=timezone.now(),
            approved_at=timezone.now(),
            approved_by=request.user.id,
            journal_id=journal_id,
            editor_type=editor_type
        )
        
        # Return result
        result = {
            "id": new_role.id,
            "user_id": user.id,
            "editor_name": f"{user.fname or ''} {user.lname or ''}".strip() or user.email,
            "editor_email": user.email,
            "journal_id": journal_id,
            "role": "Editor",
            "editor_type": editor_type,
            "editor_affiliation": user.affiliation,
            "editor_department": user.department,
            "editor_college": user.organisation,
            "editor_contact": user.contact,
            "added_on": new_role.requested_at.isoformat() if new_role.requested_at else None,
            "journal_name": journal.fld_journal_name,
            "journal_short_form": journal.short_form
        }
        
        return Response(result, status=status.HTTP_201_CREATED)


class AdminJournalEditorsView(APIView):
    """
    GET /api/v1/admin/journals/{journal_id}/editors
    
    Get all editors assigned to a specific journal.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, journal_id):
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        # Verify journal exists
        try:
            journal = Journal.objects.get(fld_id=journal_id)
        except Journal.DoesNotExist:
            return Response(
                {"detail": f"Journal with ID {journal_id} not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Query user_role for this journal's editors
        results = UserRole.objects.filter(
            journal_id=journal_id,
            role="editor",
            status="approved"
        ).select_related('user').order_by('-editor_type', 'user__fname')
        
        chief_editor = None
        co_editor = None
        section_editors = []
        seen_emails = set()
        
        for user_role in results:
            user = user_role.user
            seen_emails.add((user.email or '').lower())
            editor_dict = {
                "id": user_role.id,
                "user_id": user.id,
                "editor_name": f"{user.fname or ''} {user.lname or ''}".strip() or user.email,
                "editor_email": user.email,
                "journal_id": user_role.journal_id,
                "role": "Editor",
                "editor_type": user_role.editor_type or "section_editor",
                "editor_affiliation": user.affiliation,
                "editor_department": user.department,
                "editor_college": user.organisation,
                "editor_contact": user.contact,
                "added_on": user_role.requested_at.isoformat() if user_role.requested_at else None,
                "source": "user_role",
            }
            
            if user_role.editor_type == "chief_editor":
                chief_editor = editor_dict
            elif user_role.editor_type == "co_editor":
                co_editor = editor_dict
            else:
                section_editors.append(editor_dict)
        
        # Also include editors from legacy editor table for this journal
        legacy_editors = Editor.objects.filter(journal_id=journal_id).order_by('-editor_type', 'editor_name')
        for editor in legacy_editors:
            email_lower = (editor.editor_email or '').lower()
            if email_lower and email_lower in seen_emails:
                continue
            seen_emails.add(email_lower)
            
            editor_dict = {
                "id": f"legacy_{editor.id}",
                "user_id": None,
                "editor_name": editor.editor_name or editor.editor_email or "",
                "editor_email": editor.editor_email,
                "journal_id": editor.journal_id,
                "role": editor.role or "Editor",
                "editor_type": editor.editor_type or "section_editor",
                "editor_affiliation": editor.editor_affiliation,
                "editor_department": editor.editor_department,
                "editor_college": editor.editor_college,
                "editor_contact": editor.editor_contact,
                "added_on": editor.added_on.isoformat() if editor.added_on else None,
                "source": "legacy",
            }
            
            if editor.editor_type == "chief_editor":
                if not chief_editor:
                    chief_editor = editor_dict
                else:
                    section_editors.append(editor_dict)
            elif editor.editor_type == "co_editor":
                if not co_editor:
                    co_editor = editor_dict
                else:
                    section_editors.append(editor_dict)
            else:
                section_editors.append(editor_dict)
        
        total_editors = (1 if chief_editor else 0) + (1 if co_editor else 0) + len(section_editors)
        
        return Response({
            "journal_id": journal_id,
            "journal_name": journal.fld_journal_name,
            "chief_editor": chief_editor,
            "co_editor": co_editor,
            "section_editors": section_editors,
            "total_editors": total_editors
        }, status=status.HTTP_200_OK)


class AdminEditorDetailView(APIView):
    """
    PUT /api/v1/admin/editors/{editor_id} - Update an editor assignment
    DELETE /api/v1/admin/editors/{editor_id} - Remove an editor assignment
    """
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, editor_id):
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        # Find user_role entry
        try:
            user_role = UserRole.objects.select_related('user').get(
                id=editor_id,
                role="editor"
            )
        except UserRole.DoesNotExist:
            return Response({"detail": "Editor assignment not found"}, status=status.HTTP_404_NOT_FOUND)
        
        user = user_role.user
        
        # Get update fields
        editor_name = request.data.get("editor_name")
        editor_type = request.data.get("editor_type")
        editor_affiliation = request.data.get("editor_affiliation")
        editor_department = request.data.get("editor_department")
        editor_college = request.data.get("editor_college")
        editor_contact = request.data.get("editor_contact")
        
        # Validate editor_type if provided
        if editor_type and editor_type not in ["chief_editor", "section_editor"]:
            return Response(
                {"detail": "Invalid editor_type. Must be 'chief_editor' or 'section_editor'"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # If changing to chief_editor, check if journal already has one
        if editor_type == "chief_editor" and user_role.editor_type != "chief_editor":
            existing_chief = UserRole.objects.filter(
                journal_id=user_role.journal_id,
                role="editor",
                editor_type="chief_editor",
                status="approved"
            ).exclude(id=editor_id).select_related('user').first()
            
            if existing_chief:
                chief_user = existing_chief.user
                chief_name = f"{chief_user.fname or ''} {chief_user.lname or ''}".strip() or chief_user.email
                return Response(
                    {"detail": f"Journal already has a chief editor ({chief_name})"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Update user_role fields
        if editor_type is not None:
            user_role.editor_type = editor_type
            user_role.save()
        
        # Update user profile fields
        if editor_name is not None:
            name_parts = editor_name.split(' ', 1)
            user.fname = name_parts[0]
            user.lname = name_parts[1] if len(name_parts) > 1 else None
        if editor_affiliation is not None:
            user.affiliation = editor_affiliation
        if editor_department is not None:
            user.department = editor_department
        if editor_college is not None:
            user.organisation = editor_college
        if editor_contact is not None:
            user.contact = editor_contact
        
        user.save()
        
        # Build result
        result = {
            "id": user_role.id,
            "user_id": user.id,
            "editor_name": f"{user.fname or ''} {user.lname or ''}".strip() or user.email,
            "editor_email": user.email,
            "journal_id": user_role.journal_id,
            "role": "Editor",
            "editor_type": user_role.editor_type or "section_editor",
            "editor_affiliation": user.affiliation,
            "editor_department": user.department,
            "editor_college": user.organisation,
            "editor_contact": user.contact,
            "added_on": user_role.requested_at.isoformat() if user_role.requested_at else None
        }
        
        # Add journal info
        if user_role.journal_id:
            try:
                journal = Journal.objects.get(fld_id=user_role.journal_id)
                result["journal_name"] = journal.fld_journal_name
                result["journal_short_form"] = journal.short_form
            except Journal.DoesNotExist:
                pass
        
        return Response(result, status=status.HTTP_200_OK)

    def delete(self, request, editor_id):
        """Remove an editor assignment."""
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        # Find user_role entry
        try:
            user_role = UserRole.objects.select_related('user').get(
                id=editor_id,
                role="editor"
            )
        except UserRole.DoesNotExist:
            return Response({"detail": "Editor assignment not found"}, status=status.HTTP_404_NOT_FOUND)
        
        user = user_role.user
        editor_name = f"{user.fname or ''} {user.lname or ''}".strip() or user.email if user else "Unknown"
        
        # Check if this is the last chief editor for the journal
        if user_role.editor_type == "chief_editor":
            other_editors = UserRole.objects.filter(
                journal_id=user_role.journal_id,
                role="editor",
                status="approved"
            ).exclude(id=editor_id).count()
            
            if other_editors == 0:
                return Response(
                    {"detail": "Cannot remove the only editor from a journal. Assign another editor first."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        user_role.delete()
        
        return Response(
            {"message": f"Editor '{editor_name}' removed successfully"},
            status=status.HTTP_200_OK
        )


class AdminUserCreateView(APIView):
    """
    POST /api/v1/admin/users/create
    
    Create a new user with specified role (Admin only).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        email = request.data.get("email")
        password = request.data.get("password")
        fname = request.data.get("fname")
        lname = request.data.get("lname")
        role = request.data.get("role", "author")
        
        if not email or not password or not fname:
            return Response(
                {"detail": "email, password, and fname are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate role
        allowed_roles = ["admin", "editor", "author", "reviewer"]
        if role not in allowed_roles:
            return Response(
                {"detail": f"Invalid role. Allowed: {allowed_roles}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if email already exists
        existing = User.objects.filter(email=email).first()
        if existing:
            return Response(
                {"detail": f"User with email {email} already exists"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Hash password
        from api.jwt_utils import hash_password
        hashed_password = hash_password(password)
        
        # Create user
        new_user = User.objects.create(
            email=email,
            password=hashed_password,
            fname=fname,
            lname=lname,
            role=role,
            added_on=datetime.utcnow()
        )
        
        return Response({
            "id": new_user.id,
            "email": new_user.email,
            "fname": new_user.fname,
            "lname": new_user.lname,
            "role": new_user.role,
            "message": f"User created successfully with role '{role}'"
        }, status=status.HTTP_201_CREATED)


class AdminPaperCorrespondenceView(APIView):
    """
    GET /api/v1/admin/papers/{paper_id}/correspondence - Get all correspondence for paper
    POST /api/v1/admin/papers/{paper_id}/correspondence - Send correspondence to author
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, paper_id):
        # Allow both admins and editors
        from .views_editor import check_editor_role
        if not check_editor_role(request.user):
            return Response({"detail": "Admin or Editor access required"}, status=status.HTTP_403_FORBIDDEN)
        
        # Verify paper exists
        paper = Paper.objects.filter(id=paper_id).first()
        if not paper:
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)
        
        correspondence = PaperCorrespondence.objects.filter(
            paper_id=paper_id
        ).order_by("-sent_at", "-created_at")
        
        result = []
        for corr in correspondence:
            corr_dict = {
                "id": corr.id,
                "paper_id": corr.paper_id,
                "sender_id": corr.sender_id,
                "sender_role": corr.sender_role,
                "recipient_email": corr.recipient_email,
                "recipient_name": corr.recipient_name,
                "subject": corr.subject,
                "body": corr.body,
                "email_type": corr.email_type,
                "status_at_send": corr.status_at_send,
                "is_read": corr.is_read,
                "read_at": corr.read_at.isoformat() if corr.read_at else None,
                "delivery_status": corr.delivery_status,
                "created_at": corr.created_at.isoformat() if corr.created_at else None,
                "sent_at": corr.sent_at.isoformat() if corr.sent_at else None,
            }
            
            # Add sender info
            if corr.sender_id:
                sender = User.objects.filter(id=corr.sender_id).first()
                if sender:
                    corr_dict["sender_name"] = f"{sender.fname or ''} {sender.lname or ''}".strip() or sender.email
                    corr_dict["sender_email"] = sender.email
            
            result.append(corr_dict)
        
        return Response({
            "correspondence": result,
            "total": len(result),
            "paper_id": paper_id,
            "paper_title": paper.title
        }, status=status.HTTP_200_OK)

    def post(self, request, paper_id):
        import re
        
        # Allow both admins and editors
        from .views_editor import check_editor_role
        if not check_editor_role(request.user):
            return Response({"detail": "Admin or Editor access required"}, status=status.HTTP_403_FORBIDDEN)
        
        # Determine role for correspondence record
        user_role = (getattr(request.user, 'role', '') or '').lower()
        if user_role not in ('admin', 'editor'):
            user_role = 'editor'
        
        # Request data
        subject = request.data.get("subject")
        message = request.data.get("message")
        placeholders = request.data.get("placeholders", {})
        send_email = request.data.get("send_email", True)
        
        if not subject or not message:
            return Response(
                {"detail": "Both subject and message are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify paper exists and get author info
        paper = Paper.objects.filter(id=paper_id).first()
        if not paper:
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Get author
        author = None
        if paper.added_by and paper.added_by.isdigit():
            author = User.objects.filter(id=int(paper.added_by)).first()
        if not author:
            return Response({"detail": "Paper author not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Get journal info
        journal = Journal.objects.filter(fld_id=paper.journal).first()
        journal_name = journal.fld_journal_name if journal else "Breakthrough Publishers India Journal"
        
        # Author name
        author_name = f"{author.fname or ''} {author.lname or ''}".strip() or author.email
        sender_name = f"{request.user.fname or ''} {request.user.lname or ''}".strip() or request.user.email
        
        # Default placeholders
        default_placeholders = {
            "author_name": author_name,
            "paper_title": paper.title,
            "paper_id": str(paper.id),
            "journal_name": journal_name,
            "sender_name": sender_name,
            "current_status": paper.status,
        }
        
        # Merge placeholders
        all_placeholders = {**default_placeholders, **{k: v for k, v in placeholders.items() if v}}
        
        # Substitute placeholders
        def substitute_placeholders(text, values):
            for key, value in values.items():
                text = re.sub(r'\{\{' + key + r'\}\}', str(value or ''), text, flags=re.IGNORECASE)
            return text
        
        final_subject = substitute_placeholders(subject, all_placeholders)
        final_message = substitute_placeholders(message, all_placeholders)
        
        # Create correspondence record
        correspondence = PaperCorrespondence.objects.create(
            paper_id=paper_id,
            sender_id=request.user.id,
            sender_role=user_role,
            recipient_email=author.email,
            recipient_name=author_name,
            subject=final_subject,
            body=final_message,
            email_type="general_inquiry",
            status_at_send=paper.status,
            delivery_status="pending",
            is_read=False,
            created_at=datetime.utcnow()
        )
        
        # Send actual email if requested
        email_sent = False
        if send_email:
            from .services.email_service import send_correspondence_email
            email_sent = send_correspondence_email(correspondence)
        
        return Response({
            "message": "Correspondence sent successfully",
            "correspondence": {
                "id": correspondence.id,
                "paper_id": correspondence.paper_id,
                "recipient_email": correspondence.recipient_email,
                "recipient_name": correspondence.recipient_name,
                "subject": correspondence.subject,
                "delivery_status": correspondence.delivery_status,
                "created_at": correspondence.created_at.isoformat() if correspondence.created_at else None,
                "sent_at": correspondence.sent_at.isoformat() if correspondence.sent_at else None,
            },
            "email_sent": email_sent,
            "recipient": {
                "name": author_name,
                "email": author.email
            }
        }, status=status.HTTP_201_CREATED)


# ============================================================================
# PHASE 5: ADMIN PUBLISHED PAPERS & DOI
# ============================================================================

class AdminPublishedPapersListView(APIView):
    """
    GET /api/v1/admin/published-papers
    List all published papers with filtering options.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        skip = int(request.query_params.get("skip", 0))
        limit = int(request.query_params.get("limit", 50))
        access_type = request.query_params.get("access_type")
        doi_status = request.query_params.get("doi_status")
        journal_id = request.query_params.get("journal_id")
        
        query = PaperPublished.objects.all()
        
        if access_type:
            query = query.filter(access_type=access_type)
        if doi_status:
            query = query.filter(doi_status=doi_status)
        if journal_id:
            query = query.filter(journal_id=int(journal_id))
        
        total = query.count()
        papers = query.order_by("-date")[skip:skip+limit]
        
        result = []
        for paper in papers:
            result.append({
                "id": paper.id,
                "title": paper.title,
                "author": paper.author,
                "journal_id": paper.journal_id,
                "doi": paper.doi,
                "doi_status": paper.doi_status,
                "access_type": paper.access_type,
                "date": paper.date.isoformat() if paper.date else None,
                "volume": paper.volume,
                "issue": paper.issue,
                "pages": paper.pages,
            })
        
        return Response({
            "total": total,
            "skip": skip,
            "limit": limit,
            "papers": result
        }, status=status.HTTP_200_OK)


class AdminPublishedPaperDetailView(APIView):
    """
    GET /api/v1/admin/published-papers/{paper_id}
    Get detailed information about a published paper.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, paper_id):
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        paper = PaperPublished.objects.filter(id=paper_id).first()
        if not paper:
            return Response({"detail": "Published paper not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Get original submission if linked
        original_submission = None
        if paper.paper_submission_id:
            original = Paper.objects.filter(id=paper.paper_submission_id).first()
            if original:
                original_submission = {
                    "id": original.id,
                    "paper_code": original.paper_code,
                    "submitted_date": original.added_on.isoformat() if original.added_on else None,
                    "status": original.status
                }
        
        return Response({
            "id": paper.id,
            "title": paper.title,
            "author": paper.author,
            "abstract": paper.abstract,
            "keyword": paper.keyword,
            "journal_id": paper.journal_id,
            "doi": paper.doi,
            "doi_url": f"https://doi.org/{paper.doi}" if paper.doi else None,
            "doi_status": paper.doi_status,
            "access_type": paper.access_type,
            "date": paper.date.isoformat() if paper.date else None,
            "volume": paper.volume,
            "issue": paper.issue,
            "pages": paper.pages,
            "file": paper.file,
            "downloads": paper.downloads,
            "original_submission": original_submission
        }, status=status.HTTP_200_OK)


class AdminTriggerCopyrightView(APIView):
    """
    POST /api/v1/admin/papers/{paper_id}/trigger-copyright-form
    Trigger copyright form creation for an accepted paper.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, paper_id):
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        paper = Paper.objects.filter(id=paper_id).first()
        if not paper:
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)
        
        if paper.status != "accepted":
            return Response(
                {"detail": "Paper must be in 'accepted' status to create copyright form"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if form already exists and completed
        existing_form = CopyrightForm.objects.filter(paper_id=paper_id).first()
        if existing_form and existing_form.status == "completed":
            return Response(
                {"detail": "Copyright form already completed for this paper"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get author info
        author = None
        if paper.added_by and paper.added_by.isdigit():
            author = User.objects.filter(id=int(paper.added_by)).first()
        
        if not author:
            return Response({"detail": "Could not find author for this paper"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create or update copyright form
        deadline = datetime.utcnow() + timedelta(hours=48)
        
        if existing_form:
            existing_form.status = "pending"
            existing_form.deadline = deadline
            existing_form.reminder_count = 0
            existing_form.save()
            copyright_form = existing_form
        else:
            copyright_form = CopyrightForm.objects.create(
                paper_id=paper_id,
                author_id=author.id,
                status="pending",
                deadline=deadline,
                reminder_count=0,
                author_name=f"{author.fname or ''} {author.lname or ''}".strip(),
                author_affiliation=author.affiliation or "",
                created_at=datetime.utcnow()
            )
        
        author_name = f"{author.fname or ''} {author.lname or ''}".strip() or "Author"
        
        return Response({
            "success": True,
            "paper_id": paper.id,
            "paper_title": paper.title,
            "copyright_form_id": copyright_form.id,
            "status": copyright_form.status,
            "deadline": copyright_form.deadline.isoformat() if copyright_form.deadline else None,
            "author_email": author.email,
            "message": "Copyright form created. Notification should be sent to author."
        }, status=status.HTTP_201_CREATED)


class AdminDOIStatisticsView(APIView):
    """
    GET /api/v1/admin/doi-statistics
    Get DOI registration statistics.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        total_published = PaperPublished.objects.count()
        doi_registered = PaperPublished.objects.filter(doi_status="registered").count()
        doi_pending = PaperPublished.objects.filter(doi_status="pending").count()
        doi_failed = PaperPublished.objects.filter(doi_status="failed").count()
        no_doi = PaperPublished.objects.filter(doi__isnull=True).count()
        
        subscription_access = PaperPublished.objects.filter(access_type="subscription").count()
        open_access = PaperPublished.objects.filter(access_type="open").count()
        
        return Response({
            "total_published": total_published,
            "doi_statistics": {
                "registered": doi_registered,
                "pending": doi_pending,
                "failed": doi_failed,
                "no_doi": no_doi
            },
            "access_statistics": {
                "subscription": subscription_access,
                "open": open_access
            }
        }, status=status.HTTP_200_OK)


# ============================================================================
# PHASE 7: ADMIN NEWS MANAGEMENT
# ============================================================================

class AdminNewsListCreateView(APIView):
    """
    GET /api/v1/admin/news - List all news items
    POST /api/v1/admin/news - Create a news item
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        skip = int(request.query_params.get("skip", 0))
        limit = int(request.query_params.get("limit", 20))
        journal_id = request.query_params.get("journal_id")
        
        query = News.objects.all()
        if journal_id:
            query = query.filter(journal_id=int(journal_id))
        
        total = query.count()
        news_items = query.order_by("-added_on")[skip:skip+limit]
        
        result = []
        for item in news_items:
            result.append({
                "id": item.id,
                "title": item.title,
                "description": item.description,
                "added_on": item.added_on.isoformat() if item.added_on else None,
                "journal_id": item.journal_id
            })
        
        return Response({
            "total": total,
            "skip": skip,
            "limit": limit,
            "news": result
        }, status=status.HTTP_200_OK)

    def post(self, request):
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        title = request.data.get("title")
        description = request.data.get("description")
        journal_id = request.data.get("journal_id")
        
        if not title:
            return Response({"detail": "Title is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        from datetime import date
        news = News.objects.create(
            title=title,
            description=description,
            journal_id=journal_id,
            added_on=date.today()
        )
        
        return Response({
            "id": news.id,
            "title": news.title,
            "description": news.description,
            "added_on": news.added_on.isoformat() if news.added_on else None,
            "journal_id": news.journal_id,
            "message": "News item created successfully"
        }, status=status.HTTP_201_CREATED)


class AdminNewsDetailView(APIView):
    """
    GET /api/v1/admin/news/{news_id} - Get news detail
    PUT /api/v1/admin/news/{news_id} - Update news item
    DELETE /api/v1/admin/news/{news_id} - Delete news item
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, news_id):
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        news = News.objects.filter(id=news_id).first()
        if not news:
            return Response({"detail": "News item not found"}, status=status.HTTP_404_NOT_FOUND)
        
        return Response({
            "id": news.id,
            "title": news.title,
            "description": news.description,
            "added_on": news.added_on.isoformat() if news.added_on else None,
            "journal_id": news.journal_id
        }, status=status.HTTP_200_OK)

    def put(self, request, news_id):
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        news = News.objects.filter(id=news_id).first()
        if not news:
            return Response({"detail": "News item not found"}, status=status.HTTP_404_NOT_FOUND)
        
        title = request.data.get("title")
        description = request.data.get("description")
        journal_id = request.data.get("journal_id")
        
        if title is not None:
            news.title = title
        if description is not None:
            news.description = description
        if journal_id is not None:
            news.journal_id = journal_id
        
        news.save()
        
        return Response({
            "id": news.id,
            "title": news.title,
            "description": news.description,
            "added_on": news.added_on.isoformat() if news.added_on else None,
            "journal_id": news.journal_id,
            "message": "News item updated successfully"
        }, status=status.HTTP_200_OK)

    def delete(self, request, news_id):
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        news = News.objects.filter(id=news_id).first()
        if not news:
            return Response({"detail": "News item not found"}, status=status.HTTP_404_NOT_FOUND)
        
        news.delete()
        
        return Response({"message": "News item deleted successfully"}, status=status.HTTP_200_OK)


# ============================================================================
# PHASE 8: EMAIL TEMPLATES
# ============================================================================

class AdminEmailTemplateListCreateView(APIView):
    """
    GET /api/v1/admin/email-templates - List all email templates
    POST /api/v1/admin/email-templates - Create an email template
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        category = request.query_params.get("category")
        
        query = EmailTemplate.objects.all()
        if category:
            query = query.filter(category=category)
        
        templates = query.order_by("category", "name")
        
        result = []
        for t in templates:
            result.append({
                "id": t.id,
                "name": t.name,
                "slug": t.slug,
                "subject": t.subject,
                "category": t.category,
                "is_active": t.is_active,
                "placeholders": t.placeholders,
                "created_at": t.created_at.isoformat() if t.created_at else None
            })
        
        return Response({
            "total": len(result),
            "templates": result
        }, status=status.HTTP_200_OK)

    def post(self, request):
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        name = request.data.get("name")
        slug = request.data.get("slug")
        subject = request.data.get("subject")
        body_template = request.data.get("body_template")
        category = request.data.get("category", "general")
        placeholders = request.data.get("placeholders", "")
        
        if not all([name, slug, subject, body_template]):
            return Response(
                {"detail": "name, slug, subject, and body_template are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check slug uniqueness
        if EmailTemplate.objects.filter(slug=slug).exists():
            return Response({"detail": f"Template with slug '{slug}' already exists"}, status=status.HTTP_400_BAD_REQUEST)
        
        template = EmailTemplate.objects.create(
            name=name,
            slug=slug,
            subject=subject,
            body_template=body_template,
            category=category,
            placeholders=placeholders,
            is_active=True,
            created_at=datetime.utcnow()
        )
        
        return Response({
            "id": template.id,
            "name": template.name,
            "slug": template.slug,
            "subject": template.subject,
            "category": template.category,
            "message": "Email template created successfully"
        }, status=status.HTTP_201_CREATED)


class AdminEmailTemplateDetailView(APIView):
    """
    GET /api/v1/admin/email-templates/{template_id} - Get template detail
    PUT /api/v1/admin/email-templates/{template_id} - Update template
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, template_id):
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        template = EmailTemplate.objects.filter(id=template_id).first()
        if not template:
            return Response({"detail": "Email template not found"}, status=status.HTTP_404_NOT_FOUND)
        
        return Response({
            "id": template.id,
            "name": template.name,
            "slug": template.slug,
            "subject": template.subject,
            "body_template": template.body_template,
            "category": template.category,
            "placeholders": template.placeholders,
            "is_active": template.is_active,
            "created_at": template.created_at.isoformat() if template.created_at else None,
            "updated_at": template.updated_at.isoformat() if template.updated_at else None
        }, status=status.HTTP_200_OK)

    def put(self, request, template_id):
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        template = EmailTemplate.objects.filter(id=template_id).first()
        if not template:
            return Response({"detail": "Email template not found"}, status=status.HTTP_404_NOT_FOUND)
        
        name = request.data.get("name")
        subject = request.data.get("subject")
        body_template = request.data.get("body_template")
        category = request.data.get("category")
        placeholders = request.data.get("placeholders")
        is_active = request.data.get("is_active")
        
        if name is not None:
            template.name = name
        if subject is not None:
            template.subject = subject
        if body_template is not None:
            template.body_template = body_template
        if category is not None:
            template.category = category
        if placeholders is not None:
            template.placeholders = placeholders
        if is_active is not None:
            template.is_active = is_active
        
        template.updated_at = datetime.utcnow()
        template.save()
        
        return Response({
            "id": template.id,
            "name": template.name,
            "slug": template.slug,
            "subject": template.subject,
            "category": template.category,
            "message": "Email template updated successfully"
        }, status=status.HTTP_200_OK)


# ============================================================================
# PHASE 9: ADMIN ANALYTICS
# ============================================================================

class AdminSubmissionTrendsView(APIView):
    """
    GET /api/v1/admin/analytics/submission-trends
    Monthly submission counts.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        months_back = int(request.query_params.get("months", 12))
        
        from django.db.models.functions import TruncMonth
        
        # Get submission trends
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=months_back * 30)
        
        submissions = Paper.objects.filter(
            added_on__gte=start_date
        ).annotate(
            month=TruncMonth('added_on')
        ).values('month').annotate(
            count=Count('id')
        ).order_by('month')
        
        # Get accepted papers
        accepted = Paper.objects.filter(
            added_on__gte=start_date,
            status="accepted"
        ).annotate(
            month=TruncMonth('added_on')
        ).values('month').annotate(
            count=Count('id')
        ).order_by('month')
        
        accepted_dict = {a['month']: a['count'] for a in accepted}
        
        trends = []
        for s in submissions:
            if s['month']:
                trends.append({
                    "label": s['month'].strftime('%b %Y'),
                    "submissions": s['count'],
                    "accepted": accepted_dict.get(s['month'], 0)
                })
        
        return Response({
            "trends": trends
        }, status=status.HTTP_200_OK)


class AdminTopReviewersView(APIView):
    """
    GET /api/v1/admin/analytics/top-reviewers
    Reviewers ranked by completions.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        limit = int(request.query_params.get("limit", 10))
        
        # Get top reviewers by completed reviews
        reviewers = OnlineReview.objects.filter(
            review_status="completed"
        ).values('reviewer_id').annotate(
            completed_count=Count('id')
        ).order_by('-completed_count')[:limit]
        
        result = []
        for r in reviewers:
            reviewer = User.objects.filter(id=int(r['reviewer_id'])).first() if r['reviewer_id'] else None
            if reviewer:
                result.append({
                    "reviewer_id": reviewer.id,
                    "name": f"{reviewer.fname or ''} {reviewer.lname or ''}".strip() or reviewer.email,
                    "email": reviewer.email,
                    "reviews_completed": r['completed_count'],
                    "affiliation": reviewer.affiliation
                })
        
        return Response({
            "reviewers": result,
            "total": len(result)
        }, status=status.HTTP_200_OK)


class AdminStatusDistributionView(APIView):
    """
    GET /api/v1/admin/analytics/status-distribution
    Papers by status.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        STATUS_COLORS = {
            'submitted': '#3B82F6',
            'under_review': '#F59E0B',
            'accepted': '#10B981',
            'rejected': '#EF4444',
            'published': '#8B5CF6',
            'revision_requested': '#06B6D4',
            'withdrawn': '#6B7280',
            'pending': '#F97316',
        }
        
        distribution = Paper.objects.values('status').annotate(
            count=Count('id')
        ).order_by('status')
        
        result = []
        for d in distribution:
            if d['status']:
                result.append({
                    "status": d['status'],
                    "count": d['count'],
                    "color": STATUS_COLORS.get(d['status'], '#6B7280')
                })
        
        return Response({
            "distribution": result,
            "total": sum(d['count'] for d in result)
        }, status=status.HTTP_200_OK)


class AdminJournalStatsView(APIView):
    """
    GET /api/v1/admin/analytics/journal-stats
    Per-journal metrics.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        journals = Journal.objects.all()
        
        result = []
        for j in journals:
            total_submissions = Paper.objects.filter(journal=j.fld_id).count()
            accepted = Paper.objects.filter(journal=j.fld_id, status="accepted").count()
            under_review = Paper.objects.filter(journal=j.fld_id, status="under_review").count()
            rejected = Paper.objects.filter(journal=j.fld_id, status="rejected").count()
            published = PaperPublished.objects.filter(journal_id=j.fld_id).count()
            
            acceptance_rate = (accepted / total_submissions * 100) if total_submissions > 0 else 0
            
            result.append({
                "journal_id": j.fld_id,
                "journal_name": j.fld_journal_name,
                "short_form": j.short_form,
                "total_submissions": total_submissions,
                "accepted": accepted,
                "under_review": under_review,
                "rejected": rejected,
                "published": published,
                "acceptance_rate": round(acceptance_rate, 1)
            })
        
        return Response({
            "journal_stats": result,
            "total_journals": len(result)
        }, status=status.HTTP_200_OK)


class AdminUserGrowthView(APIView):
    """
    GET /api/v1/admin/analytics/user-growth
    User registration trends grouped by month and role.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        months_back = int(request.query_params.get("months", 12))
        
        from django.db.models.functions import TruncMonth
        
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=months_back * 30)
        
        growth = User.objects.filter(
            added_on__gte=start_date
        ).annotate(
            month=TruncMonth('added_on')
        ).values('month', 'role').annotate(
            count=Count('id')
        ).order_by('month', 'role')
        
        # Organize by month
        months_data = {}
        for g in growth:
            if g['month']:
                month_str = g['month'].strftime('%Y-%m')
                label = g['month'].strftime('%b %Y')
                if month_str not in months_data:
                    months_data[month_str] = {"label": label, "new_users": 0}
                months_data[month_str]["new_users"] += g['count']
        
        growth_list = [months_data[k] for k in sorted(months_data.keys())]
        
        return Response({
            "growth": growth_list
        }, status=status.HTTP_200_OK)


class AdminReviewMetricsView(APIView):
    """
    GET /api/v1/admin/analytics/review-metrics
    Review completion rates and metrics.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not check_admin_role(request.user):
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        total_reviews = ReviewSubmission.objects.filter(status="submitted").count()
        
        # Average ratings from submitted reviews
        from django.db.models import Avg
        averages = ReviewSubmission.objects.filter(status="submitted").aggregate(
            avg_technical=Avg('technical_quality'),
            avg_clarity=Avg('clarity'),
            avg_originality=Avg('originality'),
            avg_significance=Avg('significance'),
        )
        
        average_ratings = {
            "technical_quality": round(averages['avg_technical'] or 0, 1),
            "clarity": round(averages['avg_clarity'] or 0, 1),
            "originality": round(averages['avg_originality'] or 0, 1),
            "significance": round(averages['avg_significance'] or 0, 1),
        }
        
        # Recommendation distribution
        rec_dist = ReviewSubmission.objects.filter(
            status="submitted"
        ).exclude(
            recommendation__isnull=True
        ).values('recommendation').annotate(
            count=Count('id')
        ).order_by('recommendation')
        
        recommendation_distribution = [
            {"recommendation": r['recommendation'], "count": r['count']}
            for r in rec_dist
        ]
        
        # Also include assignment-level stats
        total_assignments = OnlineReview.objects.count()
        completed = OnlineReview.objects.filter(review_status="completed").count()
        pending = OnlineReview.objects.filter(review_status="pending").count()
        completion_rate = (completed / total_assignments * 100) if total_assignments > 0 else 0
        
        return Response({
            "total_reviews": total_reviews,
            "average_ratings": average_ratings,
            "recommendation_distribution": recommendation_distribution,
            "total_assignments": total_assignments,
            "completed": completed,
            "pending": pending,
            "completion_rate": round(completion_rate, 1)
        }, status=status.HTTP_200_OK)

