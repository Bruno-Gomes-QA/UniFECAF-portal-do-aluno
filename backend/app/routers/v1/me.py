"""
UniFECAF Portal do Aluno - API v1 Me Router (/me).
"""

from __future__ import annotations

from datetime import UTC, date, datetime
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
    MeCourseInfo,
    MeDocumentDownloadResponse,
    MeDocumentInfo,
    MeDocumentRequestResponse,
    MeFinancialSummaryResponse,
    MeInvoiceInfo,
    MeNotificationInfo,
    MePayMockResponse,
    MeProfileResponse,
    MeTodayClassInfo,
    MeTodayClassResponse,
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


@router.get("/profile", response_model=MeProfileResponse, summary="Perfil do aluno")
def profile(current_user: CurrentUser, db: Session = Depends(get_db)) -> MeProfileResponse:
    _require_student(current_user)

    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise_api_error(
            status_code=status.HTTP_404_NOT_FOUND,
            code="STUDENT_NOT_FOUND",
            message="Perfil de aluno não encontrado.",
        )

    course = db.query(Course).filter(Course.id == student.course_id).first()
    current_term = db.query(Term).filter(Term.is_current == True).first()  # noqa: E712

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
        total_progress=student.total_progress,
        current_term=current_term.code if current_term else None,
    )


@router.get("/today-class", response_model=MeTodayClassResponse, summary="Aula do dia (máx 1)")
def today_class(current_user: CurrentUser, db: Session = Depends(get_db)) -> MeTodayClassResponse:
    _require_student(current_user)

    today = date.today()
    student_id = current_user.id

    stmt = (
        select(ClassSession, Subject)
        .join(Section, Section.id == ClassSession.section_id)
        .join(SectionEnrollment, SectionEnrollment.section_id == Section.id)
        .join(Subject, Subject.id == Section.subject_id)
        .where(SectionEnrollment.student_id == student_id)
        .where(SectionEnrollment.status == EnrollmentStatus.ENROLLED)
        .where(ClassSession.session_date == today)
        .where(ClassSession.is_canceled == False)  # noqa: E712
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
    _require_student(current_user)

    current_term = db.query(Term).filter(Term.is_current == True).first()  # noqa: E712
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
        .filter(FinalGrade.student_id == current_user.id, Section.term_id == current_term.id)
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
    _require_student(current_user)

    invoices = (
        db.query(Invoice)
        .filter(Invoice.student_id == current_user.id)
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
    status_filter: InvoiceStatus | None = Query(None, description="Filtrar por status do invoice."),
) -> PaginatedResponse[MeInvoiceInfo]:
    _require_student(current_user)

    stmt = (
        select(Invoice)
        .where(Invoice.student_id == current_user.id)
        .order_by(Invoice.due_date.desc())
    )
    if status_filter is not None:
        stmt = stmt.where(Invoice.status == status_filter)

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
    _require_student(current_user)

    invoice = get_or_404(
        db, Invoice, invoice_id, code="INVOICE_NOT_FOUND", message="Boleto não encontrado."
    )
    if invoice.student_id != current_user.id:
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
    _require_student(current_user)

    stmt = (
        select(UserNotification)
        .options(joinedload(UserNotification.notification))
        .where(UserNotification.user_id == current_user.id)
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
    _require_student(current_user)

    count = (
        db.query(func.count(UserNotification.id))
        .filter(UserNotification.user_id == current_user.id)
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
    _require_student(current_user)

    un = get_or_404(
        db,
        UserNotification,
        user_notification_id,
        code="NOTIFICATION_NOT_FOUND",
        message="Notificação não encontrada.",
    )
    if un.user_id != current_user.id:
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
    _require_student(current_user)

    un = get_or_404(
        db,
        UserNotification,
        user_notification_id,
        code="NOTIFICATION_NOT_FOUND",
        message="Notificação não encontrada.",
    )
    if un.user_id != current_user.id:
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
    _require_student(current_user)

    un = get_or_404(
        db,
        UserNotification,
        user_notification_id,
        code="NOTIFICATION_NOT_FOUND",
        message="Notificação não encontrada.",
    )
    if un.user_id != current_user.id:
        raise_api_error(
            status_code=status.HTTP_403_FORBIDDEN, code="AUTH_FORBIDDEN", message="Acesso negado."
        )

    if un.archived_at is None:
        un.archived_at = datetime.now(UTC)
        db.commit()


@router.get("/documents", response_model=list[MeDocumentInfo], summary="Documentos do aluno")
def documents(current_user: CurrentUser, db: Session = Depends(get_db)) -> list[MeDocumentInfo]:
    _require_student(current_user)

    docs = (
        db.query(StudentDocument)
        .filter(StudentDocument.student_id == current_user.id)
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
    _require_student(current_user)

    doc = (
        db.query(StudentDocument)
        .filter(StudentDocument.student_id == current_user.id, StudentDocument.doc_type == doc_type)
        .first()
    )
    if not doc:
        doc = StudentDocument(student_id=current_user.id, doc_type=doc_type)
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
    _require_student(current_user)

    doc = (
        db.query(StudentDocument)
        .filter(StudentDocument.student_id == current_user.id, StudentDocument.doc_type == doc_type)
        .first()
    )
    if not doc or doc.status != DocumentStatus.AVAILABLE or not doc.file_url:
        raise_api_error(
            status_code=status.HTTP_404_NOT_FOUND,
            code="DOCUMENT_NOT_AVAILABLE",
            message="Documento não disponível.",
        )

    return MeDocumentDownloadResponse(doc_type=doc.doc_type.value, file_url=doc.file_url)
