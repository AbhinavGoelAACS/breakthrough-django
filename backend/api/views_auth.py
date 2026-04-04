from datetime import timedelta

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .jwt_utils import (
    create_access_token,
    create_refresh_token,
    hash_password,
    validate_password_policy,
    verify_password,
    verify_token,
    JWT_SECRET_KEY,
    JWT_ALGORITHM,
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


class ForgotPasswordView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        if not email:
            return Response(
                {"detail": "Email is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Always return success to prevent email enumeration
        success_msg = {
            "message": "If an account with that email exists, a password reset link has been sent."
        }

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response(success_msg, status=status.HTTP_200_OK)

        # Create a short-lived reset token (1 hour)
        from datetime import datetime, timezone
        from jose import jwt

        payload = {
            "sub": str(user.id),
            "email": user.email,
            "type": "password_reset",
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        }
        reset_token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

        # Send reset email
        from .services.email_service import send_email, _get_frontend_url

        frontend_url = _get_frontend_url()
        reset_link = f"{frontend_url}/reset-password?token={reset_token}"

        html_body = f"""
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #0D4715; font-size: 24px; margin: 0;">BreakThrough Publishers India</h1>
            </div>
            <div style="background: #fff; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">
                <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 20px;">Password Reset Request</h2>
                <p style="color: #475569; line-height: 1.6; margin: 0 0 24px 0;">
                    We received a request to reset the password for your account associated with <strong>{user.email}</strong>.
                </p>
                <div style="text-align: center; margin: 32px 0;">
                    <a href="{reset_link}"
                       style="display: inline-block; background: #0D4715; color: white; padding: 14px 32px;
                              border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                        Reset Password
                    </a>
                </div>
                <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 0 8px 0;">
                    This link will expire in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.
                </p>
                <p style="color: #94a3b8; font-size: 12px; margin: 16px 0 0 0; border-top: 1px solid #e5e7eb; padding-top: 16px;">
                    If the button doesn't work, copy and paste this link into your browser:<br/>
                    <a href="{reset_link}" style="color: #0D4715; word-break: break-all;">{reset_link}</a>
                </p>
            </div>
        </div>
        """

        plain_body = (
            f"Password Reset Request\n\n"
            f"We received a request to reset your password for {user.email}.\n\n"
            f"Click the link below to reset your password (expires in 1 hour):\n"
            f"{reset_link}\n\n"
            f"If you didn't request this, you can safely ignore this email."
        )

        send_email(user.email, "Password Reset - BreakThrough Publishers", plain_body, html_body)

        return Response(success_msg, status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get("token", "")
        new_password = request.data.get("new_password", "")
        confirm_password = request.data.get("confirm_password", "")

        if not token:
            return Response(
                {"detail": "Reset token is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not new_password or not confirm_password:
            return Response(
                {"detail": "New password and confirmation are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_password != confirm_password:
            return Response(
                {"detail": "Passwords do not match"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(new_password) < 8:
            return Response(
                {"detail": "Password must be at least 8 characters"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        policy_error = validate_password_policy(new_password)
        if policy_error:
            return Response(
                {"detail": policy_error},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify the reset token
        payload = verify_token(token)
        if not payload or payload.get("type") != "password_reset":
            return Response(
                {"detail": "Invalid or expired reset token"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_id = payload.get("sub")
        try:
            user = User.objects.get(id=int(user_id))
        except (User.DoesNotExist, ValueError, TypeError):
            return Response(
                {"detail": "User not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        user.password = hash_password(new_password)
        user.save(update_fields=["password"])

        return Response(
            {"message": "Password has been reset successfully. You can now log in."},
            status=status.HTTP_200_OK,
        )
