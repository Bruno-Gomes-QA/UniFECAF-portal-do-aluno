"""
UniFECAF Portal do Aluno - Admin schemas (finance).
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AdminInvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    student_id: UUID
    term_id: UUID | None = None
    description: str
    due_date: date
    amount: Decimal = Field(..., ge=0)
    status: str
    created_at: datetime
    updated_at: datetime


class AdminInvoiceCreateRequest(BaseModel):
    student_id: UUID
    term_id: UUID | None = None
    description: str = "Mensalidade"
    due_date: date
    amount: Decimal = Field(..., ge=0)
    status: str = Field("PENDING", description="PENDING | PAID | OVERDUE | CANCELED")


class AdminInvoiceUpdateRequest(BaseModel):
    student_id: UUID | None = None
    term_id: UUID | None = None
    description: str | None = None
    due_date: date | None = None
    amount: Decimal | None = Field(None, ge=0)
    status: str | None = None


class AdminPaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    invoice_id: UUID
    amount: Decimal
    status: str
    provider: str | None = None
    provider_ref: str | None = None
    paid_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class AdminPaymentCreateRequest(BaseModel):
    invoice_id: UUID
    amount: Decimal = Field(..., ge=0)
    status: str = Field("AUTHORIZED", description="AUTHORIZED | SETTLED | FAILED | REFUNDED")
    provider: str | None = None
    provider_ref: str | None = None
    paid_at: datetime | None = None


class AdminPaymentUpdateRequest(BaseModel):
    amount: Decimal | None = Field(None, ge=0)
    status: str | None = None
    provider: str | None = None
    provider_ref: str | None = None
    paid_at: datetime | None = None


class MarkInvoicePaidResponse(BaseModel):
    invoice_id: UUID
    payment_id: UUID
    status: str
    paid_at: datetime
