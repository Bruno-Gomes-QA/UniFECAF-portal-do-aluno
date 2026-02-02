"""
UniFECAF Portal do Aluno - /me endpoint schemas (portal do aluno).
"""

from __future__ import annotations

from datetime import date, datetime, time
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class MeCourseInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    degree_type: str | None = None


class MeProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: UUID
    ra: str = Field(..., description="Registro Acadêmico")
    full_name: str
    email: str
    course: MeCourseInfo
    total_progress: Decimal = Field(..., ge=0, le=100)
    current_term: str | None = Field(None, description="Termo atual, ex.: '2026-1'")


class MeTodayClassInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: UUID
    subject_id: UUID
    subject_code: str
    subject_name: str
    session_date: date
    start_time: time
    end_time: time
    room: str | None = None


class MeTodayClassResponse(BaseModel):
    class_info: MeTodayClassInfo | None = None
    warnings: list[str] = Field(default_factory=list)


class MeAcademicSubjectItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    subject_id: UUID
    subject_code: str
    subject_name: str
    final_score: Decimal | None = Field(None, ge=0, le=10)
    absences_count: int = Field(0, ge=0)
    absences_pct: Decimal = Field(Decimal("0.00"), ge=0, le=100)
    status: str = Field(default="IN_PROGRESS")
    has_absence_alert: bool = Field(default=False, description="True se faltas > 20%")


class MeAcademicSummaryResponse(BaseModel):
    current_term: str
    subjects: list[MeAcademicSubjectItem] = Field(default_factory=list)
    average_score: Decimal | None = None
    subjects_at_risk: int = 0


class MeInvoiceInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    description: str
    due_date: date
    amount: Decimal = Field(..., ge=0)
    status: str
    is_overdue: bool = False


class MeFinancialSummaryResponse(BaseModel):
    next_invoice: MeInvoiceInfo | None = None
    last_paid_invoice: MeInvoiceInfo | None = None
    total_pending: Decimal = Field(Decimal("0.00"), ge=0)
    total_overdue: Decimal = Field(Decimal("0.00"), ge=0)
    has_pending: bool = False
    has_overdue: bool = False


class MePayMockResponse(BaseModel):
    invoice_id: UUID
    payment_id: UUID
    status: str
    paid_at: datetime


class MeNotificationInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID = Field(..., description="UserNotification id")
    notification_id: UUID
    type: str
    priority: str
    title: str | None = None
    body: str
    delivered_at: datetime
    read_at: datetime | None = None
    archived_at: datetime | None = None
    is_read: bool = False


class MeUnreadCountResponse(BaseModel):
    unread_count: int = Field(..., ge=0)


class MeDocumentInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    doc_type: str
    status: str
    title: str | None = None
    file_url: str | None = None
    generated_at: datetime | None = None


class MeDocumentRequestResponse(BaseModel):
    doc_type: str
    status: str
    file_url: str | None = None
    generated_at: datetime | None = None


class MeDocumentDownloadResponse(BaseModel):
    doc_type: str
    file_url: str


# =========== Schedule / Horários ===========


class MeScheduleClassInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: UUID
    subject_id: UUID
    subject_code: str
    subject_name: str
    section_id: UUID
    session_date: date
    start_time: time
    end_time: time
    room: str | None = None
    is_canceled: bool = False
    weekday: int = Field(..., ge=0, le=6, description="0=Monday, 6=Sunday")


class MeScheduleTodayResponse(BaseModel):
    """Todas as aulas do dia."""
    date: date
    classes: list[MeScheduleClassInfo] = Field(default_factory=list)
    total_classes: int = 0


class MeScheduleWeekResponse(BaseModel):
    """Grade semanal de aulas."""
    week_start: date
    week_end: date
    days: dict[str, list[MeScheduleClassInfo]] = Field(default_factory=dict)
    total_classes: int = 0


# =========== Enrollments / Matrículas ===========


class MeEnrollmentInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    enrollment_id: UUID
    section_id: UUID
    subject_id: UUID
    subject_code: str
    subject_name: str
    credits: int = 0
    term_code: str | None = None
    professor_name: str | None = None
    status: str = Field(default="ENROLLED")
    enrolled_at: datetime | None = None


class MeEnrollmentsResponse(BaseModel):
    term_code: str | None = None
    enrollments: list[MeEnrollmentInfo] = Field(default_factory=list)
    total_credits: int = 0


# =========== Grades / Notas Detalhadas ===========


class MeGradeComponentInfo(BaseModel):
    """Componente de nota (ex: P1, P2, Trabalho)."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    label: str = Field(..., description="Ex: P1, P2, Trabalho Final")
    weight: Decimal = Field(Decimal("1.00"), ge=0)
    max_score: Decimal = Field(Decimal("10.00"), ge=0)
    score: Decimal | None = None
    graded_at: datetime | None = None


class MeGradeDetailInfo(BaseModel):
    """Detalhes de notas por disciplina."""
    model_config = ConfigDict(from_attributes=True)

    section_id: UUID
    subject_id: UUID
    subject_code: str
    subject_name: str
    term_code: str | None = None
    components: list[MeGradeComponentInfo] = Field(default_factory=list)
    final_score: Decimal | None = Field(None, ge=0, le=10)
    status: str = Field(default="IN_PROGRESS")
    needs_exam: bool = False


class MeGradesResponse(BaseModel):
    """Lista de notas do aluno."""
    term_code: str | None = None
    grades: list[MeGradeDetailInfo] = Field(default_factory=list)
    average: Decimal | None = None


# =========== Attendance / Frequência ===========


class MeAttendanceSessionInfo(BaseModel):
    """Registro de presença em uma sessão."""
    model_config = ConfigDict(from_attributes=True)

    session_id: UUID
    session_date: date
    start_time: time
    end_time: time
    status: str = Field(..., description="PRESENT, ABSENT, JUSTIFIED, LATE")


class MeAttendanceSubjectInfo(BaseModel):
    """Frequência por disciplina."""
    model_config = ConfigDict(from_attributes=True)

    section_id: UUID
    subject_id: UUID
    subject_code: str
    subject_name: str
    total_sessions: int = 0
    attended_sessions: int = 0
    absences_count: int = 0
    absences_pct: Decimal = Field(Decimal("0.00"), ge=0, le=100)
    has_alert: bool = Field(default=False, description="True se faltas > 20%")
    sessions: list[MeAttendanceSessionInfo] = Field(default_factory=list)


class MeAttendanceResponse(BaseModel):
    """Resumo de frequência do aluno."""
    term_code: str | None = None
    subjects: list[MeAttendanceSubjectInfo] = Field(default_factory=list)
    overall_attendance_pct: Decimal | None = None


# =========== Transcript / Histórico ===========


class MeTranscriptSubjectInfo(BaseModel):
    """Disciplina no histórico."""
    model_config = ConfigDict(from_attributes=True)

    subject_id: UUID
    subject_code: str
    subject_name: str
    credits: int = 0
    final_score: Decimal | None = None
    status: str = Field(..., description="APPROVED, FAILED, IN_PROGRESS, DROPPED")
    term_code: str


class MeTranscriptTermInfo(BaseModel):
    """Termo no histórico."""
    term_code: str
    term_name: str | None = None
    subjects: list[MeTranscriptSubjectInfo] = Field(default_factory=list)
    term_average: Decimal | None = None
    term_credits: int = 0


class MeTranscriptResponse(BaseModel):
    """Histórico acadêmico completo."""
    student_name: str
    ra: str
    course_name: str
    terms: list[MeTranscriptTermInfo] = Field(default_factory=list)
    total_credits_completed: int = 0
    total_credits_required: int = 0
    cumulative_average: Decimal | None = None
    progress_pct: Decimal = Field(Decimal("0.00"), ge=0, le=100)


# =========== Term Selection ===========


class MeTermOption(BaseModel):
    """Term option for selection in portal."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    is_current: bool


# =========== Profile Update ===========


class MeProfileUpdateRequest(BaseModel):
    """Campos editáveis do perfil."""
    phone: str | None = Field(None, max_length=20)
    emergency_contact: str | None = Field(None, max_length=100)
    emergency_phone: str | None = Field(None, max_length=20)


class MeProfileUpdateResponse(BaseModel):
    message: str = "Perfil atualizado com sucesso"
    updated_fields: list[str] = Field(default_factory=list)
