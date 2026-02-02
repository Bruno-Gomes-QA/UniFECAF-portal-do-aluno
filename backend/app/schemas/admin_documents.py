"""
UniFECAF Portal do Aluno - Admin schemas (documents).
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AdminStudentDocumentResponse(BaseModel):
    """Student document response with enriched data."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    student_id: UUID
    student_name: str | None = None  # Enriched from student
    student_ra: str | None = None  # Enriched from student
    doc_type: str
    status: str
    title: str | None = None
    description: str | None = None
    file_url: str | None = None
    file_size: int | None = None
    file_type: str | None = None
    generated_at: datetime | None = None
    requested_at: datetime | None = None
    requested_by: UUID | None = None
    requested_by_name: str | None = None  # Enriched from user
    created_at: datetime
    updated_at: datetime


class AdminStudentDocumentCreateRequest(BaseModel):
    """Create student document request."""

    student_id: UUID
    doc_type: str = Field(..., description="DECLARATION | STUDENT_CARD | TRANSCRIPT")
    status: str = Field("AVAILABLE", description="AVAILABLE | GENERATING | ERROR")
    title: str | None = Field(None, max_length=200)
    description: str | None = None
    file_url: str | None = None
    file_size: int | None = Field(None, ge=0)
    file_type: str | None = Field(None, max_length=50)
    generated_at: datetime | None = None


class AdminStudentDocumentUpdateRequest(BaseModel):
    """Update student document request."""

    status: str | None = None
    title: str | None = Field(None, max_length=200)
    description: str | None = None
    file_url: str | None = None
    file_size: int | None = Field(None, ge=0)
    file_type: str | None = Field(None, max_length=50)
    generated_at: datetime | None = None


class AdminStudentDocumentGenerateRequest(BaseModel):
    """Request to generate a new document."""

    student_id: UUID
    doc_type: str = Field(..., description="DECLARATION | STUDENT_CARD | TRANSCRIPT")
    title: str | None = None
    description: str | None = None


# Statistics responses
class AdminDocumentStatsResponse(BaseModel):
    """Statistics for documents module."""

    total_documents: int
    by_status: dict[str, int]
    by_type: dict[str, int]
    generating_count: int
    error_count: int
    recent_requests: int  # Last 7 days
