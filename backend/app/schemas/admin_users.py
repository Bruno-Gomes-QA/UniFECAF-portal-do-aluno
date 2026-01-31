"""
UniFECAF Portal do Aluno - Admin schemas (users).
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class AdminUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    role: str
    status: str
    created_at: datetime
    updated_at: datetime
    last_login_at: datetime | None = None


class AdminUserCreateRequest(BaseModel):
    email: EmailStr = Field(..., examples=["new.user@unifecaf.edu.br"])
    password: str = Field(..., min_length=6, examples=["strongpass"])
    role: str = Field("STUDENT", description="STUDENT | STAFF | ADMIN")
    status: str = Field("ACTIVE", description="ACTIVE | INVITED | SUSPENDED")


class AdminUserUpdateRequest(BaseModel):
    email: EmailStr | None = None
    password: str | None = Field(None, min_length=6)
    role: str | None = None
    status: str | None = None
