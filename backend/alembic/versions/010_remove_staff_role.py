"""Remove STAFF role

Revision ID: 010_remove_staff_role
Revises: 009_remove_campus
Create Date: 2026-01-31
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "010_remove_staff_role"
down_revision = "009_remove_campus"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Map existing STAFF users to ADMIN to avoid lockout
    op.execute("UPDATE auth.users SET role='ADMIN' WHERE role='STAFF'")

    # Create new enum without STAFF
    op.execute("CREATE TYPE auth.user_role_new AS ENUM ('STUDENT', 'ADMIN')")
    op.execute(
        "ALTER TABLE auth.users "
        "ALTER COLUMN role DROP DEFAULT"
    )
    op.execute(
        "ALTER TABLE auth.users "
        "ALTER COLUMN role TYPE auth.user_role_new "
        "USING role::text::auth.user_role_new"
    )
    op.execute("DROP TYPE auth.user_role")
    op.execute("ALTER TYPE auth.user_role_new RENAME TO user_role")
    op.execute("ALTER TABLE auth.users ALTER COLUMN role SET DEFAULT 'STUDENT'")


def downgrade() -> None:
    # Recreate enum with STAFF
    op.execute("CREATE TYPE auth.user_role_old AS ENUM ('STUDENT', 'STAFF', 'ADMIN')")
    op.execute(
        "ALTER TABLE auth.users "
        "ALTER COLUMN role DROP DEFAULT"
    )
    op.execute(
        "ALTER TABLE auth.users "
        "ALTER COLUMN role TYPE auth.user_role_old "
        "USING role::text::auth.user_role_old"
    )
    op.execute("DROP TYPE auth.user_role")
    op.execute("ALTER TYPE auth.user_role_old RENAME TO user_role")
    op.execute("ALTER TABLE auth.users ALTER COLUMN role SET DEFAULT 'STUDENT'")
