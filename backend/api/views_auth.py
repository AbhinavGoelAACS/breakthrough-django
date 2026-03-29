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
from .models import User
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

