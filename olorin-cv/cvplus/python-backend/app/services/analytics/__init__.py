"""
Analytics Module
Usage tracking and metrics for CVPlus
"""

from app.services.analytics.cv_metrics import clear_user_analytics, get_cv_metrics
from app.services.analytics.event_tracking import track_event
from app.services.analytics.profile_analytics import get_profile_analytics
from app.services.analytics.service import AnalyticsService
from app.services.analytics.summaries import get_user_summary

__all__ = [
    "AnalyticsService",
    "clear_user_analytics",
    "get_cv_metrics",
    "get_profile_analytics",
    "get_user_summary",
    "track_event",
]
