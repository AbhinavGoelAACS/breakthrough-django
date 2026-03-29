from rest_framework.authentication import BaseAuthentication
from rest_framework import exceptions

from .models import User
from .jwt_utils import verify_token


class JWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return None

        token = auth_header.split(" ", 1)[1].strip()
        payload = verify_token(token)

        if payload is None or payload.get("type") != "access":
            raise exceptions.AuthenticationFailed("Invalid or expired token")

        user_id = payload.get("sub")
        try:
            user = User.objects.get(id=int(user_id))
        except User.DoesNotExist:
            raise exceptions.AuthenticationFailed("User not found")

        return (user, None)

