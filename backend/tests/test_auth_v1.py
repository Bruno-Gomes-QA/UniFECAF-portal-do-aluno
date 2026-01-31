"""
Auth / RBAC tests (v1).
"""

from starlette import status


def test_auth_me_requires_cookie(client):
    res = client.get("/api/v1/auth/me")
    assert res.status_code == status.HTTP_401_UNAUTHORIZED
    body = res.json()
    assert body["error"]["code"] == "AUTH_NOT_AUTHENTICATED"


def test_login_invalid_credentials_returns_envelope(client):
    res = client.post(
        "/api/v1/auth/login", json={"email": "demo@unifecaf.edu.br", "password": "wrong"}
    )
    assert res.status_code == status.HTTP_401_UNAUTHORIZED
    body = res.json()
    assert body["error"]["code"] == "AUTH_INVALID_CREDENTIALS"


def test_login_sets_cookie_and_me_works(client):
    res = client.post(
        "/api/v1/auth/login", json={"email": "demo@unifecaf.edu.br", "password": "demo123"}
    )
    assert res.status_code == status.HTTP_204_NO_CONTENT
    assert "access_token" in client.cookies

    me = client.get("/api/v1/auth/me")
    assert me.status_code == status.HTTP_200_OK
    data = me.json()
    assert data["email"] == "demo@unifecaf.edu.br"
    assert data["role"] == "STUDENT"


def test_logout_revokes_cookie(client):
    client.post("/api/v1/auth/login", json={"email": "demo@unifecaf.edu.br", "password": "demo123"})
    res = client.post("/api/v1/auth/logout")
    assert res.status_code == status.HTTP_204_NO_CONTENT

    me = client.get("/api/v1/auth/me")
    assert me.status_code == status.HTTP_401_UNAUTHORIZED
