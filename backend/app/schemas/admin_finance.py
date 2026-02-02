"""
UniFECAF Portal do Aluno - Admin schemas (finance).
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AdminInvoiceResponse(BaseModel):
    """Invoice response with enriched data."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    reference: str
    student_id: UUID
    student_name: str | None = None
    student_ra: str | None = None
    term_id: UUID | None = None
    term_code: str | None = None
    description: str
    due_date: date
    amount: Decimal = Field(..., ge=0)
    fine_rate: Decimal = Field(default=Decimal("2.00"), ge=0, le=100)
    interest_rate: Decimal = Field(default=Decimal("1.00"), ge=0, le=100)
    amount_due: Decimal | None = None  # Calculated field
    installment_number: int | None = None
    installment_total: int | None = None
    status: str
    payments_count: int = 0
    created_at: datetime
    updated_at: datetime


class AdminInvoiceCreateRequest(BaseModel):
    """Request to create an invoice."""

    student_id: UUID
    term_id: UUID | None = None
    description: str = "Mensalidade"
    due_date: date
    amount: Decimal = Field(..., gt=0)
    fine_rate: Decimal = Field(default=Decimal("2.00"), ge=0, le=100)
    interest_rate: Decimal = Field(default=Decimal("1.00"), ge=0, le=100)
    installment_number: int | None = Field(None, ge=1)
    installment_total: int | None = Field(None, ge=1)
    status: str = Field("PENDING", description="PENDING | PAID | OVERDUE | CANCELED")


class AdminInvoiceUpdateRequest(BaseModel):
    """Request to update an invoice."""

    term_id: UUID | None = None
    description: str | None = None
    due_date: date | None = None
    amount: Decimal | None = Field(None, gt=0)
    fine_rate: Decimal | None = Field(None, ge=0, le=100)
    interest_rate: Decimal | None = Field(None, ge=0, le=100)
    installment_number: int | None = Field(None, ge=1)
    installment_total: int | None = Field(None, ge=1)
    status: str | None = None


class AdminPaymentResponse(BaseModel):
    """Payment response with enriched data."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    invoice_id: UUID
    invoice_reference: str | None = None
    student_name: str | None = None
    student_ra: str | None = None
    amount: Decimal
    status: str
    method: str | None = None
    provider: str | None = None
    provider_ref: str | None = None
    paid_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class AdminPaymentCreateRequest(BaseModel):
    """Request to create a payment."""

    invoice_id: UUID
    amount: Decimal = Field(..., gt=0)
    method: str | None = None
    provider: str | None = None
    provider_ref: str | None = None
    paid_at: datetime | None = None


class AdminPaymentUpdateRequest(BaseModel):
    """Request to update a payment."""

    method: str | None = None
    provider: str | None = None
    provider_ref: str | None = None
    paid_at: datetime | None = None


class MarkInvoicePaidResponse(BaseModel):
    """Response for marking invoice as paid."""

    invoice_id: UUID
    payment_id: UUID
    status: str
    paid_at: datetime


class InvoiceSummaryResponse(BaseModel):
    """Summary of invoices."""

    total_pending: Decimal = Decimal("0.00")
    total_overdue: Decimal = Decimal("0.00")
    total_paid: Decimal = Decimal("0.00")
    total_canceled: Decimal = Decimal("0.00")
    count_pending: int = 0
    count_overdue: int = 0
    count_paid: int = 0
    count_canceled: int = 0


class PaymentSummaryResponse(BaseModel):
    """Summary of payments."""

    total_authorized: Decimal = Decimal("0.00")
    total_settled: Decimal = Decimal("0.00")
    total_failed: Decimal = Decimal("0.00")
    total_refunded: Decimal = Decimal("0.00")
    count_authorized: int = 0
    count_settled: int = 0
    count_failed: int = 0
    count_refunded: int = 0


# ==================== NEGOTIATION / RENEGOTIATION ====================


class StudentDebtSummary(BaseModel):
    """Summary of student's pending invoices for negotiation."""
    
    student_id: UUID
    student_name: str
    student_ra: str
    pending_invoices: list["AdminInvoiceResponse"]
    total_pending_amount: Decimal
    total_pending_with_fees: Decimal  # With fine and interest calculated
    count_pending: int
    has_current_term_enrollment: bool  # Whether student is enrolled in current term


class NegotiationInstallment(BaseModel):
    """A single installment in a negotiation plan."""
    
    installment_number: int
    due_date: date
    amount: Decimal
    description: str


class NegotiationPlanRequest(BaseModel):
    """Request to generate a negotiation plan."""
    
    student_id: UUID
    total_amount: Decimal = Field(..., gt=0, description="Total amount to be split into installments")
    num_installments: int = Field(..., ge=1, le=24, description="Number of installments (1-24)")
    first_due_date: date = Field(..., description="Due date for the first installment")
    description_prefix: str = Field(default="Renegociação", description="Prefix for invoice descriptions")
    cancel_pending: bool = Field(default=True, description="Whether to cancel existing pending invoices")


class NegotiationPlanResponse(BaseModel):
    """Response with negotiation plan preview."""
    
    student_id: UUID
    total_amount: Decimal
    installment_amount: Decimal  # Equal installments
    num_installments: int
    installments: list[NegotiationInstallment]
    pending_to_cancel: list[UUID]  # IDs of invoices that will be canceled


class NegotiationExecuteRequest(BaseModel):
    """Request to execute a negotiation plan."""
    
    student_id: UUID
    term_id: UUID | None = None
    installments: list[NegotiationInstallment]
    cancel_pending_ids: list[UUID] = Field(default_factory=list)
    fine_rate: Decimal = Field(default=Decimal("2.00"), ge=0, le=100)
    interest_rate: Decimal = Field(default=Decimal("1.00"), ge=0, le=100)


class NegotiationExecuteResponse(BaseModel):
    """Response after executing a negotiation plan."""
    
    student_id: UUID
    created_invoices: list["AdminInvoiceResponse"]
    canceled_invoices: list[UUID]
    total_created: int
    total_canceled: int
