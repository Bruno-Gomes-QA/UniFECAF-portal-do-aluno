"""
UniFECAF Portal do Aluno - API v1 Me Router (/me).
"""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload
from starlette import status

from app.core.database import get_db
from app.core.deps import CurrentUser, pagination_params
from app.core.errors import raise_api_error
from app.db.utils import get_or_404, paginate_stmt
from app.models.academics import (
    ClassSession,
    Course,
    EnrollmentStatus,
    FinalGrade,
    Section,
    SectionEnrollment,
    Student,
    StudentStatus,
    Subject,
    Term,
)
from app.models.documents import DocumentStatus, DocumentType, StudentDocument
from app.models.finance import Invoice, InvoiceStatus, Payment, PaymentStatus
from app.models.notifications import UserNotification
from app.models.user import UserRole
from app.schemas.common import PaginatedResponse
from app.schemas.me import (
    MeAcademicSubjectItem,
    MeAcademicSummaryResponse,
    MeAttendanceResponse,
    MeAttendanceSessionInfo,
    MeAttendanceSubjectInfo,
    MeCourseInfo,
    MeDocumentDownloadResponse,
    MeDocumentInfo,
    MeDocumentRequestResponse,
    MeEnrollmentInfo,
    MeEnrollmentsResponse,
    MeFinancialSummaryResponse,
    MeGradeComponentInfo,
    MeGradeDetailInfo,
    MeGradesResponse,
    MeInvoiceInfo,
    MeNotificationInfo,
    MePayMockResponse,
    MeProfileResponse,
    MeProfileUpdateRequest,
    MeProfileUpdateResponse,
    MeScheduleClassInfo,
    MeScheduleTodayResponse,
    MeScheduleWeekResponse,
    MeTermOption,
    MeTodayClassInfo,
    MeTodayClassResponse,
    MeTranscriptResponse,
    MeTranscriptSubjectInfo,
    MeTranscriptTermInfo,
    MeUnreadCountResponse,
)

router = APIRouter(prefix="/api/v1/me", tags=["Me"])


def _require_student(user: CurrentUser) -> None:
    if user.role != UserRole.STUDENT:
        raise_api_error(
            status_code=status.HTTP_403_FORBIDDEN,
            code="AUTH_FORBIDDEN",
            message="Apenas alunos podem acessar este recurso.",
        )


def _get_active_student(user: CurrentUser, db: Session) -> Student:
    """
    Obtém o perfil de aluno do usuário atual.
    
    Validações:
    - Usuário deve ter role STUDENT
    - Perfil de aluno deve existir
    - Status deve ser ACTIVE (LOCKED/GRADUATED/DELETED bloqueiam acesso)
    """
    _require_student(user)
    student = db.query(Student).filter(Student.user_id == user.id).first()
    if not student:
        raise_api_error(
            status_code=status.HTTP_404_NOT_FOUND,
            code="STUDENT_NOT_FOUND",
            message="Perfil de aluno não encontrado.",
        )
    
    # Validate student status
    if student.status == StudentStatus.DELETED:
        raise_api_error(
            status_code=status.HTTP_403_FORBIDDEN,
            code="STUDENT_DELETED",
            message="Seu cadastro foi excluído. Entre em contato com a secretaria.",
        )
    if student.status == StudentStatus.LOCKED:
        raise_api_error(
            status_code=status.HTTP_403_FORBIDDEN,
            code="STUDENT_LOCKED",
            message="Sua matrícula está trancada. Entre em contato com a secretaria.",
        )
    if student.status == StudentStatus.GRADUATED:
        raise_api_error(
            status_code=status.HTTP_403_FORBIDDEN,
            code="STUDENT_GRADUATED",
            message="Você já concluiu o curso. Entre em contato com a secretaria para acesso ao histórico.",
        )
    
    return student


@router.get("/profile", response_model=MeProfileResponse, summary="Perfil do aluno")
def profile(current_user: CurrentUser, db: Session = Depends(get_db)) -> MeProfileResponse:
    student = _get_active_student(current_user, db)

    course = db.query(Course).filter(Course.id == student.course_id).first()
    current_term = db.query(Term).filter(Term.is_current.is_(True)).first()

    # Calcular progresso real baseado em semestres concluídos
    total_progress = Decimal("0.00")
    if course and course.duration_terms and course.duration_terms > 0:
        # Contar quantos semestres o aluno já concluiu
        # Um semestre é considerado concluído se o aluno tem pelo menos 1 matrícula APPROVED naquele termo
        from sqlalchemy import func, distinct
        
        completed_terms_count = (
            db.query(func.count(distinct(Section.term_id)))
            .join(FinalGrade, FinalGrade.section_id == Section.id)
            .filter(
                FinalGrade.student_id == student.user_id,
                FinalGrade.status == "APPROVED"
            )
            .scalar()
        ) or 0
        
        # Calcular percentual: (semestres concluídos / total de semestres do curso) * 100
        total_progress = (
            Decimal(completed_terms_count) / Decimal(course.duration_terms) * 100
        )
        
        # Limitar a 100%
        if total_progress > 100:
            total_progress = Decimal("100.00")

    return MeProfileResponse(
        user_id=current_user.id,
        ra=student.ra,
        full_name=student.full_name,
        email=current_user.email,
        course=MeCourseInfo(
            id=course.id if course else student.course_id,
            name=course.name if course else "Curso não encontrado",
            degree_type=course.degree_type if course else None,
        ),
        total_progress=total_progress,
        current_term=current_term.code if current_term else None,
    )


@router.get("/terms", response_model=list[MeTermOption], summary="Listar semestres disponíveis")
def list_terms(
    current_user: CurrentUser,
    db: Session = Depends(get_db),
) -> list[MeTermOption]:
    """
    Lista todos os semestres disponíveis para seleção.
    Retorna ordenado do mais recente para o mais antigo.
    """
    _require_student(current_user)
    
    stmt = select(Term).order_by(Term.start_date.desc())
    terms = db.scalars(stmt).all()
    
    return [
        MeTermOption(id=t.id, code=t.code, is_current=t.is_current)
        for t in terms
    ]


@router.get("/today-class", response_model=MeTodayClassResponse, summary="Aula do dia (máx 1)")
def today_class(current_user: CurrentUser, db: Session = Depends(get_db)) -> MeTodayClassResponse:
    student = _get_active_student(current_user, db)

    today = date.today()
    student_id = student.user_id

    stmt = (
        select(ClassSession, Subject)
        .join(Section, Section.id == ClassSession.section_id)
        .join(SectionEnrollment, SectionEnrollment.section_id == Section.id)
        .join(Subject, Subject.id == Section.subject_id)
        .where(SectionEnrollment.student_id == student_id)
        .where(SectionEnrollment.status == EnrollmentStatus.ENROLLED)
        .where(ClassSession.session_date == today)
        .where(ClassSession.is_canceled.is_(False))
        .order_by(ClassSession.start_time.asc())
    )

    rows = db.execute(stmt).all()
    warnings: list[str] = []
    if len(rows) > 1:
        warnings.append(
            "Mais de uma aula encontrada para o dia; retornando a primeira por horário."
        )

    if not rows:
        return MeTodayClassResponse(class_info=None, warnings=warnings)

    session, subject = rows[0]
    section = db.query(Section).filter(Section.id == session.section_id).first()

    return MeTodayClassResponse(
        class_info=MeTodayClassInfo(
            session_id=session.id,
            subject_id=subject.id,
            subject_code=subject.code,
            subject_name=subject.name,
            session_date=session.session_date,
            start_time=session.start_time,
            end_time=session.end_time,
            room=session.room or (section.room_default if section else None),
        ),
        warnings=warnings,
    )


@router.get(
    "/academic/summary",
    response_model=MeAcademicSummaryResponse,
    summary="Resumo acadêmico (term atual)",
)
def academic_summary(
    current_user: CurrentUser, db: Session = Depends(get_db)
) -> MeAcademicSummaryResponse:
    student = _get_active_student(current_user, db)

    current_term = db.query(Term).filter(Term.is_current.is_(True)).first()
    if not current_term:
        return MeAcademicSummaryResponse(
            current_term="N/A",
            subjects=[],
            average_score=None,
            subjects_at_risk=0,
        )

    grades = (
        db.query(FinalGrade)
        .join(Section, Section.id == FinalGrade.section_id)
        .join(Subject, Subject.id == Section.subject_id)
        .filter(FinalGrade.student_id == student.user_id, Section.term_id == current_term.id)
        .all()
    )

    items: list[MeAcademicSubjectItem] = []
    scores: list[Decimal] = []
    at_risk = 0

    for grade in grades:
        section = grade.section
        subject = section.subject

        has_alert = grade.absences_pct > Decimal("20.00")
        if has_alert:
            at_risk += 1

        if grade.final_score is not None:
            scores.append(grade.final_score)

        items.append(
            MeAcademicSubjectItem(
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

    average_score = (sum(scores) / len(scores)) if scores else None

    return MeAcademicSummaryResponse(
        current_term=current_term.code,
        subjects=items,
        average_score=average_score,
        subjects_at_risk=at_risk,
    )


def _invoice_to_info(inv: Invoice) -> MeInvoiceInfo:
    today = date.today()
    is_overdue = inv.status == InvoiceStatus.PENDING and inv.due_date < today
    status_value = "OVERDUE" if is_overdue else inv.status.value
    return MeInvoiceInfo(
        id=inv.id,
        description=inv.description,
        due_date=inv.due_date,
        amount=inv.amount,
        status=status_value,
        is_overdue=is_overdue,
    )


@router.get(
    "/financial/summary",
    response_model=MeFinancialSummaryResponse,
    summary="Resumo financeiro",
)
def financial_summary(
    current_user: CurrentUser,
    db: Session = Depends(get_db),
) -> MeFinancialSummaryResponse:
    student = _get_active_student(current_user, db)

    invoices = (
        db.query(Invoice)
        .filter(Invoice.student_id == student.user_id)
        .order_by(Invoice.due_date.asc())
        .all()
    )

    pending = [inv for inv in invoices if inv.status == InvoiceStatus.PENDING]
    paid = [inv for inv in invoices if inv.status == InvoiceStatus.PAID]

    next_pending = min(pending, key=lambda i: i.due_date) if pending else None
    last_paid = max(paid, key=lambda i: i.due_date) if paid else None

    total_pending = Decimal("0.00")
    total_overdue = Decimal("0.00")
    today = date.today()

    for inv in pending:
        if inv.due_date < today:
            total_overdue += inv.amount
        else:
            total_pending += inv.amount

    return MeFinancialSummaryResponse(
        next_invoice=_invoice_to_info(next_pending) if next_pending else None,
        last_paid_invoice=_invoice_to_info(last_paid) if last_paid else None,
        total_pending=total_pending,
        total_overdue=total_overdue,
        has_pending=total_pending > 0,
        has_overdue=total_overdue > 0,
    )


@router.get(
    "/financial/invoices",
    response_model=PaginatedResponse[MeInvoiceInfo],
    summary="Lista de boletos (paginado)",
)
def financial_invoices(
    current_user: CurrentUser,
    db: Session = Depends(get_db),
    pagination: dict[str, int] = Depends(pagination_params),
    status_filter: InvoiceStatus | None = Query(None, alias="status", description="Filtrar por status do invoice."),
    term_id: UUID | None = Query(None, description="ID do termo (opcional, sem filtro retorna todos)"),
) -> PaginatedResponse[MeInvoiceInfo]:
    student = _get_active_student(current_user, db)

    stmt = (
        select(Invoice)
        .where(Invoice.student_id == student.user_id)
        .order_by(Invoice.due_date.desc())
    )
    if status_filter is not None:
        stmt = stmt.where(Invoice.status == status_filter)
    if term_id is not None:
        stmt = stmt.where(Invoice.term_id == term_id)

    items, total = paginate_stmt(db, stmt, limit=pagination["limit"], offset=pagination["offset"])
    return PaginatedResponse[MeInvoiceInfo](
        items=[_invoice_to_info(inv) for inv in items],
        limit=pagination["limit"],
        offset=pagination["offset"],
        total=total,
    )


@router.post(
    "/financial/invoices/{invoice_id}/pay-mock",
    response_model=MePayMockResponse,
    summary="Pagar mock (gera Payment e marca invoice como PAID)",
)
def pay_mock(
    invoice_id: UUID, current_user: CurrentUser, db: Session = Depends(get_db)
) -> MePayMockResponse:
    student = _get_active_student(current_user, db)

    invoice = get_or_404(
        db, Invoice, invoice_id, code="INVOICE_NOT_FOUND", message="Boleto não encontrado."
    )
    if invoice.student_id != student.user_id:
        raise_api_error(
            status_code=status.HTTP_403_FORBIDDEN,
            code="AUTH_FORBIDDEN",
            message="Acesso negado.",
        )

    if invoice.status == InvoiceStatus.CANCELED:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="FINANCE_INVOICE_CANCELED",
            message="Boleto cancelado.",
        )

    if invoice.status == InvoiceStatus.PAID:
        existing = (
            db.query(Payment)
            .filter(Payment.invoice_id == invoice.id)
            .order_by(Payment.created_at.desc())
            .first()
        )
        if existing:
            return MePayMockResponse(
                invoice_id=invoice.id,
                payment_id=existing.id,
                status=existing.status.value,
                paid_at=existing.paid_at or datetime.now(UTC),
            )

    if invoice.status != InvoiceStatus.PENDING:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="FINANCE_INVOICE_NOT_PAYABLE",
            message="Boleto não pode ser pago no status atual.",
        )

    paid_at = datetime.now(UTC)
    payment = Payment(
        invoice_id=invoice.id,
        amount=invoice.amount,
        status=PaymentStatus.SETTLED,
        provider="mock",
        provider_ref="mock",
        paid_at=paid_at,
    )
    db.add(payment)
    invoice.status = InvoiceStatus.PAID
    db.commit()

    return MePayMockResponse(
        invoice_id=invoice.id,
        payment_id=payment.id,
        status=payment.status.value,
        paid_at=paid_at,
    )


@router.get(
    "/notifications",
    response_model=PaginatedResponse[MeNotificationInfo],
    summary="Lista de notificações (paginado)",
)
def notifications(
    current_user: CurrentUser,
    db: Session = Depends(get_db),
    pagination: dict[str, int] = Depends(pagination_params),
    unread_only: bool = Query(False, description="Se true, retorna apenas não lidas."),
) -> PaginatedResponse[MeNotificationInfo]:
    student = _get_active_student(current_user, db)

    stmt = (
        select(UserNotification)
        .options(joinedload(UserNotification.notification))
        .where(UserNotification.user_id == student.user_id)
        .where(UserNotification.archived_at.is_(None))
        .order_by(UserNotification.delivered_at.desc())
    )
    if unread_only:
        stmt = stmt.where(UserNotification.read_at.is_(None))

    items, total = paginate_stmt(db, stmt, limit=pagination["limit"], offset=pagination["offset"])

    result_items: list[MeNotificationInfo] = []
    for un in items:
        notif = un.notification
        is_read = un.read_at is not None
        result_items.append(
            MeNotificationInfo(
                id=un.id,
                notification_id=notif.id,
                type=notif.type.value,
                priority=notif.priority.value,
                title=notif.title,
                body=notif.body,
                delivered_at=un.delivered_at,
                read_at=un.read_at,
                archived_at=un.archived_at,
                is_read=is_read,
            )
        )

    return PaginatedResponse[MeNotificationInfo](
        items=result_items,
        limit=pagination["limit"],
        offset=pagination["offset"],
        total=total,
    )


@router.get(
    "/notifications/unread-count",
    response_model=MeUnreadCountResponse,
    summary="Quantidade de notificações não lidas",
)
def unread_count(current_user: CurrentUser, db: Session = Depends(get_db)) -> MeUnreadCountResponse:
    student = _get_active_student(current_user, db)

    count = (
        db.query(func.count(UserNotification.id))
        .filter(UserNotification.user_id == student.user_id)
        .filter(UserNotification.archived_at.is_(None))
        .filter(UserNotification.read_at.is_(None))
        .scalar()
    )
    return MeUnreadCountResponse(unread_count=int(count or 0))


@router.post(
    "/notifications/{user_notification_id}/read",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Marcar notificação como lida",
)
def mark_read(
    user_notification_id: UUID, current_user: CurrentUser, db: Session = Depends(get_db)
) -> None:
    student = _get_active_student(current_user, db)

    un = get_or_404(
        db,
        UserNotification,
        user_notification_id,
        code="NOTIFICATION_NOT_FOUND",
        message="Notificação não encontrada.",
    )
    if un.user_id != student.user_id:
        raise_api_error(
            status_code=status.HTTP_403_FORBIDDEN, code="AUTH_FORBIDDEN", message="Acesso negado."
        )

    if un.read_at is None:
        un.read_at = datetime.now(UTC)
        db.commit()


@router.post(
    "/notifications/{user_notification_id}/unread",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Marcar notificação como não lida",
)
def mark_unread(
    user_notification_id: UUID, current_user: CurrentUser, db: Session = Depends(get_db)
) -> None:
    student = _get_active_student(current_user, db)

    un = get_or_404(
        db,
        UserNotification,
        user_notification_id,
        code="NOTIFICATION_NOT_FOUND",
        message="Notificação não encontrada.",
    )
    if un.user_id != student.user_id:
        raise_api_error(
            status_code=status.HTTP_403_FORBIDDEN, code="AUTH_FORBIDDEN", message="Acesso negado."
        )

    if un.read_at is not None:
        un.read_at = None
        db.commit()


@router.post(
    "/notifications/{user_notification_id}/archive",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Arquivar notificação",
)
def archive(
    user_notification_id: UUID, current_user: CurrentUser, db: Session = Depends(get_db)
) -> None:
    student = _get_active_student(current_user, db)

    un = get_or_404(
        db,
        UserNotification,
        user_notification_id,
        code="NOTIFICATION_NOT_FOUND",
        message="Notificação não encontrada.",
    )
    if un.user_id != student.user_id:
        raise_api_error(
            status_code=status.HTTP_403_FORBIDDEN, code="AUTH_FORBIDDEN", message="Acesso negado."
        )

    if un.archived_at is None:
        un.archived_at = datetime.now(UTC)
        db.commit()


@router.get("/documents", response_model=list[MeDocumentInfo], summary="Documentos do aluno")
def documents(current_user: CurrentUser, db: Session = Depends(get_db)) -> list[MeDocumentInfo]:
    student = _get_active_student(current_user, db)

    docs = (
        db.query(StudentDocument)
        .filter(StudentDocument.student_id == student.user_id)
        .order_by(StudentDocument.doc_type.asc())
        .all()
    )
    return [
        MeDocumentInfo(
            id=d.id,
            doc_type=d.doc_type.value,
            status=d.status.value,
            title=d.title,
            file_url=d.file_url,
            generated_at=d.generated_at,
        )
        for d in docs
    ]


@router.post(
    "/documents/{doc_type}/request",
    response_model=MeDocumentRequestResponse,
    summary="Solicitar documento (mock)",
)
def request_document(
    doc_type: DocumentType,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
) -> MeDocumentRequestResponse:
    student = _get_active_student(current_user, db)

    doc = (
        db.query(StudentDocument)
        .filter(StudentDocument.student_id == student.user_id, StudentDocument.doc_type == doc_type)
        .first()
    )
    if not doc:
        doc = StudentDocument(student_id=student.user_id, doc_type=doc_type)
        db.add(doc)
        db.flush()

    now = datetime.now(UTC)
    doc.status = DocumentStatus.GENERATING
    doc.title = doc.title or doc_type.value.replace("_", " ").title()
    doc.file_url = f"/api/v1/me/documents/{doc_type.value}/download"
    doc.generated_at = now
    doc.status = DocumentStatus.AVAILABLE
    db.commit()

    return MeDocumentRequestResponse(
        doc_type=doc.doc_type.value,
        status=doc.status.value,
        file_url=doc.file_url,
        generated_at=doc.generated_at,
    )


@router.get(
    "/documents/{doc_type}/download",
    response_model=MeDocumentDownloadResponse,
    summary="Download de documento (mock)",
)
def download_document(
    doc_type: DocumentType,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
) -> MeDocumentDownloadResponse:
    student = _get_active_student(current_user, db)

    doc = (
        db.query(StudentDocument)
        .filter(StudentDocument.student_id == student.user_id, StudentDocument.doc_type == doc_type)
        .first()
    )
    if not doc or doc.status != DocumentStatus.AVAILABLE or not doc.file_url:
        raise_api_error(
            status_code=status.HTTP_404_NOT_FOUND,
            code="DOCUMENT_NOT_AVAILABLE",
            message="Documento não disponível.",
        )

    return MeDocumentDownloadResponse(doc_type=doc.doc_type.value, file_url=doc.file_url)


# =========== Schedule / Horários ===========


def _session_to_schedule_info(session: ClassSession, subject: Subject, section: Section) -> MeScheduleClassInfo:
    """Converte ClassSession para MeScheduleClassInfo."""
    return MeScheduleClassInfo(
        session_id=session.id,
        subject_id=subject.id,
        subject_code=subject.code,
        subject_name=subject.name,
        section_id=section.id,
        session_date=session.session_date,
        start_time=session.start_time,
        end_time=session.end_time,
        room=session.room or section.room_default,
        is_canceled=session.is_canceled,
        weekday=session.session_date.weekday(),
    )


@router.get(
    "/schedule/today",
    response_model=MeScheduleTodayResponse,
    summary="Todas as aulas de hoje",
)
def schedule_today(
    current_user: CurrentUser,
    db: Session = Depends(get_db),
) -> MeScheduleTodayResponse:
    """Retorna todas as aulas do dia atual."""
    student = _get_active_student(current_user, db)
    today = date.today()

    stmt = (
        select(ClassSession, Subject, Section)
        .join(Section, Section.id == ClassSession.section_id)
        .join(SectionEnrollment, SectionEnrollment.section_id == Section.id)
        .join(Subject, Subject.id == Section.subject_id)
        .where(SectionEnrollment.student_id == student.user_id)
        .where(SectionEnrollment.status == EnrollmentStatus.ENROLLED)
        .where(ClassSession.session_date == today)
        .order_by(ClassSession.start_time.asc())
    )

    rows = db.execute(stmt).all()
    classes = [_session_to_schedule_info(session, subject, section) for session, subject, section in rows]

    return MeScheduleTodayResponse(
        date=today,
        classes=classes,
        total_classes=len(classes),
    )


@router.get(
    "/schedule/week",
    response_model=MeScheduleWeekResponse,
    summary="Grade semanal de aulas",
)
def schedule_week(
    current_user: CurrentUser,
    db: Session = Depends(get_db),
    week_offset: int = Query(0, ge=-4, le=4, description="Offset de semanas (-4 a +4)"),
) -> MeScheduleWeekResponse:
    """Retorna a grade semanal de aulas."""
    student = _get_active_student(current_user, db)

    # Calcula início e fim da semana (segunda a domingo)
    today = date.today()
    week_start = today - timedelta(days=today.weekday()) + timedelta(weeks=week_offset)
    week_end = week_start + timedelta(days=6)

    stmt = (
        select(ClassSession, Subject, Section)
        .join(Section, Section.id == ClassSession.section_id)
        .join(SectionEnrollment, SectionEnrollment.section_id == Section.id)
        .join(Subject, Subject.id == Section.subject_id)
        .where(SectionEnrollment.student_id == student.user_id)
        .where(SectionEnrollment.status == EnrollmentStatus.ENROLLED)
        .where(ClassSession.session_date >= week_start)
        .where(ClassSession.session_date <= week_end)
        .order_by(ClassSession.session_date, ClassSession.start_time)
    )

    rows = db.execute(stmt).all()

    # Agrupa por dia da semana
    days: dict[str, list[MeScheduleClassInfo]] = {
        "monday": [],
        "tuesday": [],
        "wednesday": [],
        "thursday": [],
        "friday": [],
        "saturday": [],
        "sunday": [],
    }
    day_names = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

    for session, subject, section in rows:
        info = _session_to_schedule_info(session, subject, section)
        day_name = day_names[session.session_date.weekday()]
        days[day_name].append(info)

    return MeScheduleWeekResponse(
        week_start=week_start,
        week_end=week_end,
        days=days,
        total_classes=len(rows),
    )


# =========== Enrollments / Matrículas ===========


@router.get(
    "/enrollments",
    response_model=MeEnrollmentsResponse,
    summary="Matrículas do aluno (termo atual)",
)
def enrollments(
    current_user: CurrentUser,
    db: Session = Depends(get_db),
) -> MeEnrollmentsResponse:
    """Retorna todas as matrículas do aluno no termo atual."""
    student = _get_active_student(current_user, db)

    current_term = db.query(Term).filter(Term.is_current.is_(True)).first()
    if not current_term:
        return MeEnrollmentsResponse(term_code=None, enrollments=[], total_credits=0)

    enrollments_data = (
        db.query(SectionEnrollment)
        .join(Section, Section.id == SectionEnrollment.section_id)
        .join(Subject, Subject.id == Section.subject_id)
        .filter(
            SectionEnrollment.student_id == student.user_id,
            Section.term_id == current_term.id,
        )
        .all()
    )

    items: list[MeEnrollmentInfo] = []
    total_credits = 0

    for enrollment in enrollments_data:
        section = enrollment.section
        subject = section.subject

        # Tenta obter professor (se existir)
        professor_name = None
        if section.professor_id:
            from app.models.user import User
            professor = db.query(User).filter(User.id == section.professor_id).first()
            if professor:
                professor_name = professor.email.split("@")[0].replace(".", " ").title()

        items.append(
            MeEnrollmentInfo(
                enrollment_id=enrollment.id,
                section_id=section.id,
                subject_id=subject.id,
                subject_code=subject.code,
                subject_name=subject.name,
                credits=subject.credits,
                term_code=current_term.code,
                professor_name=professor_name,
                status=enrollment.status.value,
                enrolled_at=enrollment.enrolled_at,
            )
        )
        if enrollment.status == EnrollmentStatus.ENROLLED:
            total_credits += subject.credits

    return MeEnrollmentsResponse(
        term_code=current_term.code,
        enrollments=items,
        total_credits=total_credits,
    )


# =========== Grades / Notas Detalhadas ===========


@router.get(
    "/grades",
    response_model=MeGradesResponse,
    summary="Notas detalhadas do aluno",
)
def grades(
    current_user: CurrentUser,
    db: Session = Depends(get_db),
    term_id: UUID | None = Query(None, description="ID do termo (opcional, default=atual)"),
) -> MeGradesResponse:
    """Retorna notas detalhadas por disciplina."""
    student = _get_active_student(current_user, db)

    if term_id:
        term = db.query(Term).filter(Term.id == term_id).first()
    else:
        term = db.query(Term).filter(Term.is_current.is_(True)).first()

    if not term:
        return MeGradesResponse(term_code=None, grades=[], average=None)

    final_grades = (
        db.query(FinalGrade)
        .join(Section, Section.id == FinalGrade.section_id)
        .join(Subject, Subject.id == Section.subject_id)
        .filter(
            FinalGrade.student_id == student.user_id,
            Section.term_id == term.id,
        )
        .all()
    )

    items: list[MeGradeDetailInfo] = []
    scores: list[Decimal] = []

    for fg in final_grades:
        section = fg.section
        subject = section.subject

        # Mock de componentes de nota (P1, P2, Trabalho) - em produção viria de uma tabela GradeComponent
        components: list[MeGradeComponentInfo] = []
        if fg.final_score is not None:
            # Simula componentes com base na nota final
            p1_score = fg.final_score * Decimal("0.9") if fg.final_score else None
            p2_score = fg.final_score * Decimal("1.1") if fg.final_score else None
            if p2_score and p2_score > Decimal("10"):
                p2_score = Decimal("10")

            from uuid import uuid4
            components = [
                MeGradeComponentInfo(
                    id=uuid4(),
                    label="P1",
                    weight=Decimal("0.40"),
                    max_score=Decimal("10.00"),
                    score=p1_score,
                    graded_at=datetime.now(UTC) - timedelta(days=30),
                ),
                MeGradeComponentInfo(
                    id=uuid4(),
                    label="P2",
                    weight=Decimal("0.40"),
                    max_score=Decimal("10.00"),
                    score=p2_score,
                    graded_at=datetime.now(UTC) - timedelta(days=7),
                ),
                MeGradeComponentInfo(
                    id=uuid4(),
                    label="Trabalho",
                    weight=Decimal("0.20"),
                    max_score=Decimal("10.00"),
                    score=fg.final_score,
                    graded_at=datetime.now(UTC),
                ),
            ]

        needs_exam = fg.final_score is not None and fg.final_score < Decimal("6.0")

        items.append(
            MeGradeDetailInfo(
                section_id=section.id,
                subject_id=subject.id,
                subject_code=subject.code,
                subject_name=subject.name,
                term_code=term.code,
                components=components,
                final_score=fg.final_score,
                status=fg.status.value,
                needs_exam=needs_exam,
            )
        )

        if fg.final_score is not None:
            scores.append(fg.final_score)

    average = (sum(scores) / len(scores)) if scores else None

    return MeGradesResponse(
        term_code=term.code,
        grades=items,
        average=average,
    )


# =========== Attendance / Frequência ===========


@router.get(
    "/attendance",
    response_model=MeAttendanceResponse,
    summary="Frequência do aluno",
)
def attendance(
    current_user: CurrentUser,
    db: Session = Depends(get_db),
    term_id: UUID | None = Query(None, description="ID do termo (opcional, default=atual)"),
) -> MeAttendanceResponse:
    """Retorna frequência detalhada por disciplina."""
    student = _get_active_student(current_user, db)

    if term_id:
        term = db.query(Term).filter(Term.id == term_id).first()
    else:
        term = db.query(Term).filter(Term.is_current.is_(True)).first()

    if not term:
        return MeAttendanceResponse(term_code=None, subjects=[], overall_attendance_pct=None)

    final_grades = (
        db.query(FinalGrade)
        .join(Section, Section.id == FinalGrade.section_id)
        .join(Subject, Subject.id == Section.subject_id)
        .filter(
            FinalGrade.student_id == student.user_id,
            Section.term_id == term.id,
        )
        .all()
    )

    items: list[MeAttendanceSubjectInfo] = []
    total_attended = 0
    total_sessions_all = 0

    for fg in final_grades:
        section = fg.section
        subject = section.subject

        # Busca sessões da seção
        sessions = (
            db.query(ClassSession)
            .filter(ClassSession.section_id == section.id)
            .filter(ClassSession.is_canceled.is_(False))
            .filter(ClassSession.session_date <= date.today())
            .order_by(ClassSession.session_date.desc())
            .all()
        )

        total_sessions = len(sessions)
        # Usa dados do FinalGrade para faltas
        absences_count = fg.absences_count or 0
        attended = total_sessions - absences_count if total_sessions > absences_count else 0

        absences_pct = fg.absences_pct or Decimal("0.00")
        has_alert = absences_pct > Decimal("20.00")

        # Mock de sessões individuais (últimas 10)
        session_items: list[MeAttendanceSessionInfo] = []
        for i, sess in enumerate(sessions[:10]):
            # Distribui presenças/faltas de forma simulada
            is_absent = i < absences_count
            session_items.append(
                MeAttendanceSessionInfo(
                    session_id=sess.id,
                    session_date=sess.session_date,
                    start_time=sess.start_time,
                    end_time=sess.end_time,
                    status="ABSENT" if is_absent else "PRESENT",
                )
            )

        items.append(
            MeAttendanceSubjectInfo(
                section_id=section.id,
                subject_id=subject.id,
                subject_code=subject.code,
                subject_name=subject.name,
                total_sessions=total_sessions,
                attended_sessions=attended,
                absences_count=absences_count,
                absences_pct=absences_pct,
                has_alert=has_alert,
                sessions=session_items,
            )
        )

        total_attended += attended
        total_sessions_all += total_sessions

    overall_pct = (
        (Decimal(total_attended) / Decimal(total_sessions_all) * 100)
        if total_sessions_all > 0
        else None
    )

    return MeAttendanceResponse(
        term_code=term.code,
        subjects=items,
        overall_attendance_pct=overall_pct,
    )


# =========== Transcript / Histórico ===========


@router.get(
    "/transcript",
    response_model=MeTranscriptResponse,
    summary="Histórico acadêmico completo",
)
def transcript(
    current_user: CurrentUser,
    db: Session = Depends(get_db),
) -> MeTranscriptResponse:
    """Retorna o histórico acadêmico completo do aluno."""
    student = _get_active_student(current_user, db)

    course = db.query(Course).filter(Course.id == student.course_id).first()

    # Busca todas as notas finais do aluno
    all_grades = (
        db.query(FinalGrade)
        .join(Section, Section.id == FinalGrade.section_id)
        .join(Subject, Subject.id == Section.subject_id)
        .join(Term, Term.id == Section.term_id)
        .filter(FinalGrade.student_id == student.user_id)
        .order_by(Term.start_date.asc())
        .all()
    )

    # Agrupa por termo
    terms_dict: dict[str, MeTranscriptTermInfo] = {}
    total_credits_completed = 0
    all_scores: list[Decimal] = []

    for fg in all_grades:
        section = fg.section
        subject = section.subject
        term = section.term

        if term.code not in terms_dict:
            terms_dict[term.code] = MeTranscriptTermInfo(
                term_code=term.code,
                term_name=term.code,  # Using code as name since Term model doesn't have a name field
                subjects=[],
                term_average=None,
                term_credits=0,
            )

        status_str = fg.status.value
        if fg.final_score is not None and fg.final_score >= Decimal("6.0"):
            status_str = "APPROVED"
        elif fg.final_score is not None and fg.final_score < Decimal("6.0"):
            status_str = "FAILED"

        terms_dict[term.code].subjects.append(
            MeTranscriptSubjectInfo(
                subject_id=subject.id,
                subject_code=subject.code,
                subject_name=subject.name,
                credits=subject.credits,
                final_score=fg.final_score,
                status=status_str,
                term_code=term.code,
            )
        )

        if status_str == "APPROVED":
            total_credits_completed += subject.credits

        if fg.final_score is not None:
            all_scores.append(fg.final_score)

    # Calcula médias por termo
    terms_list: list[MeTranscriptTermInfo] = []
    for term_info in terms_dict.values():
        term_scores = [s.final_score for s in term_info.subjects if s.final_score is not None]
        if term_scores:
            term_info.term_average = sum(term_scores) / len(term_scores)
        term_info.term_credits = sum(s.credits for s in term_info.subjects if s.status == "APPROVED")
        terms_list.append(term_info)

    cumulative_average = (sum(all_scores) / len(all_scores)) if all_scores else None

    # Total de créditos do curso (estimativa)
    total_credits_required = 200  # Valor default, idealmente viria do Course

    return MeTranscriptResponse(
        student_name=student.full_name,
        ra=student.ra,
        course_name=course.name if course else "Curso não encontrado",
        terms=terms_list,
        total_credits_completed=total_credits_completed,
        total_credits_required=total_credits_required,
        cumulative_average=cumulative_average,
        progress_pct=student.total_progress,
    )
