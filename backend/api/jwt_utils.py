import os
import re
from datetime import datetime, timedelta, timezone

from jose import jwt
import bcrypt


JWT_SECRET_KEY = os.environ.get(
    "JWT_SECRET_KEY", "your-secret-key-change-this-in-production"
)
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")




def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')


def verify_password(plain_password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        pass
    # Fallback: check Django-style hashed passwords (e.g. PBKDF2 from make_password)
    try:
        from django.contrib.auth.hashers import check_password
        return check_password(plain_password, hashed)
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: timedelta) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def create_refresh_token(data: dict) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode = data.copy()
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def verify_token(token: str):
    try:
        return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except Exception:
        return None


def validate_password_policy(password: str) -> str | None:
    """Return an error message if `password` violates the policy, else None."""
    if len(password) < 8:
        return "Password must be at least 8 characters"
    if not re.search(r'[A-Z]', password):
        return "Password must contain at least one uppercase letter"
    if not re.search(r'[a-z]', password):
        return "Password must contain at least one lowercase letter"
    if not re.search(r'\d', password):
        return "Password must contain at least one number"
    if not re.search(r'[!@#$%^&*()\-_=+\[\]{};:\'",.<>/?\\|`~]', password):
        return "Password must contain at least one special character"
    return None

