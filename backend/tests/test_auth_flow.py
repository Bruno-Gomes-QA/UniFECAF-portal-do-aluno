"""
UniFECAF Portal do Aluno - Authentication Flow Tests
"""

import pytest


class TestAuthFlow:
    """Test authentication flow."""

    def test_home_requires_authentication(self, client):
        """Test that /home returns 401 without authentication."""
        response = client.get("/home")
        assert response.status_code == 401
        assert response.json()["detail"] == "Not authenticated"

    def test_login_with_valid_credentials(self, client):
        """Test login with valid demo credentials."""
        response = client.post(
            "/auth/login",
            json={"email": "demo@unifecaf.edu.br", "password": "demo123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Login successful"
        assert data["email"] == "demo@unifecaf.edu.br"
        assert "user_id" in data

        # Check that cookie was set
        assert "access_token" in response.cookies

    def test_login_with_invalid_credentials(self, client):
        """Test login with invalid credentials."""
        response = client.post(
            "/auth/login",
            json={"email": "demo@unifecaf.edu.br", "password": "wrongpassword"},
        )
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid email or password"

    def test_login_with_nonexistent_user(self, client):
        """Test login with non-existent user."""
        response = client.post(
            "/auth/login",
            json={"email": "nonexistent@unifecaf.edu.br", "password": "demo123"},
        )
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid email or password"

    def test_home_with_valid_session(self, authenticated_client):
        """Test that /home returns data with valid session."""
        response = authenticated_client.get("/home")
        assert response.status_code == 200
        data = response.json()

        # Check response structure
        assert "student" in data
        assert "grades" in data
        assert "financial" in data
        assert "today_agenda" in data
        assert "notifications" in data
        assert "quick_actions" in data

        # Check student info
        assert data["student"]["ra"] == "2024001234"
        assert data["student"]["full_name"] == "João da Silva Demo"
        assert data["student"]["email"] == "demo@unifecaf.edu.br"

    def test_logout_clears_session(self, client):
        """Test that logout clears the session cookie."""
        # First login
        client.post(
            "/auth/login",
            json={"email": "demo@unifecaf.edu.br", "password": "demo123"},
        )

        # Verify we can access /home
        response = client.get("/home")
        assert response.status_code == 200

        # Logout
        logout_response = client.post("/auth/logout")
        assert logout_response.status_code == 204

        # Now /home should return 401
        response = client.get("/home")
        assert response.status_code == 401

    def test_get_current_user_info(self, authenticated_client):
        """Test /auth/me endpoint returns current user info."""
        response = authenticated_client.get("/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "demo@unifecaf.edu.br"
        assert data["role"] == "STUDENT"
        assert data["status"] == "ACTIVE"


class TestHomeData:
    """Test home endpoint data structure."""

    def test_grades_summary_structure(self, authenticated_client):
        """Test grades summary data structure."""
        response = authenticated_client.get("/home")
        assert response.status_code == 200
        grades = response.json()["grades"]

        assert "current_term" in grades
        assert "subjects" in grades
        assert isinstance(grades["subjects"], list)

    def test_financial_summary_structure(self, authenticated_client):
        """Test financial summary data structure."""
        response = authenticated_client.get("/home")
        assert response.status_code == 200
        financial = response.json()["financial"]

        assert "invoices" in financial
        assert "total_pending" in financial
        assert "total_overdue" in financial
        assert "has_pending" in financial
        assert "has_overdue" in financial

    def test_quick_actions_available(self, authenticated_client):
        """Test that quick actions are returned."""
        response = authenticated_client.get("/home")
        assert response.status_code == 200
        quick_actions = response.json()["quick_actions"]

        assert len(quick_actions) > 0
        for action in quick_actions:
            assert "id" in action
            assert "label" in action
            assert "href" in action
