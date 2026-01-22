"""
Profile Analytics
Analytics for specific profiles using MongoDB pipelines
"""

import logging
from typing import Dict

from app.models import AnalyticsEvent, Profile
from app.services.analytics.pipelines import build_profile_analytics_pipeline
from app.services.analytics.formatters import (
    format_profile_analytics,
    format_empty_profile_analytics,
)

logger = logging.getLogger(__name__)


async def get_profile_analytics(profile_id: str, user_id: str) -> Dict:
    """
    Get analytics for specific profile using aggregation pipeline

    Args:
        profile_id: Profile ID
        user_id: User ID (for ownership verification)

    Returns:
        Profile analytics with views, visitors, contacts, and activity
    """
    logger.info(f"Getting profile analytics for {profile_id}")

    profile = await Profile.get(profile_id)
    if not profile or profile.user_id != user_id:
        raise PermissionError("Profile not found or access denied")

    pipeline = build_profile_analytics_pipeline(profile_id)
    results = await AnalyticsEvent.aggregate(pipeline).to_list(length=1)

    if not results:
        return format_empty_profile_analytics(profile_id, profile.slug)

    return format_profile_analytics(results[0], profile_id, profile.slug)
