"""
WebSocket endpoint for Smart Subs (dual-view subtitles with shoresh highlighting)
Real-time: audio -> STT -> simplify Hebrew -> translate -> shoresh analysis -> dual cue
"""

import asyncio
import json
import logging

from beanie import PydanticObjectId
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.api.routes.websocket_helpers import (
    check_and_start_quota_session,
    check_authentication_message,
    check_subscription_tier,
    end_quota_session,
    get_user_from_token,
    update_quota_during_session,
)
from app.core.config import settings
from app.models.content import LiveChannel
from app.models.live_feature_quota import FeatureType, UsageSessionStatus
from app.services.rate_limiter_live import get_rate_limiter

router = APIRouter()
logger = logging.getLogger(__name__)


@router.websocket("/ws/live/{channel_id}/smart-subs")
async def websocket_smart_subs(
    websocket: WebSocket,
    channel_id: str,
    target_lang: str = Query("en"),
    platform: str = Query("web"),
    show_shoresh: bool = Query(True),
):
    """
    WebSocket endpoint for Smart Subs (dual-view subtitles).

    Security mirrors websocket_live_dubbing.py architecture.

    Auth: {"type": "authenticate", "token": "..."} as first message
    Client sends: JSON auth + binary audio chunks (16kHz mono LINEAR16 PCM)
    Server sends: connected, smart_subtitle, latency_report, error
    """
    # Step 0: Enforce wss:// in production
    if settings.olorin.dubbing.require_secure_websocket and not settings.DEBUG:
        if websocket.url.scheme != "wss":
            await websocket.close(
                code=4000,
                reason="Secure WebSocket (wss://) required in production",
            )
            return

    # Step 1: Check if feature is enabled
    if not settings.olorin.smart_subs.enabled:
        await websocket.close(code=4000, reason="Smart Subs is disabled")
        return

    # Step 2: Accept connection
    await websocket.accept()

    # Step 3: Authenticate
    token, auth_error = await check_authentication_message(websocket)
    if auth_error:
        return

    # Step 4: Validate token
    user = await get_user_from_token(token)
    if not user:
        await websocket.send_json(
            {"type": "error", "message": "Invalid or expired token", "recoverable": False}
        )
        await websocket.close(code=4001, reason="Authentication failed")
        return

    # Step 5: Rate limit
    rate_limiter = await get_rate_limiter()
    allowed, error_msg, reset_in = await rate_limiter.check_websocket_connection(
        str(user.id)
    )
    if not allowed:
        await websocket.send_json(
            {"type": "error", "message": error_msg, "recoverable": True, "retry_after_seconds": reset_in}
        )
        await websocket.close(code=4029, reason="Rate limit exceeded")
        return

    # Step 6: Subscription tier check
    if not await check_subscription_tier(websocket, user, ["premium", "family"]):
        return

    # Step 7: Validate channel
    try:
        channel = await LiveChannel.get(PydanticObjectId(channel_id))
    except Exception:
        channel = None

    if not channel:
        await websocket.close(code=4004, reason="Channel not found")
        return

    if not channel.supports_smart_subs:
        await websocket.send_json(
            {"type": "error", "message": "Channel does not support Smart Subs", "recoverable": False}
        )
        await websocket.close(code=4005, reason="Smart Subs not available")
        return

    logger.info(
        "Smart Subs session authenticated",
        extra={
            "user_id": str(user.id),
            "channel_id": channel_id,
            "target_lang": target_lang,
            "show_shoresh": show_shoresh,
        },
    )

    # Step 7.5: Beta 500 integration
    from app.services.beta.smart_subs_integration import BetaSmartSubsIntegration

    integration = BetaSmartSubsIntegration(
        channel=channel,
        user=user,
        target_language=target_lang,
        show_shoresh=show_shoresh,
        platform=platform,
    )

    # Step 8: Check quota
    allowed_quota, quota_session, _ = await check_and_start_quota_session(
        websocket,
        user,
        channel_id,
        FeatureType.SMART_SUBS,
        "he",
        target_lang,
        platform,
    )
    if not allowed_quota:
        return

    # Step 9: Start session
    last_usage_update = 0.0
    usage_update_interval = 10.0

    try:
        connection_info = await integration.start()
        await websocket.send_json(connection_info)

        last_usage_update = asyncio.get_event_loop().time()

        # Process incoming data
        try:
            while True:
                data = await websocket.receive()

                if "bytes" in data:
                    # Binary audio chunk - feeds into ChannelSTTManager
                    # Transcripts processed through Smart Subs pipeline
                    pass
                elif "text" in data:
                    msg = json.loads(data["text"])
                    if msg.get("type") == "transcript":
                        # Process transcript through Smart Subs pipeline
                        cue = await integration.process_transcript(
                            msg.get("text", "")
                        )
                        if cue:
                            await websocket.send_json(cue.to_dict())

                # Update quota periodically
                quota_ok, last_usage_update = await update_quota_during_session(
                    websocket,
                    user,
                    quota_session,
                    FeatureType.SMART_SUBS,
                    last_usage_update,
                    usage_update_interval,
                )
                if not quota_ok:
                    break

        except WebSocketDisconnect:
            logger.info(
                "Smart Subs session ended (disconnect)",
                extra={"user_id": str(user.id), "session_id": integration.session_id},
            )
            await end_quota_session(quota_session, UsageSessionStatus.COMPLETED)

    except Exception as e:
        logger.error(
            "Error in Smart Subs stream",
            extra={"error": str(e)},
        )
        await end_quota_session(quota_session, UsageSessionStatus.ERROR)
        try:
            await websocket.send_json(
                {"type": "error", "message": str(e), "recoverable": False}
            )
        except Exception:
            pass
    finally:
        if integration.is_running:
            await integration.stop()


@router.get("/live/{channel_id}/smart-subs/status")
async def check_smart_subs_availability(channel_id: str):
    """
    Check if Smart Subs is available for a channel.

    Returns availability info including shoresh highlighting options.
    """
    if not settings.olorin.smart_subs.enabled:
        return {"available": False, "error": "Smart Subs is disabled"}

    try:
        channel = await LiveChannel.get(PydanticObjectId(channel_id))
        if not channel:
            return {"available": False, "error": "Channel not found"}

        return {
            "available": channel.supports_smart_subs,
            "source_language": "he",
            "supported_target_languages": (
                channel.available_translation_languages
                if hasattr(channel, "available_translation_languages")
                else ["en", "es", "ar", "ru"]
            ),
            "shoresh_highlight_color": settings.olorin.smart_subs.shoresh_highlight_color,
            "display_duration_ms": settings.olorin.smart_subs.dual_subtitle_display_duration_ms,
            "min_age": settings.olorin.smart_subs.min_age_for_smart_subs,
        }

    except Exception as e:
        logger.error(
            "Error checking Smart Subs availability",
            extra={"error": str(e)},
        )
        return {"available": False, "error": "Internal error"}
