"""
UniFECAF Portal do Aluno - Admin schemas (communications).
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AdminNotificationResponse(BaseModel):
    """Notification response with enriched statistics."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    type: str
    channel: str
    priority: str
    title: str | None = None
    body: str
    is_archived: bool = False
    delivered_count: int = 0
    read_count: int = 0
    created_at: datetime


class AdminNotificationCreateRequest(BaseModel):
    """Create notification request."""

    type: str = Field("ADMIN", description="ACADEMIC | FINANCIAL | ADMIN")
    channel: str = Field("IN_APP", description="IN_APP | EMAIL | SMS")
    priority: str = Field("NORMAL", description="LOW | NORMAL | HIGH")
    title: str | None = Field(None, max_length=150)
    body: str = Field(..., min_length=1)


class AdminNotificationUpdateRequest(BaseModel):
    """Update notification request."""

    type: str | None = None
    channel: str | None = None
    priority: str | None = None
    title: str | None = Field(None, max_length=150)
    body: str | None = None
    is_archived: bool | None = None


class DeliverNotificationRequest(BaseModel):
    """Request to deliver notification to users."""

    all_students: bool = False
    user_ids: list[UUID] = Field(default_factory=list)


class DeliverNotificationResponse(BaseModel):
    """Response from delivery operation."""

    notification_id: UUID
    delivered: int = Field(..., ge=0)
    skipped_existing: int = Field(..., ge=0)


class AdminUserNotificationResponse(BaseModel):
    """User notification delivery record."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    user_name: str | None = None  # Enriched from user
    user_email: str | None = None  # Enriched from user
    notification_id: UUID
    notification_title: str | None = None  # Enriched from notification
    delivered_at: datetime
    read_at: datetime | None = None
    archived_at: datetime | None = None
    action_url: str | None = None
    action_label: str | None = None


class AdminNotificationPreferencesResponse(BaseModel):
    """User notification preferences."""

    model_config = ConfigDict(from_attributes=True)

    user_id: UUID
    user_name: str | None = None  # Enriched
    user_email: str | None = None  # Enriched
    in_app_enabled: bool
    email_enabled: bool
    sms_enabled: bool
    created_at: datetime
    updated_at: datetime


class AdminNotificationPreferencesUpdateRequest(BaseModel):
    """Update user notification preferences."""

    in_app_enabled: bool | None = None
    email_enabled: bool | None = None
    sms_enabled: bool | None = None


# Statistics responses
class AdminNotificationStatsResponse(BaseModel):
    """Statistics for notifications module."""

    total_notifications: int
    active_notifications: int
    archived_notifications: int
    total_deliveries: int
    total_reads: int
    read_rate: float  # percentage
    by_type: dict[str, int]
    by_channel: dict[str, int]
    by_priority: dict[str, int]
