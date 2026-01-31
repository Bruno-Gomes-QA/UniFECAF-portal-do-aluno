"""Auth domain - users and sessions

Revision ID: 002_auth_domain
Revises: 001_common_extensions
Create Date: 2026-01-30

Creates auth domain tables: users and JWT sessions.
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers
revision: str = "002_auth_domain"
down_revision: str | None = "001_common_extensions"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create auth domain tables."""

    # Create enums
    op.execute("""
        DO $$ BEGIN
          CREATE TYPE auth.user_role AS ENUM ('STUDENT', 'STAFF', 'ADMIN');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$
    """)

    op.execute("""
        DO $$ BEGIN
          CREATE TYPE auth.user_status AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$
    """)

    # Create users table
    op.execute("""
        CREATE TABLE auth.users (
          id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          email           citext UNIQUE NOT NULL,
          password_hash   text NOT NULL,
          role            auth.user_role NOT NULL DEFAULT 'STUDENT',
          status          auth.user_status NOT NULL DEFAULT 'ACTIVE',
          created_at      timestamptz NOT NULL DEFAULT now(),
          updated_at      timestamptz NOT NULL DEFAULT now(),
          last_login_at   timestamptz
        )
    """)

    op.execute("""
        CREATE TRIGGER trg_users_updated_at
        BEFORE UPDATE ON auth.users
        FOR EACH ROW EXECUTE FUNCTION common.set_updated_at()
    """)

    # Create JWT sessions table
    op.execute("""
        CREATE TABLE auth.jwt_sessions (
          jti             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          issued_at       timestamptz NOT NULL DEFAULT now(),
          expires_at      timestamptz NOT NULL,
          revoked_at      timestamptz,
          ip              inet,
          user_agent      text
        )
    """)

    op.execute("CREATE INDEX idx_jwt_sessions_user ON auth.jwt_sessions(user_id)")
    op.execute(
        "CREATE INDEX idx_jwt_sessions_active ON auth.jwt_sessions(user_id) WHERE revoked_at IS NULL"
    )


def downgrade() -> None:
    """Drop auth domain tables."""
    op.execute("DROP TABLE IF EXISTS auth.jwt_sessions CASCADE")
    op.execute("DROP TABLE IF EXISTS auth.users CASCADE")
    op.execute("DROP TYPE IF EXISTS auth.user_status")
    op.execute("DROP TYPE IF EXISTS auth.user_role")
