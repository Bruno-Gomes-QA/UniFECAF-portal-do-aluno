"""Add method column to payments

Revision ID: 011_payment_method
Revises: 010_finance_business_rules
Create Date: 2026-02-01

Adds method column to track payment method (PIX, BOLETO, etc.)
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers
revision: str = "011_payment_method"
down_revision: str | None = "010_finance_business_rules"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add method column to payments."""
    op.execute("""
        ALTER TABLE finance.payments
        ADD COLUMN IF NOT EXISTS method VARCHAR(50)
    """)


def downgrade() -> None:
    """Remove method column from payments."""
    op.execute("""
        ALTER TABLE finance.payments
        DROP COLUMN IF EXISTS method
    """)
