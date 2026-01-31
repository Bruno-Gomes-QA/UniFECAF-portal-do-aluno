"""
UniFECAF Portal do Aluno - Security utilities
"""

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from app.core.config import get_settings

settings = get_settings()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Generate password hash."""
    return pwd_context.hash(password)


class TokenPayload(BaseModel):
    sub: UUID
    jti: UUID
    exp: datetime


def create_access_token(*, sub: UUID, jti: UUID, expires_delta: timedelta | None = None) -> str:
    """Create a JWT access token (HS256) for cookie-based auth."""
    expire = datetime.now(UTC) + (expires_delta or timedelta(minutes=settings.jwt_expires_minutes))
    to_encode: dict[str, Any] = {"sub": str(sub), "jti": str(jti), "exp": expire}
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def verify_access_token(token: str) -> TokenPayload | None:
    """Decode and validate a JWT access token. Returns None on any failure."""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None

    try:
        return TokenPayload.model_validate(payload)
    except Exception:
        return None
