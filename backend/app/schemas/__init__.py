"""
UniFECAF Portal do Aluno - Pydantic Schemas
"""

from app.schemas.auth import AuthMeResponse, LoginRequest, LoginResponse

__all__ = [
    # Auth
    "LoginRequest",
    "LoginResponse",
    "AuthMeResponse",
]
