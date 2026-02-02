"""
UniFECAF Portal do Aluno - FastAPI Application
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import get_settings
from app.core.errors import (
    ApiException,
    api_exception_handler,
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.routers import health_router
from app.routers.v1 import (
    admin_academics_router,
    admin_audit_router,
    admin_comm_router,
    admin_dashboard_router,
    admin_documents_router,
    admin_finance_router,
    admin_users_router,
    me_router,
)
from app.routers.v1 import (
    auth_router as v1_auth_router,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    logger.info("Starting UniFECAF Portal do Aluno API...")
    logger.info(f"CORS origins: {settings.cors_origins_list}")
    yield
    logger.info("Shutting down UniFECAF Portal do Aluno API...")


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    description=(
        "API do Portal do Aluno da UniFECAF (FastAPI + PostgreSQL).\n\n"
        "Auth: JWT access-only em cookie httpOnly (`access_token`) + allowlist de sessões (`jti`).\n"
        'Erros: sempre no envelope `{ "error": { "code": "...", "message": "...", "details": {} } }`.'
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
    openapi_tags=[
        {"name": "Health", "description": "Healthcheck e status do backend."},
        {
            "name": "Auth",
            "description": "Autenticação via cookie httpOnly (JWT + allowlist por jti).",
        },
        {"name": "Me", "description": "Portal do aluno (/me)."},
        {"name": "Admin - Users", "description": "Administração de usuários."},
        {
            "name": "Admin - Academics",
            "description": "Administração acadêmica (termos, cursos, disciplinas, turmas, etc).",
        },
        {"name": "Admin - Finance", "description": "Administração financeira (invoices/payments)."},
        {"name": "Admin - Comm", "description": "Notificações e preferências."},
        {"name": "Admin - Documents", "description": "Documentos de alunos."},
        {"name": "Admin - Audit", "description": "Logs de auditoria do sistema."},
    ],
)

# Exception handlers (error envelope)
app.add_exception_handler(ApiException, api_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health_router)
app.include_router(v1_auth_router)
app.include_router(me_router)
app.include_router(admin_users_router)
app.include_router(admin_academics_router)
app.include_router(admin_finance_router)
app.include_router(admin_comm_router)
app.include_router(admin_documents_router)
app.include_router(admin_audit_router)
app.include_router(admin_dashboard_router)


@app.get("/")
def root():
    """Root endpoint."""
    return {
        "message": "UniFECAF Portal do Aluno API",
        "docs": "/docs",
        "health": "/health",
    }
