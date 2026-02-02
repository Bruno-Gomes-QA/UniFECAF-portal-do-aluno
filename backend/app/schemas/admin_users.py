"""
UniFECAF Portal do Aluno - Admin schemas (users).
"""

from __future__ import annotations

import re
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class AdminUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    role: str
    status: str
    is_superadmin: bool = False
    created_at: datetime
    updated_at: datetime
    last_login_at: datetime | None = None


class AdminUserCreateRequest(BaseModel):
    email: EmailStr = Field(..., examples=["usuario@fecaf.com.br"])
    password: str = Field(..., min_length=8, examples=["senhasegura123"])
    role: str = Field("STUDENT", description="STUDENT | ADMIN")
    status: str = Field("ACTIVE", description="ACTIVE | INVITED | SUSPENDED")

    @field_validator("email")
    @classmethod
    def validate_email_domain(cls, v: str) -> str:
        """Valida domínio do email: @fecaf.com.br para admin ou @a.fecaf.com.br para aluno."""
        # Aceita qualquer email válido - a validação de domínio por role é feita no router
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Senha deve ter no mínimo 8 caracteres")
        return v


class AdminUserUpdateRequest(BaseModel):
    # email removido - não pode ser alterado
    password: str | None = Field(None, min_length=8)
    role: str | None = None
    status: str | None = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str | None) -> str | None:
        if v is not None and len(v) < 8:
            raise ValueError("Senha deve ter no mínimo 8 caracteres")
        return v
