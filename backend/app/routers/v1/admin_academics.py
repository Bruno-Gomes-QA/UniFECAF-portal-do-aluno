"""
UniFECAF Portal do Aluno - API v1 Admin Academics Router.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from starlette import status

from app.core.database import get_db
from app.core.deps import AdminUser, pagination_params
from app.core.errors import raise_api_error
from app.db.utils import apply_update, get_or_404, paginate_stmt
from app.models.academics import (
    Assessment,
    AssessmentGrade,
    AttendanceRecord,
    AttendanceStatus,
    ClassSession,
    Course,
    EnrollmentStatus,
    FinalGrade,
    FinalStatus,
    Section,
    SectionEnrollment,
    SectionMeeting,
    Student,
    Subject,
    Term,
)
from app.schemas.admin_academics import (
    AssessmentCreateRequest,
    AssessmentGradeCreateRequest,
    AssessmentGradeResponse,
    AssessmentGradeUpdateRequest,
    AssessmentResponse,
    AssessmentUpdateRequest,
    AttendanceCreateRequest,
    AttendanceResponse,
    AttendanceUpdateRequest,
    ClassSessionCreateRequest,
    ClassSessionResponse,
    ClassSessionUpdateRequest,
    CourseCreateRequest,
    CourseResponse,
    CourseUpdateRequest,
    EnrollmentCreateRequest,
    EnrollmentResponse,
    FinalGradeCreateRequest,
    FinalGradeResponse,
    FinalGradeUpdateRequest,
    GenerateSessionsRequest,
    GenerateSessionsResponse,
    SectionCreateRequest,
    SectionMeetingCreateRequest,
    SectionMeetingResponse,
    SectionMeetingUpdateRequest,
    SectionResponse,
    SectionUpdateRequest,
    StudentCreateRequest,
    StudentResponse,
    StudentUpdateRequest,
    SubjectCreateRequest,
    SubjectResponse,
    SubjectUpdateRequest,
    TermCreateRequest,
    TermResponse,
    TermUpdateRequest,
)
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/api/v1/admin", tags=["Admin - Academics"])


def _now_utc() -> datetime:
    return datetime.now(UTC)


def _ensure_enum(value: str, enum_cls, *, field: str) -> object:
    try:
        return enum_cls(value)
    except ValueError:
        raise_api_error(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="VALIDATION_ERROR",
            message=f"Valor inválido para {field}.",
            details={"allowed": [e.value for e in enum_cls]},
        )


# -------------------- Terms --------------------


@router.get("/terms", response_model=PaginatedResponse[TermResponse], summary="Listar termos")
def list_terms(
    _: AdminUser,
    db: Session = Depends(get_db),
    pagination: dict[str, int] = Depends(pagination_params),
) -> PaginatedResponse[TermResponse]:
    stmt = select(Term).order_by(Term.start_date.desc())
    items, total = paginate_stmt(db, stmt, limit=pagination["limit"], offset=pagination["offset"])
    return PaginatedResponse[TermResponse](
        items=[TermResponse.model_validate(t) for t in items],
        limit=pagination["limit"],
        offset=pagination["offset"],
        total=total,
    )


@router.post(
    "/terms",
    response_model=TermResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar termo",
)
def create_term(
    _: AdminUser, payload: TermCreateRequest, db: Session = Depends(get_db)
) -> TermResponse:
    term = Term(**payload.model_dump())
    db.add(term)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise_api_error(
            status_code=status.HTTP_409_CONFLICT,
            code="TERM_CODE_CONFLICT",
            message="Já existe um termo com este código.",
        )
    db.refresh(term)
    return TermResponse.model_validate(term)


@router.get("/terms/{term_id}", response_model=TermResponse, summary="Detalhar termo")
def get_term(term_id: UUID, _: AdminUser, db: Session = Depends(get_db)) -> TermResponse:
    term = get_or_404(db, Term, term_id, message="Termo não encontrado.")
    return TermResponse.model_validate(term)


@router.patch("/terms/{term_id}", response_model=TermResponse, summary="Atualizar termo (patch)")
def patch_term(
    term_id: UUID, payload: TermUpdateRequest, _: AdminUser, db: Session = Depends(get_db)
) -> TermResponse:
    term = get_or_404(db, Term, term_id, message="Termo não encontrado.")
    apply_update(term, payload.model_dump(exclude_unset=True))
    db.commit()
    db.refresh(term)
    return TermResponse.model_validate(term)


@router.delete("/terms/{term_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remover termo")
def delete_term(term_id: UUID, _: AdminUser, db: Session = Depends(get_db)) -> None:
    term = get_or_404(db, Term, term_id, message="Termo não encontrado.")
    db.delete(term)
    db.commit()


@router.post(
    "/terms/{term_id}/set-current",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Definir termo atual",
)
def set_current_term(term_id: UUID, _: AdminUser, db: Session = Depends(get_db)) -> None:
    term = get_or_404(db, Term, term_id, message="Termo não encontrado.")
    db.query(Term).update({Term.is_current: False})
    term.is_current = True
    db.commit()


# -------------------- Courses --------------------


@router.get("/courses", response_model=PaginatedResponse[CourseResponse], summary="Listar cursos")
def list_courses(
    _: AdminUser,
    db: Session = Depends(get_db),
    pagination: dict[str, int] = Depends(pagination_params),
) -> PaginatedResponse[CourseResponse]:
    stmt = select(Course).order_by(Course.created_at.desc())
    items, total = paginate_stmt(db, stmt, limit=pagination["limit"], offset=pagination["offset"])
    return PaginatedResponse[CourseResponse](
        items=[CourseResponse.model_validate(c) for c in items],
        limit=pagination["limit"],
        offset=pagination["offset"],
        total=total,
    )


@router.post(
    "/courses",
    response_model=CourseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar curso",
)
def create_course(
    _: AdminUser, payload: CourseCreateRequest, db: Session = Depends(get_db)
) -> CourseResponse:
    course = Course(**payload.model_dump())
    db.add(course)
    db.commit()
    db.refresh(course)
    return CourseResponse.model_validate(course)


@router.get("/courses/{course_id}", response_model=CourseResponse, summary="Detalhar curso")
def get_course(course_id: UUID, _: AdminUser, db: Session = Depends(get_db)) -> CourseResponse:
    course = get_or_404(db, Course, course_id, message="Curso não encontrado.")
    return CourseResponse.model_validate(course)


@router.patch(
    "/courses/{course_id}", response_model=CourseResponse, summary="Atualizar curso (patch)"
)
def patch_course(
    course_id: UUID, payload: CourseUpdateRequest, _: AdminUser, db: Session = Depends(get_db)
) -> CourseResponse:
    course = get_or_404(db, Course, course_id, message="Curso não encontrado.")
    apply_update(course, payload.model_dump(exclude_unset=True))
    db.commit()
    db.refresh(course)
    return CourseResponse.model_validate(course)


@router.delete(
    "/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remover curso"
)
def delete_course(course_id: UUID, _: AdminUser, db: Session = Depends(get_db)) -> None:
    course = get_or_404(db, Course, course_id, message="Curso não encontrado.")
    db.delete(course)
    db.commit()


# -------------------- Subjects --------------------


@router.get(
    "/subjects", response_model=PaginatedResponse[SubjectResponse], summary="Listar disciplinas"
)
def list_subjects(
    _: AdminUser,
    db: Session = Depends(get_db),
    pagination: dict[str, int] = Depends(pagination_params),
) -> PaginatedResponse[SubjectResponse]:
    stmt = select(Subject).order_by(Subject.created_at.desc())
    items, total = paginate_stmt(db, stmt, limit=pagination["limit"], offset=pagination["offset"])
    return PaginatedResponse[SubjectResponse](
        items=[SubjectResponse.model_validate(s) for s in items],
        limit=pagination["limit"],
        offset=pagination["offset"],
        total=total,
    )


@router.post(
    "/subjects",
    response_model=SubjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar disciplina",
)
def create_subject(
    _: AdminUser, payload: SubjectCreateRequest, db: Session = Depends(get_db)
) -> SubjectResponse:
    subject = Subject(**payload.model_dump())
    db.add(subject)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise_api_error(
            status_code=status.HTTP_409_CONFLICT,
            code="SUBJECT_CONFLICT",
            message="Conflito ao criar disciplina (course_id+code deve ser único).",
        )
    db.refresh(subject)
    return SubjectResponse.model_validate(subject)


@router.get("/subjects/{subject_id}", response_model=SubjectResponse, summary="Detalhar disciplina")
def get_subject(subject_id: UUID, _: AdminUser, db: Session = Depends(get_db)) -> SubjectResponse:
    subject = get_or_404(db, Subject, subject_id, message="Disciplina não encontrada.")
    return SubjectResponse.model_validate(subject)


@router.patch(
    "/subjects/{subject_id}", response_model=SubjectResponse, summary="Atualizar disciplina (patch)"
)
def patch_subject(
    subject_id: UUID, payload: SubjectUpdateRequest, _: AdminUser, db: Session = Depends(get_db)
) -> SubjectResponse:
    subject = get_or_404(db, Subject, subject_id, message="Disciplina não encontrada.")
    apply_update(subject, payload.model_dump(exclude_unset=True))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise_api_error(
            status_code=status.HTTP_409_CONFLICT,
            code="SUBJECT_CONFLICT",
            message="Conflito ao atualizar disciplina (course_id+code deve ser único).",
        )
    db.refresh(subject)
    return SubjectResponse.model_validate(subject)


@router.delete(
    "/subjects/{subject_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remover disciplina"
)
def delete_subject(subject_id: UUID, _: AdminUser, db: Session = Depends(get_db)) -> None:
    subject = get_or_404(db, Subject, subject_id, message="Disciplina não encontrada.")
    db.delete(subject)
    db.commit()


# -------------------- Sections --------------------


@router.get("/sections", response_model=PaginatedResponse[SectionResponse], summary="Listar turmas")
def list_sections(
    _: AdminUser,
    db: Session = Depends(get_db),
    pagination: dict[str, int] = Depends(pagination_params),
) -> PaginatedResponse[SectionResponse]:
    stmt = select(Section).order_by(Section.created_at.desc())
    items, total = paginate_stmt(db, stmt, limit=pagination["limit"], offset=pagination["offset"])
    return PaginatedResponse[SectionResponse](
        items=[SectionResponse.model_validate(s) for s in items],
        limit=pagination["limit"],
        offset=pagination["offset"],
        total=total,
    )


@router.post(
    "/sections",
    response_model=SectionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar turma",
)
def create_section(
    _: AdminUser, payload: SectionCreateRequest, db: Session = Depends(get_db)
) -> SectionResponse:
    section = Section(**payload.model_dump())
    db.add(section)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise_api_error(
            status_code=status.HTTP_409_CONFLICT,
            code="SECTION_CONFLICT",
            message="Conflito ao criar turma (term+subject+code deve ser único).",
        )
    db.refresh(section)
    return SectionResponse.model_validate(section)


@router.get("/sections/{section_id}", response_model=SectionResponse, summary="Detalhar turma")
def get_section(section_id: UUID, _: AdminUser, db: Session = Depends(get_db)) -> SectionResponse:
    section = get_or_404(db, Section, section_id, message="Turma não encontrada.")
    return SectionResponse.model_validate(section)


@router.patch(
    "/sections/{section_id}", response_model=SectionResponse, summary="Atualizar turma (patch)"
)
def patch_section(
    section_id: UUID, payload: SectionUpdateRequest, _: AdminUser, db: Session = Depends(get_db)
) -> SectionResponse:
    section = get_or_404(db, Section, section_id, message="Turma não encontrada.")
    apply_update(section, payload.model_dump(exclude_unset=True))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise_api_error(
            status_code=status.HTTP_409_CONFLICT,
            code="SECTION_CONFLICT",
            message="Conflito ao atualizar turma (term+subject+code deve ser único).",
        )
    db.refresh(section)
    return SectionResponse.model_validate(section)


@router.delete(
    "/sections/{section_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remover turma"
)
def delete_section(section_id: UUID, _: AdminUser, db: Session = Depends(get_db)) -> None:
    section = get_or_404(db, Section, section_id, message="Turma não encontrada.")
    db.delete(section)
    db.commit()


# -------------------- Meetings (nested) --------------------


@router.get(
    "/sections/{section_id}/meetings",
    response_model=list[SectionMeetingResponse],
    summary="Listar encontros semanais da turma",
)
def list_section_meetings(
    section_id: UUID, _: AdminUser, db: Session = Depends(get_db)
) -> list[SectionMeetingResponse]:
    section = get_or_404(db, Section, section_id, message="Turma não encontrada.")
    meetings = (
        db.query(SectionMeeting)
        .filter(SectionMeeting.section_id == section.id)
        .order_by(SectionMeeting.weekday.asc(), SectionMeeting.start_time.asc())
        .all()
    )
    return [SectionMeetingResponse.model_validate(m) for m in meetings]


@router.post(
    "/sections/{section_id}/meetings",
    response_model=SectionMeetingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar encontro semanal",
)
def create_section_meeting(
    section_id: UUID,
    payload: SectionMeetingCreateRequest,
    _: AdminUser,
    db: Session = Depends(get_db),
) -> SectionMeetingResponse:
    section = get_or_404(db, Section, section_id, message="Turma não encontrada.")
    meeting = SectionMeeting(section_id=section.id, **payload.model_dump())
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return SectionMeetingResponse.model_validate(meeting)


@router.patch(
    "/meetings/{meeting_id}",
    response_model=SectionMeetingResponse,
    summary="Atualizar encontro (patch)",
)
def patch_meeting(
    meeting_id: UUID,
    payload: SectionMeetingUpdateRequest,
    _: AdminUser,
    db: Session = Depends(get_db),
) -> SectionMeetingResponse:
    meeting = get_or_404(db, SectionMeeting, meeting_id, message="Encontro não encontrado.")
    apply_update(meeting, payload.model_dump(exclude_unset=True))
    db.commit()
    db.refresh(meeting)
    return SectionMeetingResponse.model_validate(meeting)


@router.delete(
    "/meetings/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remover encontro"
)
def delete_meeting(meeting_id: UUID, _: AdminUser, db: Session = Depends(get_db)) -> None:
    meeting = get_or_404(db, SectionMeeting, meeting_id, message="Encontro não encontrado.")
    db.delete(meeting)
    db.commit()


# -------------------- Sessions (nested) --------------------


@router.get(
    "/sections/{section_id}/sessions",
    response_model=PaginatedResponse[ClassSessionResponse],
    summary="Listar aulas por data (paginado)",
)
def list_section_sessions(
    section_id: UUID,
    _: AdminUser,
    db: Session = Depends(get_db),
    pagination: dict[str, int] = Depends(pagination_params),
) -> PaginatedResponse[ClassSessionResponse]:
    section = get_or_404(db, Section, section_id, message="Turma não encontrada.")
    stmt = (
        select(ClassSession)
        .where(ClassSession.section_id == section.id)
        .order_by(ClassSession.session_date.desc())
    )
    items, total = paginate_stmt(db, stmt, limit=pagination["limit"], offset=pagination["offset"])
    return PaginatedResponse[ClassSessionResponse](
        items=[ClassSessionResponse.model_validate(s) for s in items],
        limit=pagination["limit"],
        offset=pagination["offset"],
        total=total,
    )


@router.post(
    "/sections/{section_id}/sessions",
    response_model=ClassSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar aula por data",
)
def create_section_session(
    section_id: UUID,
    payload: ClassSessionCreateRequest,
    _: AdminUser,
    db: Session = Depends(get_db),
) -> ClassSessionResponse:
    section = get_or_404(db, Section, section_id, message="Turma não encontrada.")
    session = ClassSession(section_id=section.id, **payload.model_dump())
    db.add(session)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise_api_error(
            status_code=status.HTTP_409_CONFLICT,
            code="CLASS_SESSION_CONFLICT",
            message="Conflito ao criar aula (section+date+start_time deve ser único).",
        )
    db.refresh(session)
    return ClassSessionResponse.model_validate(session)


@router.patch(
    "/sessions/{session_id}", response_model=ClassSessionResponse, summary="Atualizar aula (patch)"
)
def patch_session(
    session_id: UUID,
    payload: ClassSessionUpdateRequest,
    _: AdminUser,
    db: Session = Depends(get_db),
) -> ClassSessionResponse:
    session = get_or_404(db, ClassSession, session_id, message="Aula não encontrada.")
    apply_update(session, payload.model_dump(exclude_unset=True))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise_api_error(
            status_code=status.HTTP_409_CONFLICT,
            code="CLASS_SESSION_CONFLICT",
            message="Conflito ao atualizar aula (section+date+start_time deve ser único).",
        )
    db.refresh(session)
    return ClassSessionResponse.model_validate(session)


@router.delete(
    "/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remover aula"
)
def delete_session(session_id: UUID, _: AdminUser, db: Session = Depends(get_db)) -> None:
    session = get_or_404(db, ClassSession, session_id, message="Aula não encontrada.")
    db.delete(session)
    db.commit()


@router.post(
    "/terms/{term_id}/generate-sessions",
    response_model=GenerateSessionsResponse,
    summary="Gerar aulas por data (a partir de meetings)",
)
def generate_sessions(
    term_id: UUID,
    payload: GenerateSessionsRequest,
    _: AdminUser,
    db: Session = Depends(get_db),
) -> GenerateSessionsResponse:
    term = get_or_404(db, Term, term_id, message="Termo não encontrado.")
    date_from = payload.date_from
    date_to = payload.date_to
    if date_to < date_from:
        raise_api_error(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="VALIDATION_ERROR",
            message="date_to deve ser >= date_from.",
        )

    sections = db.query(Section).filter(Section.term_id == term.id).all()
    created = 0
    skipped = 0

    for section in sections:
        meetings = db.query(SectionMeeting).filter(SectionMeeting.section_id == section.id).all()
        for meeting in meetings:
            cur = date_from
            while cur <= date_to:
                # DB convention: 0=Sunday ... 6=Saturday
                weekday_0_sun = (cur.weekday() + 1) % 7
                if weekday_0_sun == meeting.weekday:
                    session = ClassSession(
                        section_id=section.id,
                        session_date=cur,
                        start_time=meeting.start_time,
                        end_time=meeting.end_time,
                        room=meeting.room,
                        is_canceled=False,
                    )
                    db.add(session)
                    try:
                        db.commit()
                        created += 1
                    except IntegrityError:
                        db.rollback()
                        skipped += 1
                cur += timedelta(days=1)

    return GenerateSessionsResponse(created=created, skipped=skipped)


# -------------------- Students --------------------


@router.get("/students", response_model=PaginatedResponse[StudentResponse], summary="Listar alunos")
def list_students(
    _: AdminUser,
    db: Session = Depends(get_db),
    pagination: dict[str, int] = Depends(pagination_params),
) -> PaginatedResponse[StudentResponse]:
    stmt = select(Student).order_by(Student.created_at.desc())
    items, total = paginate_stmt(db, stmt, limit=pagination["limit"], offset=pagination["offset"])
    return PaginatedResponse[StudentResponse](
        items=[StudentResponse.model_validate(s) for s in items],
        limit=pagination["limit"],
        offset=pagination["offset"],
        total=total,
    )


@router.post(
    "/students",
    response_model=StudentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar aluno",
)
def create_student(
    _: AdminUser, payload: StudentCreateRequest, db: Session = Depends(get_db)
) -> StudentResponse:
    student = Student(**payload.model_dump())
    db.add(student)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise_api_error(
            status_code=status.HTTP_409_CONFLICT,
            code="STUDENT_CONFLICT",
            message="Conflito ao criar aluno (RA deve ser único).",
        )
    db.refresh(student)
    return StudentResponse.model_validate(student)


@router.get("/students/{student_id}", response_model=StudentResponse, summary="Detalhar aluno")
def get_student(student_id: UUID, _: AdminUser, db: Session = Depends(get_db)) -> StudentResponse:
    student = get_or_404(db, Student, student_id, message="Aluno não encontrado.")
    return StudentResponse.model_validate(student)


@router.patch(
    "/students/{student_id}", response_model=StudentResponse, summary="Atualizar aluno (patch)"
)
def patch_student(
    student_id: UUID, payload: StudentUpdateRequest, _: AdminUser, db: Session = Depends(get_db)
) -> StudentResponse:
    student = get_or_404(db, Student, student_id, message="Aluno não encontrado.")
    apply_update(student, payload.model_dump(exclude_unset=True))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise_api_error(
            status_code=status.HTTP_409_CONFLICT,
            code="STUDENT_CONFLICT",
            message="Conflito ao atualizar aluno (RA deve ser único).",
        )
    db.refresh(student)
    return StudentResponse.model_validate(student)


@router.delete(
    "/students/{student_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remover aluno"
)
def delete_student(student_id: UUID, _: AdminUser, db: Session = Depends(get_db)) -> None:
    student = get_or_404(db, Student, student_id, message="Aluno não encontrado.")
    db.delete(student)
    db.commit()


# -------------------- Enrollments (rule: 1 aula/dia) --------------------


def _validate_enrollment_conflict(db: Session, *, student_id, section_id) -> None:
    section = get_or_404(db, Section, section_id, message="Turma não encontrada.")

    new_weekdays = {
        m.weekday
        for m in db.query(SectionMeeting).filter(SectionMeeting.section_id == section.id).all()
    }
    if not new_weekdays:
        return

    enrolled_section_ids = (
        db.query(SectionEnrollment.section_id)
        .join(Section, Section.id == SectionEnrollment.section_id)
        .filter(SectionEnrollment.student_id == student_id)
        .filter(Section.term_id == section.term_id)
        .filter(SectionEnrollment.status == EnrollmentStatus.ENROLLED)
        .all()
    )
    section_ids = [row[0] for row in enrolled_section_ids]
    if not section_ids:
        return

    existing_weekdays = {
        m.weekday
        for m in db.query(SectionMeeting).filter(SectionMeeting.section_id.in_(section_ids)).all()
    }
    if new_weekdays.intersection(existing_weekdays):
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="ACADEMIC_SCHEDULE_CONFLICT",
            message="Conflito de horário: aluno já possui aula no mesmo dia da semana.",
            details={"weekdays": sorted(new_weekdays.intersection(existing_weekdays))},
        )


@router.get(
    "/enrollments",
    response_model=PaginatedResponse[EnrollmentResponse],
    summary="Listar matrículas",
)
def list_enrollments(
    _: AdminUser,
    db: Session = Depends(get_db),
    pagination: dict[str, int] = Depends(pagination_params),
) -> PaginatedResponse[EnrollmentResponse]:
    stmt = select(SectionEnrollment).order_by(SectionEnrollment.created_at.desc())
    items, total = paginate_stmt(db, stmt, limit=pagination["limit"], offset=pagination["offset"])
    return PaginatedResponse[EnrollmentResponse](
        items=[
            EnrollmentResponse(
                id=e.id,
                student_id=e.student_id,
                section_id=e.section_id,
                status=e.status.value,
                created_at=e.created_at,
                updated_at=e.updated_at,
            )
            for e in items
        ],
        limit=pagination["limit"],
        offset=pagination["offset"],
        total=total,
    )


@router.post(
    "/enrollments",
    response_model=EnrollmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar matrícula",
)
def create_enrollment(
    _: AdminUser, payload: EnrollmentCreateRequest, db: Session = Depends(get_db)
) -> EnrollmentResponse:
    enrollment_status = _ensure_enum(payload.status, EnrollmentStatus, field="status")
    _validate_enrollment_conflict(db, student_id=payload.student_id, section_id=payload.section_id)

    enrollment = SectionEnrollment(
        student_id=payload.student_id,
        section_id=payload.section_id,
        status=enrollment_status,
    )
    db.add(enrollment)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise_api_error(
            status_code=status.HTTP_409_CONFLICT,
            code="ENROLLMENT_CONFLICT",
            message="Conflito ao criar matrícula (student+section deve ser único).",
        )
    db.refresh(enrollment)
    return EnrollmentResponse(
        id=enrollment.id,
        student_id=enrollment.student_id,
        section_id=enrollment.section_id,
        status=enrollment.status.value,
        created_at=enrollment.created_at,
        updated_at=enrollment.updated_at,
    )


@router.delete(
    "/enrollments/{enrollment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remover matrícula",
)
def delete_enrollment(enrollment_id: UUID, _: AdminUser, db: Session = Depends(get_db)) -> None:
    enrollment = get_or_404(
        db, SectionEnrollment, enrollment_id, message="Matrícula não encontrada."
    )
    db.delete(enrollment)
    db.commit()


# -------------------- Attendance --------------------


@router.get(
    "/attendance", response_model=PaginatedResponse[AttendanceResponse], summary="Listar presenças"
)
def list_attendance(
    _: AdminUser,
    db: Session = Depends(get_db),
    pagination: dict[str, int] = Depends(pagination_params),
) -> PaginatedResponse[AttendanceResponse]:
    stmt = select(AttendanceRecord).order_by(AttendanceRecord.recorded_at.desc())
    items, total = paginate_stmt(db, stmt, limit=pagination["limit"], offset=pagination["offset"])
    return PaginatedResponse[AttendanceResponse](
        items=[
            AttendanceResponse(
                id=a.id,
                session_id=a.session_id,
                student_id=a.student_id,
                status=a.status.value,
                recorded_at=a.recorded_at,
                created_at=a.created_at,
                updated_at=a.updated_at,
            )
            for a in items
        ],
        limit=pagination["limit"],
        offset=pagination["offset"],
        total=total,
    )


@router.post(
    "/attendance",
    response_model=AttendanceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar presença",
)
def create_attendance(
    _: AdminUser, payload: AttendanceCreateRequest, db: Session = Depends(get_db)
) -> AttendanceResponse:
    attendance_status = _ensure_enum(payload.status, AttendanceStatus, field="status")
    record = AttendanceRecord(
        session_id=payload.session_id,
        student_id=payload.student_id,
        status=attendance_status,
    )
    db.add(record)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise_api_error(
            status_code=status.HTTP_409_CONFLICT,
            code="ATTENDANCE_CONFLICT",
            message="Conflito ao criar presença (session+student deve ser único).",
        )
    db.refresh(record)
    return AttendanceResponse(
        id=record.id,
        session_id=record.session_id,
        student_id=record.student_id,
        status=record.status.value,
        recorded_at=record.recorded_at,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


@router.patch(
    "/attendance/{attendance_id}",
    response_model=AttendanceResponse,
    summary="Atualizar presença (patch)",
)
def patch_attendance(
    attendance_id: UUID,
    payload: AttendanceUpdateRequest,
    _: AdminUser,
    db: Session = Depends(get_db),
) -> AttendanceResponse:
    record = get_or_404(db, AttendanceRecord, attendance_id, message="Presença não encontrada.")
    data = payload.model_dump(exclude_unset=True)
    if "status" in data and data["status"]:
        data["status"] = _ensure_enum(data["status"], AttendanceStatus, field="status")
    apply_update(record, data)
    db.commit()
    db.refresh(record)
    return AttendanceResponse(
        id=record.id,
        session_id=record.session_id,
        student_id=record.student_id,
        status=record.status.value,
        recorded_at=record.recorded_at,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


@router.delete(
    "/attendance/{attendance_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remover presença",
)
def delete_attendance(attendance_id: UUID, _: AdminUser, db: Session = Depends(get_db)) -> None:
    record = get_or_404(db, AttendanceRecord, attendance_id, message="Presença não encontrada.")
    db.delete(record)
    db.commit()


# -------------------- Assessments + Grades --------------------


@router.get(
    "/assessments",
    response_model=PaginatedResponse[AssessmentResponse],
    summary="Listar avaliações",
)
def list_assessments(
    _: AdminUser,
    db: Session = Depends(get_db),
    pagination: dict[str, int] = Depends(pagination_params),
) -> PaginatedResponse[AssessmentResponse]:
    stmt = select(Assessment).order_by(Assessment.created_at.desc())
    items, total = paginate_stmt(db, stmt, limit=pagination["limit"], offset=pagination["offset"])
    return PaginatedResponse[AssessmentResponse](
        items=[AssessmentResponse.model_validate(a) for a in items],
        limit=pagination["limit"],
        offset=pagination["offset"],
        total=total,
    )


@router.post(
    "/assessments",
    response_model=AssessmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar avaliação",
)
def create_assessment(
    _: AdminUser, payload: AssessmentCreateRequest, db: Session = Depends(get_db)
) -> AssessmentResponse:
    assessment = Assessment(**payload.model_dump())
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return AssessmentResponse.model_validate(assessment)


@router.get(
    "/assessments/{assessment_id}", response_model=AssessmentResponse, summary="Detalhar avaliação"
)
def get_assessment(
    assessment_id: UUID, _: AdminUser, db: Session = Depends(get_db)
) -> AssessmentResponse:
    assessment = get_or_404(db, Assessment, assessment_id, message="Avaliação não encontrada.")
    return AssessmentResponse.model_validate(assessment)


@router.patch(
    "/assessments/{assessment_id}",
    response_model=AssessmentResponse,
    summary="Atualizar avaliação (patch)",
)
def patch_assessment(
    assessment_id: UUID,
    payload: AssessmentUpdateRequest,
    _: AdminUser,
    db: Session = Depends(get_db),
) -> AssessmentResponse:
    assessment = get_or_404(db, Assessment, assessment_id, message="Avaliação não encontrada.")
    apply_update(assessment, payload.model_dump(exclude_unset=True))
    db.commit()
    db.refresh(assessment)
    return AssessmentResponse.model_validate(assessment)


@router.delete(
    "/assessments/{assessment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remover avaliação",
)
def delete_assessment(assessment_id: UUID, _: AdminUser, db: Session = Depends(get_db)) -> None:
    assessment = get_or_404(db, Assessment, assessment_id, message="Avaliação não encontrada.")
    db.delete(assessment)
    db.commit()


@router.get(
    "/assessment-grades",
    response_model=PaginatedResponse[AssessmentGradeResponse],
    summary="Listar notas de avaliações",
)
def list_assessment_grades(
    _: AdminUser,
    db: Session = Depends(get_db),
    pagination: dict[str, int] = Depends(pagination_params),
) -> PaginatedResponse[AssessmentGradeResponse]:
    stmt = select(AssessmentGrade).order_by(AssessmentGrade.created_at.desc())
    items, total = paginate_stmt(db, stmt, limit=pagination["limit"], offset=pagination["offset"])
    return PaginatedResponse[AssessmentGradeResponse](
        items=[AssessmentGradeResponse.model_validate(g) for g in items],
        limit=pagination["limit"],
        offset=pagination["offset"],
        total=total,
    )


@router.post(
    "/assessment-grades",
    response_model=AssessmentGradeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar nota de avaliação",
)
def create_assessment_grade(
    _: AdminUser, payload: AssessmentGradeCreateRequest, db: Session = Depends(get_db)
) -> AssessmentGradeResponse:
    grade = AssessmentGrade(**payload.model_dump())
    db.add(grade)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise_api_error(
            status_code=status.HTTP_409_CONFLICT,
            code="ASSESSMENT_GRADE_CONFLICT",
            message="Conflito ao criar nota (assessment+student deve ser único).",
        )
    db.refresh(grade)
    return AssessmentGradeResponse.model_validate(grade)


@router.patch(
    "/assessment-grades/{grade_id}",
    response_model=AssessmentGradeResponse,
    summary="Atualizar nota de avaliação (patch)",
)
def patch_assessment_grade(
    grade_id: UUID,
    payload: AssessmentGradeUpdateRequest,
    _: AdminUser,
    db: Session = Depends(get_db),
) -> AssessmentGradeResponse:
    grade = get_or_404(db, AssessmentGrade, grade_id, message="Nota não encontrada.")
    apply_update(grade, payload.model_dump(exclude_unset=True))
    db.commit()
    db.refresh(grade)
    return AssessmentGradeResponse.model_validate(grade)


@router.delete(
    "/assessment-grades/{grade_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remover nota de avaliação",
)
def delete_assessment_grade(grade_id: UUID, _: AdminUser, db: Session = Depends(get_db)) -> None:
    grade = get_or_404(db, AssessmentGrade, grade_id, message="Nota não encontrada.")
    db.delete(grade)
    db.commit()


# -------------------- Final Grades --------------------


@router.get(
    "/final-grades",
    response_model=PaginatedResponse[FinalGradeResponse],
    summary="Listar notas finais",
)
def list_final_grades(
    _: AdminUser,
    db: Session = Depends(get_db),
    pagination: dict[str, int] = Depends(pagination_params),
) -> PaginatedResponse[FinalGradeResponse]:
    stmt = select(FinalGrade).order_by(FinalGrade.created_at.desc())
    items, total = paginate_stmt(db, stmt, limit=pagination["limit"], offset=pagination["offset"])
    return PaginatedResponse[FinalGradeResponse](
        items=[
            FinalGradeResponse(
                id=g.id,
                section_id=g.section_id,
                student_id=g.student_id,
                final_score=g.final_score,
                absences_count=g.absences_count,
                absences_pct=g.absences_pct,
                status=g.status.value,
                calculated_at=g.calculated_at,
                created_at=g.created_at,
                updated_at=g.updated_at,
            )
            for g in items
        ],
        limit=pagination["limit"],
        offset=pagination["offset"],
        total=total,
    )


@router.post(
    "/final-grades",
    response_model=FinalGradeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar nota final",
)
def create_final_grade(
    _: AdminUser, payload: FinalGradeCreateRequest, db: Session = Depends(get_db)
) -> FinalGradeResponse:
    final_status = _ensure_enum(payload.status, FinalStatus, field="status")
    grade = FinalGrade(
        section_id=payload.section_id,
        student_id=payload.student_id,
        final_score=payload.final_score,
        absences_count=payload.absences_count,
        absences_pct=payload.absences_pct,
        status=final_status,
        calculated_at=_now_utc(),
    )
    db.add(grade)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise_api_error(
            status_code=status.HTTP_409_CONFLICT,
            code="FINAL_GRADE_CONFLICT",
            message="Conflito ao criar nota final (section+student deve ser único).",
        )
    db.refresh(grade)
    return FinalGradeResponse(
        id=grade.id,
        section_id=grade.section_id,
        student_id=grade.student_id,
        final_score=grade.final_score,
        absences_count=grade.absences_count,
        absences_pct=grade.absences_pct,
        status=grade.status.value,
        calculated_at=grade.calculated_at,
        created_at=grade.created_at,
        updated_at=grade.updated_at,
    )


@router.patch(
    "/final-grades/{grade_id}",
    response_model=FinalGradeResponse,
    summary="Atualizar nota final (patch)",
)
def patch_final_grade(
    grade_id: UUID, payload: FinalGradeUpdateRequest, _: AdminUser, db: Session = Depends(get_db)
) -> FinalGradeResponse:
    grade = get_or_404(db, FinalGrade, grade_id, message="Nota final não encontrada.")
    data = payload.model_dump(exclude_unset=True)
    if "status" in data and data["status"]:
        data["status"] = _ensure_enum(data["status"], FinalStatus, field="status")
    if any(k in data for k in ["final_score", "absences_count", "absences_pct", "status"]):
        grade.calculated_at = _now_utc()
    apply_update(grade, data)
    db.commit()
    db.refresh(grade)
    return FinalGradeResponse(
        id=grade.id,
        section_id=grade.section_id,
        student_id=grade.student_id,
        final_score=grade.final_score,
        absences_count=grade.absences_count,
        absences_pct=grade.absences_pct,
        status=grade.status.value,
        calculated_at=grade.calculated_at,
        created_at=grade.created_at,
        updated_at=grade.updated_at,
    )


@router.delete(
    "/final-grades/{grade_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remover nota final",
)
def delete_final_grade(grade_id: UUID, _: AdminUser, db: Session = Depends(get_db)) -> None:
    grade = get_or_404(db, FinalGrade, grade_id, message="Nota final não encontrada.")
    db.delete(grade)
    db.commit()
