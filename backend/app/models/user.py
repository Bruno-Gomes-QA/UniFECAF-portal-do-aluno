"""
UniFECAF Portal do Aluno - User Model (auth.users)
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UserRole(str, enum.Enum):
    """User roles."""

    STUDENT = "STUDENT"
    STAFF = "STAFF"
    ADMIN = "ADMIN"


class UserStatus(str, enum.Enum):
    """User status."""

    ACTIVE = "ACTIVE"
    INVITED = "INVITED"
    SUSPENDED = "SUSPENDED"


class User(Base):
    """User model - corresponds to auth.users table."""

    __tablename__ = "users"
    __table_args__ = {"schema": "auth"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", schema="auth"),
        nullable=False,
        default=UserRole.STUDENT,
    )
    status: Mapped[UserStatus] = mapped_column(
        Enum(UserStatus, name="user_status", schema="auth"),
        nullable=False,
        default=UserStatus.ACTIVE,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    student: Mapped["Student"] = relationship(  # noqa: F821
        "Student", back_populates="user", uselist=False
    )
    notifications: Mapped[list["UserNotification"]] = relationship(  # noqa: F821
        "UserNotification", back_populates="user"
    )

    def __repr__(self) -> str:
        return f"<User {self.email}>"
