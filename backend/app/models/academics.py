"""
UniFECAF Portal do Aluno - Academic Models
"""

import enum
import uuid
from datetime import date, datetime, time
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Time,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class EnrollmentStatus(str, enum.Enum):
    """Enrollment status."""

    ENROLLED = "ENROLLED"
    LOCKED = "LOCKED"
    DROPPED = "DROPPED"
    COMPLETED = "COMPLETED"


class AttendanceStatus(str, enum.Enum):
    """Attendance status."""

    PRESENT = "PRESENT"
    ABSENT = "ABSENT"
    EXCUSED = "EXCUSED"


class FinalStatus(str, enum.Enum):
    """Final grade status."""

    IN_PROGRESS = "IN_PROGRESS"
    APPROVED = "APPROVED"
    FAILED = "FAILED"


class StudentStatus(str, enum.Enum):
    """Student status."""

    ACTIVE = "ACTIVE"
    LOCKED = "LOCKED"
    GRADUATED = "GRADUATED"
    DELETED = "DELETED"


class DegreeType(str, enum.Enum):
    """Degree type for courses."""

    TECNOLOGO = "TECNOLOGO"
    BACHARELADO = "BACHARELADO"
    LICENCIATURA = "LICENCIATURA"
    TECNICO = "TECNICO"
    POS_GRADUACAO = "POS_GRADUACAO"


class Course(Base):
    """Course model with business rules."""

    __tablename__ = "courses"
    __table_args__ = (
        CheckConstraint("duration_terms >= 1 AND duration_terms <= 20", name="ck_courses_duration"),
        {"schema": "academics"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    degree_type: Mapped[DegreeType] = mapped_column(
        Enum(DegreeType, name="degree_type", schema="academics"),
        nullable=False,
    )
    duration_terms: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    subjects: Mapped[list["Subject"]] = relationship("Subject", back_populates="course")
    students: Mapped[list["Student"]] = relationship("Student", back_populates="course")


class Term(Base):
    """Academic term/semester model."""

    __tablename__ = "terms"
    __table_args__ = (
        CheckConstraint("end_date > start_date", name="ck_terms_dates"),
        {"schema": "academics"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    sections: Mapped[list["Section"]] = relationship("Section", back_populates="term")


class Subject(Base):
    """Subject/discipline model with business rules."""

    __tablename__ = "subjects"
    __table_args__ = (
        UniqueConstraint("course_id", "code", name="uq_subjects_course_code"),
        CheckConstraint("credits >= 1 AND credits <= 20", name="ck_subjects_credits"),
        {"schema": "academics"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("academics.courses.id", ondelete="CASCADE"), nullable=False
    )
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    credits: Mapped[int] = mapped_column(Integer, nullable=False, default=4)
    term_number: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    course: Mapped[Course] = relationship("Course", back_populates="subjects")
    sections: Mapped[list["Section"]] = relationship("Section", back_populates="subject")


class Student(Base):
    """Student profile model."""

    __tablename__ = "students"
    __table_args__ = {"schema": "academics"}

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="RESTRICT"),
        primary_key=True,
    )
    ra: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("academics.courses.id", ondelete="RESTRICT"),
        nullable=False,
    )
    admission_term: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("academics.terms.id", ondelete="SET NULL"),
        nullable=True,
    )
    total_progress: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False, default=Decimal("0.00")
    )
    status: Mapped[StudentStatus] = mapped_column(
        Enum(StudentStatus, name="student_status", schema="academics"),
        nullable=False,
        default=StudentStatus.ACTIVE,
    )
    graduation_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User", back_populates="student", passive_deletes=True
    )  # noqa: F821
    course: Mapped[Course] = relationship("Course", back_populates="students")
    enrollments: Mapped[list["SectionEnrollment"]] = relationship(
        "SectionEnrollment", back_populates="student"
    )
    final_grades: Mapped[list["FinalGrade"]] = relationship("FinalGrade", back_populates="student")
    invoices: Mapped[list["Invoice"]] = relationship("Invoice", back_populates="student")


# Import for type hints - avoid circular import
from app.models.finance import Invoice  # noqa: E402, F401


class Section(Base):
    """Section/turma model - subject offered in a term."""

    __tablename__ = "sections"
    __table_args__ = (
        UniqueConstraint("term_id", "subject_id", "code", name="uq_sections_term_subject_code"),
        {"schema": "academics"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    term_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("academics.terms.id", ondelete="CASCADE"), nullable=False
    )
    subject_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("academics.subjects.id", ondelete="CASCADE"), nullable=False
    )
    code: Mapped[str] = mapped_column(String, nullable=False)
    room_default: Mapped[str | None] = mapped_column(String, nullable=True)
    capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    term: Mapped[Term] = relationship("Term", back_populates="sections")
    subject: Mapped[Subject] = relationship("Subject", back_populates="sections")
    enrollments: Mapped[list["SectionEnrollment"]] = relationship(
        "SectionEnrollment", back_populates="section", passive_deletes=True
    )
    meetings: Mapped[list["SectionMeeting"]] = relationship(
        "SectionMeeting", back_populates="section", passive_deletes=True
    )
    sessions: Mapped[list["ClassSession"]] = relationship(
        "ClassSession", back_populates="section", passive_deletes=True
    )
    assessments: Mapped[list["Assessment"]] = relationship(
        "Assessment", back_populates="section", passive_deletes=True
    )
    final_grades: Mapped[list["FinalGrade"]] = relationship(
        "FinalGrade", back_populates="section", passive_deletes=True
    )


class SectionEnrollment(Base):
    """Student enrollment in a section."""

    __tablename__ = "section_enrollments"
    __table_args__ = (
        UniqueConstraint("student_id", "section_id", name="uq_section_enrollments_student_section"),
        {"schema": "academics"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("academics.students.user_id", ondelete="CASCADE"),
        nullable=False,
    )
    section_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("academics.sections.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[EnrollmentStatus] = mapped_column(
        Enum(EnrollmentStatus, name="enrollment_status", schema="academics"),
        nullable=False,
        default=EnrollmentStatus.ENROLLED,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    student: Mapped[Student] = relationship("Student", back_populates="enrollments")
    section: Mapped[Section] = relationship("Section", back_populates="enrollments")


class SectionMeeting(Base):
    """Weekly schedule pattern for a section."""

    __tablename__ = "section_meetings"
    __table_args__ = (
        CheckConstraint("end_time > start_time", name="ck_section_meetings_times"),
        CheckConstraint("weekday BETWEEN 0 AND 6", name="ck_section_meetings_weekday"),
        {"schema": "academics"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    section_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("academics.sections.id", ondelete="CASCADE"), nullable=False
    )
    weekday: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    room: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    section: Mapped[Section] = relationship("Section", back_populates="meetings")


class ClassSession(Base):
    """Concrete class session on a specific date."""

    __tablename__ = "class_sessions"
    __table_args__ = (
        CheckConstraint("end_time > start_time", name="ck_class_sessions_times"),
        UniqueConstraint(
            "section_id", "session_date", "start_time", name="uq_class_sessions_section_date_time"
        ),
        {"schema": "academics"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    section_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("academics.sections.id", ondelete="CASCADE"), nullable=False
    )
    session_date: Mapped[date] = mapped_column(Date, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    room: Mapped[str | None] = mapped_column(String, nullable=True)
    is_canceled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    section: Mapped[Section] = relationship("Section", back_populates="sessions")
    attendance_records: Mapped[list["AttendanceRecord"]] = relationship(
        "AttendanceRecord", back_populates="session"
    )


class AttendanceRecord(Base):
    """Attendance record for a student in a session."""

    __tablename__ = "attendance_records"
    __table_args__ = (
        UniqueConstraint("session_id", "student_id", name="uq_attendance_records_session_student"),
        {"schema": "academics"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("academics.class_sessions.id", ondelete="CASCADE"),
        nullable=False,
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("academics.students.user_id", ondelete="CASCADE"),
        nullable=False,
    )
    status: Mapped[AttendanceStatus] = mapped_column(
        Enum(AttendanceStatus, name="attendance_status", schema="academics"),
        nullable=False,
    )
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    session: Mapped[ClassSession] = relationship(
        "ClassSession", back_populates="attendance_records"
    )


class Assessment(Base):
    """Assessment/evaluation for a section."""

    __tablename__ = "assessments"
    __table_args__ = (
        CheckConstraint("weight > 0", name="ck_assessments_weight"),
        CheckConstraint("max_score > 0", name="ck_assessments_max_score"),
        {"schema": "academics"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    section_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("academics.sections.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    kind: Mapped[str] = mapped_column(String, nullable=False)
    weight: Mapped[Decimal] = mapped_column(Numeric(6, 3), nullable=False, default=Decimal("1.000"))
    max_score: Mapped[Decimal] = mapped_column(
        Numeric(6, 2), nullable=False, default=Decimal("10.00")
    )
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    section: Mapped[Section] = relationship("Section", back_populates="assessments")
    grades: Mapped[list["AssessmentGrade"]] = relationship(
        "AssessmentGrade", back_populates="assessment"
    )


class AssessmentGrade(Base):
    """Grade for a student on an assessment."""

    __tablename__ = "assessment_grades"
    __table_args__ = (
        CheckConstraint("score >= 0", name="ck_assessment_grades_score"),
        UniqueConstraint(
            "assessment_id", "student_id", name="uq_assessment_grades_assessment_student"
        ),
        {"schema": "academics"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assessment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("academics.assessments.id", ondelete="CASCADE"),
        nullable=False,
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("academics.students.user_id", ondelete="CASCADE"),
        nullable=False,
    )
    score: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    assessment: Mapped[Assessment] = relationship("Assessment", back_populates="grades")


class FinalGrade(Base):
    """Final grade for a student in a section."""

    __tablename__ = "final_grades"
    __table_args__ = (
        UniqueConstraint("section_id", "student_id", name="uq_final_grades_section_student"),
        {"schema": "academics"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    section_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("academics.sections.id", ondelete="CASCADE"), nullable=False
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("academics.students.user_id", ondelete="CASCADE"),
        nullable=False,
    )
    final_score: Mapped[Decimal | None] = mapped_column(Numeric(4, 2), nullable=True)
    absences_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    absences_pct: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False, default=Decimal("0.00")
    )
    status: Mapped[FinalStatus] = mapped_column(
        Enum(FinalStatus, name="final_status", schema="academics"),
        nullable=False,
        default=FinalStatus.IN_PROGRESS,
    )
    calculated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    section: Mapped[Section] = relationship("Section", back_populates="final_grades")
    student: Mapped[Student] = relationship("Student", back_populates="final_grades")
