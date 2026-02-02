"""
UniFECAF Portal do Aluno - Admin schemas (audit).
"""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AdminAuditLogResponse(BaseModel):
    """Audit log response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    actor_user_id: UUID | None = None
    actor_email: str | None = None  # Enriched field
    action: str
    entity_type: str | None = None
    entity_id: UUID | None = None
    ip: str | None = None
    user_agent: str | None = None
    data: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class AdminAuditStatsResponse(BaseModel):
    """Audit statistics for a single action."""

    action: str
    count: int


class AdminAuditActorStatsResponse(BaseModel):
    """Audit statistics for a single actor."""

    user_id: str
    email: str
    count: int


class AdminAuditSummaryResponse(BaseModel):
    """Audit summary statistics."""

    period_days: int
    total_logs: int
    unique_actions: int
    unique_actors: int
    login_failures: int
    top_actions: list[dict[str, Any]]
    top_actors: list[dict[str, Any]]
