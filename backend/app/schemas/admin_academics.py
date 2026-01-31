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


class CourseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    degree_type: str | None = None
    duration_terms: int | None = None
    created_at: datetime
    updated_at: datetime


class CourseCreateRequest(BaseModel):
    name: str
    degree_type: str | None = None
    duration_terms: int | None = Field(None, ge=1)


class CourseUpdateRequest(BaseModel):
    name: str | None = None
    degree_type: str | None = None
    duration_terms: int | None = Field(None, ge=1)


class SubjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    course_id: UUID
    code: str
    name: str
    credits: int | None = Field(None, ge=0)
    is_active: bool
    created_at: datetime
    updated_at: datetime


class SubjectCreateRequest(BaseModel):
    course_id: UUID
    code: str
    name: str
    credits: int | None = Field(None, ge=0)
    is_active: bool = True


class SubjectUpdateRequest(BaseModel):
    course_id: UUID | None = None
    code: str | None = None
    name: str | None = None
    credits: int | None = Field(None, ge=0)
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


class StudentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: UUID
    ra: str
    full_name: str
    course_id: UUID
    admission_term: UUID | None = None
    total_progress: Decimal
    created_at: datetime
    updated_at: datetime


class StudentCreateRequest(BaseModel):
    user_id: UUID
    ra: str
    full_name: str
    course_id: UUID
    admission_term: UUID | None = None
    total_progress: Decimal = Field(Decimal("0.00"), ge=0, le=100)


class StudentUpdateRequest(BaseModel):
    ra: str | None = None
    full_name: str | None = None
    course_id: UUID | None = None
    admission_term: UUID | None = None
    total_progress: Decimal | None = Field(None, ge=0, le=100)


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
