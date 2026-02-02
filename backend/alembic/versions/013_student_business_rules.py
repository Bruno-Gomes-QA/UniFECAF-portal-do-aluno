"""Student business rules

Revision ID: 013_student_business_rules
Revises: 011_student_soft_delete
Create Date: 2026-01-31

Adds LOCKED and GRADUATED status to students and graduation_date field.
RA is auto-generated based on max existing RA + 1 (starting from seed 107885).
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers
revision: str = "013_student_business_rules"
down_revision: str | None = "011_student_soft_delete"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add LOCKED and GRADUATED status and graduation_date."""

    # 1. Add new enum values for student_status
    # PostgreSQL requires special handling for adding enum values
    op.execute("""
        ALTER TYPE academics.student_status ADD VALUE IF NOT EXISTS 'LOCKED';
    """)
    op.execute("""
        ALTER TYPE academics.student_status ADD VALUE IF NOT EXISTS 'GRADUATED';
    """)

    # 2. Add graduation_date column
    op.execute("""
        ALTER TABLE academics.students 
        ADD COLUMN IF NOT EXISTS graduation_date DATE;
    """)


def downgrade() -> None:
    """Remove graduation_date and sequence (enum values cannot be easily removed)."""
    op.execute("DROP SEQUENCE IF EXISTS academics.student_ra_seq;")
    op.execute("ALTER TABLE academics.students DROP COLUMN IF EXISTS graduation_date;")
    # Note: Removing enum values requires recreating the type, skipped for simplicity
