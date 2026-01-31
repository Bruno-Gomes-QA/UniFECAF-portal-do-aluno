"""
UniFECAF Portal do Aluno - Test Configuration
"""

import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Set test environment
os.environ.setdefault("DATABASE_URL", "postgresql://unifecaf:unifecaf@localhost:5432/unifecaf_dev")

from app.main import app
from app.core.database import get_db, Base


@pytest.fixture(scope="session")
def client():
    """Create test client."""
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="function")
def authenticated_client(client):
    """Create authenticated test client with demo user session."""
    # Login with demo user
    response = client.post(
        "/auth/login",
        json={"email": "demo@unifecaf.edu.br", "password": "demo123"},
    )
    # The cookie should be automatically set in the client
    yield client
    # Logout after test
    client.post("/auth/logout")
