"""
RBAC tests (student blocked from /admin).
"""

from starlette import status


def test_student_cannot_access_admin(authenticated_client):
    res = authenticated_client.get("/api/v1/admin/users")
    assert res.status_code == status.HTTP_403_FORBIDDEN
    assert res.json()["error"]["code"] == "AUTH_FORBIDDEN"


def test_admin_can_access_admin(admin_client):
    res = admin_client.get("/api/v1/admin/users")
    assert res.status_code == status.HTTP_200_OK
    assert "items" in res.json()
