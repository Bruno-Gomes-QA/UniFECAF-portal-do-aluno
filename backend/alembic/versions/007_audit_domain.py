"""Audit domain - audit log

Revision ID: 007_audit_domain
Revises: 006_documents_domain
Create Date: 2026-01-30

Creates audit domain tables: audit log.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision: str = "007_audit_domain"
down_revision: Union[str, None] = "006_documents_domain"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create audit domain tables."""
    
    # Audit Log
    op.execute("""
        CREATE TABLE audit.audit_log (
          id            bigserial PRIMARY KEY,
          actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
          action        text NOT NULL,
          entity_type   text,
          entity_id     uuid,
          ip            inet,
          user_agent    text,
          data          jsonb NOT NULL DEFAULT '{}'::jsonb,
          created_at    timestamptz NOT NULL DEFAULT now()
        )
    """)
    
    op.execute("CREATE INDEX idx_audit_actor_time ON audit.audit_log(actor_user_id, created_at DESC)")


def downgrade() -> None:
    """Drop audit domain tables."""
    op.execute("DROP TABLE IF EXISTS audit.audit_log CASCADE")
