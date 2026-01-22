"""
Analytics Service
Business logic for usage tracking and metrics
"""

import logging
from typing import Optional, Dict, List
from datetime import datetime, timedelta

from app.models import AnalyticsEvent, Profile, CV
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class AnalyticsService:
    """Service for analytics operations"""

    async def track_event(
        self,
        event_type: str,
        user_id: Optional[str] = None,
        cv_id: Optional[str] = None,
        profile_id: Optional[str] = None,
        visitor_id: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> AnalyticsEvent:
        """
        Track analytics event

        Args:
            event_type: Event type (view, download, contact, etc.)
            user_id: User ID (if authenticated)
            cv_id: CV ID (if applicable)
            profile_id: Profile ID (if applicable)
            visitor_id: Anonymous visitor ID (for public views)
            metadata: Additional event metadata

        Returns:
            Created event
        """
        logger.debug(f"Tracking event: {event_type}", extra={
            "user_id": user_id,
            "cv_id": cv_id,
            "profile_id": profile_id,
        })

        metadata = metadata or {}

        event = AnalyticsEvent(
            event_type=event_type,
            user_id=user_id,
            cv_id=cv_id,
            profile_id=profile_id,
            visitor_id=visitor_id,
            ip_address=metadata.get("ip_address"),
            user_agent=metadata.get("user_agent"),
            referrer=metadata.get("referrer"),
            utm_source=metadata.get("utm_source"),
            utm_medium=metadata.get("utm_medium"),
            utm_campaign=metadata.get("utm_campaign"),
            country=metadata.get("country"),
            city=metadata.get("city"),
            metadata=metadata,
        )

        await event.save()

        return event

    async def get_user_summary(
        self,
        user_id: str,
        days: int = 30
    ) -> Dict:
        """
        Get analytics summary for user

        Args:
            user_id: User ID
            days: Number of days to include

        Returns:
            Analytics summary
        """
        logger.info(f"Getting analytics summary for user {user_id}", extra={
            "days": days,
        })

        start_date = datetime.utcnow() - timedelta(days=days)

        # Query events
        events = await AnalyticsEvent.find(
            AnalyticsEvent.user_id == user_id,
            AnalyticsEvent.created_at >= start_date
        ).to_list()

        # Aggregate metrics
        total_views = sum(1 for e in events if e.event_type == "view")
        total_downloads = sum(1 for e in events if e.event_type == "download")

        # Count unique visitors (by visitor_id)
        unique_visitors = len(set(
            e.visitor_id for e in events
            if e.visitor_id and e.event_type == "view"
        ))

        # Top sources
        sources = {}
        for event in events:
            if event.referrer:
                sources[event.referrer] = sources.get(event.referrer, 0) + 1

        top_sources = [
            {"source": source, "count": count}
            for source, count in sorted(sources.items(), key=lambda x: x[1], reverse=True)[:5]
        ]

        return {
            "total_views": total_views,
            "total_downloads": total_downloads,
            "unique_visitors": unique_visitors,
            "top_sources": top_sources,
            "time_period": f"Last {days} days",
            "start_date": start_date.isoformat(),
            "end_date": datetime.utcnow().isoformat(),
        }

    async def get_profile_analytics(
        self,
        profile_id: str,
        user_id: str
    ) -> Dict:
        """
        Get analytics for specific profile

        Args:
            profile_id: Profile ID
            user_id: User ID (for ownership verification)

        Returns:
            Profile analytics
        """
        logger.info(f"Getting profile analytics for {profile_id}")

        # Verify ownership
        profile = await Profile.get(profile_id)
        if not profile or profile.user_id != user_id:
            raise PermissionError("Profile not found or access denied")

        # Query events
        events = await AnalyticsEvent.find(
            AnalyticsEvent.profile_id == profile_id
        ).to_list()

        # Calculate metrics
        total_views = sum(1 for e in events if e.event_type == "view")
        unique_visitors = len(set(
            e.visitor_id for e in events
            if e.visitor_id and e.event_type == "view"
        ))
        contact_requests = sum(1 for e in events if e.event_type == "contact")

        # Recent activity (last 10 events)
        recent_events = sorted(events, key=lambda e: e.created_at, reverse=True)[:10]
        recent_activity = [
            {
                "type": e.event_type,
                "timestamp": e.created_at.isoformat(),
                "source": e.referrer or "direct",
            }
            for e in recent_events
        ]

        return {
            "profile_id": profile_id,
            "slug": profile.slug,
            "total_views": total_views,
            "unique_visitors": unique_visitors,
            "contact_requests": contact_requests,
            "recent_activity": recent_activity,
        }

    async def get_cv_metrics(
        self,
        cv_id: str,
        user_id: str
    ) -> Dict:
        """
        Get metrics for specific CV

        Args:
            cv_id: CV ID
            user_id: User ID (for ownership verification)

        Returns:
            CV metrics
        """
        logger.info(f"Getting CV metrics for {cv_id}")

        # Verify ownership
        cv = await CV.get(cv_id)
        if not cv or cv.user_id != user_id:
            raise PermissionError("CV not found or access denied")

        # Query events
        events = await AnalyticsEvent.find(
            AnalyticsEvent.cv_id == cv_id
        ).to_list()

        # Calculate metrics
        views = sum(1 for e in events if e.event_type == "view")
        downloads = sum(1 for e in events if e.event_type == "download")

        # Get analysis scores if available
        from app.models import CVAnalysis
        analysis = None
        if cv.analysis_id:
            analysis = await CVAnalysis.get(cv.analysis_id)

        return {
            "cv_id": cv_id,
            "analysis_score": analysis.ats_score if analysis else None,
            "completeness": analysis.completeness_score if analysis else None,
            "views": views,
            "downloads": downloads,
            "last_updated": cv.updated_at.isoformat(),
            "created_at": cv.created_at.isoformat(),
        }

    async def clear_user_analytics(self, user_id: str):
        """Clear all analytics data for user (admin only)"""

        logger.warning(f"Clearing analytics data for user {user_id}")

        # Delete all events
        await AnalyticsEvent.find(
            AnalyticsEvent.user_id == user_id
        ).delete()

        logger.info(f"Analytics data cleared for user {user_id}")
