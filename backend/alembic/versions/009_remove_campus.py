"""Remove campus (single-campus decision)

Revision ID: 009_remove_campus
Revises: 007_audit_domain
Create Date: 2026-01-31

Removes academics.campuses and academics.courses.campus_id (we assume single campus).
This migration is safe to run on fresh databases (objects may not exist).
"""

from collections.abc import Sequence

from alembic import op

revision: str = "009_remove_campus"
down_revision: str | None = "007_audit_domain"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE IF EXISTS academics.courses DROP COLUMN IF EXISTS campus_id CASCADE")
    op.execute("DROP TABLE IF EXISTS academics.campuses CASCADE")


def downgrade() -> None:
    # We intentionally do not recreate the campus schema.
    pass
