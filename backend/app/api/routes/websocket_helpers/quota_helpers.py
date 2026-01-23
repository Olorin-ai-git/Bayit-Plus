"""
Quota management helpers for WebSocket endpoints
"""

import asyncio
import logging
from typing import Optional, Tuple

from fastapi import WebSocket

from app.models.live_feature_quota import (FeatureType,
                                             LiveFeatureUsageSession,
                                             UsageSessionStatus)
from app.models.user import User
from app.services.live_feature_quota_service import LiveFeatureQuotaService

logger = logging.getLogger(__name__)


async def check_and_start_quota_session(
    websocket: WebSocket,
    user: User,
    channel_id: str,
    feature_type: FeatureType,
    source_language: str,
    target_language: str,
    platform: str,
) -> Tuple[bool, Optional[LiveFeatureUsageSession], Optional[dict]]:
    """
    Check quota availability and start session tracking.

    Returns:
        (allowed, quota_session, usage_stats): allowed if quota available
    """
    # Check quota
    allowed, error_msg, usage_stats = await LiveFeatureQuotaService.check_quota(
        user_id=str(user.id),
        feature_type=feature_type,
        estimated_duration_minutes=1.0,
    )

    if not allowed:
        await websocket.send_json({
            "type": "quota_exceeded",
            "message": error_msg,
            "usage_stats": usage_stats,
            "recoverable": False,
        })
        await websocket.close(code=4029, reason="Quota exceeded")
        logger.warning(f"Quota exceeded for user {user.id}: {error_msg}")
        return False, None, usage_stats

    # Start session tracking
    quota_session = None
    try:
        quota_session = await LiveFeatureQuotaService.start_session(
            user_id=str(user.id),
            channel_id=channel_id,
            feature_type=feature_type,
            source_language=source_language,
            target_language=target_language,
            platform=platform,
        )
        logger.info(f"Started quota session {quota_session.session_id}")
    except Exception as e:
        logger.error(f"Failed to start quota session: {e}")

    return True, quota_session, usage_stats


async def update_quota_during_session(
    websocket: WebSocket,
    user: User,
    quota_session: LiveFeatureUsageSession,
    feature_type: FeatureType,
    last_update_time: float,
    update_interval: float,
) -> Tuple[bool, float]:
    """
    Update quota usage and check if still under limit.

    Returns:
        (allowed, new_last_update_time): False if quota exceeded
    """
    current_time = asyncio.get_event_loop().time()

    if current_time - last_update_time < update_interval:
        return True, last_update_time

    try:
        await LiveFeatureQuotaService.update_session(
            session_id=quota_session.session_id,
            audio_seconds_delta=update_interval,
            segments_delta=0,
        )

        # Check if still under quota
        allowed, error_msg, _ = await LiveFeatureQuotaService.check_quota(
            user_id=str(user.id),
            feature_type=feature_type,
            estimated_duration_minutes=0,
        )

        if not allowed:
            await websocket.send_json({
                "type": "quota_exceeded",
                "message": "Usage limit reached during session",
                "recoverable": False,
            })
            return False, current_time

        return True, current_time

    except Exception as e:
        logger.error(f"Error updating usage: {e}")
        return True, last_update_time


async def end_quota_session(
    quota_session: Optional[LiveFeatureUsageSession], status: UsageSessionStatus
):
    """End quota session with given status."""
    if quota_session:
        try:
            await LiveFeatureQuotaService.end_session(
                session_id=quota_session.session_id, status=status
            )
        except Exception as e:
            logger.error(f"Error ending quota session: {e}")
