"""
UniFECAF Portal do Aluno - Auth Schemas
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LoginRequest(BaseModel):
    """Login request schema."""

    email: EmailStr = Field(
        ..., description="User email address", examples=["demo@unifecaf.edu.br"]
    )
    password: str = Field(..., min_length=1, description="User password", examples=["demo123"])


class LoginResponse(BaseModel):
    """Login response schema."""

    message: str = Field(default="Login successful")
    user_id: UUID
    email: str


class AuthMeResponse(BaseModel):
    """Authenticated user info (/auth/me)."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    role: str
    status: str
    last_login_at: datetime | None = None
