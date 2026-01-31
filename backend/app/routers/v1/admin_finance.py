"""
UniFECAF Portal do Aluno - API v1 Admin Finance Router.
"""

from __future__ import annotations

from datetime import UTC, date, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session
from starlette import status

from app.core.database import get_db
from app.core.deps import AdminUser, pagination_params
from app.core.errors import raise_api_error
from app.db.utils import apply_update, get_or_404, paginate_stmt
from app.models.finance import Invoice, InvoiceStatus, Payment, PaymentStatus
from app.schemas.admin_finance import (
    AdminInvoiceCreateRequest,
    AdminInvoiceResponse,
    AdminInvoiceUpdateRequest,
    AdminPaymentCreateRequest,
    AdminPaymentResponse,
    AdminPaymentUpdateRequest,
    MarkInvoicePaidResponse,
)
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/api/v1/admin", tags=["Admin - Finance"])


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

    items, total = paginate_stmt(db, stmt, limit=pagination["limit"], offset=pagination["offset"])
    return PaginatedResponse[AdminInvoiceResponse](
        items=[AdminInvoiceResponse.model_validate(i) for i in items],
        limit=pagination["limit"],
        offset=pagination["offset"],
        total=total,
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
    try:
        status_enum = InvoiceStatus(payload.status)
    except ValueError:
        raise_api_error(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="VALIDATION_ERROR",
            message="Status inválido.",
            details={"allowed": [s.value for s in InvoiceStatus]},
        )
    invoice = Invoice(
        student_id=payload.student_id,
        term_id=payload.term_id,
        description=payload.description,
        due_date=payload.due_date,
        amount=payload.amount,
        status=status_enum,
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return AdminInvoiceResponse.model_validate(invoice)


@router.get(
    "/invoices/{invoice_id}", response_model=AdminInvoiceResponse, summary="Detalhar invoice"
)
def get_invoice(
    invoice_id: UUID, _: AdminUser, db: Session = Depends(get_db)
) -> AdminInvoiceResponse:
    invoice = get_or_404(db, Invoice, invoice_id, message="Invoice não encontrada.")
    return AdminInvoiceResponse.model_validate(invoice)


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
    invoice = get_or_404(db, Invoice, invoice_id, message="Invoice não encontrada.")
    data = payload.model_dump(exclude_unset=True)
    if "status" in data and data["status"]:
        try:
            data["status"] = InvoiceStatus(data["status"])
        except ValueError:
            raise_api_error(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                code="VALIDATION_ERROR",
                message="Status inválido.",
                details={"allowed": [s.value for s in InvoiceStatus]},
            )
    apply_update(invoice, data)
    db.commit()
    db.refresh(invoice)
    return AdminInvoiceResponse.model_validate(invoice)


@router.delete(
    "/invoices/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remover invoice"
)
def delete_invoice(invoice_id: UUID, _: AdminUser, db: Session = Depends(get_db)) -> None:
    invoice = get_or_404(db, Invoice, invoice_id, message="Invoice não encontrada.")
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
    invoice = get_or_404(db, Invoice, invoice_id, message="Invoice não encontrada.")
    if invoice.status == InvoiceStatus.CANCELED:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="FINANCE_INVOICE_CANCELED",
            message="Invoice cancelada.",
        )

    if invoice.status == InvoiceStatus.PAID:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="FINANCE_INVOICE_ALREADY_PAID",
            message="Invoice já está paga.",
        )

    paid_at = datetime.now(UTC)
    payment = Payment(
        invoice_id=invoice.id,
        amount=invoice.amount,
        status=PaymentStatus.SETTLED,
        provider="admin",
        provider_ref="admin",
        paid_at=paid_at,
    )
    db.add(payment)
    invoice.status = InvoiceStatus.PAID
    db.commit()
    db.refresh(payment)
    return MarkInvoicePaidResponse(
        invoice_id=invoice.id, payment_id=payment.id, status=payment.status.value, paid_at=paid_at
    )


@router.get(
    "/payments", response_model=PaginatedResponse[AdminPaymentResponse], summary="Listar payments"
)
def list_payments(
    _: AdminUser,
    db: Session = Depends(get_db),
    pagination: dict[str, int] = Depends(pagination_params),
    invoice_id: UUID | None = Query(None),
    status_filter: PaymentStatus | None = Query(None, alias="status"),
) -> PaginatedResponse[AdminPaymentResponse]:
    stmt = select(Payment).order_by(Payment.created_at.desc())
    if invoice_id:
        stmt = stmt.where(Payment.invoice_id == invoice_id)
    if status_filter:
        stmt = stmt.where(Payment.status == status_filter)

    items, total = paginate_stmt(db, stmt, limit=pagination["limit"], offset=pagination["offset"])
    return PaginatedResponse[AdminPaymentResponse](
        items=[AdminPaymentResponse.model_validate(p) for p in items],
        limit=pagination["limit"],
        offset=pagination["offset"],
        total=total,
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
    try:
        status_enum = PaymentStatus(payload.status)
    except ValueError:
        raise_api_error(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="VALIDATION_ERROR",
            message="Status inválido.",
            details={"allowed": [s.value for s in PaymentStatus]},
        )
    payment = Payment(
        invoice_id=payload.invoice_id,
        amount=payload.amount,
        status=status_enum,
        provider=payload.provider,
        provider_ref=payload.provider_ref,
        paid_at=payload.paid_at,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return AdminPaymentResponse.model_validate(payment)


@router.get(
    "/payments/{payment_id}", response_model=AdminPaymentResponse, summary="Detalhar payment"
)
def get_payment(
    payment_id: UUID, _: AdminUser, db: Session = Depends(get_db)
) -> AdminPaymentResponse:
    payment = get_or_404(db, Payment, payment_id, message="Payment não encontrado.")
    return AdminPaymentResponse.model_validate(payment)


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
    payment = get_or_404(db, Payment, payment_id, message="Payment não encontrado.")
    data = payload.model_dump(exclude_unset=True)
    if "status" in data and data["status"]:
        try:
            data["status"] = PaymentStatus(data["status"])
        except ValueError:
            raise_api_error(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                code="VALIDATION_ERROR",
                message="Status inválido.",
                details={"allowed": [s.value for s in PaymentStatus]},
            )
    apply_update(payment, data)
    db.commit()
    db.refresh(payment)
    return AdminPaymentResponse.model_validate(payment)


@router.delete(
    "/payments/{payment_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remover payment"
)
def delete_payment(payment_id: UUID, _: AdminUser, db: Session = Depends(get_db)) -> None:
    payment = get_or_404(db, Payment, payment_id, message="Payment não encontrado.")
    db.delete(payment)
    db.commit()
