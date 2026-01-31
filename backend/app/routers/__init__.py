"""
UniFECAF Portal do Aluno - Routers
"""

from app.routers.health import router as health_router
from app.routers.auth import router as auth_router
from app.routers.home import router as home_router

__all__ = ["health_router", "auth_router", "home_router"]
