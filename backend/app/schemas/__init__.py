"""
UniFECAF Portal do Aluno - Pydantic Schemas
"""

from app.schemas.auth import LoginRequest, LoginResponse, UserResponse
from app.schemas.home import (
    HomeResponse,
    StudentInfo,
    CourseInfo,
    GradeSummary,
    SubjectGrade,
    FinancialSummary,
    InvoiceInfo,
    TodayAgenda,
    ClassInfo,
    NotificationInfo,
    QuickAction,
)

__all__ = [
    # Auth
    "LoginRequest",
    "LoginResponse",
    "UserResponse",
    # Home
    "HomeResponse",
    "StudentInfo",
    "CourseInfo",
    "GradeSummary",
    "SubjectGrade",
    "FinancialSummary",
    "InvoiceInfo",
    "TodayAgenda",
    "ClassInfo",
    "NotificationInfo",
    "QuickAction",
]
