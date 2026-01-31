"""
Trivia session initialization and setup helpers
"""

import logging
from typing import Optional, Tuple

from beanie import PydanticObjectId
from fastapi import WebSocket

from app.core.config import settings
from app.models.content import LiveChannel
from app.models.live_feature_quota import FeatureType, LiveFeatureUsageSession
from app.models.user import User
from app.services.live_feature_quota_service import live_feature_quota_service

logger = logging.getLogger(__name__)


async def validate_channel_and_feature(
    websocket: WebSocket, channel_id: str
) -> Optional[LiveChannel]:
    """
    Validate channel exists and trivia feature is enabled.
    Returns channel if valid, None otherwise (and closes WebSocket).
    """
    # Verify channel exists
    try:
        channel = await LiveChannel.get(PydanticObjectId(channel_id))
    except Exception:
        channel = None

    if not channel:
        await websocket.close(code=4004, reason="Channel not found")
        return None

    # Check TRIVIA_ENABLED feature flag
    if not settings.TRIVIA_ENABLED:
        await websocket.send_json(
            {
                "type": "error",
                "message": "Trivia feature is currently disabled",
                "recoverable": False,
            }
        )
        await websocket.close(code=4007, reason="Feature disabled")
        return None

    return channel


async def initialize_trivia_session(
    websocket: WebSocket,
    user: User,
    channel_id: str,
    channel: LiveChannel,
) -> Optional[LiveFeatureUsageSession]:
    """
    Check quota and start trivia session.
    Returns session if successful, None otherwise (and closes WebSocket).
    """
    # Check quota
    allowed, error_msg, usage_stats = await live_feature_quota_service.check_quota(
        user_id=str(user.id),
        feature_type=FeatureType.TRIVIA,
        estimated_duration_minutes=1.0,
    )
    if not allowed:
        await websocket.send_json(
            {
                "type": "quota_exceeded",
                "message": error_msg,
                "usage_stats": usage_stats,
                "recoverable": False,
            }
        )
        await websocket.close(code=4029, reason="Quota exceeded")
        return None

    # Start quota session
    try:
        session = await live_feature_quota_service.start_session(
            user_id=str(user.id),
            channel_id=channel_id,
            feature_type=FeatureType.TRIVIA,
            source_language=channel.primary_language or "he",
            target_language="en",
            platform="web",
        )
        logger.info(f"Live trivia connection: user={user.id}, channel={channel_id}")
        return session
    except Exception as e:
        logger.error(f"Failed to start quota session: {e}")
        await websocket.send_json(
            {
                "type": "error",
                "message": "Failed to initialize trivia session",
                "recoverable": False,
            }
        )
        await websocket.close(code=4000, reason="Session initialization failed")
        return None
