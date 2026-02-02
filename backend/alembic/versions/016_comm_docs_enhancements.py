"""Add comm and documents enhancements

Revision ID: 016_comm_docs_enhancements
Revises: 015_merge_branches
Create Date: 2026-02-01

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "016_comm_docs_enhancements"
down_revision = "015_merge_branches"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # === NOTIFICATIONS ENHANCEMENTS ===
    
    # Add is_archived for soft-delete
    op.add_column(
        "notifications",
        sa.Column("is_archived", sa.Boolean(), nullable=False, server_default="false"),
        schema="comm",
    )
    
    # Add delivery/read counters (cached for performance)
    op.add_column(
        "notifications",
        sa.Column("delivered_count", sa.Integer(), nullable=False, server_default="0"),
        schema="comm",
    )
    op.add_column(
        "notifications",
        sa.Column("read_count", sa.Integer(), nullable=False, server_default="0"),
        schema="comm",
    )
    
    # === USER_NOTIFICATIONS ENHANCEMENTS ===
    
    # Add action_url and action_label for actionable notifications
    op.add_column(
        "user_notifications",
        sa.Column("action_url", sa.String(), nullable=True),
        schema="comm",
    )
    op.add_column(
        "user_notifications",
        sa.Column("action_label", sa.String(100), nullable=True),
        schema="comm",
    )
    
    # === STUDENT_DOCUMENTS ENHANCEMENTS ===
    
    # Add file metadata
    op.add_column(
        "student_documents",
        sa.Column("file_size", sa.Integer(), nullable=True),
        schema="documents",
    )
    op.add_column(
        "student_documents",
        sa.Column("file_type", sa.String(50), nullable=True),
        schema="documents",
    )
    
    # Add request tracking
    op.add_column(
        "student_documents",
        sa.Column("requested_at", sa.DateTime(timezone=True), nullable=True),
        schema="documents",
    )
    op.add_column(
        "student_documents",
        sa.Column("requested_by", postgresql.UUID(as_uuid=True), nullable=True),
        schema="documents",
    )
    
    # Add description field
    op.add_column(
        "student_documents",
        sa.Column("description", sa.Text(), nullable=True),
        schema="documents",
    )
    
    # === INDEXES FOR PERFORMANCE ===
    
    # Notifications indexes
    op.create_index(
        "idx_notifications_type",
        "notifications",
        ["type"],
        schema="comm",
    )
    op.create_index(
        "idx_notifications_channel",
        "notifications",
        ["channel"],
        schema="comm",
    )
    op.create_index(
        "idx_notifications_priority",
        "notifications",
        ["priority"],
        schema="comm",
    )
    op.create_index(
        "idx_notifications_archived",
        "notifications",
        ["is_archived"],
        schema="comm",
    )
    
    # User notifications indexes
    op.create_index(
        "idx_user_notifications_read",
        "user_notifications",
        ["read_at"],
        schema="comm",
    )
    op.create_index(
        "idx_user_notifications_archived",
        "user_notifications",
        ["archived_at"],
        schema="comm",
    )
    
    # Student documents indexes
    op.create_index(
        "idx_student_documents_status",
        "student_documents",
        ["status"],
        schema="documents",
    )
    op.create_index(
        "idx_student_documents_type",
        "student_documents",
        ["doc_type"],
        schema="documents",
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index("idx_student_documents_type", table_name="student_documents", schema="documents")
    op.drop_index("idx_student_documents_status", table_name="student_documents", schema="documents")
    op.drop_index("idx_user_notifications_archived", table_name="user_notifications", schema="comm")
    op.drop_index("idx_user_notifications_read", table_name="user_notifications", schema="comm")
    op.drop_index("idx_notifications_archived", table_name="notifications", schema="comm")
    op.drop_index("idx_notifications_priority", table_name="notifications", schema="comm")
    op.drop_index("idx_notifications_channel", table_name="notifications", schema="comm")
    op.drop_index("idx_notifications_type", table_name="notifications", schema="comm")
    
    # Drop student_documents columns
    op.drop_column("student_documents", "description", schema="documents")
    op.drop_column("student_documents", "requested_by", schema="documents")
    op.drop_column("student_documents", "requested_at", schema="documents")
    op.drop_column("student_documents", "file_type", schema="documents")
    op.drop_column("student_documents", "file_size", schema="documents")
    
    # Drop user_notifications columns
    op.drop_column("user_notifications", "action_label", schema="comm")
    op.drop_column("user_notifications", "action_url", schema="comm")
    
    # Drop notifications columns
    op.drop_column("notifications", "read_count", schema="comm")
    op.drop_column("notifications", "delivered_count", schema="comm")
    op.drop_column("notifications", "is_archived", schema="comm")
