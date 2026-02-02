"""
UniFECAF Portal do Aluno - API v1 Admin Audit Router.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import Text, func, select
from sqlalchemy.orm import Session
from starlette import status

from app.core.database import get_db
from app.core.deps import AdminUser, pagination_params
from app.core.errors import raise_api_error
from app.db.utils import paginate_stmt
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.admin_audit import (
    AdminAuditLogResponse,
    AdminAuditSummaryResponse,
)
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/api/v1/admin", tags=["Admin - Audit"])


def _create_audit_meta_log(
    db: Session, admin: User, action: str, request: Request, data: dict | None = None
) -> None:
    """Create meta-audit log for audit access."""
    log = AuditLog(
        actor_user_id=admin.id,
        action=action,
        entity_type="AuditLog",
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        data=data or {},
    )
    db.add(log)
    db.commit()


@router.get(
    "/audit-logs",
    response_model=PaginatedResponse[AdminAuditLogResponse],
    summary="Listar logs de auditoria",
)
def list_audit_logs(
    admin: AdminUser,
    request: Request,
    db: Session = Depends(get_db),
    pagination: dict[str, int] = Depends(pagination_params),
    actor_user_id: UUID | None = Query(None, description="Filtrar por ator"),
    action: str | None = Query(None, description="Filtrar por ação"),
    entity_type: str | None = Query(None, description="Filtrar por tipo de entidade"),
    entity_id: UUID | None = Query(None, description="Filtrar por ID de entidade"),
    ip: str | None = Query(None, description="Filtrar por IP"),
    date_from: datetime | None = Query(None, description="Data inicial"),
    date_to: datetime | None = Query(None, description="Data final"),
    search: str | None = Query(None, description="Busca textual no campo data"),
) -> PaginatedResponse[AdminAuditLogResponse]:
    """
    Lista logs de auditoria com filtros avançados.

    Acesso restrito a administradores.
    """
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc())

    # Apply filters
    if actor_user_id:
        stmt = stmt.where(AuditLog.actor_user_id == actor_user_id)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
    if entity_id:
        stmt = stmt.where(AuditLog.entity_id == entity_id)
    if ip:
        stmt = stmt.where(AuditLog.ip == ip)
    if date_from:
        stmt = stmt.where(AuditLog.created_at >= date_from)
    if date_to:
        stmt = stmt.where(AuditLog.created_at <= date_to)
    if search:
        # JSONB text search - convert to text for ILIKE search
        stmt = stmt.where(AuditLog.data.cast(Text).ilike(f"%{search}%"))

    items, total = paginate_stmt(db, stmt, limit=pagination["limit"], offset=pagination["offset"])

    # Enrich with actor email
    actor_ids = {log.actor_user_id for log in items if log.actor_user_id}
    actors = {}
    if actor_ids:
        actor_users = db.query(User.id, User.email).filter(User.id.in_(actor_ids)).all()
        actors = {u.id: u.email for u in actor_users}

    response_items = []
    for log in items:
        item = AdminAuditLogResponse.model_validate(log)
        item.actor_email = actors.get(log.actor_user_id) if log.actor_user_id else None
        response_items.append(item)

    # Meta-audit: log that admin viewed audit logs
    _create_audit_meta_log(
        db, admin, "AUDIT_LOG_VIEWED", request,
        {"filters": {"actor_user_id": str(actor_user_id) if actor_user_id else None,
                     "action": action, "entity_type": entity_type}}
    )

    return PaginatedResponse[AdminAuditLogResponse](
        items=response_items,
        limit=pagination["limit"],
        offset=pagination["offset"],
        total=total,
    )


@router.get(
    "/audit-logs/actions",
    response_model=list[str],
    summary="Listar ações disponíveis",
)
def list_audit_actions(
    admin: AdminUser,  # noqa: ARG001
    db: Session = Depends(get_db),
) -> list[str]:
    """Retorna lista de ações distintas registradas."""
    actions = db.query(func.distinct(AuditLog.action)).order_by(AuditLog.action).all()
    return [a[0] for a in actions]


@router.get(
    "/audit-logs/entity-types",
    response_model=list[str],
    summary="Listar tipos de entidade",
)
def list_entity_types(
    admin: AdminUser,  # noqa: ARG001
    db: Session = Depends(get_db),
) -> list[str]:
    """Retorna lista de tipos de entidade distintos."""
    types = (
        db.query(func.distinct(AuditLog.entity_type))
        .filter(AuditLog.entity_type.isnot(None))
        .order_by(AuditLog.entity_type)
        .all()
    )
    return [t[0] for t in types]


@router.get(
    "/audit-logs/stats/summary",
    response_model=AdminAuditSummaryResponse,
    summary="Estatísticas resumidas de auditoria",
)
def get_audit_stats(
    admin: AdminUser,
    db: Session = Depends(get_db),
    period_days: int = Query(30, ge=1, le=90, description="Dias para análise"),
) -> AdminAuditSummaryResponse:
    """Retorna estatísticas resumidas dos últimos N dias."""
    from datetime import timedelta

    cutoff = datetime.utcnow() - timedelta(days=period_days)

    # Total logs in period
    total = db.query(func.count(AuditLog.id)).filter(
        AuditLog.created_at >= cutoff
    ).scalar() or 0

    # Unique actions
    unique_actions = db.query(func.count(func.distinct(AuditLog.action))).filter(
        AuditLog.created_at >= cutoff
    ).scalar() or 0

    # Unique actors
    unique_actors = db.query(func.count(func.distinct(AuditLog.actor_user_id))).filter(
        AuditLog.created_at >= cutoff,
        AuditLog.actor_user_id.isnot(None)
    ).scalar() or 0

    # Login failures
    login_failures = db.query(func.count(AuditLog.id)).filter(
        AuditLog.created_at >= cutoff,
        AuditLog.action == "USER_LOGIN_FAILED"
    ).scalar() or 0

    # Top actions
    top_actions_query = (
        db.query(AuditLog.action, func.count(AuditLog.id).label("count"))
        .filter(AuditLog.created_at >= cutoff)
        .group_by(AuditLog.action)
        .order_by(func.count(AuditLog.id).desc())
        .limit(10)
        .all()
    )
    top_actions = [{"action": a.action, "count": a.count} for a in top_actions_query]

    # Top actors
    top_actors_query = (
        db.query(AuditLog.actor_user_id, func.count(AuditLog.id).label("count"))
        .filter(AuditLog.created_at >= cutoff, AuditLog.actor_user_id.isnot(None))
        .group_by(AuditLog.actor_user_id)
        .order_by(func.count(AuditLog.id).desc())
        .limit(10)
        .all()
    )

    # Get actor emails
    actor_ids = [a.actor_user_id for a in top_actors_query]
    actors = {}
    if actor_ids:
        actor_users = db.query(User.id, User.email).filter(User.id.in_(actor_ids)).all()
        actors = {u.id: u.email for u in actor_users}

    top_actors = [
        {"user_id": str(a.actor_user_id), "email": actors.get(a.actor_user_id, "Unknown"), "count": a.count}
        for a in top_actors_query
    ]

    # Unique actions count
    unique_actions = db.query(func.count(func.distinct(AuditLog.action))).filter(
        AuditLog.created_at >= cutoff
    ).scalar() or 0

    # Unique actors count
    unique_actors = db.query(func.count(func.distinct(AuditLog.actor_user_id))).filter(
        AuditLog.created_at >= cutoff,
        AuditLog.actor_user_id.isnot(None)
    ).scalar() or 0

    # Login failures (security metric)
    login_failures = db.query(func.count(AuditLog.id)).filter(
        AuditLog.created_at >= cutoff,
        AuditLog.action == "USER_LOGIN_FAILED"
    ).scalar() or 0

    return AdminAuditSummaryResponse(
        period_days=period_days,
        total_logs=total,
        unique_actions=unique_actions,
        unique_actors=unique_actors,
        login_failures=login_failures,
        top_actions=top_actions,
        top_actors=top_actors,
    )


@router.get(
    "/audit-logs/{log_id}",
    response_model=AdminAuditLogResponse,
    summary="Detalhar log de auditoria",
)
def get_audit_log(
    log_id: int,
    admin: AdminUser,
    request: Request,
    db: Session = Depends(get_db),
) -> AdminAuditLogResponse:
    """Retorna detalhes de um log específico."""
    log = db.query(AuditLog).filter(AuditLog.id == log_id).first()
    if not log:
        raise_api_error(
            status_code=status.HTTP_404_NOT_FOUND,
            code="AUDIT_LOG_NOT_FOUND",
            message="Registro de auditoria não encontrado.",
        )

    # Get actor email
    actor_email = None
    if log.actor_user_id:
        actor = db.query(User.email).filter(User.id == log.actor_user_id).first()
        actor_email = actor.email if actor else None

    response = AdminAuditLogResponse.model_validate(log)
    response.actor_email = actor_email

    return response

