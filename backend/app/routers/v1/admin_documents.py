"""
UniFECAF Portal do Aluno - API v1 Admin Documents Router.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from starlette import status

from app.core.database import get_db
from app.core.deps import AdminUser, CurrentUser, pagination_params
from app.core.errors import raise_api_error
from app.db.utils import apply_update, get_or_404, paginate_stmt
from app.models.academics import Student
from app.models.documents import DocumentStatus, DocumentType, StudentDocument
from app.models.user import User
from app.schemas.admin_documents import (
    AdminDocumentStatsResponse,
    AdminStudentDocumentCreateRequest,
    AdminStudentDocumentGenerateRequest,
    AdminStudentDocumentResponse,
    AdminStudentDocumentUpdateRequest,
)
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/api/v1/admin", tags=["Admin - Documents"])


def _parse_doc_type(value: str) -> DocumentType:
    try:
        return DocumentType(value)
    except ValueError:
        raise_api_error(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="VALIDATION_ERROR",
            message="doc_type inválido.",
            details={"allowed": [d.value for d in DocumentType]},
        )


def _parse_doc_status(value: str) -> DocumentStatus:
    try:
        return DocumentStatus(value)
    except ValueError:
        raise_api_error(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="VALIDATION_ERROR",
            message="status inválido.",
            details={"allowed": [s.value for s in DocumentStatus]},
        )


def _enrich_document(doc: StudentDocument, db: Session) -> dict:
    """Enrich document with student data."""
    data = {
        "id": doc.id,
        "student_id": doc.student_id,
        "doc_type": doc.doc_type.value if doc.doc_type else None,
        "status": doc.status.value if doc.status else None,
        "title": doc.title,
        "description": doc.description,
        "file_url": doc.file_url,
        "file_size": doc.file_size,
        "file_type": doc.file_type,
        "generated_at": doc.generated_at,
        "requested_at": doc.requested_at,
        "requested_by": doc.requested_by,
        "created_at": doc.created_at,
        "updated_at": doc.updated_at,
    }

    # Enrich with student data
    student = db.query(Student).filter(Student.user_id == doc.student_id).first()
    if student:
        data["student_name"] = student.full_name
        data["student_ra"] = student.ra

    # Enrich with requester name
    if doc.requested_by:
        requester_student = db.query(Student).filter(Student.user_id == doc.requested_by).first()
        if requester_student:
            data["requested_by_name"] = requester_student.full_name
        else:
            # Fallback to email for admin users
            requester_user = db.query(User).filter(User.id == doc.requested_by).first()
            if requester_user:
                data["requested_by_name"] = requester_user.email.split('@')[0]

    return data


# --- Statistics endpoint ---
@router.get(
    "/student-documents/stats",
    response_model=AdminDocumentStatsResponse,
    summary="Estatísticas de documentos",
)
def get_document_stats(
    _: AdminUser,
    db: Session = Depends(get_db),
) -> AdminDocumentStatsResponse:
    """Get document statistics."""
    total = db.query(func.count(StudentDocument.id)).scalar() or 0

    # By status
    by_status_rows = (
        db.query(StudentDocument.status, func.count(StudentDocument.id))
        .group_by(StudentDocument.status)
        .all()
    )
    by_status = {str(row[0].value): row[1] for row in by_status_rows}

    # By type
    by_type_rows = (
        db.query(StudentDocument.doc_type, func.count(StudentDocument.id))
        .group_by(StudentDocument.doc_type)
        .all()
    )
    by_type = {str(row[0].value): row[1] for row in by_type_rows}

    # Counts
    generating = db.query(func.count(StudentDocument.id)).filter(
        StudentDocument.status == DocumentStatus.GENERATING
    ).scalar() or 0

    error = db.query(func.count(StudentDocument.id)).filter(
        StudentDocument.status == DocumentStatus.ERROR
    ).scalar() or 0

    # Recent requests (last 7 days)
    seven_days_ago = datetime.now(UTC) - timedelta(days=7)
    recent = db.query(func.count(StudentDocument.id)).filter(
        StudentDocument.requested_at >= seven_days_ago
    ).scalar() or 0

    return AdminDocumentStatsResponse(
        total_documents=total,
        by_status=by_status,
        by_type=by_type,
        generating_count=generating,
        error_count=error,
        recent_requests=recent,
    )


@router.get(
    "/student-documents",
    response_model=PaginatedResponse[AdminStudentDocumentResponse],
    summary="Listar documentos de alunos",
)
def list_student_documents(
    _: AdminUser,
    db: Session = Depends(get_db),
    pagination: dict[str, int] = Depends(pagination_params),
    student_id: UUID | None = Query(None, description="Filtrar por aluno"),
    doc_type: str | None = Query(None, description="Filtrar por tipo (DECLARATION, STUDENT_CARD, TRANSCRIPT)"),
    status: str | None = Query(None, description="Filtrar por status (AVAILABLE, GENERATING, ERROR)"),
    search: str | None = Query(None, description="Busca em title, description ou nome do aluno"),
) -> PaginatedResponse[AdminStudentDocumentResponse]:
    stmt = select(StudentDocument).order_by(StudentDocument.created_at.desc())

    # Apply filters
    if student_id:
        stmt = stmt.where(StudentDocument.student_id == student_id)
    if doc_type:
        try:
            stmt = stmt.where(StudentDocument.doc_type == DocumentType(doc_type))
        except ValueError:
            pass
    if status:
        try:
            stmt = stmt.where(StudentDocument.status == DocumentStatus(status))
        except ValueError:
            pass

    # Search filter (title, description, or student name)
    if search:
        search_term = f"%{search}%"
        # Get student IDs matching the search
        matching_students = (
            db.query(Student.user_id)
            .join(User, Student.user_id == User.id)
            .filter(User.name.ilike(search_term))
            .all()
        )
        student_ids = [s[0] for s in matching_students]

        if student_ids:
            stmt = stmt.where(
                (StudentDocument.title.ilike(search_term)) |
                (StudentDocument.description.ilike(search_term)) |
                (StudentDocument.student_id.in_(student_ids))
            )
        else:
            stmt = stmt.where(
                (StudentDocument.title.ilike(search_term)) |
                (StudentDocument.description.ilike(search_term))
            )

    items, total = paginate_stmt(db, stmt, limit=pagination["limit"], offset=pagination["offset"])

    # Enrich each item
    enriched_items = [
        AdminStudentDocumentResponse(**_enrich_document(doc, db))
        for doc in items
    ]

    return PaginatedResponse[AdminStudentDocumentResponse](
        items=enriched_items,
        limit=pagination["limit"],
        offset=pagination["offset"],
        total=total,
    )


@router.post(
    "/student-documents",
    response_model=AdminStudentDocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar documento de aluno",
)
def create_student_document(
    admin: CurrentUser,
    payload: AdminStudentDocumentCreateRequest,
    db: Session = Depends(get_db),
) -> AdminStudentDocumentResponse:
    doc = StudentDocument(
        student_id=payload.student_id,
        doc_type=_parse_doc_type(payload.doc_type),
        status=_parse_doc_status(payload.status),
        title=payload.title,
        description=payload.description,
        file_url=payload.file_url,
        file_size=payload.file_size,
        file_type=payload.file_type,
        generated_at=payload.generated_at,
        requested_at=datetime.now(UTC),
        requested_by=admin.id,
    )
    db.add(doc)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise_api_error(
            status_code=status.HTTP_409_CONFLICT,
            code="STUDENT_DOCUMENT_CONFLICT",
            message="Conflito ao criar documento (student+doc_type deve ser único).",
        )
    db.refresh(doc)
    return AdminStudentDocumentResponse(**_enrich_document(doc, db))


@router.post(
    "/student-documents/generate",
    response_model=AdminStudentDocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Solicitar geração de documento",
)
def generate_student_document(
    admin: CurrentUser,
    payload: AdminStudentDocumentGenerateRequest,
    db: Session = Depends(get_db),
) -> AdminStudentDocumentResponse:
    """
    Request generation of a new document for a student.
    Creates the document with GENERATING status.
    """
    # Check if student exists
    student = db.query(Student).filter(Student.user_id == payload.student_id).first()
    if not student:
        raise_api_error(
            status_code=status.HTTP_404_NOT_FOUND,
            code="STUDENT_NOT_FOUND",
            message="Aluno não encontrado.",
        )

    doc = StudentDocument(
        student_id=payload.student_id,
        doc_type=_parse_doc_type(payload.doc_type),
        status=DocumentStatus.GENERATING,
        title=payload.title or f"Documento {payload.doc_type}",
        description=payload.description,
        requested_at=datetime.now(UTC),
        requested_by=admin.id,
    )
    db.add(doc)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise_api_error(
            status_code=status.HTTP_409_CONFLICT,
            code="STUDENT_DOCUMENT_CONFLICT",
            message="Documento deste tipo já existe para o aluno.",
        )
    db.refresh(doc)
    return AdminStudentDocumentResponse(**_enrich_document(doc, db))


@router.get(
    "/student-documents/{doc_id}",
    response_model=AdminStudentDocumentResponse,
    summary="Detalhar documento de aluno",
)
def get_student_document(
    doc_id: UUID, _: AdminUser, db: Session = Depends(get_db)
) -> AdminStudentDocumentResponse:
    doc = get_or_404(db, StudentDocument, doc_id, message="Documento não encontrado.")
    return AdminStudentDocumentResponse(**_enrich_document(doc, db))


@router.patch(
    "/student-documents/{doc_id}",
    response_model=AdminStudentDocumentResponse,
    summary="Atualizar documento de aluno (patch)",
)
def patch_student_document(
    doc_id: UUID,
    payload: AdminStudentDocumentUpdateRequest,
    _: AdminUser,
    db: Session = Depends(get_db),
) -> AdminStudentDocumentResponse:
    doc = get_or_404(db, StudentDocument, doc_id, message="Documento não encontrado.")
    data = payload.model_dump(exclude_unset=True)
    if "status" in data and data["status"]:
        data["status"] = _parse_doc_status(data["status"])
    apply_update(doc, data)
    db.commit()
    db.refresh(doc)
    return AdminStudentDocumentResponse(**_enrich_document(doc, db))


@router.delete(
    "/student-documents/{doc_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remover documento de aluno",
)
def delete_student_document(doc_id: UUID, _: AdminUser, db: Session = Depends(get_db)) -> None:
    doc = get_or_404(db, StudentDocument, doc_id, message="Documento não encontrado.")
    db.delete(doc)
    db.commit()
