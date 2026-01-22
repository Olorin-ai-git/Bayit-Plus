"""
MongoDB Document Models
Beanie ODM models for CVPlus
"""

from app.models.cv import CV, CVAnalysis
from app.models.profile import Profile, ContactRequest
from app.models.analytics import AnalyticsEvent
from app.models.user import User

__all__ = [
    "CV",
    "CVAnalysis",
    "Profile",
    "ContactRequest",
    "AnalyticsEvent",
    "User",
]
