"""
UniFECAF Portal do Aluno - API v1 Admin Dashboard Router.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, select, and_, or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import AdminUser
from app.models.academics import (
    Student, StudentStatus, Term, SectionEnrollment, EnrollmentStatus,
    Course, Section
)
from app.models.finance import Invoice, InvoiceStatus, Payment, PaymentStatus
from app.models.notifications import Notification, UserNotification
from app.models.user import User
from app.schemas.admin_dashboard import (
    DashboardStats,
    EnrollmentSummary,
    FinanceSummary,
    NotificationSummary,
    RecentActivity,
    TermOption,
)

router = APIRouter(prefix="/api/v1/admin/dashboard", tags=["Admin - Dashboard"])


@router.get("/terms", response_model=list[TermOption], summary="Listar semestres para seleção")
def list_terms_for_select(
    _: AdminUser,
    db: Session = Depends(get_db),
) -> list[TermOption]:
    """List all terms for dashboard selection."""
    stmt = select(Term).order_by(Term.start_date.desc())
    terms = db.scalars(stmt).all()
    
    return [
        TermOption(id=t.id, code=t.code, is_current=t.is_current)
        for t in terms
    ]


@router.get("/stats", response_model=DashboardStats, summary="Estatísticas do dashboard")
def get_dashboard_stats(
    _: AdminUser,
    db: Session = Depends(get_db),
    term_id: UUID | None = Query(None, description="ID do semestre (usa atual se não informado)"),
) -> DashboardStats:
    """Get comprehensive dashboard statistics for a term."""
    
    # Get term
    term: Term | None = None
    if term_id:
        term = db.get(Term, term_id)
    else:
        # Get current term
        term = db.scalar(select(Term).where(Term.is_current == True))
    
    # Finance summary
    finance = _get_finance_summary(db, term)
    
    # Enrollment summary
    enrollment = _get_enrollment_summary(db, term)
    
    # Notifications summary
    notifications = _get_notification_summary(db, term)
    
    # Recent activities
    activities = _get_recent_activities(db, term)
    
    # Quick stats
    quick_stats = _get_quick_stats(db, term)
    
    return DashboardStats(
        term_id=term.id if term else None,
        term_code=term.code if term else None,
        finance=finance,
        enrollment=enrollment,
        notifications=notifications,
        recent_activities=activities,
        quick_stats=quick_stats,
    )


def _get_finance_summary(db: Session, term: Term | None) -> FinanceSummary:
    """Get finance summary for dashboard."""
    base_query = select(Invoice.id, Invoice.amount, Invoice.status)
    
    if term:
        base_query = base_query.where(Invoice.term_id == term.id)
    
    subq = base_query.subquery()
    
    stmt = select(
        func.coalesce(func.sum(subq.c.amount), 0).label("total_invoiced"),
        func.coalesce(
            func.sum(case((subq.c.status == InvoiceStatus.PAID, subq.c.amount), else_=0)),
            0
        ).label("total_paid"),
        func.coalesce(
            func.sum(case((subq.c.status == InvoiceStatus.PENDING, subq.c.amount), else_=0)),
            0
        ).label("total_pending"),
        func.coalesce(
            func.sum(case((subq.c.status == InvoiceStatus.OVERDUE, subq.c.amount), else_=0)),
            0
        ).label("total_overdue"),
        func.count(subq.c.id).label("count_invoices"),
        func.coalesce(func.count(case((subq.c.status == InvoiceStatus.PAID, 1))), 0).label("count_paid"),
        func.coalesce(func.count(case((subq.c.status == InvoiceStatus.PENDING, 1))), 0).label("count_pending"),
        func.coalesce(func.count(case((subq.c.status == InvoiceStatus.OVERDUE, 1))), 0).label("count_overdue"),
    )
    
    result = db.execute(stmt).one()
    
    count_invoices = result.count_invoices or 0
    count_paid = result.count_paid or 0
    payment_rate = (count_paid / count_invoices * 100) if count_invoices > 0 else 0.0
    
    return FinanceSummary(
        total_invoiced=result.total_invoiced or Decimal("0.00"),
        total_paid=result.total_paid or Decimal("0.00"),
        total_pending=result.total_pending or Decimal("0.00"),
        total_overdue=result.total_overdue or Decimal("0.00"),
        count_invoices=count_invoices,
        count_paid=count_paid,
        count_pending=result.count_pending or 0,
        count_overdue=result.count_overdue or 0,
        payment_rate=round(payment_rate, 1),
    )


def _get_enrollment_summary(db: Session, term: Term | None) -> EnrollmentSummary:
    """Get enrollment summary for dashboard."""
    
    # Total students (not deleted)
    total_students = db.scalar(
        select(func.count()).select_from(Student).where(Student.status != StudentStatus.DELETED)
    ) or 0
    
    # Students by status
    status_counts = db.execute(
        select(Student.status, func.count().label("cnt"))
        .where(Student.status != StudentStatus.DELETED)
        .group_by(Student.status)
    ).all()
    
    active_students = 0
    locked_students = 0
    graduated_students = 0
    
    for status, cnt in status_counts:
        if status == StudentStatus.ACTIVE:
            active_students = cnt
        elif status == StudentStatus.LOCKED:
            locked_students = cnt
        elif status == StudentStatus.GRADUATED:
            graduated_students = cnt
    
    # Enrollments for term
    total_enrollments = 0
    if term:
        # Count enrollments in sections of this term
        total_enrollments = db.scalar(
            select(func.count())
            .select_from(SectionEnrollment)
            .join(Section)
            .where(
                Section.term_id == term.id,
                SectionEnrollment.status == EnrollmentStatus.ENROLLED
            )
        ) or 0
    
    return EnrollmentSummary(
        total_students=total_students,
        total_enrollments=total_enrollments,
        active_students=active_students,
        locked_students=locked_students,
        graduated_students=graduated_students,
    )


def _get_notification_summary(db: Session, term: Term | None) -> NotificationSummary:
    """Get notification summary for dashboard."""
    
    # Base query - user notifications from the term period
    base = select(UserNotification.id, UserNotification.read_at)
    
    if term:
        base = base.where(
            UserNotification.delivered_at >= term.start_date,
            UserNotification.delivered_at <= term.end_date,
        )
    
    subq = base.subquery()
    
    stmt = select(
        func.count(subq.c.id).label("total_sent"),
        func.coalesce(func.count(case((subq.c.read_at.isnot(None), 1))), 0).label("total_read"),
        func.coalesce(func.count(case((subq.c.read_at.is_(None), 1))), 0).label("total_unread"),
    )
    
    result = db.execute(stmt).one()
    
    total_sent = result.total_sent or 0
    total_read = result.total_read or 0
    read_rate = (total_read / total_sent * 100) if total_sent > 0 else 0.0
    
    return NotificationSummary(
        total_sent=total_sent,
        total_read=total_read,
        total_unread=result.total_unread or 0,
        read_rate=round(read_rate, 1),
    )


def _get_recent_activities(db: Session, term: Term | None) -> list[RecentActivity]:
    """Get recent activities for dashboard."""
    activities: list[RecentActivity] = []
    
    # Recent payments (last 5)
    payments_stmt = (
        select(Payment, Invoice, Student)
        .join(Invoice, Payment.invoice_id == Invoice.id)
        .join(Student, Invoice.student_id == Student.user_id)
        .where(Payment.status == PaymentStatus.SETTLED)
        .order_by(Payment.paid_at.desc())
        .limit(5)
    )
    
    for payment, invoice, student in db.execute(payments_stmt).all():
        activities.append(RecentActivity(
            type="payment",
            description=f"{student.full_name} pagou R$ {payment.amount:.2f}",
            timestamp=payment.paid_at.isoformat() if payment.paid_at else "",
            icon="dollar-sign",
        ))
    
    # Recent enrollments (last 5)
    if term:
        enrollments_stmt = (
            select(SectionEnrollment, Section, Student)
            .join(Section, SectionEnrollment.section_id == Section.id)
            .join(Student, SectionEnrollment.student_id == Student.user_id)
            .where(Section.term_id == term.id)
            .order_by(SectionEnrollment.created_at.desc())
            .limit(5)
        )
        
        for enrollment, section, student in db.execute(enrollments_stmt).all():
            activities.append(RecentActivity(
                type="enrollment",
                description=f"{student.full_name} matriculado em {section.code}",
                timestamp=enrollment.created_at.isoformat() if enrollment.created_at else "",
                icon="user-check",
            ))
    
    # Sort all activities by timestamp
    activities.sort(key=lambda x: x.timestamp, reverse=True)
    
    return activities[:10]


def _get_quick_stats(db: Session, term: Term | None) -> dict[str, int | str]:
    """Get quick stats for dashboard."""
    
    # Total users
    total_users = db.scalar(select(func.count()).select_from(User)) or 0
    
    # Total courses
    total_courses = db.scalar(select(func.count()).select_from(Course)) or 0
    
    # Invoices overdue
    invoices_overdue = db.scalar(
        select(func.count())
        .select_from(Invoice)
        .where(Invoice.status == InvoiceStatus.OVERDUE)
    ) or 0
    
    # Sections in current term
    sections_term = 0
    if term:
        sections_term = db.scalar(
            select(func.count())
            .select_from(Section)
            .where(Section.term_id == term.id)
        ) or 0
    
    return {
        "total_users": total_users,
        "total_courses": total_courses,
        "invoices_overdue": invoices_overdue,
        "sections_term": sections_term,
    }
