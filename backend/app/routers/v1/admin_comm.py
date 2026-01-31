"""
UniFECAF Portal do Aluno - API v1 Admin Communications Router.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
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
    AdminNotificationUpdateRequest,
    AdminUserNotificationResponse,
    DeliverNotificationRequest,
    DeliverNotificationResponse,
)
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/api/v1/admin", tags=["Admin - Comm"])


@router.get(
    "/notifications",
    response_model=PaginatedResponse[AdminNotificationResponse],
    summary="Listar notificações",
)
def list_notifications(
    _: AdminUser,
    db: Session = Depends(get_db),
    pagination: dict[str, int] = Depends(pagination_params),
) -> PaginatedResponse[AdminNotificationResponse]:
    stmt = select(Notification).order_by(Notification.created_at.desc())
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

    return DeliverNotificationResponse(
        notification_id=notif.id, delivered=delivered, skipped_existing=skipped
    )


@router.get(
    "/user-notifications",
    response_model=PaginatedResponse[AdminUserNotificationResponse],
    summary="Listar entregas (user_notifications)",
)
def list_user_notifications(
    _: AdminUser,
    db: Session = Depends(get_db),
    pagination: dict[str, int] = Depends(pagination_params),
    user_id: UUID | None = Query(None),
    unread_only: bool = Query(False),
) -> PaginatedResponse[AdminUserNotificationResponse]:
    stmt = (
        select(UserNotification)
        .options(joinedload(UserNotification.notification))
        .order_by(UserNotification.delivered_at.desc())
    )
    if user_id:
        stmt = stmt.where(UserNotification.user_id == user_id)
    if unread_only:
        stmt = stmt.where(UserNotification.read_at.is_(None))

    items, total = paginate_stmt(db, stmt, limit=pagination["limit"], offset=pagination["offset"])
    return PaginatedResponse[AdminUserNotificationResponse](
        items=[AdminUserNotificationResponse.model_validate(un) for un in items],
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
    return AdminNotificationPreferencesResponse.model_validate(pref)


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
    return AdminNotificationPreferencesResponse.model_validate(pref)
