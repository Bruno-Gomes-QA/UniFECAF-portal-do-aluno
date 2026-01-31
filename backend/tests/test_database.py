"""
UniFECAF Portal do Aluno - Database Connection Tests
"""

import pytest
from sqlalchemy import text


def test_database_connection(client):
    """Test that database connection works via health endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"


def test_health_endpoint_returns_message(client):
    """Test that health endpoint returns proper message."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "UniFECAF Portal do Aluno" in data["message"]
