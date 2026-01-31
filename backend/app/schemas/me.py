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
