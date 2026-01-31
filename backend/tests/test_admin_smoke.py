"""
Admin smoke test: build a minimal semester and validate schedule conflict rule.
"""

from uuid import uuid4

from starlette import status


def test_admin_academics_smoke_and_enrollment_conflict(admin_client):
    suffix = uuid4().hex[:8]

    # Term
    term = admin_client.post(
        "/api/v1/admin/terms",
        json={
            "code": f"2099-{suffix}",
            "start_date": "2099-01-01",
            "end_date": "2099-06-30",
            "is_current": False,
        },
    )
    assert term.status_code == status.HTTP_201_CREATED
    term_id = term.json()["id"]

    # Course
    course = admin_client.post(
        "/api/v1/admin/courses",
        json={"name": f"Curso {suffix}", "degree_type": "Tecnólogo", "duration_terms": 5},
    )
    assert course.status_code == status.HTTP_201_CREATED
    course_id = course.json()["id"]

    # Two subjects
    subj1 = admin_client.post(
        "/api/v1/admin/subjects",
        json={
            "course_id": course_id,
            "code": f"SUBJ1-{suffix}",
            "name": f"Disciplina 1 {suffix}",
            "credits": 4,
        },
    )
    assert subj1.status_code == status.HTTP_201_CREATED
    subj1_id = subj1.json()["id"]

    subj2 = admin_client.post(
        "/api/v1/admin/subjects",
        json={
            "course_id": course_id,
            "code": f"SUBJ2-{suffix}",
            "name": f"Disciplina 2 {suffix}",
            "credits": 4,
        },
    )
    assert subj2.status_code == status.HTTP_201_CREATED
    subj2_id = subj2.json()["id"]

    # Sections (same term)
    sec1 = admin_client.post(
        "/api/v1/admin/sections",
        json={
            "term_id": term_id,
            "subject_id": subj1_id,
            "code": "A",
            "room_default": "Sala 1",
            "capacity": 60,
        },
    )
    assert sec1.status_code == status.HTTP_201_CREATED
    sec1_id = sec1.json()["id"]

    sec2 = admin_client.post(
        "/api/v1/admin/sections",
        json={
            "term_id": term_id,
            "subject_id": subj2_id,
            "code": "A",
            "room_default": "Sala 2",
            "capacity": 60,
        },
    )
    assert sec2.status_code == status.HTTP_201_CREATED
    sec2_id = sec2.json()["id"]

    # Meetings: both on Monday (DB convention: 0=Sun, 1=Mon, ..., 6=Sat).
    m1 = admin_client.post(
        f"/api/v1/admin/sections/{sec1_id}/meetings",
        json={"weekday": 1, "start_time": "19:00:00", "end_time": "21:00:00", "room": "Sala 1"},
    )
    assert m1.status_code == status.HTTP_201_CREATED

    m2 = admin_client.post(
        f"/api/v1/admin/sections/{sec2_id}/meetings",
        json={"weekday": 1, "start_time": "19:00:00", "end_time": "21:00:00", "room": "Sala 2"},
    )
    assert m2.status_code == status.HTTP_201_CREATED

    # Create user + student
    email = f"student-{suffix}@unifecaf.edu.br"
    user = admin_client.post(
        "/api/v1/admin/users",
        json={"email": email, "password": "student123", "role": "STUDENT", "status": "ACTIVE"},
    )
    assert user.status_code == status.HTTP_201_CREATED
    user_id = user.json()["id"]

    student = admin_client.post(
        "/api/v1/admin/students",
        json={
            "user_id": user_id,
            "ra": f"RA{suffix}",
            "full_name": f"Aluno {suffix}",
            "course_id": course_id,
            "admission_term": term_id,
            "total_progress": "0.00",
        },
    )
    assert student.status_code == status.HTTP_201_CREATED

    # Enrollment 1 OK
    e1 = admin_client.post(
        "/api/v1/admin/enrollments",
        json={"student_id": user_id, "section_id": sec1_id, "status": "ENROLLED"},
    )
    assert e1.status_code == status.HTTP_201_CREATED

    # Enrollment 2 should conflict (same weekday)
    e2 = admin_client.post(
        "/api/v1/admin/enrollments",
        json={"student_id": user_id, "section_id": sec2_id, "status": "ENROLLED"},
    )
    assert e2.status_code == status.HTTP_400_BAD_REQUEST
    assert e2.json()["error"]["code"] == "ACADEMIC_SCHEDULE_CONFLICT"
