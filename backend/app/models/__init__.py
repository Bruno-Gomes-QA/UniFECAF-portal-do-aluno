"""
UniFECAF Portal do Aluno - SQLAlchemy Models
"""

from app.models.academics import (
    Assessment,
    AssessmentGrade,
    AttendanceRecord,
    ClassSession,
    Course,
    DegreeType,
    FinalGrade,
    Section,
    SectionEnrollment,
    SectionMeeting,
    Student,
    Subject,
    Term,
)
from app.models.audit import AuditLog
from app.models.auth import JwtSession
from app.models.documents import StudentDocument
from app.models.finance import Invoice, Payment
from app.models.notifications import (
    Notification,
    NotificationPreference,
    UserNotification,
)
from app.models.user import User

__all__ = [
    # Auth
    "User",
    "JwtSession",
    # Academics
    "Course",
    "DegreeType",
    "Term",
    "Subject",
    "Student",
    "Section",
    "SectionEnrollment",
    "SectionMeeting",
    "ClassSession",
    "AttendanceRecord",
    "Assessment",
    "AssessmentGrade",
    "FinalGrade",
    # Finance
    "Invoice",
    "Payment",
    # Notifications
    "Notification",
    "UserNotification",
    "NotificationPreference",
    # Documents
    "StudentDocument",
    # Audit
    "AuditLog",
]
