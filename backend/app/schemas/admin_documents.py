"""
UniFECAF Portal do Aluno - Admin schemas (documents).
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AdminStudentDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    student_id: UUID
    doc_type: str
    status: str
    title: str | None = None
    file_url: str | None = None
    generated_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class AdminStudentDocumentCreateRequest(BaseModel):
    student_id: UUID
    doc_type: str = Field(..., description="DECLARATION | STUDENT_CARD | TRANSCRIPT")
    status: str = Field("AVAILABLE", description="AVAILABLE | GENERATING | ERROR")
    title: str | None = None
    file_url: str | None = None
    generated_at: datetime | None = None


class AdminStudentDocumentUpdateRequest(BaseModel):
    status: str | None = None
    title: str | None = None
    file_url: str | None = None
    generated_at: datetime | None = None
