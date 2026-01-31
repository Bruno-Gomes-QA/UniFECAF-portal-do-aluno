"""
UniFECAF Portal do Aluno - API v1 Admin Documents Router.
"""

from __future__ import annotations

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
from app.models.documents import DocumentStatus, DocumentType, StudentDocument
from app.schemas.admin_documents import (
    AdminStudentDocumentCreateRequest,
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


@router.get(
    "/student-documents",
    response_model=PaginatedResponse[AdminStudentDocumentResponse],
    summary="Listar documentos de alunos",
)
def list_student_documents(
    _: AdminUser,
    db: Session = Depends(get_db),
    pagination: dict[str, int] = Depends(pagination_params),
) -> PaginatedResponse[AdminStudentDocumentResponse]:
    stmt = select(StudentDocument).order_by(StudentDocument.created_at.desc())
    items, total = paginate_stmt(db, stmt, limit=pagination["limit"], offset=pagination["offset"])
    return PaginatedResponse[AdminStudentDocumentResponse](
        items=[AdminStudentDocumentResponse.model_validate(d) for d in items],
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
    _: AdminUser,
    payload: AdminStudentDocumentCreateRequest,
    db: Session = Depends(get_db),
) -> AdminStudentDocumentResponse:
    doc = StudentDocument(
        student_id=payload.student_id,
        doc_type=_parse_doc_type(payload.doc_type),
        status=_parse_doc_status(payload.status),
        title=payload.title,
        file_url=payload.file_url,
        generated_at=payload.generated_at,
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
    return AdminStudentDocumentResponse.model_validate(doc)


@router.get(
    "/student-documents/{doc_id}",
    response_model=AdminStudentDocumentResponse,
    summary="Detalhar documento de aluno",
)
def get_student_document(
    doc_id: UUID, _: AdminUser, db: Session = Depends(get_db)
) -> AdminStudentDocumentResponse:
    doc = get_or_404(db, StudentDocument, doc_id, message="Documento não encontrado.")
    return AdminStudentDocumentResponse.model_validate(doc)


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
    return AdminStudentDocumentResponse.model_validate(doc)


@router.delete(
    "/student-documents/{doc_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remover documento de aluno",
)
def delete_student_document(doc_id: UUID, _: AdminUser, db: Session = Depends(get_db)) -> None:
    doc = get_or_404(db, StudentDocument, doc_id, message="Documento não encontrado.")
    db.delete(doc)
    db.commit()
