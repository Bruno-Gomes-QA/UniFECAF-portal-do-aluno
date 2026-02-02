"""
UniFECAF Portal do Aluno - Shared Pydantic schemas.
"""

from __future__ import annotations

from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T] = Field(default_factory=list)
    limit: int = Field(..., ge=1, le=500)
    offset: int = Field(..., ge=0)
    total: int = Field(..., ge=0)
