"""Finance business rules - reference, fine, interest, installments

Revision ID: 010_finance_business_rules
Revises: 009_remove_campus
Create Date: 2026-02-01

Adds business rule fields to finance tables:
- reference: unique invoice code (INV-YYYYMM-XXXX)
- fine_rate: penalty percentage for overdue
- interest_rate: monthly interest percentage
- installment_number/total: for payment plans
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers
revision: str = "010_finance_business_rules"
down_revision: str | None = "009_remove_campus"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add business rule fields to invoices."""

    # Add columns to invoices
    op.execute("""
        ALTER TABLE finance.invoices
        ADD COLUMN IF NOT EXISTS reference VARCHAR(20),
        ADD COLUMN IF NOT EXISTS fine_rate NUMERIC(5,2) NOT NULL DEFAULT 2.00,
        ADD COLUMN IF NOT EXISTS interest_rate NUMERIC(5,2) NOT NULL DEFAULT 1.00,
        ADD COLUMN IF NOT EXISTS installment_number INTEGER,
        ADD COLUMN IF NOT EXISTS installment_total INTEGER
    """)

    # Add constraint for installments
    op.execute("""
        ALTER TABLE finance.invoices
        DROP CONSTRAINT IF EXISTS chk_installment,
        ADD CONSTRAINT chk_installment CHECK (
            (installment_number IS NULL AND installment_total IS NULL) OR
            (installment_number >= 1 AND installment_total >= installment_number)
        )
    """)

    # Create sequence for reference numbers
    op.execute("""
        CREATE SEQUENCE IF NOT EXISTS finance.invoice_reference_seq START 1
    """)

    # Create function to generate reference
    op.execute("""
        CREATE OR REPLACE FUNCTION finance.generate_invoice_reference()
        RETURNS TRIGGER AS $$
        BEGIN
            IF NEW.reference IS NULL THEN
                NEW.reference := 'INV-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || 
                    LPAD(nextval('finance.invoice_reference_seq')::text, 4, '0');
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)

    # Create trigger for auto-generating reference
    op.execute("""
        DROP TRIGGER IF EXISTS trg_invoice_reference ON finance.invoices;
        CREATE TRIGGER trg_invoice_reference
        BEFORE INSERT ON finance.invoices
        FOR EACH ROW EXECUTE FUNCTION finance.generate_invoice_reference();
    """)

    # Populate existing invoices with reference codes
    op.execute("""
        WITH numbered AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn,
                   TO_CHAR(created_at, 'YYYYMM') as month_code
            FROM finance.invoices
            WHERE reference IS NULL
        )
        UPDATE finance.invoices i
        SET reference = 'INV-' || n.month_code || '-' || LPAD(n.rn::text, 4, '0')
        FROM numbered n
        WHERE i.id = n.id
    """)

    # Make reference NOT NULL and UNIQUE after populating
    op.execute("""
        ALTER TABLE finance.invoices
        ALTER COLUMN reference SET NOT NULL
    """)

    op.execute("""
        ALTER TABLE finance.invoices
        DROP CONSTRAINT IF EXISTS invoices_reference_key,
        ADD CONSTRAINT invoices_reference_key UNIQUE (reference)
    """)

    # Create index for reference lookups
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_invoices_reference 
        ON finance.invoices(reference)
    """)


def downgrade() -> None:
    """Remove business rule fields from invoices."""
    op.execute("DROP INDEX IF EXISTS finance.idx_invoices_reference")
    op.execute("DROP TRIGGER IF EXISTS trg_invoice_reference ON finance.invoices")
    op.execute("DROP FUNCTION IF EXISTS finance.generate_invoice_reference()")
    op.execute("DROP SEQUENCE IF EXISTS finance.invoice_reference_seq")
    op.execute("""
        ALTER TABLE finance.invoices
        DROP CONSTRAINT IF EXISTS invoices_reference_key,
        DROP CONSTRAINT IF EXISTS chk_installment,
        DROP COLUMN IF EXISTS reference,
        DROP COLUMN IF EXISTS fine_rate,
        DROP COLUMN IF EXISTS interest_rate,
        DROP COLUMN IF EXISTS installment_number,
        DROP COLUMN IF EXISTS installment_total
    """)
