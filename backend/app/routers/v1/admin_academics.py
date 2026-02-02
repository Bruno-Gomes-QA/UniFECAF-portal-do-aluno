"""
UniFECAF Portal do Aluno - API v1 Admin Academics Router.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import BigInteger, select, func, delete
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
    StudentStatus,
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


def _recalculate_attendance_for_student_section(
    db: Session, student_id: UUID, section_id: UUID
) -> None:
    """
    Recalcula absences_count e absences_pct para o FinalGrade de um aluno em uma seção.
    Chamado automaticamente ao criar/atualizar/deletar registros de frequência.
    """
    from decimal import Decimal
    
    # Buscar o FinalGrade
    final_grade = db.query(FinalGrade).filter(
        FinalGrade.student_id == student_id,
        FinalGrade.section_id == section_id,
    ).first()
    
    if not final_grade:
        return  # Não há FinalGrade ainda, nada a atualizar
    
    # Contar total de sessões não canceladas da seção até hoje
    from datetime import date
    total_sessions = db.query(ClassSession).filter(
        ClassSession.section_id == section_id,
        ClassSession.is_canceled.is_(False),
        ClassSession.session_date <= date.today(),
    ).count()
    
    if total_sessions == 0:
        # Não há sessões ainda, zerar faltas
        final_grade.absences_count = 0
        final_grade.absences_pct = Decimal("0.00")
        db.commit()
        return
    
    # Contar quantas faltas (ABSENT) o aluno tem
    absences_count = db.query(AttendanceRecord).join(
        ClassSession, ClassSession.id == AttendanceRecord.session_id
    ).filter(
        AttendanceRecord.student_id == student_id,
        ClassSession.section_id == section_id,
        AttendanceRecord.status == AttendanceStatus.ABSENT,
        ClassSession.is_canceled.is_(False),
        ClassSession.session_date <= date.today(),
    ).count()
    
    # Calcular percentual de faltas
    absences_pct = (Decimal(absences_count) / Decimal(total_sessions)) * 100
    
    # Atualizar FinalGrade
    final_grade.absences_count = absences_count
    final_grade.absences_pct = absences_pct
    db.commit()


# -------------------- Terms --------------------


def _term_to_response(term: Term, db: Session) -> TermResponse:
    """Convert Term model to response with aggregations."""
    sections_count = db.scalar(
        select(func.count()).where(Section.term_id == term.id)
    ) or 0
    response = TermResponse.model_validate(term)
    response.sections_count = sections_count
    return response


@router.get("/terms", response_model=PaginatedResponse[TermResponse], summary="Listar termos")
def list_terms(
    _: AdminUser,
    db: Session = Depends(get_db),
    pagination: dict[str, int] = Depends(pagination_params),
) -> PaginatedResponse[TermResponse]:
    stmt = select(Term).order_by(Term.start_date.desc())
    items, total = paginate_stmt(db, stmt, limit=pagination["limit"], offset=pagination["offset"])
    return PaginatedResponse[TermResponse](
        items=[_term_to_response(t, db) for t in items],
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
    # If new term is marked as current, unmark all others
    if payload.is_current:
        db.query(Term).update({Term.is_current: False})
    
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
    return _term_to_response(term, db)


@router.get("/terms/{term_id}", response_model=TermResponse, summary="Detalhar termo")
def get_term(term_id: UUID, _: AdminUser, db: Session = Depends(get_db)) -> TermResponse:
    term = get_or_404(db, Term, term_id, message="Termo não encontrado.")
    return _term_to_response(term, db)


@router.patch("/terms/{term_id}", response_model=TermResponse, summary="Atualizar termo (patch)")
def patch_term(
    term_id: UUID, payload: TermUpdateRequest, _: AdminUser, db: Session = Depends(get_db)
) -> TermResponse:
    term = get_or_404(db, Term, term_id, message="Termo não encontrado.")
    
    # If setting this term as current, unmark all others first
    if payload.is_current is True:
        db.query(Term).filter(Term.id != term_id).update({Term.is_current: False})
    
    apply_update(term, payload.model_dump(exclude_unset=True))
    db.commit()
    db.refresh(term)
    return _term_to_response(term, db)


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


@router.get("/terms/current", response_model=TermResponse | None, summary="Obter termo atual")
def get_current_term(_: AdminUser, db: Session = Depends(get_db)) -> TermResponse | None:
    term = db.query(Term).filter(Term.is_current == True).first()  # noqa: E712
    if not term:
        return None
    return _term_to_response(term, db)


# -------------------- Courses --------------------


def _course_to_response(course: Course, db: Session) -> CourseResponse:
    """Convert Course model to response with aggregations."""
    students_count = db.scalar(
        select(func.count()).where(
            Student.course_id == course.id,
            Student.status == StudentStatus.ACTIVE,
        )
    ) or 0
    subjects_count = db.scalar(
        select(func.count()).where(
            Subject.course_id == course.id,
            Subject.is_active == True,  # noqa: E712
        )
    ) or 0

    response = CourseResponse.model_validate(course)
    response.students_count = students_count
    response.subjects_count = subjects_count
    return response


def _create_course_audit_log(
    db: Session, request: Request, course: Course, action: str, extra_data: dict | None = None
) -> None:
    """Create audit log entry for course operations."""
    from app.models.audit import AuditLog

    data = {"course_id": str(course.id), "course_code": course.code, "course_name": course.name}
    if extra_data:
        data.update(extra_data)

    audit = AuditLog(
        actor_user_id=request.state.current_user.id if hasattr(request.state, "current_user") else None,
        action=action,
        entity_type="Course",
        entity_id=course.id,
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        data=data,
    )
    db.add(audit)


@router.get("/courses", response_model=PaginatedResponse[CourseResponse], summary="Listar cursos")
def list_courses(
    _: AdminUser,
    db: Session = Depends(get_db),
    pagination: dict[str, int] = Depends(pagination_params),
    is_active: bool | None = Query(True, description="Filtrar por status (true=ativos, false=inativos, None=todos)"),
    search: str | None = Query(None, description="Buscar por código ou nome"),
) -> PaginatedResponse[CourseResponse]:
    from sqlalchemy import or_

    stmt = select(Course)

    if is_active is not None:
        stmt = stmt.where(Course.is_active == is_active)
    if search:
        stmt = stmt.where(
            or_(
                Course.code.ilike(f"%{search}%"),
                Course.name.ilike(f"%{search}%"),
            )
        )

    stmt = stmt.order_by(Course.name)
    items, total = paginate_stmt(db, stmt, limit=pagination["limit"], offset=pagination["offset"])

    return PaginatedResponse[CourseResponse](
        items=[_course_to_response(c, db) for c in items],
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
    request: Request, _: AdminUser, payload: CourseCreateRequest, db: Session = Depends(get_db)
) -> CourseResponse:
    # Check for duplicate code
    existing_code = db.scalar(select(Course).where(func.upper(Course.code) == payload.code.upper()))
    if existing_code:
        raise_api_error(
            status_code=status.HTTP_409_CONFLICT,
            code="COURSE_CODE_CONFLICT",
            message="Já existe um curso com este código.",
        )

    # Check for duplicate name (case-insensitive)
    existing_name = db.scalar(select(Course).where(func.lower(Course.name) == payload.name.lower()))
    if existing_name:
        raise_api_error(
            status_code=status.HTTP_409_CONFLICT,
            code="COURSE_NAME_CONFLICT",
            message="Já existe um curso com este nome.",
        )

    course = Course(**payload.model_dump())
    db.add(course)
    db.flush()

    _create_course_audit_log(db, request, course, "COURSE_CREATED")
    db.commit()
    db.refresh(course)
    return _course_to_response(course, db)


@router.get("/courses/{course_id}", response_model=CourseResponse, summary="Detalhar curso")
def get_course(course_id: UUID, _: AdminUser, db: Session = Depends(get_db)) -> CourseResponse:
    course = get_or_404(db, Course, course_id, message="Curso não encontrado.")
    return _course_to_response(course, db)


@router.get(
    "/courses/{course_id}/subjects",
    response_model=PaginatedResponse[SubjectResponse],
    summary="Listar disciplinas do curso",
)
def list_course_subjects(
    course_id: UUID,
    _: AdminUser,
    db: Session = Depends(get_db),
    pagination: dict[str, int] = Depends(pagination_params),
    is_active: bool | None = Query(None, description="Filtrar por status"),
) -> PaginatedResponse[SubjectResponse]:
    course = get_or_404(db, Course, course_id, message="Curso não encontrado.")

    stmt = select(Subject).where(Subject.course_id == course_id)
    if is_active is not None:
        stmt = stmt.where(Subject.is_active == is_active)
    stmt = stmt.order_by(Subject.term_number.nulls_last(), Subject.code)

    items, total = paginate_stmt(db, stmt, limit=pagination["limit"], offset=pagination["offset"])

    return PaginatedResponse[SubjectResponse](
        items=[_subject_to_response(s, course.name, db) for s in items],
        limit=pagination["limit"],
        offset=pagination["offset"],
        total=total,
    )


@router.patch(
    "/courses/{course_id}", response_model=CourseResponse, summary="Atualizar curso (patch)"
)
def patch_course(
    course_id: UUID,
    request: Request,
    payload: CourseUpdateRequest,
    _: AdminUser,
    db: Session = Depends(get_db),
) -> CourseResponse:
    course = get_or_404(db, Course, course_id, message="Curso não encontrado.")

    update_data = payload.model_dump(exclude_unset=True)

    # Check for duplicate name if being updated
    if "name" in update_data and update_data["name"].lower() != course.name.lower():
        existing = db.scalar(
            select(Course).where(
                func.lower(Course.name) == update_data["name"].lower(),
                Course.id != course_id,
            )
        )
        if existing:
            raise_api_error(
                status_code=status.HTTP_409_CONFLICT,
                code="COURSE_NAME_CONFLICT",
                message="Já existe um curso com este nome.",
            )

    old_values = {k: getattr(course, k) for k in update_data}
    apply_update(course, update_data)

    _create_course_audit_log(
        db, request, course, "COURSE_UPDATED", extra_data={"old_values": str(old_values), "new_values": str(update_data)}
    )
    db.commit()
    db.refresh(course)
    return _course_to_response(course, db)


@router.patch(
    "/courses/{course_id}/deactivate",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Desativar curso",
)
def deactivate_course(
    course_id: UUID, request: Request, _: AdminUser, db: Session = Depends(get_db)
) -> None:
    course = get_or_404(db, Course, course_id, message="Curso não encontrado.")

    if not course.is_active:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="COURSE_ALREADY_INACTIVE",
            message="Curso já está inativo.",
        )

    # Check for active students
    active_students = db.scalar(
        select(func.count()).where(
            Student.course_id == course_id,
            Student.status == StudentStatus.ACTIVE,
        )
    ) or 0

    if active_students > 0:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="COURSE_HAS_ACTIVE_STUDENTS",
            message=f"Curso possui {active_students} aluno(s) ativo(s). Transfira-os antes de desativar.",
            details={"active_students": active_students},
        )

    course.is_active = False
    _create_course_audit_log(db, request, course, "COURSE_DEACTIVATED")
    db.commit()


@router.patch(
    "/courses/{course_id}/activate",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Reativar curso",
)
def activate_course(
    course_id: UUID, request: Request, _: AdminUser, db: Session = Depends(get_db)
) -> None:
    course = get_or_404(db, Course, course_id, message="Curso não encontrado.")

    if course.is_active:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="COURSE_ALREADY_ACTIVE",
            message="Curso já está ativo.",
        )

    course.is_active = True
    _create_course_audit_log(db, request, course, "COURSE_ACTIVATED")
    db.commit()


@router.delete(
    "/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remover curso"
)
def delete_course(
    course_id: UUID, request: Request, _: AdminUser, db: Session = Depends(get_db)
) -> None:
    course = get_or_404(db, Course, course_id, message="Curso não encontrado.")

    # Check if course ever had students (including deleted)
    has_students = db.scalar(select(func.count()).where(Student.course_id == course_id)) or 0

    if has_students > 0:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="COURSE_HAS_HISTORY",
            message="Curso possui histórico de alunos. Desative-o em vez de excluir.",
            details={"total_students": has_students},
        )

    _create_course_audit_log(db, request, course, "COURSE_DELETED")
    db.delete(course)  # CASCADE deletes subjects
    db.commit()


# -------------------- Subjects --------------------


def _subject_to_response(subject: Subject, course_name: str, db: Session) -> SubjectResponse:
    """Convert Subject model to response with aggregations."""
    sections_count = db.scalar(
        select(func.count()).where(Section.subject_id == subject.id)
    ) or 0

    response = SubjectResponse.model_validate(subject)
    response.course_name = course_name
    response.workload_hours = subject.credits * 20
    response.sections_count = sections_count
    return response


def _create_subject_audit_log(
    db: Session, request: Request, subject: Subject, action: str, extra_data: dict | None = None
) -> None:
    """Create audit log entry for subject operations."""
    from app.models.audit import AuditLog

    data = {"subject_id": str(subject.id), "subject_code": subject.code, "subject_name": subject.name}
    if extra_data:
        data.update(extra_data)

    audit = AuditLog(
        actor_user_id=request.state.current_user.id if hasattr(request.state, "current_user") else None,
        action=action,
        entity_type="Subject",
        entity_id=subject.id,
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        data=data,
    )
    db.add(audit)


@router.get(
    "/subjects", response_model=PaginatedResponse[SubjectResponse], summary="Listar disciplinas"
)
def list_subjects(
    _: AdminUser,
    db: Session = Depends(get_db),
    pagination: dict[str, int] = Depends(pagination_params),
    course_id: UUID | None = Query(None, description="Filtrar por curso"),
    is_active: bool | None = Query(True, description="Filtrar por status"),
    search: str | None = Query(None, description="Buscar por código ou nome"),
) -> PaginatedResponse[SubjectResponse]:
    from sqlalchemy import or_

    stmt = select(Subject).join(Course, Subject.course_id == Course.id)

    if course_id is not None:
        stmt = stmt.where(Subject.course_id == course_id)
    if is_active is not None:
        stmt = stmt.where(Subject.is_active == is_active)
    if search:
        stmt = stmt.where(
            or_(
                Subject.code.ilike(f"%{search}%"),
                Subject.name.ilike(f"%{search}%"),
            )
        )

    stmt = stmt.order_by(Subject.term_number.nulls_last(), Subject.code)
    items, total = paginate_stmt(db, stmt, limit=pagination["limit"], offset=pagination["offset"])

    # Build response with course names
    results = []
    course_cache: dict[str, str] = {}
    for subject in items:
        if str(subject.course_id) not in course_cache:
            course = db.get(Course, subject.course_id)
            course_cache[str(subject.course_id)] = course.name if course else ""
        results.append(_subject_to_response(subject, course_cache[str(subject.course_id)], db))

    return PaginatedResponse[SubjectResponse](
        items=results,
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
    request: Request, _: AdminUser, payload: SubjectCreateRequest, db: Session = Depends(get_db)
) -> SubjectResponse:
    # Check if course exists and is active
    course = db.get(Course, payload.course_id)
    if not course:
        raise_api_error(
            status_code=status.HTTP_404_NOT_FOUND,
            code="COURSE_NOT_FOUND",
            message="Curso não encontrado.",
        )
    if not course.is_active:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="COURSE_INACTIVE",
            message="Não é possível criar disciplina para curso inativo.",
        )

    # Validate term_number against course duration
    if payload.term_number and payload.term_number > course.duration_terms:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="INVALID_TERM_NUMBER",
            message=f"Semestre {payload.term_number} excede a duração do curso ({course.duration_terms} semestres).",
        )

    subject = Subject(**payload.model_dump())
    db.add(subject)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise_api_error(
            status_code=status.HTTP_409_CONFLICT,
            code="SUBJECT_CONFLICT",
            message="Já existe uma disciplina com este código neste curso.",
        )

    _create_subject_audit_log(db, request, subject, "SUBJECT_CREATED")
    db.commit()
    db.refresh(subject)
    return _subject_to_response(subject, course.name, db)


@router.get("/subjects/{subject_id}", response_model=SubjectResponse, summary="Detalhar disciplina")
def get_subject(subject_id: UUID, _: AdminUser, db: Session = Depends(get_db)) -> SubjectResponse:
    subject = get_or_404(db, Subject, subject_id, message="Disciplina não encontrada.")
    course = db.get(Course, subject.course_id)
    return _subject_to_response(subject, course.name if course else "", db)


@router.patch(
    "/subjects/{subject_id}", response_model=SubjectResponse, summary="Atualizar disciplina (patch)"
)
def patch_subject(
    subject_id: UUID,
    request: Request,
    payload: SubjectUpdateRequest,
    _: AdminUser,
    db: Session = Depends(get_db),
) -> SubjectResponse:
    subject = get_or_404(db, Subject, subject_id, message="Disciplina não encontrada.")

    update_data = payload.model_dump(exclude_unset=True)

    # Check if trying to change course_id
    if "course_id" in update_data and update_data["course_id"] != subject.course_id:
        # Only allow if no sections exist
        has_sections = db.scalar(select(func.count()).where(Section.subject_id == subject_id)) or 0
        if has_sections > 0:
            raise_api_error(
                status_code=status.HTTP_400_BAD_REQUEST,
                code="SUBJECT_COURSE_CHANGE_BLOCKED",
                message=f"Não é possível mudar o curso de disciplina com {has_sections} turma(s).",
            )
        # Validate new course exists and is active
        new_course = db.get(Course, update_data["course_id"])
        if not new_course:
            raise_api_error(status_code=status.HTTP_404_NOT_FOUND, code="COURSE_NOT_FOUND", message="Curso não encontrado.")
        if not new_course.is_active:
            raise_api_error(
                status_code=status.HTTP_400_BAD_REQUEST,
                code="COURSE_INACTIVE",
                message="Não é possível transferir disciplina para curso inativo.",
            )

    # Validate term_number if provided
    if "term_number" in update_data and update_data["term_number"]:
        course = db.get(Course, update_data.get("course_id", subject.course_id))
        if course and update_data["term_number"] > course.duration_terms:
            raise_api_error(
                status_code=status.HTTP_400_BAD_REQUEST,
                code="INVALID_TERM_NUMBER",
                message=f"Semestre {update_data['term_number']} excede a duração do curso ({course.duration_terms} semestres).",
            )

    old_values = {k: getattr(subject, k) for k in update_data}
    apply_update(subject, update_data)

    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise_api_error(
            status_code=status.HTTP_409_CONFLICT,
            code="SUBJECT_CONFLICT",
            message="Já existe uma disciplina com este código neste curso.",
        )

    _create_subject_audit_log(
        db, request, subject, "SUBJECT_UPDATED", extra_data={"old_values": str(old_values), "new_values": str(update_data)}
    )
    db.commit()
    db.refresh(subject)
    course = db.get(Course, subject.course_id)
    return _subject_to_response(subject, course.name if course else "", db)


@router.patch(
    "/subjects/{subject_id}/deactivate",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Desativar disciplina",
)
def deactivate_subject(
    subject_id: UUID, request: Request, _: AdminUser, db: Session = Depends(get_db)
) -> None:
    subject = get_or_404(db, Subject, subject_id, message="Disciplina não encontrada.")

    if not subject.is_active:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="SUBJECT_ALREADY_INACTIVE",
            message="Disciplina já está inativa.",
        )

    # Check for sections in current term
    active_sections = db.scalar(
        select(func.count())
        .select_from(Section)
        .join(Term, Section.term_id == Term.id)
        .where(Section.subject_id == subject_id, Term.is_current == True)  # noqa: E712
    ) or 0

    if active_sections > 0:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="SUBJECT_HAS_ACTIVE_SECTIONS",
            message=f"Disciplina possui {active_sections} turma(s) no semestre atual.",
            details={"active_sections": active_sections},
        )

    subject.is_active = False
    _create_subject_audit_log(db, request, subject, "SUBJECT_DEACTIVATED")
    db.commit()


@router.patch(
    "/subjects/{subject_id}/activate",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Reativar disciplina",
)
def activate_subject(
    subject_id: UUID, request: Request, _: AdminUser, db: Session = Depends(get_db)
) -> None:
    subject = get_or_404(db, Subject, subject_id, message="Disciplina não encontrada.")

    if subject.is_active:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="SUBJECT_ALREADY_ACTIVE",
            message="Disciplina já está ativa.",
        )

    # Check if course is active
    course = db.get(Course, subject.course_id)
    if course and not course.is_active:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="COURSE_INACTIVE",
            message="Não é possível reativar disciplina de curso inativo.",
        )

    subject.is_active = True
    _create_subject_audit_log(db, request, subject, "SUBJECT_ACTIVATED")
    db.commit()


@router.delete(
    "/subjects/{subject_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remover disciplina"
)
def delete_subject(
    subject_id: UUID, request: Request, _: AdminUser, db: Session = Depends(get_db)
) -> None:
    subject = get_or_404(db, Subject, subject_id, message="Disciplina não encontrada.")

    # Check if subject has any sections (history)
    has_sections = db.scalar(select(func.count()).where(Section.subject_id == subject_id)) or 0

    if has_sections > 0:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="SUBJECT_HAS_HISTORY",
            message="Disciplina possui histórico de turmas. Desative-a em vez de excluir.",
            details={"total_sections": has_sections},
        )

    _create_subject_audit_log(db, request, subject, "SUBJECT_DELETED")
    db.delete(subject)
    db.commit()


# -------------------- Sections --------------------


@router.get("/sections", response_model=PaginatedResponse[SectionResponse], summary="Listar turmas")
def list_sections(
    _: AdminUser,
    db: Session = Depends(get_db),
    pagination: dict[str, int] = Depends(pagination_params),
    term_id: UUID | None = Query(None, description="Filtrar por semestre"),
    subject_id: UUID | None = Query(None, description="Filtrar por disciplina"),
    course_id: UUID | None = Query(None, description="Filtrar por curso"),
) -> PaginatedResponse[SectionResponse]:
    stmt = select(Section).join(Term, Section.term_id == Term.id).order_by(Term.start_date.desc(), Section.code)
    
    if term_id:
        stmt = stmt.where(Section.term_id == term_id)
    if subject_id:
        stmt = stmt.where(Section.subject_id == subject_id)
    if course_id:
        stmt = stmt.join(Subject, Section.subject_id == Subject.id).where(Subject.course_id == course_id)
    
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
    # Check if subject is active
    subject = db.get(Subject, payload.subject_id)
    if subject and not subject.is_active:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="SUBJECT_INACTIVE",
            message="Não é possível criar turma para disciplina inativa.",
        )

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
    
    # Check dependencies before deleting
    dependencies = []
    
    # Check enrollments
    enrollment_count = db.scalar(
        select(func.count()).select_from(SectionEnrollment).where(SectionEnrollment.section_id == section_id)
    ) or 0
    if enrollment_count > 0:
        dependencies.append(f"{enrollment_count} matrícula(s)")
    
    # Check sessions
    session_count = db.scalar(
        select(func.count()).select_from(ClassSession).where(ClassSession.section_id == section_id)
    ) or 0
    if session_count > 0:
        dependencies.append(f"{session_count} aula(s)")
    
    # Check assessments
    assessment_count = db.scalar(
        select(func.count()).select_from(Assessment).where(Assessment.section_id == section_id)
    ) or 0
    if assessment_count > 0:
        dependencies.append(f"{assessment_count} avaliação(ões)")
    
    # Check final grades
    final_grade_count = db.scalar(
        select(func.count()).select_from(FinalGrade).where(FinalGrade.section_id == section_id)
    ) or 0
    if final_grade_count > 0:
        dependencies.append(f"{final_grade_count} nota(s) final(is)")
    
    if dependencies:
        raise_api_error(
            status_code=status.HTTP_409_CONFLICT,
            code="SECTION_HAS_DEPENDENCIES",
            message=f"Não é possível excluir turma com dependências: {', '.join(dependencies)}. Remova primeiro as dependências.",
        )
    
    # Also delete meetings (no foreign key conflict)
    db.execute(delete(SectionMeeting).where(SectionMeeting.section_id == section_id))
    
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

# Import additional models and modules for student business rules
import re
from app.models.user import User, UserRole, UserStatus
from app.models.audit import AuditLog


def _generate_next_ra(db: Session) -> str:
    """Generate next RA based on the highest existing RA."""
    result = db.execute(
        select(func.coalesce(func.max(func.cast(Student.ra, BigInteger)), 107884))
    )
    max_ra = result.scalar()
    return str(max_ra + 1)


def _validate_ra_format(ra: str) -> None:
    """Validate RA format: minimum 6 numeric digits."""
    if not re.match(r"^\d{6,}$", ra):
        raise_api_error(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="INVALID_RA_FORMAT",
            message="RA deve ter no mínimo 6 dígitos numéricos.",
        )


def _create_student_audit_log(
    db: Session,
    admin: User,
    action: str,
    student_id: UUID,
    details: dict,
    request: Request | None = None,
) -> None:
    """Create audit log entry for student operations."""
    log = AuditLog(
        actor_user_id=admin.id,
        action=action,
        entity_type="STUDENT",
        entity_id=student_id,
        data=details,
        ip=request.client.host if request and request.client else None,
        user_agent=request.headers.get("user-agent") if request else None,
    )
    db.add(log)


@router.get("/students", response_model=PaginatedResponse[StudentResponse], summary="Listar alunos")
def list_students(
    _: AdminUser,
    db: Session = Depends(get_db),
    pagination: dict[str, int] = Depends(pagination_params),
    status_filter: str | None = Query(None, alias="status"),
    course_id: UUID | None = None,
    user_id: UUID | None = Query(None, description="Filtrar por user_id específico"),
    ra: str | None = None,
    full_name: str | None = None,
    search: str | None = Query(None, description="Buscar por RA ou nome"),
) -> PaginatedResponse[StudentResponse]:
    """
    Lista alunos com filtros.
    
    - Por padrão, exclui DELETED
    - Use status=ALL para incluir todos
    - Filtre por course_id, ra (ILIKE), full_name (ILIKE)
    - Use search para buscar por RA ou nome
    - Use user_id para buscar um aluno específico
    """
    stmt = select(Student).order_by(Student.created_at.desc())
    
    # Status filter
    if status_filter and status_filter.upper() == "ALL":
        pass  # No filter - include all
    elif status_filter:
        stmt = stmt.where(Student.status == _ensure_enum(status_filter, StudentStatus, field="status"))
    else:
        # Default: exclude DELETED
        stmt = stmt.where(Student.status != StudentStatus.DELETED)
    
    # Additional filters
    if user_id:
        stmt = stmt.where(Student.user_id == user_id)
    if course_id:
        stmt = stmt.where(Student.course_id == course_id)
    if ra:
        stmt = stmt.where(Student.ra.ilike(f"%{ra}%"))
    if full_name:
        stmt = stmt.where(Student.full_name.ilike(f"%{full_name}%"))
    if search:
        stmt = stmt.where(
            (Student.ra.ilike(f"%{search}%")) | (Student.full_name.ilike(f"%{search}%"))
        )
    
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
    admin: AdminUser,
    payload: StudentCreateRequest,
    db: Session = Depends(get_db),
    request: Request = None,
) -> StudentResponse:
    """
    Cria perfil de aluno com validações:
    - Usuário deve existir e ter role STUDENT
    - Usuário deve estar ACTIVE
    - Usuário não pode já ter perfil de aluno
    - Curso deve existir
    - RA auto-gerado se não informado
    - RA deve ter formato válido (6+ dígitos)
    """
    # 1. Verificar se user existe
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise_api_error(
            status_code=status.HTTP_404_NOT_FOUND,
            code="USER_NOT_FOUND",
            message="Usuário não encontrado.",
        )
    
    # 2. Verificar se user tem role STUDENT
    if user.role != UserRole.STUDENT:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="USER_NOT_STUDENT",
            message="Usuário não tem perfil de aluno (role deve ser STUDENT).",
        )
    
    # 3. Verificar se user está ACTIVE
    if user.status != UserStatus.ACTIVE:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="USER_NOT_ACTIVE",
            message="Usuário não está ativo.",
        )
    
    # 4. Verificar se user já tem perfil de aluno
    existing = db.query(Student).filter(Student.user_id == payload.user_id).first()
    if existing:
        raise_api_error(
            status_code=status.HTTP_409_CONFLICT,
            code="STUDENT_ALREADY_EXISTS",
            message="Usuário já possui perfil de aluno.",
        )
    
    # 5. Verificar se curso existe
    course = db.query(Course).filter(Course.id == payload.course_id).first()
    if not course:
        raise_api_error(
            status_code=status.HTTP_404_NOT_FOUND,
            code="COURSE_NOT_FOUND",
            message="Curso não encontrado.",
        )
    
    # 6. Verificar termo de admissão se informado
    if payload.admission_term:
        term = db.query(Term).filter(Term.id == payload.admission_term).first()
        if not term:
            raise_api_error(
                status_code=status.HTTP_404_NOT_FOUND,
                code="TERM_NOT_FOUND",
                message="Termo de admissão não encontrado.",
            )
    
    # 7. Gerar RA se não informado
    data = payload.model_dump()
    if not data.get("ra"):
        data["ra"] = _generate_next_ra(db)
    else:
        _validate_ra_format(data["ra"])
    
    # 8. Criar aluno
    student = Student(**data)
    db.add(student)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise_api_error(
            status_code=status.HTTP_409_CONFLICT,
            code="STUDENT_RA_CONFLICT",
            message="RA já existe. Tente novamente ou informe outro RA.",
        )
    db.refresh(student)
    
    # 9. Auditoria
    _create_student_audit_log(
        db, admin, "STUDENT_CREATED", student.user_id,
        {"ra": student.ra, "full_name": student.full_name, "course_id": str(student.course_id)},
        request,
    )
    db.commit()
    
    return StudentResponse.model_validate(student)


@router.get("/students/{student_id}", response_model=StudentResponse, summary="Detalhar aluno")
def get_student(student_id: UUID, _: AdminUser, db: Session = Depends(get_db)) -> StudentResponse:
    student = get_or_404(db, Student, student_id, message="Aluno não encontrado.")
    return StudentResponse.model_validate(student)


@router.patch(
    "/students/{student_id}", response_model=StudentResponse, summary="Atualizar aluno (patch)"
)
def patch_student(
    student_id: UUID,
    payload: StudentUpdateRequest,
    admin: AdminUser,
    db: Session = Depends(get_db),
    request: Request = None,
) -> StudentResponse:
    """
    Atualiza aluno com validações:
    - Aluno DELETED não pode ser editado (reativar primeiro)
    - user_id não pode ser alterado
    - Transferência de curso registrada em auditoria
    - Alteração de RA registrada em auditoria
    """
    student = get_or_404(db, Student, student_id, message="Aluno não encontrado.")
    
    # 1. Bloquear edição se DELETED
    if student.status == StudentStatus.DELETED:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="STUDENT_DELETED",
            message="Não é possível editar aluno excluído. Reative primeiro.",
        )
    
    data = payload.model_dump(exclude_unset=True)
    old_values = {
        "full_name": student.full_name,
        "course_id": str(student.course_id),
    }
    
    # 2. Bloquear alteração de RA
    if "ra" in data:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="RA_IMMUTABLE",
            message="RA não pode ser alterado após criação.",
        )
    
    # 3. Registrar transferência de curso se alterado
    if "course_id" in data and data["course_id"] and str(data["course_id"]) != str(student.course_id):
        # Verificar se novo curso existe
        new_course = db.query(Course).filter(Course.id == data["course_id"]).first()
        if not new_course:
            raise_api_error(
                status_code=status.HTTP_404_NOT_FOUND,
                code="COURSE_NOT_FOUND",
                message="Curso não encontrado.",
            )
        _create_student_audit_log(
            db, admin, "STUDENT_TRANSFERRED", student_id,
            {"old_course": str(student.course_id), "new_course": str(data["course_id"])},
            request,
        )
    
    # 4. Verificar termo se alterado
    if "admission_term" in data and data["admission_term"]:
        term = db.query(Term).filter(Term.id == data["admission_term"]).first()
        if not term:
            raise_api_error(
                status_code=status.HTTP_404_NOT_FOUND,
                code="TERM_NOT_FOUND",
                message="Termo de admissão não encontrado.",
            )
    
    # 5. Aplicar alterações
    apply_update(student, data)
    db.commit()
    
    # 6. Auditoria geral se houve mudança
    new_values = {
        "full_name": student.full_name,
        "course_id": str(student.course_id),
    }
    if old_values != new_values:
        _create_student_audit_log(
            db, admin, "STUDENT_UPDATED", student_id,
            {"before": old_values, "after": new_values},
            request,
        )
        db.commit()
    
    db.refresh(student)
    return StudentResponse.model_validate(student)


@router.delete(
    "/students/{student_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remover aluno (soft-delete)"
)
def delete_student(
    student_id: UUID,
    admin: AdminUser,
    db: Session = Depends(get_db),
    request: Request = None,
) -> None:
    """
    Soft-delete: marca status como DELETED e preenche deleted_at.
    Dados acadêmicos (matrículas, notas, presenças) são preservados.
    """
    student = get_or_404(db, Student, student_id, message="Aluno não encontrado.")
    
    if student.status == StudentStatus.DELETED:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="STUDENT_ALREADY_DELETED",
            message="Aluno já está excluído.",
        )
    
    previous_status = student.status.value
    student.status = StudentStatus.DELETED
    student.deleted_at = _now_utc()
    
    _create_student_audit_log(
        db, admin, "STUDENT_DELETED", student_id,
        {"previous_status": previous_status, "ra": student.ra, "full_name": student.full_name},
        request,
    )
    db.commit()


@router.post(
    "/students/{student_id}/lock",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Trancar matrícula",
)
def lock_student(
    student_id: UUID,
    admin: AdminUser,
    db: Session = Depends(get_db),
    request: Request = None,
) -> None:
    """Trancar matrícula. Apenas alunos ACTIVE podem ser trancados."""
    student = get_or_404(db, Student, student_id, message="Aluno não encontrado.")
    
    if student.status != StudentStatus.ACTIVE:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="INVALID_STATUS_TRANSITION",
            message="Apenas alunos ACTIVE podem ter matrícula trancada.",
        )
    
    student.status = StudentStatus.LOCKED
    _create_student_audit_log(
        db, admin, "STUDENT_LOCKED", student_id,
        {"ra": student.ra, "full_name": student.full_name},
        request,
    )
    db.commit()


@router.post(
    "/students/{student_id}/graduate",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Marcar como formado",
)
def graduate_student(
    student_id: UUID,
    admin: AdminUser,
    db: Session = Depends(get_db),
    request: Request = None,
) -> None:
    """
    Marcar aluno como formado. Apenas alunos ACTIVE podem ser formados.
    Esta ação é IRREVERSÍVEL.
    """
    from datetime import date as date_type
    
    student = get_or_404(db, Student, student_id, message="Aluno não encontrado.")
    
    if student.status != StudentStatus.ACTIVE:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="INVALID_STATUS_TRANSITION",
            message="Apenas alunos ACTIVE podem ser marcados como formados.",
        )
    
    student.status = StudentStatus.GRADUATED
    student.graduation_date = date_type.today()
    
    _create_student_audit_log(
        db, admin, "STUDENT_GRADUATED", student_id,
        {"ra": student.ra, "full_name": student.full_name, "graduation_date": str(student.graduation_date)},
        request,
    )
    db.commit()


@router.post(
    "/students/{student_id}/reactivate",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Reativar aluno",
)
def reactivate_student(
    student_id: UUID,
    admin: AdminUser,
    db: Session = Depends(get_db),
    request: Request = None,
) -> None:
    """
    Reativar aluno DELETED ou LOCKED.
    Alunos GRADUATED não podem ser reativados.
    """
    student = get_or_404(db, Student, student_id, message="Aluno não encontrado.")
    
    if student.status == StudentStatus.GRADUATED:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="CANNOT_REACTIVATE_GRADUATED",
            message="Alunos formados não podem ser reativados.",
        )
    
    if student.status == StudentStatus.ACTIVE:
        raise_api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="STUDENT_ALREADY_ACTIVE",
            message="Aluno já está ativo.",
        )
    
    previous_status = student.status.value
    student.status = StudentStatus.ACTIVE
    student.deleted_at = None
    
    _create_student_audit_log(
        db, admin, "STUDENT_REACTIVATED", student_id,
        {"previous_status": previous_status, "ra": student.ra, "full_name": student.full_name},
        request,
    )
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
    term_id: UUID | None = Query(None, description="Filtrar por semestre (via turma)"),
    section_id: UUID | None = Query(None, description="Filtrar por turma"),
    student_id: UUID | None = Query(None, description="Filtrar por aluno"),
    status: str | None = Query(None, description="Filtrar por status"),
) -> PaginatedResponse[EnrollmentResponse]:
    stmt = select(SectionEnrollment).order_by(SectionEnrollment.created_at.desc())
    
    if term_id:
        # Filter by term through section
        stmt = stmt.join(Section, SectionEnrollment.section_id == Section.id).where(Section.term_id == term_id)
    if section_id:
        stmt = stmt.where(SectionEnrollment.section_id == section_id)
    if student_id:
        stmt = stmt.where(SectionEnrollment.student_id == student_id)
    if status:
        enrollment_status = _ensure_enum(status, EnrollmentStatus, field="status")
        stmt = stmt.where(SectionEnrollment.status == enrollment_status)
    
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
    
    # Check dependencies: attendance records for this student in this section's sessions
    attendance_count = db.scalar(
        select(func.count())
        .select_from(AttendanceRecord)
        .join(ClassSession, AttendanceRecord.session_id == ClassSession.id)
        .where(
            ClassSession.section_id == enrollment.section_id,
            AttendanceRecord.student_id == enrollment.student_id,
        )
    ) or 0
    
    # Check assessment grades
    grade_count = db.scalar(
        select(func.count())
        .select_from(AssessmentGrade)
        .join(Assessment, AssessmentGrade.assessment_id == Assessment.id)
        .where(
            Assessment.section_id == enrollment.section_id,
            AssessmentGrade.student_id == enrollment.student_id,
        )
    ) or 0
    
    # Check final grades
    final_grade_count = db.scalar(
        select(func.count())
        .select_from(FinalGrade)
        .where(
            FinalGrade.section_id == enrollment.section_id,
            FinalGrade.student_id == enrollment.student_id,
        )
    ) or 0
    
    dependencies = []
    if attendance_count > 0:
        dependencies.append(f"{attendance_count} registro(s) de presença")
    if grade_count > 0:
        dependencies.append(f"{grade_count} nota(s) de avaliação")
    if final_grade_count > 0:
        dependencies.append(f"{final_grade_count} nota(s) final(is)")
    
    if dependencies:
        raise_api_error(
            status_code=status.HTTP_409_CONFLICT,
            code="ENROLLMENT_HAS_DEPENDENCIES",
            message=f"Não é possível excluir matrícula com dependências: {', '.join(dependencies)}. Remova primeiro as dependências.",
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
    session_id: UUID | None = Query(None, description="Filtrar por aula"),
    student_id: UUID | None = Query(None, description="Filtrar por aluno"),
) -> PaginatedResponse[AttendanceResponse]:
    stmt = (
        select(AttendanceRecord, Student.full_name, Student.ra)
        .join(Student, AttendanceRecord.student_id == Student.user_id, isouter=True)
        .order_by(AttendanceRecord.recorded_at.desc())
    )
    
    if session_id:
        stmt = stmt.where(AttendanceRecord.session_id == session_id)
    if student_id:
        stmt = stmt.where(AttendanceRecord.student_id == student_id)
    
    # Count query
    count_stmt = select(func.count()).select_from(AttendanceRecord)
    if session_id:
        count_stmt = count_stmt.where(AttendanceRecord.session_id == session_id)
    if student_id:
        count_stmt = count_stmt.where(AttendanceRecord.student_id == student_id)
    total = db.execute(count_stmt).scalar() or 0
    
    # Paginate
    stmt = stmt.limit(pagination["limit"]).offset(pagination["offset"])
    rows = db.execute(stmt).all()
    
    return PaginatedResponse[AttendanceResponse](
        items=[
            AttendanceResponse(
                id=row.AttendanceRecord.id,
                session_id=row.AttendanceRecord.session_id,
                student_id=row.AttendanceRecord.student_id,
                student_name=row.full_name,
                student_ra=row.ra,
                status=row.AttendanceRecord.status.value,
                recorded_at=row.AttendanceRecord.recorded_at,
                created_at=row.AttendanceRecord.created_at,
                updated_at=row.AttendanceRecord.updated_at,
            )
            for row in rows
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
    
    # Recalcular absences_count e absences_pct no FinalGrade
    session = db.query(ClassSession).filter(ClassSession.id == payload.session_id).first()
    if session:
        _recalculate_attendance_for_student_section(db, payload.student_id, session.section_id)
    
    # Fetch student info
    student = db.execute(select(Student).where(Student.user_id == record.student_id)).scalar_one_or_none()
    return AttendanceResponse(
        id=record.id,
        session_id=record.session_id,
        student_id=record.student_id,
        student_name=student.full_name if student else None,
        student_ra=student.ra if student else None,
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
    
    # Recalcular absences_count e absences_pct no FinalGrade
    session = db.query(ClassSession).filter(ClassSession.id == record.session_id).first()
    if session:
        _recalculate_attendance_for_student_section(db, record.student_id, session.section_id)
    
    # Fetch student info
    student = db.execute(select(Student).where(Student.user_id == record.student_id)).scalar_one_or_none()
    return AttendanceResponse(
        id=record.id,
        session_id=record.session_id,
        student_id=record.student_id,
        student_name=student.full_name if student else None,
        student_ra=student.ra if student else None,
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
    
    # Guardar informações antes de deletar
    student_id = record.student_id
    session = db.query(ClassSession).filter(ClassSession.id == record.session_id).first()
    section_id = session.section_id if session else None
    
    db.delete(record)
    db.commit()
    
    # Recalcular absences_count e absences_pct no FinalGrade
    if section_id:
        _recalculate_attendance_for_student_section(db, student_id, section_id)


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
    assessment_id: str | None = None,
) -> PaginatedResponse[AssessmentGradeResponse]:
    stmt = (
        select(AssessmentGrade, Student.full_name, Student.ra)
        .join(Student, AssessmentGrade.student_id == Student.user_id, isouter=True)
        .order_by(AssessmentGrade.created_at.desc())
    )
    if assessment_id:
        stmt = stmt.where(AssessmentGrade.assessment_id == assessment_id)
    
    # Count query
    count_stmt = select(func.count()).select_from(AssessmentGrade)
    if assessment_id:
        count_stmt = count_stmt.where(AssessmentGrade.assessment_id == assessment_id)
    total = db.execute(count_stmt).scalar() or 0
    
    # Paginate
    stmt = stmt.limit(pagination["limit"]).offset(pagination["offset"])
    rows = db.execute(stmt).all()
    
    return PaginatedResponse[AssessmentGradeResponse](
        items=[
            AssessmentGradeResponse(
                id=row.AssessmentGrade.id,
                assessment_id=row.AssessmentGrade.assessment_id,
                student_id=row.AssessmentGrade.student_id,
                student_name=row.full_name,
                student_ra=row.ra,
                score=row.AssessmentGrade.score,
                created_at=row.AssessmentGrade.created_at,
                updated_at=row.AssessmentGrade.updated_at,
            )
            for row in rows
        ],
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
    # Fetch student info
    student = db.execute(select(Student).where(Student.user_id == grade.student_id)).scalar_one_or_none()
    return AssessmentGradeResponse(
        id=grade.id,
        assessment_id=grade.assessment_id,
        student_id=grade.student_id,
        student_name=student.full_name if student else None,
        student_ra=student.ra if student else None,
        score=grade.score,
        created_at=grade.created_at,
        updated_at=grade.updated_at,
    )


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
    # Fetch student info
    student = db.execute(select(Student).where(Student.user_id == grade.student_id)).scalar_one_or_none()
    return AssessmentGradeResponse(
        id=grade.id,
        assessment_id=grade.assessment_id,
        student_id=grade.student_id,
        student_name=student.full_name if student else None,
        student_ra=student.ra if student else None,
        score=grade.score,
        created_at=grade.created_at,
        updated_at=grade.updated_at,
    )


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
    section_id: str | None = None,
    status: str | None = None,
) -> PaginatedResponse[FinalGradeResponse]:
    stmt = (
        select(FinalGrade, Student.full_name, Student.ra)
        .join(Student, FinalGrade.student_id == Student.user_id, isouter=True)
        .order_by(FinalGrade.created_at.desc())
    )
    if section_id:
        stmt = stmt.where(FinalGrade.section_id == section_id)
    if status:
        stmt = stmt.where(FinalGrade.status == status)
    
    # Count query
    count_stmt = select(func.count()).select_from(FinalGrade)
    if section_id:
        count_stmt = count_stmt.where(FinalGrade.section_id == section_id)
    if status:
        count_stmt = count_stmt.where(FinalGrade.status == status)
    total = db.execute(count_stmt).scalar() or 0
    
    # Paginate
    stmt = stmt.limit(pagination["limit"]).offset(pagination["offset"])
    rows = db.execute(stmt).all()
    
    return PaginatedResponse[FinalGradeResponse](
        items=[
            FinalGradeResponse(
                id=row.FinalGrade.id,
                section_id=row.FinalGrade.section_id,
                student_id=row.FinalGrade.student_id,
                student_name=row.full_name,
                student_ra=row.ra,
                final_score=row.FinalGrade.final_score,
                absences_count=row.FinalGrade.absences_count,
                absences_pct=row.FinalGrade.absences_pct,
                status=row.FinalGrade.status.value,
                calculated_at=row.FinalGrade.calculated_at,
                created_at=row.FinalGrade.created_at,
                updated_at=row.FinalGrade.updated_at,
            )
            for row in rows
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
    # Fetch student info
    student = db.execute(select(Student).where(Student.user_id == grade.student_id)).scalar_one_or_none()
    return FinalGradeResponse(
        id=grade.id,
        section_id=grade.section_id,
        student_id=grade.student_id,
        student_name=student.full_name if student else None,
        student_ra=student.ra if student else None,
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
    # Fetch student info
    student = db.execute(select(Student).where(Student.user_id == grade.student_id)).scalar_one_or_none()
    return FinalGradeResponse(
        id=grade.id,
        section_id=grade.section_id,
        student_id=grade.student_id,
        student_name=student.full_name if student else None,
        student_ra=student.ra if student else None,
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
