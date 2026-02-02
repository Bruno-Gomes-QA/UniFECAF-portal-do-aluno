"""
UniFECAF Portal do Aluno - API v1 Admin Finance Router.
"""

from __future__ import annotations

from datetime import UTC, date, datetime
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session
from starlette import status

from app.core.database import get_db
from app.core.deps import AdminUser, pagination_params
from app.core.errors import raise_api_error
from app.db.utils import apply_update, get_or_404, paginate_stmt
from app.models.academics import Student, StudentStatus, Term, SectionEnrollment
from app.models.finance import Invoice, InvoiceStatus, Payment, PaymentStatus
from app.schemas.admin_finance import (
    AdminInvoiceCreateRequest,
    AdminInvoiceResponse,
    AdminInvoiceUpdateRequest,
    AdminPaymentCreateRequest,
    AdminPaymentResponse,
    AdminPaymentUpdateRequest,
    InvoiceSummaryResponse,
    MarkInvoicePaidResponse,
    NegotiationExecuteRequest,
    NegotiationExecuteResponse,
    NegotiationInstallment,
    NegotiationPlanRequest,
    NegotiationPlanResponse,
    PaymentSummaryResponse,
    StudentDebtSummary,
)
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/api/v1/admin", tags=["Admin - Finance"])


# ==================== HELPERS ====================


def _calculate_amount_due(invoice: Invoice) -> Decimal:
    """Calculate amount due with fine and interest if overdue."""
    if invoice.status in (InvoiceStatus.PAID, InvoiceStatus.CANCELED):
        return invoice.amount

    today = date.today()
    if invoice.due_date >= today:
        return invoice.amount

    # Calculate days/months overdue
    days_overdue = (today - invoice.due_date).days
    months_overdue = max(1, days_overdue // 30)

    # Single fine + monthly interest
    fine = invoice.amount * (invoice.fine_rate / Decimal("100"))
    interest = invoice.amount * (invoice.interest_rate / Decimal("100")) * months_overdue

    return invoice.amount + fine + interest


def _get_effective_status(invoice: Invoice) -> InvoiceStatus:
    """Get effective status (PENDING → OVERDUE if past due date)."""
    if invoice.status == InvoiceStatus.PENDING and invoice.due_date < date.today():
        return InvoiceStatus.OVERDUE
    return invoice.status


def _build_invoice_response(db: Session, invoice: Invoice) -> AdminInvoiceResponse:
    """Build enriched invoice response."""
    # Get student info
    student = db.get(Student, invoice.student_id)
    student_name = student.full_name if student else None
    student_ra = student.ra if student else None

    # Get term code
    term_code = invoice.term.code if invoice.term else None

    # Count payments
    payments_count = db.scalar(
        select(func.count()).where(Payment.invoice_id == invoice.id)
    ) or 0

    # Calculate amount due
    amount_due = _calculate_amount_due(invoice)

    # Get effective status
    effective_status = _get_effective_status(invoice)

    return AdminInvoiceResponse(
        id=invoice.id,
        reference=invoice.reference,
        student_id=invoice.student_id,
        student_name=student_name,
        student_ra=student_ra,
        term_id=invoice.term_id,
        term_code=term_code,
        description=invoice.description,
        due_date=invoice.due_date,
        amount=invoice.amount,
        fine_rate=invoice.fine_rate,
        interest_rate=invoice.interest_rate,
        amount_due=amount_due,
        installment_number=invoice.installment_number,
        installment_total=invoice.installment_total,
        status=effective_status.value,
        payments_count=payments_count,
        created_at=invoice.created_at,
        updated_at=invoice.updated_at,
    )


def _build_payment_response(db: Session, payment: Payment) -> AdminPaymentResponse:
    """Build enriched payment response."""
    # Get invoice info
    invoice = db.get(Invoice, payment.invoice_id)
    invoice_reference = invoice.reference if invoice else None

    # Get student info from invoice
    student_name = None
    student_ra = None
    if invoice:
        student = db.get(Student, invoice.student_id)
        if student:
            student_name = student.full_name
            student_ra = student.ra

    return AdminPaymentResponse(
        id=payment.id,
        invoice_id=payment.invoice_id,
        invoice_reference=invoice_reference,
        student_name=student_name,
        student_ra=student_ra,
        amount=payment.amount,
        status=payment.status.value,
        method=payment.method,
        provider=payment.provider,
        provider_ref=payment.provider_ref,
        paid_at=payment.paid_at,
        created_at=payment.created_at,
        updated_at=payment.updated_at,
    )


def _check_invoice_editable(invoice: Invoice, allow_paid_description: bool = False) -> None:
    """Check if invoice can be edited."""
    if invoice.status == InvoiceStatus.CANCELED:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="INVOICE_CANCELED",
            message="Fatura cancelada não pode ser editada.",
        )
    if invoice.status == InvoiceStatus.PAID and not allow_paid_description:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="INVOICE_PAID",
            message="Fatura paga não pode ser editada.",
        )


def _check_invoice_deletable(db: Session, invoice: Invoice) -> None:
    """Check if invoice can be deleted."""
    payments_count = db.scalar(
        select(func.count()).where(Payment.invoice_id == invoice.id)
    ) or 0
    if payments_count > 0:
        raise_api_error(
            status_code=status.HTTP_409_CONFLICT,
            code="INVOICE_HAS_PAYMENTS",
            message="Fatura possui pagamentos vinculados. Cancele-a em vez de excluir.",
        )


def _get_total_settled(db: Session, invoice_id: UUID) -> Decimal:
    """Get total amount of SETTLED payments for an invoice."""
    return db.scalar(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.invoice_id == invoice_id,
            Payment.status == PaymentStatus.SETTLED,
        )
    ) or Decimal("0")


def _update_invoice_status_from_payments(db: Session, invoice: Invoice) -> None:
    """Update invoice status based on total SETTLED payments."""
    total_settled = _get_total_settled(db, invoice.id)

    if total_settled >= invoice.amount:
        invoice.status = InvoiceStatus.PAID
    elif invoice.status == InvoiceStatus.PAID:
        # Refund case - revert to PENDING or OVERDUE
        if invoice.due_date < date.today():
            invoice.status = InvoiceStatus.OVERDUE
        else:
            invoice.status = InvoiceStatus.PENDING


# ==================== INVOICE ENDPOINTS ====================


@router.get(
    "/invoices", response_model=PaginatedResponse[AdminInvoiceResponse], summary="Listar invoices"
)
def list_invoices(
    _: AdminUser,
    db: Session = Depends(get_db),
    pagination: dict[str, int] = Depends(pagination_params),
    student_id: UUID | None = Query(None),
    status_filter: InvoiceStatus | None = Query(None, alias="status"),
    due_date_from: date | None = Query(None),
    due_date_to: date | None = Query(None),
    search: str | None = Query(None),
) -> PaginatedResponse[AdminInvoiceResponse]:
    stmt = select(Invoice).order_by(Invoice.due_date.desc())

    if student_id:
        stmt = stmt.where(Invoice.student_id == student_id)
    if status_filter:
        stmt = stmt.where(Invoice.status == status_filter)
    if due_date_from:
        stmt = stmt.where(Invoice.due_date >= due_date_from)
    if due_date_to:
        stmt = stmt.where(Invoice.due_date <= due_date_to)
    if search:
        # Search in reference and description
        search_pattern = f"%{search}%"
        stmt = stmt.where(
            Invoice.reference.ilike(search_pattern) | Invoice.description.ilike(search_pattern)
        )

    items, total = paginate_stmt(db, stmt, limit=pagination["limit"], offset=pagination["offset"])

    return PaginatedResponse[AdminInvoiceResponse](
        items=[_build_invoice_response(db, i) for i in items],
        limit=pagination["limit"],
        offset=pagination["offset"],
        total=total,
    )


@router.get(
    "/invoices/summary",
    response_model=InvoiceSummaryResponse,
    summary="Resumo financeiro de faturas",
)
def get_invoices_summary(
    _: AdminUser,
    db: Session = Depends(get_db),
    student_id: UUID | None = Query(None),
    term_id: UUID | None = Query(None),
    due_date_from: date | None = Query(None),
    due_date_to: date | None = Query(None),
) -> InvoiceSummaryResponse:
    """Get financial summary of invoices.
    
    Optimized to run all calculations in a single query to avoid
    multiple round-trips to the database.
    """
    # Build base WHERE conditions (without status filter)
    conditions = []
    if student_id:
        conditions.append(Invoice.student_id == student_id)
    if term_id:
        conditions.append(Invoice.term_id == term_id)
    if due_date_from:
        conditions.append(Invoice.due_date >= due_date_from)
    if due_date_to:
        conditions.append(Invoice.due_date <= due_date_to)
    
    today = date.today()
    
    # Use conditional aggregation in a single query for better performance
    # SQLAlchemy 2.x syntax: case(condition, then_value)
    stmt = select(
        # PAID totals
        func.coalesce(
            func.sum(case((Invoice.status == InvoiceStatus.PAID, Invoice.amount), else_=0)),
            0
        ).label("paid_total"),
        func.sum(case((Invoice.status == InvoiceStatus.PAID, 1), else_=0)).label("paid_count"),
        
        # CANCELED totals
        func.coalesce(
            func.sum(case((Invoice.status == InvoiceStatus.CANCELED, Invoice.amount), else_=0)),
            0
        ).label("canceled_total"),
        func.sum(case((Invoice.status == InvoiceStatus.CANCELED, 1), else_=0)).label("canceled_count"),
        
        # OVERDUE (database status) totals
        func.coalesce(
            func.sum(case((Invoice.status == InvoiceStatus.OVERDUE, Invoice.amount), else_=0)),
            0
        ).label("overdue_db_total"),
        func.sum(case((Invoice.status == InvoiceStatus.OVERDUE, 1), else_=0)).label("overdue_db_count"),
        
        # PENDING that are truly pending (not past due)
        func.coalesce(
            func.sum(case(
                ((Invoice.status == InvoiceStatus.PENDING) & (Invoice.due_date >= today), Invoice.amount),
                else_=0
            )),
            0
        ).label("pending_true_total"),
        func.sum(case(
            ((Invoice.status == InvoiceStatus.PENDING) & (Invoice.due_date >= today), 1),
            else_=0
        )).label("pending_true_count"),
        
        # PENDING that are actually overdue (past due date)
        func.coalesce(
            func.sum(case(
                ((Invoice.status == InvoiceStatus.PENDING) & (Invoice.due_date < today), Invoice.amount),
                else_=0
            )),
            0
        ).label("pending_overdue_total"),
        func.sum(case(
            ((Invoice.status == InvoiceStatus.PENDING) & (Invoice.due_date < today), 1),
            else_=0
        )).label("pending_overdue_count"),
    )
    
    # Apply filters
    if conditions:
        stmt = stmt.where(*conditions)
    
    result = db.execute(stmt).one()
    
    # Combine OVERDUE (db) + PENDING past due for effective overdue
    total_overdue = Decimal(str(result.overdue_db_total)) + Decimal(str(result.pending_overdue_total))
    count_overdue = (result.overdue_db_count or 0) + (result.pending_overdue_count or 0)
    
    return InvoiceSummaryResponse(
        total_pending=Decimal(str(result.pending_true_total)),
        total_overdue=total_overdue,
        total_paid=Decimal(str(result.paid_total)),
        total_canceled=Decimal(str(result.canceled_total)),
        count_pending=result.pending_true_count or 0,
        count_overdue=count_overdue,
        count_paid=result.paid_count or 0,
        count_canceled=result.canceled_count or 0,
    )


@router.post(
    "/invoices",
    response_model=AdminInvoiceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar invoice",
)
def create_invoice(
    _: AdminUser, payload: AdminInvoiceCreateRequest, db: Session = Depends(get_db)
) -> AdminInvoiceResponse:
    # Verify student exists and is not DELETED
    student = db.get(Student, payload.student_id)
    if not student:
        raise_api_error(
            status_code=status.HTTP_404_NOT_FOUND,
            code="STUDENT_NOT_FOUND",
            message="Aluno não encontrado.",
        )
    if student.status == StudentStatus.DELETED:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="STUDENT_DELETED",
            message="Não é possível criar fatura para aluno excluído.",
        )

    # Validate status
    try:
        status_enum = InvoiceStatus(payload.status)
    except ValueError:
        raise_api_error(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="VALIDATION_ERROR",
            message="Status inválido.",
            details={"allowed": [s.value for s in InvoiceStatus]},
        )

    # Force PENDING on creation
    status_enum = InvoiceStatus.PENDING

    # Validate installments
    if payload.installment_number and payload.installment_total:
        if payload.installment_number > payload.installment_total:
            raise_api_error(
                status_code=status.HTTP_400_BAD_REQUEST,
                code="INVALID_INSTALLMENT",
                message="Número da parcela não pode ser maior que o total de parcelas.",
            )

    invoice = Invoice(
        student_id=payload.student_id,
        term_id=payload.term_id,
        description=payload.description,
        due_date=payload.due_date,
        amount=payload.amount,
        fine_rate=payload.fine_rate,
        interest_rate=payload.interest_rate,
        installment_number=payload.installment_number,
        installment_total=payload.installment_total,
        status=status_enum,
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    return _build_invoice_response(db, invoice)


@router.get(
    "/invoices/{invoice_id}", response_model=AdminInvoiceResponse, summary="Detalhar invoice"
)
def get_invoice(
    invoice_id: UUID, _: AdminUser, db: Session = Depends(get_db)
) -> AdminInvoiceResponse:
    invoice = get_or_404(db, Invoice, invoice_id, message="Fatura não encontrada.")
    return _build_invoice_response(db, invoice)


@router.patch(
    "/invoices/{invoice_id}",
    response_model=AdminInvoiceResponse,
    summary="Atualizar invoice (patch)",
)
def patch_invoice(
    invoice_id: UUID,
    payload: AdminInvoiceUpdateRequest,
    _: AdminUser,
    db: Session = Depends(get_db),
) -> AdminInvoiceResponse:
    invoice = get_or_404(db, Invoice, invoice_id, message="Fatura não encontrada.")

    # Check if editable
    data = payload.model_dump(exclude_unset=True)

    # If only updating description, allow even for PAID
    only_description = list(data.keys()) == ["description"]
    _check_invoice_editable(invoice, allow_paid_description=only_description)

    # For PAID invoices, only allow description update
    if invoice.status == InvoiceStatus.PAID:
        data = {"description": data.get("description")} if "description" in data else {}

    # Validate status transition
    if "status" in data and data["status"]:
        try:
            new_status = InvoiceStatus(data["status"])
            data["status"] = new_status
        except ValueError:
            raise_api_error(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                code="VALIDATION_ERROR",
                message="Status inválido.",
                details={"allowed": [s.value for s in InvoiceStatus]},
            )

    # Validate installments
    inst_num = data.get("installment_number", invoice.installment_number)
    inst_total = data.get("installment_total", invoice.installment_total)
    if inst_num and inst_total and inst_num > inst_total:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="INVALID_INSTALLMENT",
            message="Número da parcela não pode ser maior que o total de parcelas.",
        )

    apply_update(invoice, data)
    db.commit()
    db.refresh(invoice)

    return _build_invoice_response(db, invoice)


@router.delete(
    "/invoices/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remover invoice"
)
def delete_invoice(invoice_id: UUID, _: AdminUser, db: Session = Depends(get_db)) -> None:
    invoice = get_or_404(db, Invoice, invoice_id, message="Fatura não encontrada.")

    # Check if deletable
    _check_invoice_deletable(db, invoice)

    db.delete(invoice)
    db.commit()


@router.post(
    "/invoices/{invoice_id}/mark-paid",
    response_model=MarkInvoicePaidResponse,
    summary="Marcar invoice como paga (cria payment SETTLED)",
)
def mark_paid(
    invoice_id: UUID, _: AdminUser, db: Session = Depends(get_db)
) -> MarkInvoicePaidResponse:
    invoice = get_or_404(db, Invoice, invoice_id, message="Fatura não encontrada.")

    if invoice.status == InvoiceStatus.CANCELED:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="INVOICE_CANCELED",
            message="Fatura cancelada não pode ser paga.",
        )

    if invoice.status == InvoiceStatus.PAID:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="INVOICE_ALREADY_PAID",
            message="Fatura já está paga.",
        )

    # Calculate remaining amount
    total_settled = _get_total_settled(db, invoice.id)
    remaining = invoice.amount - total_settled

    if remaining <= 0:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="INVOICE_ALREADY_PAID",
            message="Fatura já está totalmente paga.",
        )

    paid_at = datetime.now(UTC)
    payment = Payment(
        invoice_id=invoice.id,
        amount=remaining,
        status=PaymentStatus.SETTLED,
        provider="admin",
        provider_ref="manual",
        paid_at=paid_at,
    )
    db.add(payment)

    invoice.status = InvoiceStatus.PAID
    db.commit()
    db.refresh(payment)

    return MarkInvoicePaidResponse(
        invoice_id=invoice.id, payment_id=payment.id, status=payment.status.value, paid_at=paid_at
    )


@router.post(
    "/invoices/{invoice_id}/cancel",
    response_model=AdminInvoiceResponse,
    summary="Cancelar invoice",
)
def cancel_invoice(
    invoice_id: UUID, _: AdminUser, db: Session = Depends(get_db)
) -> AdminInvoiceResponse:
    invoice = get_or_404(db, Invoice, invoice_id, message="Fatura não encontrada.")

    if invoice.status in (InvoiceStatus.PAID, InvoiceStatus.CANCELED):
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="INVOICE_CANNOT_CANCEL",
            message=f"Fatura com status {invoice.status.value} não pode ser cancelada.",
        )

    # Check for SETTLED payments
    settled_count = db.scalar(
        select(func.count()).where(
            Payment.invoice_id == invoice.id,
            Payment.status == PaymentStatus.SETTLED,
        )
    ) or 0

    if settled_count > 0:
        raise_api_error(
            status_code=status.HTTP_409_CONFLICT,
            code="INVOICE_HAS_SETTLED_PAYMENT",
            message="Fatura possui pagamento liquidado. Estorne o pagamento primeiro.",
        )

    invoice.status = InvoiceStatus.CANCELED
    db.commit()
    db.refresh(invoice)

    return _build_invoice_response(db, invoice)


# ==================== PAYMENT ENDPOINTS ====================


@router.get(
    "/payments", response_model=PaginatedResponse[AdminPaymentResponse], summary="Listar payments"
)
def list_payments(
    _: AdminUser,
    db: Session = Depends(get_db),
    pagination: dict[str, int] = Depends(pagination_params),
    invoice_id: UUID | None = Query(None),
    student_id: UUID | None = Query(None),
    status_filter: PaymentStatus | None = Query(None, alias="status"),
    search: str | None = Query(None),
) -> PaginatedResponse[AdminPaymentResponse]:
    stmt = select(Payment).order_by(Payment.created_at.desc())
    
    # Track if we already joined Invoice
    has_joined_invoice = False

    if invoice_id:
        stmt = stmt.where(Payment.invoice_id == invoice_id)
    if student_id:
        stmt = stmt.join(Invoice).where(Invoice.student_id == student_id)
        has_joined_invoice = True
    if status_filter:
        stmt = stmt.where(Payment.status == status_filter)
    if search:
        # Search in invoice reference
        if not has_joined_invoice:
            stmt = stmt.join(Invoice)
        stmt = stmt.where(Invoice.reference.ilike(f"%{search}%"))

    items, total = paginate_stmt(db, stmt, limit=pagination["limit"], offset=pagination["offset"])

    return PaginatedResponse[AdminPaymentResponse](
        items=[_build_payment_response(db, p) for p in items],
        limit=pagination["limit"],
        offset=pagination["offset"],
        total=total,
    )


@router.get(
    "/payments/summary",
    response_model=PaymentSummaryResponse,
    summary="Resumo de pagamentos",
)
def get_payments_summary(
    _: AdminUser,
    db: Session = Depends(get_db),
    student_id: UUID | None = Query(None),
) -> PaymentSummaryResponse:
    """Get payments summary with totals by status."""
    # Build base query with conditional aggregation
    base = select(Payment.id, Payment.amount, Payment.status)
    if student_id:
        base = base.join(Invoice).where(Invoice.student_id == student_id)
    
    subq = base.subquery()
    
    stmt = select(
        func.coalesce(
            func.sum(case((subq.c.status == PaymentStatus.AUTHORIZED, subq.c.amount), else_=0)),
            0
        ).label("total_authorized"),
        func.coalesce(
            func.sum(case((subq.c.status == PaymentStatus.SETTLED, subq.c.amount), else_=0)),
            0
        ).label("total_settled"),
        func.coalesce(
            func.sum(case((subq.c.status == PaymentStatus.FAILED, subq.c.amount), else_=0)),
            0
        ).label("total_failed"),
        func.coalesce(
            func.sum(case((subq.c.status == PaymentStatus.REFUNDED, subq.c.amount), else_=0)),
            0
        ).label("total_refunded"),
        func.coalesce(
            func.count(case((subq.c.status == PaymentStatus.AUTHORIZED, 1))),
            0
        ).label("count_authorized"),
        func.coalesce(
            func.count(case((subq.c.status == PaymentStatus.SETTLED, 1))),
            0
        ).label("count_settled"),
        func.coalesce(
            func.count(case((subq.c.status == PaymentStatus.FAILED, 1))),
            0
        ).label("count_failed"),
        func.coalesce(
            func.count(case((subq.c.status == PaymentStatus.REFUNDED, 1))),
            0
        ).label("count_refunded"),
    )
    
    result = db.execute(stmt).one()
    
    return PaymentSummaryResponse(
        total_authorized=result.total_authorized,
        total_settled=result.total_settled,
        total_failed=result.total_failed,
        total_refunded=result.total_refunded,
        count_authorized=result.count_authorized,
        count_settled=result.count_settled,
        count_failed=result.count_failed,
        count_refunded=result.count_refunded,
    )


@router.post(
    "/payments",
    response_model=AdminPaymentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar payment",
)
def create_payment(
    _: AdminUser, payload: AdminPaymentCreateRequest, db: Session = Depends(get_db)
) -> AdminPaymentResponse:
    # Verify invoice exists
    invoice = db.get(Invoice, payload.invoice_id)
    if not invoice:
        raise_api_error(
            status_code=status.HTTP_404_NOT_FOUND,
            code="INVOICE_NOT_FOUND",
            message="Fatura não encontrada.",
        )

    # Check invoice status
    if invoice.status == InvoiceStatus.CANCELED:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="INVOICE_CANCELED",
            message="Não é possível criar pagamento para fatura cancelada.",
        )

    if invoice.status == InvoiceStatus.PAID:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="INVOICE_ALREADY_PAID",
            message="Fatura já está totalmente paga.",
        )

    # Validate payment amount
    total_payments = db.scalar(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.invoice_id == invoice.id,
            Payment.status.in_([PaymentStatus.AUTHORIZED, PaymentStatus.SETTLED]),
        )
    ) or Decimal("0")

    remaining = invoice.amount - total_payments

    if payload.amount > remaining:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="PAYMENT_EXCEEDS_INVOICE",
            message=f"Valor do pagamento excede o valor restante da fatura (R$ {remaining:.2f}).",
        )

    # Auto-fill paid_at if provided
    paid_at = payload.paid_at or datetime.now(UTC)

    payment = Payment(
        invoice_id=payload.invoice_id,
        amount=payload.amount,
        status=PaymentStatus.AUTHORIZED,
        method=payload.method,
        provider=payload.provider,
        provider_ref=payload.provider_ref,
        paid_at=paid_at,
    )
    db.add(payment)

    db.commit()
    db.refresh(payment)

    return _build_payment_response(db, payment)


@router.get(
    "/payments/{payment_id}", response_model=AdminPaymentResponse, summary="Detalhar payment"
)
def get_payment(
    payment_id: UUID, _: AdminUser, db: Session = Depends(get_db)
) -> AdminPaymentResponse:
    payment = get_or_404(db, Payment, payment_id, message="Pagamento não encontrado.")
    return _build_payment_response(db, payment)


@router.patch(
    "/payments/{payment_id}",
    response_model=AdminPaymentResponse,
    summary="Atualizar payment (patch)",
)
def patch_payment(
    payment_id: UUID,
    payload: AdminPaymentUpdateRequest,
    _: AdminUser,
    db: Session = Depends(get_db),
) -> AdminPaymentResponse:
    payment = get_or_404(db, Payment, payment_id, message="Pagamento não encontrado.")

    # Restrict editing for SETTLED and REFUNDED payments
    if payment.status in [PaymentStatus.SETTLED, PaymentStatus.REFUNDED]:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="PAYMENT_LOCKED",
            message=f"Pagamento com status {payment.status.value} não pode ser editado.",
        )

    data = payload.model_dump(exclude_unset=True)
    apply_update(payment, data)

    db.commit()
    db.refresh(payment)

    return _build_payment_response(db, payment)


@router.delete(
    "/payments/{payment_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remover payment"
)
def delete_payment(payment_id: UUID, _: AdminUser, db: Session = Depends(get_db)) -> None:
    payment = get_or_404(db, Payment, payment_id, message="Pagamento não encontrado.")

    # Only allow deleting AUTHORIZED or FAILED payments
    if payment.status == PaymentStatus.SETTLED:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="PAYMENT_CANNOT_DELETE_SETTLED",
            message="Pagamento liquidado não pode ser excluído. Estorne-o primeiro.",
        )

    if payment.status == PaymentStatus.REFUNDED:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="PAYMENT_CANNOT_DELETE_REFUNDED",
            message="Pagamento estornado não pode ser excluído (histórico).",
        )

    db.delete(payment)
    db.commit()


@router.post(
    "/payments/{payment_id}/settle",
    response_model=AdminPaymentResponse,
    summary="Liquidar pagamento (AUTHORIZED → SETTLED)",
)
def settle_payment(
    payment_id: UUID, _: AdminUser, db: Session = Depends(get_db)
) -> AdminPaymentResponse:
    payment = get_or_404(db, Payment, payment_id, message="Pagamento não encontrado.")

    if payment.status != PaymentStatus.AUTHORIZED:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="PAYMENT_INVALID_TRANSITION",
            message="Apenas pagamentos AUTHORIZED podem ser liquidados.",
        )

    payment.status = PaymentStatus.SETTLED
    payment.paid_at = datetime.now(UTC)

    # Update invoice status
    invoice = db.get(Invoice, payment.invoice_id)
    if invoice:
        _update_invoice_status_from_payments(db, invoice)

    db.commit()
    db.refresh(payment)

    return _build_payment_response(db, payment)


@router.post(
    "/payments/{payment_id}/refund",
    response_model=AdminPaymentResponse,
    summary="Estornar pagamento (SETTLED → REFUNDED)",
)
def refund_payment(
    payment_id: UUID, _: AdminUser, db: Session = Depends(get_db)
) -> AdminPaymentResponse:
    payment = get_or_404(db, Payment, payment_id, message="Pagamento não encontrado.")

    if payment.status != PaymentStatus.SETTLED:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="PAYMENT_INVALID_TRANSITION",
            message="Apenas pagamentos SETTLED podem ser estornados.",
        )

    payment.status = PaymentStatus.REFUNDED

    # Update invoice status (will revert to PENDING/OVERDUE)
    invoice = db.get(Invoice, payment.invoice_id)
    if invoice:
        _update_invoice_status_from_payments(db, invoice)

    db.commit()
    db.refresh(payment)

    return _build_payment_response(db, payment)


# ==================== NEGOTIATION ENDPOINTS ====================


@router.get(
    "/students/{student_id}/debt-summary",
    response_model=StudentDebtSummary,
    summary="Resumo de débitos de um aluno para negociação",
)
def get_student_debt_summary(
    student_id: UUID,
    _: AdminUser,
    db: Session = Depends(get_db),
) -> StudentDebtSummary:
    """Get student's pending invoices summary for negotiation."""
    student = get_or_404(db, Student, student_id, message="Aluno não encontrado.")
    
    if student.status == StudentStatus.DELETED:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="STUDENT_DELETED",
            message="Aluno excluído não pode ter faturas negociadas.",
        )
    
    # Get pending/overdue invoices
    today = date.today()
    pending_invoices = db.scalars(
        select(Invoice)
        .where(
            Invoice.student_id == student_id,
            Invoice.status.in_([InvoiceStatus.PENDING, InvoiceStatus.OVERDUE]),
        )
        .order_by(Invoice.due_date)
    ).all()
    
    # Calculate totals
    total_pending = Decimal("0")
    total_with_fees = Decimal("0")
    
    for inv in pending_invoices:
        total_pending += inv.amount
        total_with_fees += _calculate_amount_due(inv)
    
    # Check if student has current term enrollment
    current_term = db.scalar(
        select(Term)
        .where(Term.is_current == True)
        .limit(1)
    )
    
    has_enrollment = False
    if current_term:
        enrollment_count = db.scalar(
            select(func.count())
            .select_from(SectionEnrollment)
            .join(SectionEnrollment.section)
            .where(
                SectionEnrollment.student_id == student_id,
                SectionEnrollment.section.has(term_id=current_term.id),
            )
        ) or 0
        has_enrollment = enrollment_count > 0
    
    invoice_responses = [_build_invoice_response(db, inv) for inv in pending_invoices]
    
    return StudentDebtSummary(
        student_id=student_id,
        student_name=student.full_name,
        student_ra=student.ra,
        pending_invoices=invoice_responses,
        total_pending_amount=total_pending,
        total_pending_with_fees=total_with_fees,
        count_pending=len(pending_invoices),
        has_current_term_enrollment=has_enrollment,
    )


@router.post(
    "/invoices/negotiation/preview",
    response_model=NegotiationPlanResponse,
    summary="Gerar prévia do plano de negociação",
)
def preview_negotiation_plan(
    payload: NegotiationPlanRequest,
    _: AdminUser,
    db: Session = Depends(get_db),
) -> NegotiationPlanResponse:
    """Generate a preview of the negotiation/installment plan."""
    student = get_or_404(db, Student, payload.student_id, message="Aluno não encontrado.")
    
    if student.status == StudentStatus.DELETED:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="STUDENT_DELETED",
            message="Aluno excluído não pode ter faturas negociadas.",
        )
    
    # Validate first due date
    today = date.today()
    if payload.first_due_date < today:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="INVALID_DUE_DATE",
            message="A data do primeiro vencimento deve ser maior ou igual a hoje.",
        )
    
    # Calculate installment amount (equal installments)
    installment_amount = (payload.total_amount / payload.num_installments).quantize(Decimal("0.01"))
    
    # Build installments
    installments: list[NegotiationInstallment] = []
    current_date = payload.first_due_date
    
    for i in range(1, payload.num_installments + 1):
        # Last installment adjusts for rounding
        if i == payload.num_installments:
            amount = payload.total_amount - (installment_amount * (payload.num_installments - 1))
        else:
            amount = installment_amount
        
        installments.append(NegotiationInstallment(
            installment_number=i,
            due_date=current_date,
            amount=amount,
            description=f"{payload.description_prefix} - Parcela {i}/{payload.num_installments}",
        ))
        
        # Next month, same day (handle month overflow)
        if current_date.month == 12:
            current_date = date(current_date.year + 1, 1, min(current_date.day, 28))
        else:
            # Try same day next month, fallback to last day of month
            next_month = current_date.month + 1
            try:
                current_date = date(current_date.year, next_month, current_date.day)
            except ValueError:
                # Day doesn't exist in next month (e.g., 31 in month with 30 days)
                import calendar
                last_day = calendar.monthrange(current_date.year, next_month)[1]
                current_date = date(current_date.year, next_month, last_day)
    
    # Get pending invoices to cancel
    pending_to_cancel: list[UUID] = []
    if payload.cancel_pending:
        pending_invoices = db.scalars(
            select(Invoice.id)
            .where(
                Invoice.student_id == payload.student_id,
                Invoice.status.in_([InvoiceStatus.PENDING, InvoiceStatus.OVERDUE]),
            )
        ).all()
        pending_to_cancel = list(pending_invoices)
    
    return NegotiationPlanResponse(
        student_id=payload.student_id,
        total_amount=payload.total_amount,
        installment_amount=installment_amount,
        num_installments=payload.num_installments,
        installments=installments,
        pending_to_cancel=pending_to_cancel,
    )


@router.post(
    "/invoices/negotiation/execute",
    response_model=NegotiationExecuteResponse,
    summary="Executar plano de negociação (cria faturas e cancela antigas)",
)
def execute_negotiation_plan(
    payload: NegotiationExecuteRequest,
    _: AdminUser,
    db: Session = Depends(get_db),
) -> NegotiationExecuteResponse:
    """Execute a negotiation plan: create new invoices and cancel old ones."""
    student = get_or_404(db, Student, payload.student_id, message="Aluno não encontrado.")
    
    if student.status == StudentStatus.DELETED:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="STUDENT_DELETED",
            message="Aluno excluído não pode ter faturas negociadas.",
        )
    
    # Validate all installments have future or today dates
    today = date.today()
    for inst in payload.installments:
        if inst.due_date < today:
            raise_api_error(
                status_code=status.HTTP_400_BAD_REQUEST,
                code="INVALID_DUE_DATE",
                message=f"Parcela {inst.installment_number} tem data de vencimento no passado.",
            )
    
    # Cancel old pending invoices
    canceled_ids: list[UUID] = []
    if payload.cancel_pending_ids:
        for inv_id in payload.cancel_pending_ids:
            invoice = db.get(Invoice, inv_id)
            if invoice and invoice.student_id == payload.student_id:
                if invoice.status in (InvoiceStatus.PENDING, InvoiceStatus.OVERDUE):
                    # Check no payments
                    payments_count = db.scalar(
                        select(func.count()).where(Payment.invoice_id == inv_id)
                    ) or 0
                    if payments_count == 0:
                        invoice.status = InvoiceStatus.CANCELED
                        canceled_ids.append(inv_id)
    
    # Create new invoices
    created_invoices: list[Invoice] = []
    num_installments = len(payload.installments)
    
    for inst in payload.installments:
        invoice = Invoice(
            student_id=payload.student_id,
            term_id=payload.term_id,
            description=inst.description,
            due_date=inst.due_date,
            amount=inst.amount,
            fine_rate=payload.fine_rate,
            interest_rate=payload.interest_rate,
            installment_number=inst.installment_number,
            installment_total=num_installments,
            status=InvoiceStatus.PENDING,
        )
        db.add(invoice)
        created_invoices.append(invoice)
    
    db.commit()
    
    # Refresh to get generated IDs
    for inv in created_invoices:
        db.refresh(inv)
    
    return NegotiationExecuteResponse(
        student_id=payload.student_id,
        created_invoices=[_build_invoice_response(db, inv) for inv in created_invoices],
        canceled_invoices=canceled_ids,
        total_created=len(created_invoices),
        total_canceled=len(canceled_ids),
    )


@router.post(
    "/students/{student_id}/generate-term-invoices",
    response_model=NegotiationExecuteResponse,
    summary="Gerar faturas do semestre para rematrícula",
)
def generate_term_invoices(
    student_id: UUID,
    _: AdminUser,
    db: Session = Depends(get_db),
    term_id: UUID | None = Query(None, description="ID do termo (usa o atual se não informado)"),
    num_installments: int = Query(6, ge=1, le=12, description="Número de parcelas"),
    monthly_amount: Decimal = Query(..., gt=0, description="Valor da mensalidade"),
    first_due_date: date = Query(..., description="Data do primeiro vencimento"),
) -> NegotiationExecuteResponse:
    """Generate semester invoices for student enrollment/re-enrollment."""
    student = get_or_404(db, Student, student_id, message="Aluno não encontrado.")
    
    if student.status == StudentStatus.DELETED:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="STUDENT_DELETED",
            message="Aluno excluído não pode ter faturas geradas.",
        )
    
    # Get term
    if term_id:
        term = get_or_404(db, Term, term_id, message="Período não encontrado.")
    else:
        term = db.scalar(select(Term).where(Term.is_current == True).limit(1))
        if not term:
            raise_api_error(
                status_code=status.HTTP_400_BAD_REQUEST,
                code="NO_CURRENT_TERM",
                message="Nenhum período atual encontrado. Defina um período como atual.",
            )
    
    # Validate first due date
    today = date.today()
    if first_due_date < today:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="INVALID_DUE_DATE",
            message="A data do primeiro vencimento deve ser maior ou igual a hoje.",
        )
    
    # Check if student already has pending invoices for this term
    existing_count = db.scalar(
        select(func.count())
        .where(
            Invoice.student_id == student_id,
            Invoice.term_id == term.id,
            Invoice.status.in_([InvoiceStatus.PENDING, InvoiceStatus.OVERDUE]),
        )
    ) or 0
    
    if existing_count > 0:
        raise_api_error(
            status_code=status.HTTP_409_CONFLICT,
            code="INVOICES_ALREADY_EXIST",
            message=f"Aluno já possui {existing_count} faturas pendentes para o período {term.code}.",
        )
    
    # Create invoices
    created_invoices: list[Invoice] = []
    current_date = first_due_date
    
    for i in range(1, num_installments + 1):
        invoice = Invoice(
            student_id=student_id,
            term_id=term.id,
            description=f"Mensalidade {term.code} - Parcela {i}/{num_installments}",
            due_date=current_date,
            amount=monthly_amount,
            fine_rate=Decimal("2.00"),
            interest_rate=Decimal("1.00"),
            installment_number=i,
            installment_total=num_installments,
            status=InvoiceStatus.PENDING,
        )
        db.add(invoice)
        created_invoices.append(invoice)
        
        # Next month
        if current_date.month == 12:
            current_date = date(current_date.year + 1, 1, min(current_date.day, 28))
        else:
            next_month = current_date.month + 1
            try:
                current_date = date(current_date.year, next_month, current_date.day)
            except ValueError:
                import calendar
                last_day = calendar.monthrange(current_date.year, next_month)[1]
                current_date = date(current_date.year, next_month, last_day)
    
    db.commit()
    
    for inv in created_invoices:
        db.refresh(inv)
    
    return NegotiationExecuteResponse(
        student_id=student_id,
        created_invoices=[_build_invoice_response(db, inv) for inv in created_invoices],
        canceled_invoices=[],
        total_created=len(created_invoices),
        total_canceled=0,
    )
