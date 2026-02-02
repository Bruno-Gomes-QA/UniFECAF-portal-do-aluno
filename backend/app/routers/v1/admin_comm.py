"""
UniFECAF Portal do Aluno - API v1 Admin Communications Router.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload
from starlette import status

from app.core.database import get_db
from app.core.deps import AdminUser, pagination_params
from app.core.errors import raise_api_error
from app.db.utils import apply_update, get_or_404, paginate_stmt
from app.models.notifications import (
    Notification,
    NotificationChannel,
    NotificationPreference,
    NotificationPriority,
    NotificationType,
    UserNotification,
)
from app.models.user import User, UserRole
from app.schemas.admin_comm import (
    AdminNotificationCreateRequest,
    AdminNotificationPreferencesResponse,
    AdminNotificationPreferencesUpdateRequest,
    AdminNotificationResponse,
    AdminNotificationStatsResponse,
    AdminNotificationUpdateRequest,
    AdminUserNotificationResponse,
    DeliverNotificationRequest,
    DeliverNotificationResponse,
)
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/api/v1/admin", tags=["Admin - Comm"])


# --- Statistics endpoint ---
@router.get(
    "/notifications/stats",
    response_model=AdminNotificationStatsResponse,
    summary="Estatísticas de notificações",
)
def get_notification_stats(
    _: AdminUser,
    db: Session = Depends(get_db),
) -> AdminNotificationStatsResponse:
    """Get notification statistics."""
    # Totals
    total = db.query(func.count(Notification.id)).scalar() or 0
    active = db.query(func.count(Notification.id)).filter(Notification.is_archived == False).scalar() or 0  # noqa: E712
    archived = db.query(func.count(Notification.id)).filter(Notification.is_archived == True).scalar() or 0  # noqa: E712

    # Deliveries and reads
    total_deliveries = db.query(func.sum(Notification.delivered_count)).scalar() or 0
    total_reads = db.query(func.sum(Notification.read_count)).scalar() or 0

    read_rate = (total_reads / total_deliveries * 100) if total_deliveries > 0 else 0.0

    # By type
    by_type_rows = (
        db.query(Notification.type, func.count(Notification.id))
        .group_by(Notification.type)
        .all()
    )
    by_type = {str(row[0].value): row[1] for row in by_type_rows}

    # By channel
    by_channel_rows = (
        db.query(Notification.channel, func.count(Notification.id))
        .group_by(Notification.channel)
        .all()
    )
    by_channel = {str(row[0].value): row[1] for row in by_channel_rows}

    # By priority
    by_priority_rows = (
        db.query(Notification.priority, func.count(Notification.id))
        .group_by(Notification.priority)
        .all()
    )
    by_priority = {str(row[0].value): row[1] for row in by_priority_rows}

    return AdminNotificationStatsResponse(
        total_notifications=total,
        active_notifications=active,
        archived_notifications=archived,
        total_deliveries=total_deliveries,
        total_reads=total_reads,
        read_rate=round(read_rate, 2),
        by_type=by_type,
        by_channel=by_channel,
        by_priority=by_priority,
    )


@router.get(
    "/notifications",
    response_model=PaginatedResponse[AdminNotificationResponse],
    summary="Listar notificações",
)
def list_notifications(
    _: AdminUser,
    db: Session = Depends(get_db),
    pagination: dict[str, int] = Depends(pagination_params),
    type: str | None = Query(None, description="Filtrar por tipo (ACADEMIC, FINANCIAL, ADMIN)"),
    channel: str | None = Query(None, description="Filtrar por canal (IN_APP, EMAIL, SMS)"),
    priority: str | None = Query(None, description="Filtrar por prioridade (LOW, NORMAL, HIGH)"),
    is_archived: bool | None = Query(None, description="Filtrar por arquivado"),
    search: str | None = Query(None, description="Busca em title e body"),
) -> PaginatedResponse[AdminNotificationResponse]:
    stmt = select(Notification).order_by(Notification.created_at.desc())

    # Apply filters
    if type:
        try:
            stmt = stmt.where(Notification.type == NotificationType(type))
        except ValueError:
            pass
    if channel:
        try:
            stmt = stmt.where(Notification.channel == NotificationChannel(channel))
        except ValueError:
            pass
    if priority:
        try:
            stmt = stmt.where(Notification.priority == NotificationPriority(priority))
        except ValueError:
            pass
    if is_archived is not None:
        stmt = stmt.where(Notification.is_archived == is_archived)
    if search:
        search_term = f"%{search}%"
        stmt = stmt.where(
            (Notification.title.ilike(search_term)) | (Notification.body.ilike(search_term))
        )

    items, total = paginate_stmt(db, stmt, limit=pagination["limit"], offset=pagination["offset"])
    return PaginatedResponse[AdminNotificationResponse](
        items=[AdminNotificationResponse.model_validate(n) for n in items],
        limit=pagination["limit"],
        offset=pagination["offset"],
        total=total,
    )


@router.post(
    "/notifications",
    response_model=AdminNotificationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar notificação",
)
def create_notification(
    _: AdminUser, payload: AdminNotificationCreateRequest, db: Session = Depends(get_db)
) -> AdminNotificationResponse:
    try:
        notif = Notification(
            type=NotificationType(payload.type),
            channel=NotificationChannel(payload.channel),
            priority=NotificationPriority(payload.priority),
            title=payload.title,
            body=payload.body,
        )
    except ValueError:
        raise_api_error(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="VALIDATION_ERROR",
            message="Campos inválidos.",
        )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return AdminNotificationResponse.model_validate(notif)


@router.get(
    "/notifications/{notification_id}",
    response_model=AdminNotificationResponse,
    summary="Detalhar notificação",
)
def get_notification(
    notification_id: UUID, _: AdminUser, db: Session = Depends(get_db)
) -> AdminNotificationResponse:
    notif = get_or_404(db, Notification, notification_id, message="Notificação não encontrada.")
    return AdminNotificationResponse.model_validate(notif)


@router.patch(
    "/notifications/{notification_id}",
    response_model=AdminNotificationResponse,
    summary="Atualizar notificação (patch)",
)
def patch_notification(
    notification_id: UUID,
    payload: AdminNotificationUpdateRequest,
    _: AdminUser,
    db: Session = Depends(get_db),
) -> AdminNotificationResponse:
    notif = get_or_404(db, Notification, notification_id, message="Notificação não encontrada.")
    data = payload.model_dump(exclude_unset=True)
    try:
        if "type" in data and data["type"]:
            data["type"] = NotificationType(data["type"])
        if "channel" in data and data["channel"]:
            data["channel"] = NotificationChannel(data["channel"])
        if "priority" in data and data["priority"]:
            data["priority"] = NotificationPriority(data["priority"])
    except ValueError:
        raise_api_error(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="VALIDATION_ERROR",
            message="Campos inválidos.",
        )
    apply_update(notif, data)
    db.commit()
    db.refresh(notif)
    return AdminNotificationResponse.model_validate(notif)


@router.post(
    "/notifications/{notification_id}/archive",
    response_model=AdminNotificationResponse,
    summary="Arquivar notificação",
)
def archive_notification(
    notification_id: UUID,
    _: AdminUser,
    db: Session = Depends(get_db),
) -> AdminNotificationResponse:
    """Archive a notification (soft delete)."""
    notif = get_or_404(db, Notification, notification_id, message="Notificação não encontrada.")
    notif.is_archived = True
    db.commit()
    db.refresh(notif)
    return AdminNotificationResponse.model_validate(notif)


@router.post(
    "/notifications/{notification_id}/unarchive",
    response_model=AdminNotificationResponse,
    summary="Desarquivar notificação",
)
def unarchive_notification(
    notification_id: UUID,
    _: AdminUser,
    db: Session = Depends(get_db),
) -> AdminNotificationResponse:
    """Unarchive a notification."""
    notif = get_or_404(db, Notification, notification_id, message="Notificação não encontrada.")
    notif.is_archived = False
    db.commit()
    db.refresh(notif)
    return AdminNotificationResponse.model_validate(notif)


@router.delete(
    "/notifications/{notification_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remover notificação",
)
def delete_notification(notification_id: UUID, _: AdminUser, db: Session = Depends(get_db)) -> None:
    notif = get_or_404(db, Notification, notification_id, message="Notificação não encontrada.")
    db.delete(notif)
    db.commit()


@router.post(
    "/notifications/{notification_id}/deliver",
    response_model=DeliverNotificationResponse,
    summary="Entregar notificação",
)
def deliver_notification(
    notification_id: UUID,
    payload: DeliverNotificationRequest,
    _: AdminUser,
    db: Session = Depends(get_db),
) -> DeliverNotificationResponse:
    notif = get_or_404(db, Notification, notification_id, message="Notificação não encontrada.")

    if payload.all_students:
        user_ids = [row[0] for row in db.query(User.id).filter(User.role == UserRole.STUDENT).all()]
    else:
        user_ids = payload.user_ids

    delivered = 0
    skipped = 0

    for uid in user_ids:
        un = UserNotification(user_id=uid, notification_id=notif.id)
        db.add(un)
        try:
            db.commit()
            delivered += 1
        except IntegrityError:
            db.rollback()
            skipped += 1

    # Update counters
    notif.delivered_count = (notif.delivered_count or 0) + delivered
    db.commit()

    return DeliverNotificationResponse(
        notification_id=notif.id, delivered=delivered, skipped_existing=skipped
    )


def _enrich_user_notification(un: UserNotification, db: Session) -> dict:
    """Enrich user notification with user and notification data."""
    data = {
        "id": un.id,
        "user_id": un.user_id,
        "notification_id": un.notification_id,
        "delivered_at": un.delivered_at,
        "read_at": un.read_at,
        "archived_at": un.archived_at,
        "action_url": un.action_url,
        "action_label": un.action_label,
    }

    # Enrich with user data
    user = db.query(User).filter(User.id == un.user_id).first()
    if user:
        data["user_email"] = user.email
        # Get student name from Student table
        from app.models.academics import Student
        student = db.query(Student).filter(Student.user_id == user.id).first()
        if student:
            data["user_name"] = student.full_name
        else:
            data["user_name"] = user.email.split('@')[0]  # Fallback to email prefix

    # Enrich with notification data
    if un.notification:
        data["notification_title"] = un.notification.title

    return data


@router.get(
    "/user-notifications",
    response_model=PaginatedResponse[AdminUserNotificationResponse],
    summary="Listar entregas (user_notifications)",
)
def list_user_notifications(
    _: AdminUser,
    db: Session = Depends(get_db),
    pagination: dict[str, int] = Depends(pagination_params),
    user_id: UUID | None = Query(None, description="Filtrar por usuário"),
    notification_id: UUID | None = Query(None, description="Filtrar por notificação"),
    unread_only: bool = Query(False, description="Apenas não lidas"),
    search: str | None = Query(None, description="Busca por nome ou email do usuário"),
) -> PaginatedResponse[AdminUserNotificationResponse]:
    stmt = (
        select(UserNotification)
        .options(joinedload(UserNotification.notification))
        .order_by(UserNotification.delivered_at.desc())
    )

    if user_id:
        stmt = stmt.where(UserNotification.user_id == user_id)
    if notification_id:
        stmt = stmt.where(UserNotification.notification_id == notification_id)
    if unread_only:
        stmt = stmt.where(UserNotification.read_at.is_(None))

    # Search by user name or email
    if search:
        user_ids = [
            row[0] for row in db.query(User.id)
            .filter((User.name.ilike(f"%{search}%")) | (User.email.ilike(f"%{search}%")))
            .all()
        ]
        if user_ids:
            stmt = stmt.where(UserNotification.user_id.in_(user_ids))
        else:
            # No users match, return empty
            return PaginatedResponse[AdminUserNotificationResponse](
                items=[],
                limit=pagination["limit"],
                offset=pagination["offset"],
                total=0,
            )

    items, total = paginate_stmt(db, stmt, limit=pagination["limit"], offset=pagination["offset"])

    # Enrich each item
    enriched_items = [
        AdminUserNotificationResponse(**_enrich_user_notification(un, db))
        for un in items
    ]

    return PaginatedResponse[AdminUserNotificationResponse](
        items=enriched_items,
        limit=pagination["limit"],
        offset=pagination["offset"],
        total=total,
    )


@router.get(
    "/users/{user_id}/notification-preferences",
    response_model=AdminNotificationPreferencesResponse,
    summary="Preferências de notificação (get)",
)
def get_preferences(
    user_id: UUID, _: AdminUser, db: Session = Depends(get_db)
) -> AdminNotificationPreferencesResponse:
    pref = (
        db.query(NotificationPreference).filter(NotificationPreference.user_id == user_id).first()
    )
    if not pref:
        pref = NotificationPreference(user_id=user_id)
        db.add(pref)
        db.commit()
        db.refresh(pref)

    # Enrich with user data
    user = db.query(User).filter(User.id == user_id).first()
    data = {
        "user_id": pref.user_id,
        "in_app_enabled": pref.in_app_enabled,
        "email_enabled": pref.email_enabled,
        "sms_enabled": pref.sms_enabled,
        "created_at": pref.created_at,
        "updated_at": pref.updated_at,
    }
    if user:
        data["user_name"] = user.name
        data["user_email"] = user.email

    return AdminNotificationPreferencesResponse.model_validate(data)


@router.patch(
    "/users/{user_id}/notification-preferences",
    response_model=AdminNotificationPreferencesResponse,
    summary="Preferências de notificação (patch)",
)
def patch_preferences(
    user_id: UUID,
    payload: AdminNotificationPreferencesUpdateRequest,
    _: AdminUser,
    db: Session = Depends(get_db),
) -> AdminNotificationPreferencesResponse:
    pref = (
        db.query(NotificationPreference).filter(NotificationPreference.user_id == user_id).first()
    )
    if not pref:
        pref = NotificationPreference(user_id=user_id)
        db.add(pref)
        db.flush()
    apply_update(pref, payload.model_dump(exclude_unset=True))
    db.commit()
    db.refresh(pref)

    # Enrich with user data
    user = db.query(User).filter(User.id == user_id).first()
    data = {
        "user_id": pref.user_id,
        "in_app_enabled": pref.in_app_enabled,
        "email_enabled": pref.email_enabled,
        "sms_enabled": pref.sms_enabled,
        "created_at": pref.created_at,
        "updated_at": pref.updated_at,
    }
    if user:
        data["user_name"] = user.name
        data["user_email"] = user.email

    return AdminNotificationPreferencesResponse.model_validate(data)
