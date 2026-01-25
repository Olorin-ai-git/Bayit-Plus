"""
WebSocket endpoint for live channel dubbing (Premium feature)
Real-time audio → transcription → translation → dubbed audio streaming
"""

import logging

from beanie import PydanticObjectId
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.api.routes.websocket_helpers import (check_and_start_quota_session,
                                              check_authentication_message,
                                              check_subscription_tier,
                                              cleanup_dubbing_session,
                                              end_quota_session,
                                              get_active_session_count,
                                              get_user_from_token,
                                              initialize_dubbing_session,
                                              update_quota_during_session,
                                              validate_channel_for_dubbing)
from app.core.config import settings
from app.models.content import LiveChannel
from app.models.live_feature_quota import FeatureType, UsageSessionStatus
from app.services.rate_limiter_live import get_rate_limiter

router = APIRouter()
logger = logging.getLogger(__name__)


@router.websocket("/ws/live/{channel_id}/dubbing")
async def websocket_live_dubbing(
    websocket: WebSocket,
    channel_id: str,
    target_lang: str = Query("en"),
    voice_id: str | None = Query(None),
    platform: str = Query("web"),
):
    """
    WebSocket endpoint for live channel dubbing (Premium feature).

    Security Features:
    - Enforces wss:// (secure WebSocket) in production
    - Validates JWT token from authentication message
    - Rate limits connections and audio chunks per user
    - Validates channel and subscription tier

    Auth: {"type": "authenticate", "token": "..."} as first message (SECURITY: not in URL)
    Client sends: JSON auth + binary audio chunks (16kHz mono LINEAR16 PCM)
    Server sends: connected, dubbed_audio, transcript, latency_report, error
    """
    # SECURITY: Step 0 - Enforce wss:// in production
    if settings.olorin.dubbing.require_secure_websocket and not settings.DEBUG:
        if websocket.url.scheme != "wss":
            await websocket.close(
                code=4000,
                reason="Secure WebSocket (wss://) required in production",
            )
            logger.warning(
                f"WebSocket connection rejected: insecure protocol ({websocket.url.scheme}) "
                f"from {websocket.client}"
            )
            return

    # Step 1: Check if live dubbing is enabled
    if not settings.olorin.dubbing.live_dubbing_enabled:
        await websocket.close(code=4000, reason="Live dubbing is disabled")
        return

    # Step 2: Accept connection (then authenticate via message)
    await websocket.accept()

    # Step 3: Authenticate via message (SECURITY: token via message, not URL)
    token, auth_error = await check_authentication_message(websocket)
    if auth_error:
        return

    # Step 4: Validate token
    user = await get_user_from_token(token)
    if not user:
        await websocket.send_json(
            {
                "type": "error",
                "message": "Invalid or expired token",
                "recoverable": False,
            }
        )
        await websocket.close(code=4001, reason="Authentication failed")
        return

    # Step 5: Check rate limit (connections per minute, configurable)
    rate_limiter = await get_rate_limiter()
    allowed, error_msg, reset_in = await rate_limiter.check_websocket_connection(
        str(user.id)
    )
    if not allowed:
        await websocket.send_json(
            {
                "type": "error",
                "message": error_msg,
                "recoverable": True,
                "retry_after_seconds": reset_in,
            }
        )
        await websocket.close(code=4029, reason="Rate limit exceeded")
        return

    # Step 6: Check subscription tier (Premium feature)
    if not await check_subscription_tier(websocket, user, ["premium", "family"]):
        return

    # Step 7: Verify channel exists and supports dubbing
    channel, channel_error = await validate_channel_for_dubbing(
        websocket, channel_id, target_lang
    )
    if channel_error:
        return

    logger.info(
        f"Live dubbing session authenticated: user={user.id}, "
        f"channel={channel_id}, target_lang={target_lang}"
    )

    # Step 8: Check quota and start session tracking
    allowed, quota_session, _ = await check_and_start_quota_session(
        websocket,
        user,
        channel_id,
        FeatureType.DUBBING,
        channel.dubbing_source_language or "he",
        target_lang,
        platform,
    )
    if not allowed:
        return

    # Step 9: Initialize dubbing service and start all tasks
    dubbing_service = None
    pipeline_task = None
    latency_task = None
    sender_task = None
    last_usage_update = 0.0
    usage_update_interval = 10.0

    try:
        # Initialize session and start tasks
        dubbing_service, pipeline_task, latency_task, sender_task = (
            await initialize_dubbing_session(
                websocket, channel, user, target_lang, voice_id, platform
            )
        )

        import asyncio

        last_usage_update = asyncio.get_event_loop().time()

        # Process incoming audio chunks
        try:
            while True:
                audio_chunk = await websocket.receive_bytes()
                await dubbing_service.process_audio_chunk(audio_chunk)

                # Update quota periodically
                quota_ok, last_usage_update = await update_quota_during_session(
                    websocket,
                    user,
                    quota_session,
                    FeatureType.DUBBING,
                    last_usage_update,
                    usage_update_interval,
                )
                if not quota_ok:
                    break

        except WebSocketDisconnect:
            logger.info(
                f"Live dubbing session ended (disconnect): "
                f"user={user.id}, session={dubbing_service.session_id}"
            )
            await end_quota_session(quota_session, UsageSessionStatus.COMPLETED)

    except Exception as e:
        logger.error(f"Error in live dubbing stream: {str(e)}")
        await end_quota_session(quota_session, UsageSessionStatus.ERROR)
        try:
            await websocket.send_json(
                {"type": "error", "message": str(e), "recoverable": False}
            )
        except Exception:
            pass
    finally:
        await cleanup_dubbing_session(
            channel_id, dubbing_service, pipeline_task, latency_task, sender_task
        )


@router.get("/live/{channel_id}/dubbing/status")
async def check_dubbing_availability(channel_id: str):
    """
    Check if live dubbing is available for a channel.

    Returns:
        {
            "available": true,
            "source_language": "he",
            "supported_target_languages": ["en", "es", "ar"],
            "default_sync_delay_ms": 600,
            "active_sessions": 3
        }
    """
    # Check if feature is enabled
    if not settings.olorin.dubbing.live_dubbing_enabled:
        return {
            "available": False,
            "error": "Live dubbing is disabled",
        }

    try:
        channel = await LiveChannel.get(PydanticObjectId(channel_id))
        if not channel:
            return {"available": False, "error": "Channel not found"}

        active_count = get_active_session_count(channel_id)

        return {
            "available": channel.supports_live_dubbing,
            "source_language": channel.dubbing_source_language or "he",
            "supported_target_languages": channel.available_dubbing_languages,
            "default_voice_id": channel.default_dubbing_voice_id,
            "default_sync_delay_ms": channel.dubbing_sync_delay_ms,
            "active_sessions": active_count,
        }

    except Exception as e:
        logger.error(f"Error checking dubbing availability: {str(e)}")
        return {"available": False, "error": "Internal error"}
