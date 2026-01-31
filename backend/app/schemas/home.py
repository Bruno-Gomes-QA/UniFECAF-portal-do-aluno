"""
UniFECAF Portal do Aluno - Home Page Schemas
"""

from datetime import date, datetime, time
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ============== Student Info ==============


class CourseInfo(BaseModel):
    """Course information schema."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    degree_type: str | None = None
    campus_name: str | None = None


class StudentInfo(BaseModel):
    """Student profile information schema."""

    model_config = ConfigDict(from_attributes=True)

    user_id: UUID
    ra: str = Field(..., description="Registro Acadêmico")
    full_name: str
    email: str
    course: CourseInfo
    total_progress: Decimal = Field(..., description="Course progress percentage (0-100)")
    current_term: str | None = Field(None, description="Current term code, e.g., '2026-1'")


# ============== Grades ==============


class SubjectGrade(BaseModel):
    """Individual subject grade schema."""

    model_config = ConfigDict(from_attributes=True)

    subject_id: UUID
    subject_code: str
    subject_name: str
    final_score: Decimal | None = Field(None, ge=0, le=10, description="Final grade (0-10)")
    absences_count: int = Field(default=0, ge=0)
    absences_pct: Decimal = Field(default=Decimal("0.00"), ge=0, le=100)
    status: str = Field(default="IN_PROGRESS", description="IN_PROGRESS, APPROVED, FAILED")
    has_absence_alert: bool = Field(
        default=False, description="True if absences > 20%"
    )


class GradeSummary(BaseModel):
    """Summary of grades for current term."""

    current_term: str = Field(..., description="Current term code")
    subjects: list[SubjectGrade] = Field(default_factory=list)
    average_score: Decimal | None = Field(None, description="Average of all final scores")
    subjects_at_risk: int = Field(
        default=0, description="Number of subjects with high absence rate"
    )


# ============== Financial ==============


class InvoiceInfo(BaseModel):
    """Invoice information schema."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    description: str
    due_date: date
    amount: Decimal = Field(..., ge=0)
    status: str = Field(..., description="PENDING, PAID, OVERDUE, CANCELED")
    is_overdue: bool = Field(default=False)


class FinancialSummary(BaseModel):
    """Financial summary schema."""

    invoices: list[InvoiceInfo] = Field(default_factory=list)
    total_pending: Decimal = Field(default=Decimal("0.00"), ge=0)
    total_overdue: Decimal = Field(default=Decimal("0.00"), ge=0)
    has_pending: bool = Field(default=False)
    has_overdue: bool = Field(default=False)


# ============== Today's Agenda ==============


class ClassInfo(BaseModel):
    """Class session information for today's agenda."""

    model_config = ConfigDict(from_attributes=True)

    session_id: UUID
    subject_name: str
    subject_code: str
    start_time: time
    end_time: time
    room: str | None = None
    is_next: bool = Field(default=False, description="True if this is the next class")


class TodayAgenda(BaseModel):
    """Today's agenda schema."""

    date: date
    classes: list[ClassInfo] = Field(default_factory=list)
    total_classes: int = Field(default=0)
    next_class: ClassInfo | None = None


# ============== Notifications ==============


class NotificationInfo(BaseModel):
    """Notification information schema."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    notification_id: UUID
    type: str = Field(..., description="ACADEMIC, FINANCIAL, ADMIN")
    priority: str = Field(default="NORMAL", description="LOW, NORMAL, HIGH")
    title: str | None = None
    body: str
    delivered_at: datetime
    read_at: datetime | None = None
    is_read: bool = Field(default=False)


# ============== Quick Actions ==============


class QuickAction(BaseModel):
    """Quick action schema."""

    id: str
    label: str
    icon: str = Field(default="document")
    href: str
    description: str | None = None


# ============== Main Home Response ==============


class HomeResponse(BaseModel):
    """Complete home page response schema."""

    student: StudentInfo
    grades: GradeSummary
    financial: FinancialSummary
    today_agenda: TodayAgenda
    notifications: list[NotificationInfo] = Field(default_factory=list)
    unread_notifications_count: int = Field(default=0)
    quick_actions: list[QuickAction] = Field(default_factory=list)

    # Metadata
    generated_at: datetime = Field(default_factory=datetime.utcnow)
