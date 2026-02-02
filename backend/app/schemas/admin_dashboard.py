"""
UniFECAF Portal do Aluno - Admin Dashboard schemas.
"""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class TermOption(BaseModel):
    """Term option for select."""
    
    id: UUID
    code: str
    is_current: bool


class FinanceSummary(BaseModel):
    """Finance summary for dashboard."""
    
    total_invoiced: Decimal = Decimal("0.00")
    total_paid: Decimal = Decimal("0.00")
    total_pending: Decimal = Decimal("0.00")
    total_overdue: Decimal = Decimal("0.00")
    count_invoices: int = 0
    count_paid: int = 0
    count_pending: int = 0
    count_overdue: int = 0
    payment_rate: float = 0.0  # % of paid invoices


class EnrollmentSummary(BaseModel):
    """Enrollment summary for dashboard."""
    
    total_students: int = 0
    total_enrollments: int = 0
    active_students: int = 0
    locked_students: int = 0
    graduated_students: int = 0


class NotificationSummary(BaseModel):
    """Notification summary for dashboard."""
    
    total_sent: int = 0
    total_read: int = 0
    total_unread: int = 0
    read_rate: float = 0.0


class RecentActivity(BaseModel):
    """Recent activity item."""
    
    type: str  # 'payment', 'enrollment', 'notification', etc.
    description: str
    timestamp: str
    icon: str = "activity"


class DashboardStats(BaseModel):
    """Complete dashboard statistics."""
    
    term_id: UUID | None = None
    term_code: str | None = None
    finance: FinanceSummary
    enrollment: EnrollmentSummary
    notifications: NotificationSummary
    recent_activities: list[RecentActivity] = []
    quick_stats: dict[str, int | str] = {}
