"""
Analytics Service
Main service class for analytics operations with aggregation pipelines
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, Optional

from app.models import AnalyticsEvent, CV, Profile
from app.services.analytics.event_tracking import track_event
from app.services.analytics.formatters import (
    format_cv_metrics,
    format_empty_profile_analytics,
    format_empty_summary,
    format_profile_analytics,
    format_user_summary,
)
from app.services.analytics.pipelines import (
    build_cv_metrics_pipeline,
    build_profile_analytics_pipeline,
    build_user_summary_pipeline,
)

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Service for analytics operations with MongoDB aggregation pipelines"""

    async def track_event(
        self,
        event_type: str,
        user_id: Optional[str] = None,
        cv_id: Optional[str] = None,
        profile_id: Optional[str] = None,
        visitor_id: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> AnalyticsEvent:
        """Track analytics event"""
        return await track_event(
            event_type=event_type,
            user_id=user_id,
            cv_id=cv_id,
            profile_id=profile_id,
            visitor_id=visitor_id,
            metadata=metadata,
        )

    async def get_user_summary(self, user_id: str, days: int = 30) -> Dict:
        """Get analytics summary for user using aggregation pipeline"""
        logger.info(f"Getting analytics summary for user {user_id}", extra={"days": days})

        start_date = datetime.utcnow() - timedelta(days=days)
        pipeline = build_user_summary_pipeline(user_id, start_date)
        results = await AnalyticsEvent.aggregate(pipeline).to_list(length=1)

        if not results:
            return format_empty_summary(days, start_date)

        return format_user_summary(results[0], days, start_date)

    async def get_profile_analytics(self, profile_id: str, user_id: str) -> Dict:
        """Get analytics for specific profile using aggregation pipeline"""
        logger.info(f"Getting profile analytics for {profile_id}")

        profile = await Profile.get(profile_id)
        if not profile or profile.user_id != user_id:
            raise PermissionError("Profile not found or access denied")

        pipeline = build_profile_analytics_pipeline(profile_id)
        results = await AnalyticsEvent.aggregate(pipeline).to_list(length=1)

        if not results:
            return format_empty_profile_analytics(profile_id, profile.slug)

        return format_profile_analytics(results[0], profile_id, profile.slug)

    async def get_cv_metrics(self, cv_id: str, user_id: str) -> Dict:
        """Get metrics for specific CV using aggregation pipeline"""
        logger.info(f"Getting CV metrics for {cv_id}")

        cv = await CV.get(cv_id)
        if not cv or cv.user_id != user_id:
            raise PermissionError("CV not found or access denied")

        pipeline = build_cv_metrics_pipeline(cv_id)
        results = await AnalyticsEvent.aggregate(pipeline).to_list(length=100)

        from app.models import CVAnalysis
        analysis = None
        if cv.analysis_id:
            analysis = await CVAnalysis.get(cv.analysis_id)

        return format_cv_metrics(results, cv_id, cv, analysis)

    async def clear_user_analytics(self, user_id: str):
        """Clear all analytics data for user (admin only)"""
        logger.warning(f"Clearing analytics data for user {user_id}")
        await AnalyticsEvent.find(AnalyticsEvent.user_id == user_id).delete()
        logger.info(f"Analytics data cleared for user {user_id}")
