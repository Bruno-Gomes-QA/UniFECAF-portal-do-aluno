"""
UniFECAF Portal do Aluno - API v1 routers.
"""

from app.routers.v1.admin_academics import router as admin_academics_router
from app.routers.v1.admin_audit import router as admin_audit_router
from app.routers.v1.admin_comm import router as admin_comm_router
from app.routers.v1.admin_dashboard import router as admin_dashboard_router
from app.routers.v1.admin_documents import router as admin_documents_router
from app.routers.v1.admin_finance import router as admin_finance_router
from app.routers.v1.admin_users import router as admin_users_router
from app.routers.v1.auth import router as auth_router
from app.routers.v1.me import router as me_router

__all__ = [
    "auth_router",
    "me_router",
    "admin_users_router",
    "admin_academics_router",
    "admin_finance_router",
    "admin_comm_router",
    "admin_documents_router",
    "admin_audit_router",
    "admin_dashboard_router",
]
