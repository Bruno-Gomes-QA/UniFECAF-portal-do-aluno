"""
UniFECAF Portal do Aluno - Admin schemas (academics).
"""

from __future__ import annotations

from datetime import date, datetime, time
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TermResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    start_date: date
    end_date: date
    is_current: bool
    sections_count: int = 0
    created_at: datetime
    updated_at: datetime


class TermCreateRequest(BaseModel):
    code: str = Field(..., examples=["2026-1"])
    start_date: date
    end_date: date
    is_current: bool = False


class TermUpdateRequest(BaseModel):
    code: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    is_current: bool | None = None
from app.models.academics import DegreeType


class CourseResponse(BaseModel):
    """Course response with aggregations."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    name: str
    degree_type: DegreeType
    duration_terms: int
    is_active: bool
    students_count: int = 0
    subjects_count: int = 0
    created_at: datetime
    updated_at: datetime


class CourseCreateRequest(BaseModel):
    """Create course request. All fields required."""

    code: str = Field(
        ...,
        min_length=2,
        max_length=10,
        pattern=r"^[A-Z0-9]+$",
        description="Código único do curso (2-10 caracteres, letras maiúsculas e números)",
        examples=["ADS", "ADM", "DIR"],
    )
    name: str = Field(
        ...,
        min_length=3,
        max_length=200,
        description="Nome completo do curso",
        examples=["Análise e Desenvolvimento de Sistemas"],
    )
    degree_type: DegreeType = Field(
        ...,
        description="Tipo de grau do curso",
        examples=["TECNOLOGO"],
    )
    duration_terms: int = Field(
        ...,
        ge=1,
        le=20,
        description="Duração em semestres",
        examples=[5],
    )


class CourseUpdateRequest(BaseModel):
    """Update course request. code is immutable."""

    name: str | None = Field(None, min_length=3, max_length=200)
    degree_type: DegreeType | None = None
    duration_terms: int | None = Field(None, ge=1, le=20)


class SubjectResponse(BaseModel):
    """Subject response with aggregations."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    course_id: UUID
    course_name: str = ""
    code: str
    name: str
    credits: int
    workload_hours: int = 0
    term_number: int | None = None
    is_active: bool
    sections_count: int = 0
    created_at: datetime
    updated_at: datetime


class SubjectCreateRequest(BaseModel):
    """Create subject request."""

    course_id: UUID
    code: str = Field(
        ...,
        min_length=2,
        max_length=20,
        pattern=r"^[A-Z0-9-]+$",
        description="Código da disciplina (letras maiúsculas, números e hífen)",
        examples=["ADS-DWF-001", "MAT-105", "FIS-001"],
    )
    name: str = Field(
        ...,
        min_length=3,
        max_length=200,
        description="Nome da disciplina",
        examples=["Desenvolvimento Web Fullstack"],
    )
    credits: int = Field(
        ...,
        ge=1,
        le=20,
        description="Quantidade de créditos",
        examples=[4],
    )
    term_number: int | None = Field(
        None,
        ge=1,
        description="Semestre sugerido na grade curricular",
        examples=[1, 2, 3],
    )


class SubjectUpdateRequest(BaseModel):
    """Update subject request. code is immutable, course_id only if no sections."""

    course_id: UUID | None = None
    name: str | None = Field(None, min_length=3, max_length=200)
    credits: int | None = Field(None, ge=1, le=20)
    term_number: int | None = Field(None, ge=1)
    is_active: bool | None = None


class SectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    term_id: UUID
    subject_id: UUID
    code: str
    room_default: str | None = None
    capacity: int | None = Field(None, ge=0)
    created_at: datetime
    updated_at: datetime


class SectionCreateRequest(BaseModel):
    term_id: UUID
    subject_id: UUID
    code: str = Field(..., examples=["A"])
    room_default: str | None = None
    capacity: int | None = Field(None, ge=0)


class SectionUpdateRequest(BaseModel):
    term_id: UUID | None = None
    subject_id: UUID | None = None
    code: str | None = None
    room_default: str | None = None
    capacity: int | None = Field(None, ge=0)


class SectionMeetingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    section_id: UUID
    weekday: int = Field(..., ge=0, le=6, description="0=Domingo ... 6=Sábado")
    start_time: time
    end_time: time
    room: str | None = None
    created_at: datetime
    updated_at: datetime


class SectionMeetingCreateRequest(BaseModel):
    weekday: int = Field(..., ge=0, le=6)
    start_time: time
    end_time: time
    room: str | None = None


class SectionMeetingUpdateRequest(BaseModel):
    weekday: int | None = Field(None, ge=0, le=6)
    start_time: time | None = None
    end_time: time | None = None
    room: str | None = None


class ClassSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    section_id: UUID
    session_date: date
    start_time: time
    end_time: time
    room: str | None = None
    is_canceled: bool
    created_at: datetime
    updated_at: datetime


class ClassSessionCreateRequest(BaseModel):
    session_date: date
    start_time: time
    end_time: time
    room: str | None = None
    is_canceled: bool = False


class ClassSessionUpdateRequest(BaseModel):
    session_date: date | None = None
    start_time: time | None = None
    end_time: time | None = None
    room: str | None = None
    is_canceled: bool | None = None


# ==================== Student Schemas ====================


class StudentResponse(BaseModel):
    """Response schema for student profile."""

    model_config = ConfigDict(from_attributes=True)

    user_id: UUID
    ra: str
    full_name: str
    course_id: UUID
    admission_term: UUID | None = None
    total_progress: Decimal
    status: str  # ACTIVE | LOCKED | GRADUATED | DELETED
    graduation_date: date | None = None
    deleted_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class StudentCreateRequest(BaseModel):
    """Request schema for creating a student profile."""

    user_id: UUID
    ra: str | None = Field(None, description="RA auto-generated if not provided")
    full_name: str = Field(..., min_length=3)
    course_id: UUID
    admission_term: UUID | None = None
    total_progress: Decimal = Field(Decimal("0.00"), ge=0, le=100)


class StudentUpdateRequest(BaseModel):
    """Request schema for updating a student profile. user_id and ra are immutable."""

    full_name: str | None = Field(None, min_length=3)
    course_id: UUID | None = None
    admission_term: UUID | None = None
    total_progress: Decimal | None = Field(None, ge=0, le=100)
    # status removed - use specific endpoints (lock, graduate, delete, reactivate)


class EnrollmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    student_id: UUID
    section_id: UUID
    status: str
    created_at: datetime
    updated_at: datetime


class EnrollmentCreateRequest(BaseModel):
    student_id: UUID
    section_id: UUID
    status: str = Field("ENROLLED", description="ENROLLED | LOCKED | DROPPED | COMPLETED")


class AttendanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    session_id: UUID
    student_id: UUID
    student_name: str | None = None
    student_ra: str | None = None
    status: str = Field(..., description="PRESENT | ABSENT | EXCUSED")
    recorded_at: datetime
    created_at: datetime
    updated_at: datetime


class AttendanceCreateRequest(BaseModel):
    session_id: UUID
    student_id: UUID
    status: str = Field(..., description="PRESENT | ABSENT | EXCUSED")


class AttendanceUpdateRequest(BaseModel):
    status: str | None = None


class AssessmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    section_id: UUID
    name: str
    kind: str
    weight: Decimal
    max_score: Decimal
    due_date: date | None = None
    created_at: datetime
    updated_at: datetime


class AssessmentCreateRequest(BaseModel):
    section_id: UUID
    name: str
    kind: str
    weight: Decimal = Field(Decimal("1.000"), gt=0)
    max_score: Decimal = Field(Decimal("10.00"), gt=0)
    due_date: date | None = None


class AssessmentUpdateRequest(BaseModel):
    section_id: UUID | None = None
    name: str | None = None
    kind: str | None = None
    weight: Decimal | None = Field(None, gt=0)
    max_score: Decimal | None = Field(None, gt=0)
    due_date: date | None = None


class AssessmentGradeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    assessment_id: UUID
    student_id: UUID
    student_name: str | None = None
    student_ra: str | None = None
    score: Decimal = Field(..., ge=0)
    created_at: datetime
    updated_at: datetime


class AssessmentGradeCreateRequest(BaseModel):
    assessment_id: UUID
    student_id: UUID
    score: Decimal = Field(..., ge=0)


class AssessmentGradeUpdateRequest(BaseModel):
    score: Decimal | None = Field(None, ge=0)


class FinalGradeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    section_id: UUID
    student_id: UUID
    student_name: str | None = None
    student_ra: str | None = None
    final_score: Decimal | None = Field(None, ge=0, le=10)
    absences_count: int = Field(..., ge=0)
    absences_pct: Decimal = Field(..., ge=0, le=100)
    status: str
    calculated_at: datetime
    created_at: datetime
    updated_at: datetime


class FinalGradeCreateRequest(BaseModel):
    section_id: UUID
    student_id: UUID
    final_score: Decimal | None = Field(None, ge=0, le=10)
    absences_count: int = Field(0, ge=0)
    absences_pct: Decimal = Field(Decimal("0.00"), ge=0, le=100)
    status: str = Field("IN_PROGRESS", description="IN_PROGRESS | APPROVED | FAILED")


class FinalGradeUpdateRequest(BaseModel):
    final_score: Decimal | None = Field(None, ge=0, le=10)
    absences_count: int | None = Field(None, ge=0)
    absences_pct: Decimal | None = Field(None, ge=0, le=100)
    status: str | None = None


class GenerateSessionsRequest(BaseModel):
    date_from: date
    date_to: date


class GenerateSessionsResponse(BaseModel):
    created: int = Field(..., ge=0)
    skipped: int = Field(..., ge=0)
