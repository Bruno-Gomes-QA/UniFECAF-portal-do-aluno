"""
UniFECAF Portal do Aluno - Home Page Router
"""

from datetime import date, datetime, time, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import and_, func
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.models.academics import (
    ClassSession,
    Course,
    FinalGrade,
    Section,
    SectionEnrollment,
    Student,
    Subject,
    Term,
)
from app.models.finance import Invoice, InvoiceStatus
from app.models.notifications import Notification, UserNotification
from app.models.user import User
from app.routers.auth import CurrentUser
from app.schemas.home import (
    ClassInfo,
    CourseInfo,
    FinancialSummary,
    GradeSummary,
    HomeResponse,
    InvoiceInfo,
    NotificationInfo,
    QuickAction,
    StudentInfo,
    SubjectGrade,
    TodayAgenda,
)

router = APIRouter(tags=["Home"])


def get_student_info(user: User, db: Session) -> StudentInfo:
    """Get student profile information."""
    student = db.query(Student).filter(Student.user_id == user.id).first()

    if not student:
        # Return minimal info if student profile doesn't exist
        return StudentInfo(
            user_id=user.id,
            ra="N/A",
            full_name=user.email.split("@")[0],
            email=user.email,
            course=CourseInfo(
                id=UUID("00000000-0000-0000-0000-000000000000"),
                name="Não matriculado",
                degree_type=None,
                campus_name=None,
            ),
            total_progress=Decimal("0.00"),
            current_term=None,
        )

    course = db.query(Course).filter(Course.id == student.course_id).first()
    current_term = db.query(Term).filter(Term.is_current == True).first()  # noqa: E712

    campus_name = None
    if course and course.campus:
        campus_name = course.campus.name

    return StudentInfo(
        user_id=user.id,
        ra=student.ra,
        full_name=student.full_name,
        email=user.email,
        course=CourseInfo(
            id=course.id if course else UUID("00000000-0000-0000-0000-000000000000"),
            name=course.name if course else "Curso não encontrado",
            degree_type=course.degree_type if course else None,
            campus_name=campus_name,
        ),
        total_progress=student.total_progress,
        current_term=current_term.code if current_term else None,
    )


def get_grades_summary(user: User, db: Session) -> GradeSummary:
    """Get grades summary for current term."""
    current_term = db.query(Term).filter(Term.is_current == True).first()  # noqa: E712

    if not current_term:
        return GradeSummary(
            current_term="N/A",
            subjects=[],
            average_score=None,
            subjects_at_risk=0,
        )

    # Get student's final grades for current term
    grades = (
        db.query(FinalGrade)
        .join(Section)
        .join(Subject)
        .filter(
            FinalGrade.student_id == user.id,
            Section.term_id == current_term.id,
        )
        .all()
    )

    subject_grades = []
    scores = []
    at_risk = 0

    for grade in grades:
        section = grade.section
        subject = section.subject

        has_alert = grade.absences_pct > Decimal("20.00")
        if has_alert:
            at_risk += 1

        if grade.final_score is not None:
            scores.append(grade.final_score)

        subject_grades.append(
            SubjectGrade(
                subject_id=subject.id,
                subject_code=subject.code,
                subject_name=subject.name,
                final_score=grade.final_score,
                absences_count=grade.absences_count,
                absences_pct=grade.absences_pct,
                status=grade.status.value,
                has_absence_alert=has_alert,
            )
        )

    avg_score = sum(scores) / len(scores) if scores else None

    return GradeSummary(
        current_term=current_term.code,
        subjects=subject_grades,
        average_score=avg_score,
        subjects_at_risk=at_risk,
    )


def get_financial_summary(user: User, db: Session) -> FinancialSummary:
    """Get financial summary."""
    today = date.today()

    invoices = (
        db.query(Invoice)
        .filter(Invoice.student_id == user.id)
        .order_by(Invoice.due_date.desc())
        .limit(10)
        .all()
    )

    invoice_list = []
    total_pending = Decimal("0.00")
    total_overdue = Decimal("0.00")

    for inv in invoices:
        is_overdue = inv.status == InvoiceStatus.PENDING and inv.due_date < today

        if inv.status == InvoiceStatus.PENDING:
            if is_overdue:
                total_overdue += inv.amount
            else:
                total_pending += inv.amount

        invoice_list.append(
            InvoiceInfo(
                id=inv.id,
                description=inv.description,
                due_date=inv.due_date,
                amount=inv.amount,
                status="OVERDUE" if is_overdue else inv.status.value,
                is_overdue=is_overdue,
            )
        )

    return FinancialSummary(
        invoices=invoice_list,
        total_pending=total_pending,
        total_overdue=total_overdue,
        has_pending=total_pending > 0,
        has_overdue=total_overdue > 0,
    )


def get_today_agenda(user: User, db: Session) -> TodayAgenda:
    """Get today's class schedule."""
    today = date.today()
    now = datetime.now(timezone.utc).time()

    # Get today's sessions for enrolled sections
    sessions = (
        db.query(ClassSession)
        .join(Section)
        .join(SectionEnrollment)
        .join(Subject, Section.subject_id == Subject.id)
        .filter(
            SectionEnrollment.student_id == user.id,
            ClassSession.session_date == today,
            ClassSession.is_canceled == False,  # noqa: E712
        )
        .order_by(ClassSession.start_time)
        .all()
    )

    classes = []
    next_class = None

    for session in sessions:
        section = session.section
        subject = section.subject

        is_next = next_class is None and session.start_time >= now

        class_info = ClassInfo(
            session_id=session.id,
            subject_name=subject.name,
            subject_code=subject.code,
            start_time=session.start_time,
            end_time=session.end_time,
            room=session.room or section.room_default,
            is_next=is_next,
        )

        classes.append(class_info)

        if is_next:
            next_class = class_info

    return TodayAgenda(
        date=today,
        classes=classes,
        total_classes=len(classes),
        next_class=next_class,
    )


def get_notifications(user: User, db: Session) -> tuple[list[NotificationInfo], int]:
    """Get user notifications."""
    user_notifications = (
        db.query(UserNotification)
        .options(joinedload(UserNotification.notification))
        .filter(
            UserNotification.user_id == user.id,
            UserNotification.archived_at == None,  # noqa: E711
        )
        .order_by(UserNotification.delivered_at.desc())
        .limit(20)
        .all()
    )

    notifications = []
    unread_count = 0

    for un in user_notifications:
        notif = un.notification
        is_read = un.read_at is not None

        if not is_read:
            unread_count += 1

        notifications.append(
            NotificationInfo(
                id=un.id,
                notification_id=notif.id,
                type=notif.type.value,
                priority=notif.priority.value,
                title=notif.title,
                body=notif.body,
                delivered_at=un.delivered_at,
                read_at=un.read_at,
                is_read=is_read,
            )
        )

    return notifications, unread_count


def get_quick_actions() -> list[QuickAction]:
    """Get available quick actions."""
    return [
        QuickAction(
            id="declaration",
            label="Declaração de Matrícula",
            icon="document",
            href="/documents/declaration",
            description="Gerar declaração de vínculo com a instituição",
        ),
        QuickAction(
            id="student-card",
            label="Carteirinha Digital",
            icon="id-card",
            href="/documents/student-card",
            description="Visualizar carteirinha de estudante",
        ),
        QuickAction(
            id="transcript",
            label="Histórico Escolar",
            icon="academic-cap",
            href="/documents/transcript",
            description="Consultar histórico acadêmico completo",
        ),
        QuickAction(
            id="calendar",
            label="Calendário Acadêmico",
            icon="calendar",
            href="/calendar",
            description="Ver datas importantes do semestre",
        ),
    ]


@router.get("/home", response_model=HomeResponse)
def get_home(
    current_user: CurrentUser,
    db: Session = Depends(get_db),
) -> HomeResponse:
    """
    Get home page data for the authenticated student.

    Returns complete dashboard data including:
    - Student profile information
    - Grades summary for current term
    - Financial summary (pending/overdue invoices)
    - Today's class schedule
    - Recent notifications
    - Quick action links
    """
    student_info = get_student_info(current_user, db)
    grades = get_grades_summary(current_user, db)
    financial = get_financial_summary(current_user, db)
    agenda = get_today_agenda(current_user, db)
    notifications, unread_count = get_notifications(current_user, db)
    quick_actions = get_quick_actions()

    return HomeResponse(
        student=student_info,
        grades=grades,
        financial=financial,
        today_agenda=agenda,
        notifications=notifications,
        unread_notifications_count=unread_count,
        quick_actions=quick_actions,
        generated_at=datetime.now(timezone.utc),
    )
