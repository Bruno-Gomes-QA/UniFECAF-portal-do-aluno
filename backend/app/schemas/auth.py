"""
UniFECAF Portal do Aluno - Auth Schemas
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LoginRequest(BaseModel):
    """Login request schema."""

    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=1, description="User password")


class LoginResponse(BaseModel):
    """Login response schema."""

    message: str = Field(default="Login successful")
    user_id: UUID
    email: str


class UserResponse(BaseModel):
    """User response schema for authenticated user info."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    role: str
    status: str
    created_at: datetime
    last_login_at: datetime | None = None


class TokenPayload(BaseModel):
    """JWT token payload schema."""

    sub: str  # user_id as string
    exp: datetime
