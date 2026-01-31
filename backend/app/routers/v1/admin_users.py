"""
UniFECAF Portal do Aluno - API v1 Admin Users Router.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from starlette import status

from app.core.database import get_db
from app.core.deps import AdminUser, pagination_params
from app.core.errors import raise_api_error
from app.core.security import get_password_hash
from app.db.utils import apply_update, get_or_404, paginate_stmt
from app.models.user import User, UserRole, UserStatus
from app.schemas.admin_users import (
    AdminUserCreateRequest,
    AdminUserResponse,
    AdminUserUpdateRequest,
)
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/api/v1/admin/users", tags=["Admin - Users"])


def _parse_role(value: str) -> UserRole:
    try:
        return UserRole(value)
    except ValueError:
        raise_api_error(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="VALIDATION_ERROR",
            message="Role inválida.",
            details={"allowed": [r.value for r in UserRole]},
        )


def _parse_status(value: str) -> UserStatus:
    try:
        return UserStatus(value)
    except ValueError:
        raise_api_error(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="VALIDATION_ERROR",
            message="Status inválido.",
            details={"allowed": [s.value for s in UserStatus]},
        )


@router.get("", response_model=PaginatedResponse[AdminUserResponse], summary="Listar usuários")
def list_users(
    _: AdminUser,
    db: Session = Depends(get_db),
    pagination: dict[str, int] = Depends(pagination_params),
    email: str | None = Query(None, description="Filtro por email (contém)."),
    role: UserRole | None = Query(None),
    status_filter: UserStatus | None = Query(None, alias="status"),
) -> PaginatedResponse[AdminUserResponse]:
    stmt = select(User).order_by(User.created_at.desc())
    if email:
        stmt = stmt.where(User.email.ilike(f"%{email}%"))
    if role:
        stmt = stmt.where(User.role == role)
    if status_filter:
        stmt = stmt.where(User.status == status_filter)

    items, total = paginate_stmt(db, stmt, limit=pagination["limit"], offset=pagination["offset"])
    return PaginatedResponse[AdminUserResponse](
        items=[AdminUserResponse.model_validate(u) for u in items],
        limit=pagination["limit"],
        offset=pagination["offset"],
        total=total,
    )


@router.post(
    "",
    response_model=AdminUserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar usuário",
)
def create_user(
    _: AdminUser,
    payload: AdminUserCreateRequest,
    db: Session = Depends(get_db),
) -> AdminUserResponse:
    user = User(
        email=str(payload.email),
        password_hash=get_password_hash(payload.password),
        role=_parse_role(payload.role),
        status=_parse_status(payload.status),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise_api_error(
            status_code=status.HTTP_409_CONFLICT,
            code="USER_EMAIL_CONFLICT",
            message="Email já cadastrado.",
        )

    db.refresh(user)
    return AdminUserResponse.model_validate(user)


@router.get("/{user_id}", response_model=AdminUserResponse, summary="Detalhar usuário")
def get_user(user_id: UUID, _: AdminUser, db: Session = Depends(get_db)) -> AdminUserResponse:
    user = get_or_404(db, User, user_id, message="Usuário não encontrado.")
    return AdminUserResponse.model_validate(user)


@router.patch("/{user_id}", response_model=AdminUserResponse, summary="Atualizar usuário (patch)")
def patch_user(
    user_id: UUID,
    payload: AdminUserUpdateRequest,
    _: AdminUser,
    db: Session = Depends(get_db),
) -> AdminUserResponse:
    user = get_or_404(db, User, user_id, message="Usuário não encontrado.")

    data = payload.model_dump(exclude_unset=True)
    if "password" in data and data["password"]:
        data["password_hash"] = get_password_hash(data.pop("password"))
    if "role" in data and data["role"]:
        data["role"] = _parse_role(data["role"])
    if "status" in data and data["status"]:
        data["status"] = _parse_status(data["status"])

    apply_update(user, data)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise_api_error(
            status_code=status.HTTP_409_CONFLICT,
            code="USER_EMAIL_CONFLICT",
            message="Email já cadastrado.",
        )

    db.refresh(user)
    return AdminUserResponse.model_validate(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remover usuário")
def delete_user(user_id: UUID, _: AdminUser, db: Session = Depends(get_db)) -> None:
    user = get_or_404(db, User, user_id, message="Usuário não encontrado.")
    db.delete(user)
    db.commit()
