"""Documents domain - student documents

Revision ID: 006_documents_domain
Revises: 005_comm_domain
Create Date: 2026-01-30

Creates documents domain tables: student documents.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision: str = "006_documents_domain"
down_revision: Union[str, None] = "005_comm_domain"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create documents domain tables."""
    
    # Create enums
    op.execute("""
        DO $$ BEGIN
          CREATE TYPE documents.document_type AS ENUM ('DECLARATION', 'STUDENT_CARD', 'TRANSCRIPT');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$
    """)
    
    op.execute("""
        DO $$ BEGIN
          CREATE TYPE documents.document_status AS ENUM ('AVAILABLE', 'GENERATING', 'ERROR');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$
    """)
    
    # Student Documents
    op.execute("""
        CREATE TABLE documents.student_documents (
          id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id    uuid NOT NULL REFERENCES academics.students(user_id) ON DELETE CASCADE,
          doc_type      documents.document_type NOT NULL,
          status        documents.document_status NOT NULL DEFAULT 'AVAILABLE',
          title         text,
          file_url      text,
          generated_at  timestamptz,
          created_at    timestamptz NOT NULL DEFAULT now(),
          updated_at    timestamptz NOT NULL DEFAULT now(),
          UNIQUE (student_id, doc_type)
        )
    """)
    
    op.execute("""
        CREATE TRIGGER trg_student_documents_updated_at
        BEFORE UPDATE ON documents.student_documents
        FOR EACH ROW EXECUTE FUNCTION common.set_updated_at()
    """)


def downgrade() -> None:
    """Drop documents domain tables."""
    op.execute("DROP TABLE IF EXISTS documents.student_documents CASCADE")
    op.execute("DROP TYPE IF EXISTS documents.document_status")
    op.execute("DROP TYPE IF EXISTS documents.document_type")
