"""
UniFECAF Portal do Aluno - Health Check Router
"""

import logging

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db

router = APIRouter(tags=["Health"])
logger = logging.getLogger(__name__)


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    database: str
    message: str


@router.get("/health", response_model=HealthResponse)
def health_check(db: Session = Depends(get_db)) -> HealthResponse:
    """
    Health check endpoint.

    Verifies that the API is running and can connect to the database.
    """
    try:
        # Test database connection
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        logger.exception("Database healthcheck failed")
        db_status = "error"

    return HealthResponse(
        status="ok" if db_status == "connected" else "degraded",
        database=db_status,
        message="UniFECAF Portal do Aluno API is running",
    )
