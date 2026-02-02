"""
UniFECAF Portal do Aluno - Document Models
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DocumentType(str, enum.Enum):
    """Document type."""

    DECLARATION = "DECLARATION"
    STUDENT_CARD = "STUDENT_CARD"
    TRANSCRIPT = "TRANSCRIPT"


class DocumentStatus(str, enum.Enum):
    """Document status."""

    AVAILABLE = "AVAILABLE"
    GENERATING = "GENERATING"
    ERROR = "ERROR"


class StudentDocument(Base):
    """Student document model."""

    __tablename__ = "student_documents"
    __table_args__ = (
        UniqueConstraint("student_id", "doc_type", name="uq_student_documents_student_type"),
        {"schema": "documents"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("academics.students.user_id", ondelete="CASCADE"),
        nullable=False,
    )
    doc_type: Mapped[DocumentType] = mapped_column(
        Enum(DocumentType, name="document_type", schema="documents"),
        nullable=False,
    )
    status: Mapped[DocumentStatus] = mapped_column(
        Enum(DocumentStatus, name="document_status", schema="documents"),
        nullable=False,
        default=DocumentStatus.AVAILABLE,
    )
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_url: Mapped[str | None] = mapped_column(String, nullable=True)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    file_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    requested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    requested_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
