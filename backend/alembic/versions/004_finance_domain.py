"""Finance domain - invoices and payments

Revision ID: 004_finance_domain
Revises: 003_academics_domain
Create Date: 2026-01-30

Creates finance domain tables: invoices and payments.
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers
revision: str = "004_finance_domain"
down_revision: str | None = "003_academics_domain"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create finance domain tables."""

    # Create enums
    op.execute("""
        DO $$ BEGIN
          CREATE TYPE finance.invoice_status AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELED');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$
    """)

    op.execute("""
        DO $$ BEGIN
          CREATE TYPE finance.payment_status AS ENUM ('AUTHORIZED', 'SETTLED', 'FAILED', 'REFUNDED');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$
    """)

    # Invoices
    op.execute("""
        CREATE TABLE finance.invoices (
          id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id  uuid NOT NULL REFERENCES academics.students(user_id) ON DELETE CASCADE,
          term_id     uuid REFERENCES academics.terms(id) ON DELETE SET NULL,
          description text NOT NULL DEFAULT 'Mensalidade',
          due_date    date NOT NULL,
          amount      numeric(12,2) NOT NULL CHECK (amount >= 0),
          status      finance.invoice_status NOT NULL DEFAULT 'PENDING',
          created_at  timestamptz NOT NULL DEFAULT now(),
          updated_at  timestamptz NOT NULL DEFAULT now()
        )
    """)

    op.execute("""
        CREATE TRIGGER trg_invoices_updated_at
        BEFORE UPDATE ON finance.invoices
        FOR EACH ROW EXECUTE FUNCTION common.set_updated_at()
    """)

    op.execute("CREATE INDEX idx_invoices_student_due ON finance.invoices(student_id, due_date)")
    op.execute(
        "CREATE INDEX idx_invoices_pending_due ON finance.invoices(due_date) WHERE status = 'PENDING'"
    )

    # Payments
    op.execute("""
        CREATE TABLE finance.payments (
          id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          invoice_id    uuid NOT NULL REFERENCES finance.invoices(id) ON DELETE CASCADE,
          amount        numeric(12,2) NOT NULL CHECK (amount >= 0),
          status        finance.payment_status NOT NULL DEFAULT 'AUTHORIZED',
          provider      text,
          provider_ref  text,
          paid_at       timestamptz,
          created_at    timestamptz NOT NULL DEFAULT now(),
          updated_at    timestamptz NOT NULL DEFAULT now()
        )
    """)

    op.execute("""
        CREATE TRIGGER trg_payments_updated_at
        BEFORE UPDATE ON finance.payments
        FOR EACH ROW EXECUTE FUNCTION common.set_updated_at()
    """)

    op.execute("CREATE INDEX idx_payments_invoice ON finance.payments(invoice_id)")


def downgrade() -> None:
    """Drop finance domain tables."""
    op.execute("DROP TABLE IF EXISTS finance.payments CASCADE")
    op.execute("DROP TABLE IF EXISTS finance.invoices CASCADE")
    op.execute("DROP TYPE IF EXISTS finance.payment_status")
    op.execute("DROP TYPE IF EXISTS finance.invoice_status")
