"""
/me endpoints smoke tests.
"""

from starlette import status


def test_me_profile(authenticated_client):
    res = authenticated_client.get("/api/v1/me/profile")
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data["email"] == "demo@unifecaf.edu.br"
    assert data["ra"] == "20240988"
    assert data["course"]["name"]


def test_me_today_class(authenticated_client):
    res = authenticated_client.get("/api/v1/me/today-class")
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    # Seed creates a class session for CURRENT_DATE.
    assert "class_info" in data


def test_me_academic_summary(authenticated_client):
    res = authenticated_client.get("/api/v1/me/academic/summary")
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert "current_term" in data
    assert "subjects" in data


def test_me_financial_endpoints_and_pay_mock(authenticated_client):
    summary = authenticated_client.get("/api/v1/me/financial/summary")
    assert summary.status_code == status.HTTP_200_OK

    invoices = authenticated_client.get("/api/v1/me/financial/invoices?limit=10&offset=0")
    assert invoices.status_code == status.HTTP_200_OK
    body = invoices.json()
    assert "items" in body
    if not body["items"]:
        return

    invoice_id = body["items"][0]["id"]
    pay = authenticated_client.post(f"/api/v1/me/financial/invoices/{invoice_id}/pay-mock")
    assert pay.status_code == status.HTTP_200_OK
    assert pay.json()["invoice_id"] == invoice_id


def test_me_notifications_and_actions(authenticated_client):
    res = authenticated_client.get("/api/v1/me/notifications?limit=10&offset=0")
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert "items" in data

    count = authenticated_client.get("/api/v1/me/notifications/unread-count")
    assert count.status_code == status.HTTP_200_OK
    assert "unread_count" in count.json()

    if not data["items"]:
        return

    un_id = data["items"][0]["id"]
    r1 = authenticated_client.post(f"/api/v1/me/notifications/{un_id}/read")
    assert r1.status_code == status.HTTP_204_NO_CONTENT

    r2 = authenticated_client.post(f"/api/v1/me/notifications/{un_id}/unread")
    assert r2.status_code == status.HTTP_204_NO_CONTENT

    r3 = authenticated_client.post(f"/api/v1/me/notifications/{un_id}/archive")
    assert r3.status_code == status.HTTP_204_NO_CONTENT


def test_me_documents(authenticated_client):
    req = authenticated_client.post("/api/v1/me/documents/DECLARATION/request")
    assert req.status_code == status.HTTP_200_OK
    data = req.json()
    assert data["doc_type"] == "DECLARATION"
    assert data["status"] == "AVAILABLE"
    assert data["file_url"]

    dl = authenticated_client.get("/api/v1/me/documents/DECLARATION/download")
    assert dl.status_code == status.HTTP_200_OK
    assert dl.json()["file_url"]
