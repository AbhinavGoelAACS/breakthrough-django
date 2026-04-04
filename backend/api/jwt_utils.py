import os
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

