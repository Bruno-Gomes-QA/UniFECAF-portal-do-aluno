"""Common extensions and schemas

Revision ID: 001_common_extensions
Revises:
Create Date: 2026-01-30

Creates PostgreSQL extensions and common schema with utilities.
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers
revision: str = "001_common_extensions"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create extensions, schemas and common utilities."""

    # Create extensions
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    op.execute("CREATE EXTENSION IF NOT EXISTS citext")

    # Create schemas
    op.execute("CREATE SCHEMA IF NOT EXISTS common")
    op.execute("CREATE SCHEMA IF NOT EXISTS auth")
    op.execute("CREATE SCHEMA IF NOT EXISTS academics")
    op.execute("CREATE SCHEMA IF NOT EXISTS finance")
    op.execute("CREATE SCHEMA IF NOT EXISTS comm")
    op.execute("CREATE SCHEMA IF NOT EXISTS documents")
    op.execute("CREATE SCHEMA IF NOT EXISTS audit")

    # Create common updated_at trigger function
    op.execute("""
        CREATE OR REPLACE FUNCTION common.set_updated_at()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
          NEW.updated_at = now();
          RETURN NEW;
        END;
        $$
    """)


def downgrade() -> None:
    """Drop common utilities, schemas and extensions."""
    op.execute("DROP FUNCTION IF EXISTS common.set_updated_at CASCADE")
    op.execute("DROP SCHEMA IF EXISTS audit CASCADE")
    op.execute("DROP SCHEMA IF EXISTS documents CASCADE")
    op.execute("DROP SCHEMA IF EXISTS comm CASCADE")
    op.execute("DROP SCHEMA IF EXISTS finance CASCADE")
    op.execute("DROP SCHEMA IF EXISTS academics CASCADE")
    op.execute("DROP SCHEMA IF EXISTS auth CASCADE")
    op.execute("DROP SCHEMA IF EXISTS common CASCADE")
    op.execute("DROP EXTENSION IF EXISTS citext")
    op.execute("DROP EXTENSION IF EXISTS pgcrypto")
