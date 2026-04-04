from datetime import timedelta

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .jwt_utils import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
    verify_token,
)
from .models import User, PaperCoAuthor
from .serializers import (
    PasswordChangeSerializer,
    RefreshTokenSerializer,
    SignupSerializer,
    TokenResponseSerializer,
    UserLoginSerializer,
    UserResponseSerializer,
)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            user = User.objects.get(email=data["email"])
        except User.DoesNotExist:
            return Response(
                {"detail": "Invalid credentials"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not verify_password(data["password"], user.password):
            return Response(
                {"detail": "Invalid credentials"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        access_token_expires = timedelta(hours=24)
        access_token = create_access_token(
            data={"sub": str(user.id), "email": user.email},
            expires_delta=access_token_expires,
        )
        refresh_token = create_refresh_token(
            data={"sub": str(user.id), "email": user.email},
        )

        resp = {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": 86400,
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "fname": user.fname,
            "lname": user.lname,
            "affiliation": user.affiliation,
            "organisation": user.organisation,
        }
        out = TokenResponseSerializer(resp)
        return Response(out.data, status=status.HTTP_200_OK)


class SignupView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if data["password"] != data["confirm_password"]:
            return Response(
                {"detail": "Passwords do not match"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(email=data["email"]).exists():
            return Response(
                {"detail": f"Email {data['email']} is already registered"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from django.utils import timezone
        user = User.objects.create(
            email=data["email"],
            password=hash_password(data["password"]),
            fname=data["fname"],
            lname=data["lname"],
            mname=data.get("mname", "") or "",
            title=data.get("title", "") or "",
            affiliation=data.get("affiliation"),
            specialization=data.get("specialization"),
            contact=data.get("contact"),
            address=data.get("address"),
            role="author",
            added_on=timezone.now(),
        )

        access_token_expires = timedelta(hours=24)
        access_token = create_access_token(
            data={"sub": str(user.id), "email": user.email},
            expires_delta=access_token_expires,
        )
        refresh_token = create_refresh_token(
            data={"sub": str(user.id), "email": user.email},
        )

        resp = {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": 86400,
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "fname": user.fname,
            "lname": user.lname,
            "affiliation": user.affiliation,
            "organisation": user.organisation,
        }
        out = TokenResponseSerializer(resp)
        return Response(out.data, status=status.HTTP_201_CREATED)


class RefreshTokenView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RefreshTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = verify_token(serializer.validated_data["refresh_token"])

        if payload is None or payload.get("type") != "refresh":
            return Response(
                {"detail": "Invalid or expired refresh token"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        user_id = payload.get("sub")

        try:
            user = User.objects.get(id=int(user_id))
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )

        access_token_expires = timedelta(hours=24)
        access_token = create_access_token(
            data={"sub": str(user.id), "email": user.email},
            expires_delta=access_token_expires,
        )

        resp = {
            "access_token": access_token,
            "refresh_token": serializer.validated_data["refresh_token"],
            "token_type": "bearer",
            "expires_in": 86400,
        }
        out = TokenResponseSerializer(resp)
        return Response(out.data, status=status.HTTP_200_OK)


class MeView(APIView):
    def get(self, request):
        user = request.user
        serializer = UserResponseSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = request.user

        if not verify_password(data["current_password"], user.password):
            return Response(
                {"detail": "Current password is incorrect"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if data["new_password"] != data["confirm_password"]:
            return Response(
                {"detail": "New passwords do not match"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.password = hash_password(data["new_password"])
        user.save(update_fields=["password"])

        return Response(
            {"message": "Password changed successfully", "status": "success"},
            status=status.HTTP_200_OK,
        )


class CoAuthorTokenStatusView(APIView):
    """GET: Validate a co-author invitation token and return pre-filled profile data."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        coauthor = PaperCoAuthor.objects.filter(invitation_token=token).first()
        if not coauthor:
            return Response(
                {"detail": "Invalid or expired token"},
                status=status.HTTP_404_NOT_FOUND,
            )

        user = User.objects.filter(id=coauthor.user_id).first() if coauthor.user_id else None

        return Response({
            "email": coauthor.email,
            "first_name": coauthor.first_name,
            "middle_name": coauthor.middle_name or "",
            "last_name": coauthor.last_name,
            "salutation": coauthor.salutation or "",
            "designation": coauthor.designation or "",
            "department": coauthor.department or "",
            "organisation": coauthor.organisation or "",
            "has_set_password": False,
            "affiliation": user.affiliation or "" if user else "",
            "specialization": user.specialization or "" if user else "",
            "contact": user.contact or "" if user else "",
            "address": user.address or "" if user else "",
        }, status=status.HTTP_200_OK)


class CompleteProfileView(APIView):
    """POST: Let a co-author set their password and complete their profile via invitation token."""
    permission_classes = [permissions.AllowAny]

    def post(self, request, token):
        coauthor = PaperCoAuthor.objects.filter(invitation_token=token).first()
        if not coauthor:
            return Response(
                {"detail": "Invalid or expired token"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not coauthor.user_id:
            return Response(
                {"detail": "No user account linked to this invitation"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(id=coauthor.user_id).first()
        if not user:
            return Response(
                {"detail": "User account not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        data = request.data
        password = data.get("password")
        confirm_password = data.get("confirm_password")

        if not password or not confirm_password:
            return Response(
                {"detail": "Password and confirm password are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if password != confirm_password:
            return Response(
                {"detail": "Passwords do not match"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(password) < 6:
            return Response(
                {"detail": "Password must be at least 6 characters"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Update password
        user.password = hash_password(password)

        # Update profile fields if provided
        if data.get("first_name"):
            user.fname = data["first_name"]
        if data.get("last_name"):
            user.lname = data["last_name"]
        if data.get("middle_name") is not None:
            user.mname = data["middle_name"]
        if data.get("salutation"):
            user.salutation = data["salutation"]
        if data.get("designation"):
            user.designation = data["designation"]
        if data.get("department"):
            user.department = data["department"]
        if data.get("organisation"):
            user.organisation = data["organisation"]
        if data.get("affiliation"):
            user.affiliation = data["affiliation"]
        if data.get("specialization"):
            user.specialization = data["specialization"]
        if data.get("contact"):
            user.contact = data["contact"]
        if data.get("address"):
            user.address = data["address"]

        user.save()

        # Invalidate the token so it can't be reused
        coauthor.invitation_token = None
        coauthor.save()

        # Issue JWT tokens so the user is logged in immediately
        access_token_expires = timedelta(hours=24)
        access_token = create_access_token(
            data={"sub": str(user.id), "email": user.email},
            expires_delta=access_token_expires,
        )
        refresh_token = create_refresh_token(
            data={"sub": str(user.id), "email": user.email},
        )

        resp = {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": 86400,
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "fname": user.fname,
            "lname": user.lname,
            "affiliation": user.affiliation,
            "organisation": user.organisation,
        }
        out = TokenResponseSerializer(resp)
        return Response(out.data, status=status.HTTP_200_OK)
