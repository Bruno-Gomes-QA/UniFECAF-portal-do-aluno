"""Add audit log indexes and expose endpoint

Revision ID: 017_audit_indexes
Revises: 016_comm_docs_enhancements
Create Date: 2026-02-01

"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "017_audit_indexes"
down_revision = "016_comm_docs_enhancements"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # === AUDIT LOG INDEXES FOR PERFORMANCE ===
    
    # Index on actor_user_id for filtering by who performed action
    op.create_index(
        "idx_audit_log_actor",
        "audit_log",
        ["actor_user_id"],
        schema="audit",
    )
    
    # Index on action for filtering by action type
    op.create_index(
        "idx_audit_log_action",
        "audit_log",
        ["action"],
        schema="audit",
    )
    
    # Composite index on entity_type and entity_id for entity lookup
    op.create_index(
        "idx_audit_log_entity",
        "audit_log",
        ["entity_type", "entity_id"],
        schema="audit",
    )
    
    # Index on created_at DESC for time-based queries (most common)
    op.create_index(
        "idx_audit_log_created_desc",
        "audit_log",
        ["created_at"],
        schema="audit",
        postgresql_ops={"created_at": "DESC"},
    )
    
    # Index on IP for security analysis
    op.create_index(
        "idx_audit_log_ip",
        "audit_log",
        ["ip"],
        schema="audit",
    )


def downgrade() -> None:
    op.drop_index("idx_audit_log_ip", table_name="audit_log", schema="audit")
    op.drop_index("idx_audit_log_created_desc", table_name="audit_log", schema="audit")
    op.drop_index("idx_audit_log_entity", table_name="audit_log", schema="audit")
    op.drop_index("idx_audit_log_action", table_name="audit_log", schema="audit")
    op.drop_index("idx_audit_log_actor", table_name="audit_log", schema="audit")
