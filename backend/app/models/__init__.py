"""
UniFECAF Portal do Aluno - SQLAlchemy Models
"""

from app.models.user import User
from app.models.academics import (
    Campus,
    Course,
    Term,
    Subject,
    Student,
    Section,
    SectionEnrollment,
    SectionMeeting,
    ClassSession,
    AttendanceRecord,
    Assessment,
    AssessmentGrade,
    FinalGrade,
)
from app.models.finance import Invoice, Payment
from app.models.notifications import (
    Notification,
    UserNotification,
    NotificationPreference,
)
from app.models.documents import StudentDocument

__all__ = [
    # Auth
    "User",
    # Academics
    "Campus",
    "Course",
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
]
