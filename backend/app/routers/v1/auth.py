"""
UniFECAF Portal do Aluno - API v1 Auth Router.
"""

from __future__ import annotations

import ipaddress
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session
from starlette import status

from app.core.config import get_settings
from app.core.database import get_db
from app.core.deps import CurrentUser
from app.core.errors import raise_api_error
from app.core.security import create_access_token, verify_access_token, verify_password
from app.models.auth import JwtSession
from app.models.user import User, UserStatus
from app.schemas.auth import AuthMeResponse, LoginRequest

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])
settings = get_settings()


def _safe_client_ip(request: Request) -> str | None:
    host = request.client.host if request.client else None
    if not host:
        return None
    try:
        ipaddress.ip_address(host)
    except ValueError:
        return None
    return host


@router.post(
    "/login",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Login (cookie httpOnly)",
    description="Autentica usuário e seta cookie `access_token` (httpOnly) com JWT + `jti` allowlisted.",
)
def login(
    payload: LoginRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
) -> None:
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise_api_error(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="AUTH_INVALID_CREDENTIALS",
            message="Credenciais inválidas.",
        )

    # RN-U-030: Usuário SUSPENDED não pode fazer login
    if user.status == UserStatus.SUSPENDED:
        raise_api_error(
            status_code=status.HTTP_403_FORBIDDEN,
            code="USER_SUSPENDED",
            message="Sua conta está suspensa. Entre em contato com a secretaria.",
        )

    # RN-U-031: INVITED pode logar - ativa automaticamente no primeiro login
    now = datetime.now(UTC)
    if user.status == UserStatus.INVITED:
        user.status = UserStatus.ACTIVE

    # RN-U-033: Atualiza last_login_at
    user.last_login_at = now
    db.commit()

    expires_at = now + timedelta(minutes=settings.jwt_expires_minutes)
    session = JwtSession(
        jti=uuid.uuid4(),
        user_id=user.id,
        expires_at=expires_at,
        ip=_safe_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    db.add(session)
    db.commit()

    token = create_access_token(sub=user.id, jti=session.jti)

    response.set_cookie(
        key=settings.cookie_name,
        value=token,
        max_age=settings.jwt_expires_minutes * 60,
        httponly=True,
        samesite=settings.cookie_samesite,
        secure=settings.cookie_secure,
        path="/",
    )


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Logout (revoga sessão)",
    description="Revoga `jti` em `auth.jwt_sessions` e remove cookie.",
)
def logout(
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
) -> None:
    token = request.cookies.get(settings.cookie_name)
    if token:
        payload = verify_access_token(token)
        if payload:
            session = db.query(JwtSession).filter(JwtSession.jti == payload.jti).first()
            if session and session.revoked_at is None:
                session.revoked_at = datetime.now(UTC)
                db.commit()

    response.delete_cookie(
        key=settings.cookie_name,
        path="/",
        httponly=True,
        samesite=settings.cookie_samesite,
    )


@router.get("/me", response_model=AuthMeResponse, summary="Usuário autenticado")
def me(current_user: CurrentUser) -> AuthMeResponse:
    return AuthMeResponse(
        id=current_user.id,
        email=current_user.email,
        role=current_user.role.value,
        status=current_user.status.value,
        last_login_at=current_user.last_login_at,
    )
