"""
UniFECAF Portal do Aluno - Core module
"""

from app.core.config import Settings, get_settings
from app.core.database import Base, DbSession, get_db
from app.core.deps import AdminUser, CurrentUser, pagination_params
from app.core.errors import (
    ApiErrorDetail,
    ApiErrorEnvelope,
    ApiException,
    raise_api_error,
)
from app.core.security import (
    TokenPayload,
    create_access_token,
    get_password_hash,
    verify_access_token,
    verify_password,
)

__all__ = [
    "Settings",
    "get_settings",
    "Base",
    "DbSession",
    "get_db",
    "CurrentUser",
    "AdminUser",
    "pagination_params",
    "create_access_token",
    "verify_access_token",
    "TokenPayload",
    "get_password_hash",
    "verify_password",
    "ApiException",
    "ApiErrorEnvelope",
    "ApiErrorDetail",
    "raise_api_error",
]
