"""
User-facing REST API endpoints for live feature quota
Allows users to check their usage stats and availability
"""

import logging

from fastapi import APIRouter, Depends, HTTPException

from app.core.security import get_current_active_user
from app.models.live_feature_quota import FeatureType, UsageStats
from app.models.user import User
from app.services.live_feature_quota_service import LiveFeatureQuotaService

router = APIRouter(prefix="/live/quota", tags=["Live Feature Quota"])
logger = logging.getLogger(__name__)


@router.get("/my-usage", response_model=UsageStats)
async def get_my_usage(current_user: User = Depends(get_current_active_user)):
    """
    Get current user's live feature usage statistics.

    Returns:
        UsageStats with current usage, limits, and availability for both subtitles and dubbing
    """
    try:
        stats = await LiveFeatureQuotaService.get_usage_stats(str(current_user.id))
        return UsageStats(**stats)
    except Exception as e:
        logger.error(f"Error fetching usage stats for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch usage stats")


@router.get("/check/{feature_type}")
async def check_availability(
    feature_type: FeatureType,
    current_user: User = Depends(get_current_active_user),
):
    """
    Check if user can start a new live feature session.

    Args:
        feature_type: Type of feature to check (subtitle or dubbing)

    Returns:
        {
            "allowed": bool,
            "error": str | null,
            "usage": UsageStats
        }
    """
    try:
        allowed, error_msg, usage_stats = await LiveFeatureQuotaService.check_quota(
            str(current_user.id),
            feature_type,
            estimated_duration_minutes=1.0,
        )

        return {
            "allowed": allowed,
            "error": error_msg,
            "usage": usage_stats,
        }
    except Exception as e:
        logger.error(f"Error checking availability for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to check availability")


@router.get("/session-history")
async def get_session_history(
    limit: int = 20,
    offset: int = 0,
    current_user: User = Depends(get_current_active_user),
):
    """
    Get user's recent live feature usage sessions.

    Args:
        limit: Maximum number of sessions to return (default 20, max 100)
        offset: Number of sessions to skip (for pagination)

    Returns:
        {
            "sessions": [...],
            "total": int,
            "limit": int,
            "offset": int
        }
    """
    try:
        from app.models.live_feature_quota import LiveFeatureUsageSession

        # Enforce max limit
        limit = min(limit, 100)

        # Query sessions for user
        query = LiveFeatureUsageSession.find(
            LiveFeatureUsageSession.user_id == str(current_user.id)
        ).sort([("started_at", -1)])

        total = await query.count()
        sessions = await query.skip(offset).limit(limit).to_list()

        return {
            "sessions": [
                {
                    "session_id": s.session_id,
                    "feature_type": s.feature_type,
                    "channel_id": s.channel_id,
                    "started_at": s.started_at,
                    "ended_at": s.ended_at,
                    "duration_seconds": s.duration_seconds,
                    "audio_seconds_processed": s.audio_seconds_processed,
                    "status": s.status,
                    "source_language": s.source_language,
                    "target_language": s.target_language,
                    "platform": s.platform,
                }
                for s in sessions
            ],
            "total": total,
            "limit": limit,
            "offset": offset,
        }
    except Exception as e:
        logger.error(f"Error fetching session history for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch session history")
