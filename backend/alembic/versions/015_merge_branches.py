"""Merge finance and student branches

Revision ID: 015_merge_branches
Revises: 011_payment_method, 014_courses_subjects
Create Date: 2026-02-01

Merge migration to combine finance and student/course business rules branches.
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers
revision: str = "015_merge_branches"
down_revision: tuple[str, ...] = ("011_payment_method", "014_courses_subjects")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Merge branches - no additional changes needed."""
    pass


def downgrade() -> None:
    """Downgrade merge - no changes to revert."""
    pass