"""
UniFECAF Portal do Aluno - Admin schemas (communications).
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AdminNotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    type: str
    channel: str
    priority: str
    title: str | None = None
    body: str
    created_at: datetime


class AdminNotificationCreateRequest(BaseModel):
    type: str = Field("ADMIN", description="ACADEMIC | FINANCIAL | ADMIN")
    channel: str = Field("IN_APP", description="IN_APP | EMAIL | SMS")
    priority: str = Field("NORMAL", description="LOW | NORMAL | HIGH")
    title: str | None = None
    body: str


class AdminNotificationUpdateRequest(BaseModel):
    type: str | None = None
    channel: str | None = None
    priority: str | None = None
    title: str | None = None
    body: str | None = None


class DeliverNotificationRequest(BaseModel):
    all_students: bool = False
    user_ids: list[UUID] = Field(default_factory=list)


class DeliverNotificationResponse(BaseModel):
    notification_id: UUID
    delivered: int = Field(..., ge=0)
    skipped_existing: int = Field(..., ge=0)


class AdminUserNotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    notification_id: UUID
    delivered_at: datetime
    read_at: datetime | None = None
    archived_at: datetime | None = None


class AdminNotificationPreferencesResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: UUID
    in_app_enabled: bool
    email_enabled: bool
    sms_enabled: bool
    created_at: datetime
    updated_at: datetime


class AdminNotificationPreferencesUpdateRequest(BaseModel):
    in_app_enabled: bool | None = None
    email_enabled: bool | None = None
    sms_enabled: bool | None = None
