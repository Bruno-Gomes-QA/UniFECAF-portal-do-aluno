"""
UniFECAF Portal do Aluno - Test Configuration
"""

import os

import pytest
from fastapi.testclient import TestClient

# Default DB for local runs (CI sets DATABASE_URL explicitly).
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/test_db")
os.environ.setdefault("JWT_SECRET", "test-secret-key")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

from app.main import app


@pytest.fixture()
def client():
    """Create test client."""
    with TestClient(app) as c:
        yield c


def _login(client: TestClient, *, email: str, password: str) -> None:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 204
    assert "access_token" in client.cookies


@pytest.fixture()
def authenticated_client(client):
    """Create authenticated test client with demo student session."""
    _login(client, email="demo@unifecaf.edu.br", password="demo123")
    yield client
    client.post("/api/v1/auth/logout")


@pytest.fixture()
def admin_client(client):
    """Create authenticated test client with admin session."""
    _login(client, email="admin@unifecaf.edu.br", password="admin123")
    yield client
    client.post("/api/v1/auth/logout")
