"""
UniFECAF Portal do Aluno - Core module
"""

from app.core.config import Settings, get_settings
from app.core.database import Base, DbSession, get_db
from app.core.security import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)

__all__ = [
    "Settings",
    "get_settings",
    "Base",
    "DbSession",
    "get_db",
    "create_access_token",
    "decode_access_token",
    "get_password_hash",
    "verify_password",
]
