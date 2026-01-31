"""
UniFECAF Portal do Aluno - FastAPI Application
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers import auth_router, health_router, home_router

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
    description="API do Portal do Aluno da UniFECAF",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

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
app.include_router(auth_router)
app.include_router(home_router)


@app.get("/")
def root():
    """Root endpoint."""
    return {
        "message": "UniFECAF Portal do Aluno API",
        "docs": "/docs",
        "health": "/health",
    }
