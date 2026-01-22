"""
Analytics Service - Backward Compatibility Module
Re-exports from app.services.analytics for backward compatibility

DEPRECATED: Import directly from app.services.analytics instead
"""

from app.services.analytics import (
    AnalyticsService,
    clear_user_analytics,
    get_cv_metrics,
    get_profile_analytics,
    get_user_summary,
    track_event,
)

__all__ = [
    "AnalyticsService",
    "clear_user_analytics",
    "get_cv_metrics",
    "get_profile_analytics",
    "get_user_summary",
    "track_event",
]
