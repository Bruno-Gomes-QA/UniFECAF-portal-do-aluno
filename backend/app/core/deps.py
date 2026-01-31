"""
UniFECAF Portal do Aluno - FastAPI dependencies (auth, RBAC, pagination).
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime
from typing import Annotated

from fastapi import Cookie, Depends, Query, Request
from sqlalchemy.orm import Session
from starlette import status

from app.core.config import get_settings
from app.core.database import get_db
from app.core.errors import raise_api_error
from app.core.security import TokenPayload, verify_access_token
from app.models.auth import JwtSession
from app.models.user import User, UserRole, UserStatus

settings = get_settings()

DbSession = Annotated[Session, Depends(get_db)]


def _now_utc() -> datetime:
    return datetime.now(UTC)


def get_current_user(
    request: Request,
    db: DbSession,
    access_token: Annotated[str | None, Cookie(alias=settings.cookie_name)] = None,
) -> User:
    if not access_token:
        raise_api_error(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="AUTH_NOT_AUTHENTICATED",
            message="Não autenticado.",
        )

    payload: TokenPayload | None = verify_access_token(access_token)
    if payload is None:
        raise_api_error(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="AUTH_INVALID_TOKEN",
            message="Token inválido ou expirado.",
        )

    user: User | None = db.query(User).filter(User.id == payload.sub).first()
    if not user:
        raise_api_error(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="AUTH_USER_NOT_FOUND",
            message="Usuário não encontrado.",
        )

    if user.status != UserStatus.ACTIVE:
        raise_api_error(
            status_code=status.HTTP_403_FORBIDDEN,
            code="AUTH_USER_INACTIVE",
            message="Usuário inativo.",
        )

    session: JwtSession | None = db.query(JwtSession).filter(JwtSession.jti == payload.jti).first()
    if not session or session.user_id != user.id:
        raise_api_error(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="AUTH_SESSION_NOT_FOUND",
            message="Sessão inválida.",
        )

    if session.revoked_at is not None:
        raise_api_error(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="AUTH_SESSION_REVOKED",
            message="Sessão revogada.",
        )

    if session.expires_at <= _now_utc():
        raise_api_error(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="AUTH_SESSION_EXPIRED",
            message="Sessão expirada.",
        )

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_role(role: UserRole) -> Callable[[CurrentUser], User]:
    def _dep(current_user: CurrentUser) -> User:
        if current_user.role != role:
            raise_api_error(
                status_code=status.HTTP_403_FORBIDDEN,
                code="AUTH_FORBIDDEN",
                message="Acesso negado.",
                details={"required_role": role.value},
            )
        return current_user

    return _dep


AdminUser = Annotated[User, Depends(require_role(UserRole.ADMIN))]


def pagination_params(
    limit: Annotated[int, Query(ge=1, le=100, description="Número máximo de itens.")] = 20,
    offset: Annotated[int, Query(ge=0, description="Offset para paginação.")] = 0,
) -> dict[str, int]:
    return {"limit": limit, "offset": offset}
