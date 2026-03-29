from datetime import datetime

from django.db.models import F
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Journal, RoleRequest, User, UserRole
from .serializers import (
    RoleRequestCreateSerializer,
    RoleRequestProcessSerializer,
    SwitchRoleSerializer,
)

REQUESTABLE_ROLES = ["author", "reviewer", "editor"]
ALL_ROLES = ["author", "reviewer", "editor", "admin"]


class MyRolesView(APIView):
    def get(self, request):
        user = request.user
        user_id = user.id

        approved_roles = UserRole.objects.filter(user_id=user_id, status="approved")
        pending_requests = RoleRequest.objects.filter(
            user_id=user_id, status="pending"
        ).order_by("-requested_at")

        approved_list = []
        approved_role_names = set()
        for ur in approved_roles:
            journal_name = None
            if ur.journal_id:
                try:
                    journal = Journal.objects.get(fld_id=ur.journal_id)
                    journal_name = journal.fld_journal_name
                except Journal.DoesNotExist:
                    pass

            approved_list.append(
                {
                    "id": ur.id,
                    "role": ur.role,
                    "status": ur.status,
                    "requested_at": ur.requested_at,
                    "approved_at": ur.approved_at,
                    "journal_id": ur.journal_id,
                    "journal_name": journal_name,
                }
            )
            approved_role_names.add(ur.role.lower())

        pending_list = []
        pending_role_names = set()
        for pr in pending_requests:
            pending_list.append(
                {
                    "id": pr.id,
                    "user_id": pr.user_id,
                    "requested_role": pr.requested_role,
                    "status": pr.status,
                    "reason": pr.reason,
                    "requested_at": pr.requested_at,
                    "processed_by": pr.processed_by,
                    "processed_at": pr.processed_at,
                    "admin_notes": pr.admin_notes,
                }
            )
            pending_role_names.add(pr.requested_role.lower())

        available_roles = [
            role
            for role in REQUESTABLE_ROLES
            if role.lower() not in approved_role_names
            and role.lower() not in pending_role_names
        ]

        active_role = (user.role or "").lower()
        if not active_role or active_role == "user":
            active_role = approved_list[0]["role"] if approved_list else "user"

        return Response(
            {
                "user_id": user_id,
                "user_email": user.email,
                "active_role": active_role,
                "approved_roles": approved_list,
                "pending_requests": pending_list,
                "available_roles": available_roles,
            },
            status=status.HTTP_200_OK,
        )


class RoleRequestView(APIView):
    def post(self, request):
        serializer = RoleRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user_id = request.user.id
        requested_role = data["requested_role"].lower()

        if requested_role not in REQUESTABLE_ROLES:
            return Response(
                {"detail": f"Cannot request '{requested_role}'. Requestable roles: {REQUESTABLE_ROLES}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if UserRole.objects.filter(
            user_id=user_id, role__iexact=requested_role, status="approved"
        ).exists():
            return Response(
                {"detail": f"You already have the '{requested_role}' role"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if RoleRequest.objects.filter(
            user_id=user_id, requested_role__iexact=requested_role, status="pending"
        ).exists():
            return Response(
                {"detail": f"You already have a pending request for the '{requested_role}' role"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_request = RoleRequest.objects.create(
            user_id=user_id,
            requested_role=requested_role,
            reason=data.get("reason"),
            status="pending",
            requested_at=datetime.utcnow(),
        )

        return Response(
            {
                "message": f"Role request for '{requested_role}' submitted successfully",
                "request_id": new_request.id,
                "status": "pending",
            },
            status=status.HTTP_201_CREATED,
        )


class SwitchRoleView(APIView):
    def post(self, request):
        serializer = SwitchRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        target_role = serializer.validated_data["role"].lower()

        user = request.user
        user_id = user.id

        has_role = UserRole.objects.filter(
            user_id=user_id, role__iexact=target_role, status="approved"
        ).exists()

        is_admin = (user.role or "").lower() == "admin"

        if not has_role and not is_admin:
            return Response(
                {"detail": f"You don't have the '{target_role}' role. Request access first."},
                status=status.HTTP_403_FORBIDDEN,
            )

        user.role = target_role.capitalize()
        user.save(update_fields=["role"])

        return Response(
            {
                "success": True,
                "active_role": target_role,
                "message": f"Successfully switched to {target_role} role",
            },
            status=status.HTTP_200_OK,
        )


class AdminRoleRequestsView(APIView):
    def get(self, request):
        if (request.user.role or "").lower() != "admin":
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)

        status_filter = request.query_params.get("status_filter")
        skip = int(request.query_params.get("skip", 0))
        limit = int(request.query_params.get("limit", 20))

        queryset = RoleRequest.objects.all()
        if status_filter:
            queryset = queryset.filter(status=status_filter.lower())

        total = queryset.count()
        pending_count = RoleRequest.objects.filter(status="pending").count()

        requests = queryset.order_by("-requested_at")[skip : skip + limit]

        request_list = []
        for req in requests:
            try:
                user = User.objects.get(id=req.user_id)
                user_name = f"{user.fname or ''} {user.lname or ''}".strip()
                user_email = user.email
            except User.DoesNotExist:
                user_name = None
                user_email = None

            request_list.append(
                {
                    "id": req.id,
                    "user_id": req.user_id,
                    "requested_role": req.requested_role,
                    "status": req.status,
                    "reason": req.reason,
                    "requested_at": req.requested_at,
                    "processed_by": req.processed_by,
                    "processed_at": req.processed_at,
                    "admin_notes": req.admin_notes,
                    "user_name": user_name,
                    "user_email": user_email,
                }
            )

        return Response(
            {"total": total, "pending": pending_count, "requests": request_list},
            status=status.HTTP_200_OK,
        )


class AdminProcessRoleRequestView(APIView):
    def patch(self, request, request_id):
        if (request.user.role or "").lower() != "admin":
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)

        serializer = RoleRequestProcessSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            role_request = RoleRequest.objects.get(id=request_id)
        except RoleRequest.DoesNotExist:
            return Response({"detail": "Role request not found"}, status=status.HTTP_404_NOT_FOUND)

        if role_request.status != "pending":
            return Response(
                {"detail": f"Request already processed with status: {role_request.status}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        admin_id = request.user.id
        action = data["action"].lower()

        db_now = datetime.utcnow()

        if action == "approve":
            UserRole.objects.create(
                user_id=role_request.user_id,
                role=role_request.requested_role,
                status="approved",
                requested_at=role_request.requested_at,
                approved_by=admin_id,
                approved_at=db_now,
                journal_id=data.get("journal_id") if role_request.requested_role == "editor" else None,
            )

            role_request.status = "approved"
            role_request.processed_by = admin_id
            role_request.processed_at = db_now
            role_request.admin_notes = data.get("admin_notes")
            role_request.save()

            return Response(
                {
                    "message": f"Role request approved. User now has '{role_request.requested_role}' access.",
                    "request_id": request_id,
                    "status": "approved",
                },
                status=status.HTTP_200_OK,
            )

        elif action == "reject":
            role_request.status = "rejected"
            role_request.processed_by = admin_id
            role_request.processed_at = db_now
            role_request.admin_notes = data.get("admin_notes")
            role_request.save()

            return Response(
                {"message": "Role request rejected.", "request_id": request_id, "status": "rejected"},
                status=status.HTTP_200_OK,
            )


class AdminUserRolesView(APIView):
    def get(self, request, user_id):
        if (request.user.role or "").lower() != "admin":
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        roles = UserRole.objects.filter(user_id=user_id, status="approved")

        roles_list = []
        for role in roles:
            role_data = {
                "id": role.id,
                "user_id": role.user_id,
                "role": role.role,
                "status": role.status,
                "requested_at": role.requested_at,
                "approved_by": role.approved_by,
                "approved_at": role.approved_at,
                "rejected_reason": role.rejected_reason,
                "journal_id": role.journal_id,
                "editor_type": role.editor_type,
            }
            if role.journal_id:
                try:
                    journal = Journal.objects.get(fld_id=role.journal_id)
                    role_data["journal_name"] = journal.fld_journal_name
                except Journal.DoesNotExist:
                    role_data["journal_name"] = None
            roles_list.append(role_data)

        return Response(
            {
                "user_id": user_id,
                "user_name": f"{user.fname or ''} {user.lname or ''}".strip(),
                "user_email": user.email,
                "legacy_role": user.role,
                "roles": roles_list,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request, user_id):
        if (request.user.role or "").lower() != "admin":
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)

        role = request.query_params.get("role", "").lower()
        if role not in ALL_ROLES:
            return Response(
                {"detail": f"Invalid role. Must be one of: {ALL_ROLES}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        if UserRole.objects.filter(user_id=user_id, role__iexact=role, status="approved").exists():
            return Response({"detail": f"User already has the '{role}' role"}, status=status.HTTP_400_BAD_REQUEST)

        journal_id = request.query_params.get("journal_id")
        if journal_id:
            try:
                journal_id = int(journal_id)
            except ValueError:
                journal_id = None

        db_now = datetime.utcnow()
        UserRole.objects.create(
            user_id=user_id,
            role=role,
            status="approved",
            requested_at=db_now,
            approved_by=request.user.id,
            approved_at=db_now,
            journal_id=journal_id if role == "editor" else None,
        )

        return Response(
            {"message": f"Role '{role}' assigned to user successfully", "user_id": user_id, "role": role},
            status=status.HTTP_200_OK,
        )


class AdminRevokeUserRoleView(APIView):
    def delete(self, request, user_id, role):
        if (request.user.role or "").lower() != "admin":
            return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)

        role = role.lower()

        try:
            user_role = UserRole.objects.get(user_id=user_id, role__iexact=role)
            user_role.delete()
        except UserRole.DoesNotExist:
            return Response(
                {"detail": f"User does not have the '{role}' role"},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {"message": f"Role '{role}' revoked from user", "user_id": user_id, "role": role},
            status=status.HTTP_200_OK,
        )
