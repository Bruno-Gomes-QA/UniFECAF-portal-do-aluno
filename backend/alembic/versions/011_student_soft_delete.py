"""Add student soft delete status and restrict user delete

Revision ID: 011_student_soft_delete
Revises: 010_remove_staff_role
Create Date: 2026-01-31
"""

from alembic import op
import sqlalchemy as sa

revision = "011_student_soft_delete"
down_revision = "010_remove_staff_role"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE TYPE academics.student_status AS ENUM ('ACTIVE', 'DELETED')")
    op.add_column(
        "students",
        sa.Column(
            "status",
            sa.Enum("ACTIVE", "DELETED", name="student_status", schema="academics"),
            nullable=False,
            server_default="ACTIVE",
        ),
        schema="academics",
    )
    op.add_column(
        "students",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        schema="academics",
    )
    op.execute("UPDATE academics.students SET status='ACTIVE' WHERE status IS NULL")
    op.execute("ALTER TABLE academics.students ALTER COLUMN status SET DEFAULT 'ACTIVE'")

    op.drop_constraint("students_user_id_fkey", "students", schema="academics", type_="foreignkey")
    op.create_foreign_key(
        "students_user_id_fkey",
        "students",
        "users",
        ["user_id"],
        ["id"],
        source_schema="academics",
        referent_schema="auth",
        ondelete="RESTRICT",
    )


def downgrade() -> None:
    op.drop_constraint("students_user_id_fkey", "students", schema="academics", type_="foreignkey")
    op.create_foreign_key(
        "students_user_id_fkey",
        "students",
        "users",
        ["user_id"],
        ["id"],
        source_schema="academics",
        referent_schema="auth",
        ondelete="CASCADE",
    )

    op.drop_column("students", "deleted_at", schema="academics")
    op.drop_column("students", "status", schema="academics")
    op.execute("DROP TYPE academics.student_status")
