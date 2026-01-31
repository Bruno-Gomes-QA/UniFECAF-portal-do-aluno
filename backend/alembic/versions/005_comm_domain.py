"""Communications domain - notifications

Revision ID: 005_comm_domain
Revises: 004_finance_domain
Create Date: 2026-01-30

Creates communications domain tables: notifications, user notifications and preferences.
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers
revision: str = "005_comm_domain"
down_revision: str | None = "004_finance_domain"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create communications domain tables."""

    # Create enums
    op.execute("""
        DO $$ BEGIN
          CREATE TYPE comm.notification_type AS ENUM ('ACADEMIC', 'FINANCIAL', 'ADMIN');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$
    """)

    op.execute("""
        DO $$ BEGIN
          CREATE TYPE comm.notification_channel AS ENUM ('IN_APP', 'EMAIL', 'SMS');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$
    """)

    op.execute("""
        DO $$ BEGIN
          CREATE TYPE comm.notification_priority AS ENUM ('LOW', 'NORMAL', 'HIGH');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$
    """)

    # Notifications
    op.execute("""
        CREATE TABLE comm.notifications (
          id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          type        comm.notification_type NOT NULL DEFAULT 'ADMIN',
          channel     comm.notification_channel NOT NULL DEFAULT 'IN_APP',
          priority    comm.notification_priority NOT NULL DEFAULT 'NORMAL',
          title       text,
          body        text NOT NULL,
          created_at  timestamptz NOT NULL DEFAULT now()
        )
    """)

    # User Notifications
    op.execute("""
        CREATE TABLE comm.user_notifications (
          id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          notification_id uuid NOT NULL REFERENCES comm.notifications(id) ON DELETE CASCADE,
          delivered_at    timestamptz NOT NULL DEFAULT now(),
          read_at         timestamptz,
          archived_at     timestamptz,
          extra_data      jsonb NOT NULL DEFAULT '{}'::jsonb,
          UNIQUE (user_id, notification_id)
        )
    """)

    op.execute(
        "CREATE INDEX idx_user_notifications_user ON comm.user_notifications(user_id, delivered_at DESC)"
    )
    op.execute(
        "CREATE INDEX idx_user_notifications_unread ON comm.user_notifications(user_id) WHERE read_at IS NULL"
    )

    # Notification Preferences
    op.execute("""
        CREATE TABLE comm.notification_preferences (
          user_id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
          in_app_enabled  boolean NOT NULL DEFAULT true,
          email_enabled   boolean NOT NULL DEFAULT true,
          sms_enabled     boolean NOT NULL DEFAULT false,
          created_at      timestamptz NOT NULL DEFAULT now(),
          updated_at      timestamptz NOT NULL DEFAULT now()
        )
    """)

    op.execute("""
        CREATE TRIGGER trg_notification_preferences_updated_at
        BEFORE UPDATE ON comm.notification_preferences
        FOR EACH ROW EXECUTE FUNCTION common.set_updated_at()
    """)


def downgrade() -> None:
    """Drop communications domain tables."""
    op.execute("DROP TABLE IF EXISTS comm.notification_preferences CASCADE")
    op.execute("DROP TABLE IF EXISTS comm.user_notifications CASCADE")
    op.execute("DROP TABLE IF EXISTS comm.notifications CASCADE")
    op.execute("DROP TYPE IF EXISTS comm.notification_priority")
    op.execute("DROP TYPE IF EXISTS comm.notification_channel")
    op.execute("DROP TYPE IF EXISTS comm.notification_type")
