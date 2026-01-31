"""
UniFECAF Portal do Aluno - Notification Models
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class NotificationType(str, enum.Enum):
    """Notification type."""

    ACADEMIC = "ACADEMIC"
    FINANCIAL = "FINANCIAL"
    ADMIN = "ADMIN"


class NotificationChannel(str, enum.Enum):
    """Notification channel."""

    IN_APP = "IN_APP"
    EMAIL = "EMAIL"
    SMS = "SMS"


class NotificationPriority(str, enum.Enum):
    """Notification priority."""

    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"


class Notification(Base):
    """Notification model."""

    __tablename__ = "notifications"
    __table_args__ = {"schema": "comm"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType, name="notification_type", schema="comm"),
        nullable=False,
        default=NotificationType.ADMIN,
    )
    channel: Mapped[NotificationChannel] = mapped_column(
        Enum(NotificationChannel, name="notification_channel", schema="comm"),
        nullable=False,
        default=NotificationChannel.IN_APP,
    )
    priority: Mapped[NotificationPriority] = mapped_column(
        Enum(NotificationPriority, name="notification_priority", schema="comm"),
        nullable=False,
        default=NotificationPriority.NORMAL,
    )
    title: Mapped[str | None] = mapped_column(String, nullable=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    user_notifications: Mapped[list["UserNotification"]] = relationship(
        "UserNotification", back_populates="notification"
    )


class UserNotification(Base):
    """User notification delivery record."""

    __tablename__ = "user_notifications"
    __table_args__ = (
        UniqueConstraint("user_id", "notification_id", name="uq_user_notifications_user_notif"),
        {"schema": "comm"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="CASCADE"),
        nullable=False,
    )
    notification_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("comm.notifications.id", ondelete="CASCADE"),
        nullable=False,
    )
    delivered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    extra_data: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="notifications")  # noqa: F821
    notification: Mapped[Notification] = relationship(
        "Notification", back_populates="user_notifications"
    )


class NotificationPreference(Base):
    """User notification preferences."""

    __tablename__ = "notification_preferences"
    __table_args__ = {"schema": "comm"}

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    in_app_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    email_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    sms_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
