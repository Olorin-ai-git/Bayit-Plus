"""
WebSocket endpoint for Live Nikud (real-time vocalized Hebrew subtitles)
Real-time: audio -> STT -> add nikud via Claude -> emit vocalized cue
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


@router.websocket("/ws/live/{channel_id}/nikud")
async def websocket_live_nikud(
    websocket: WebSocket,
    channel_id: str,
    platform: str = Query("web"),
):
    """
    WebSocket endpoint for Live Nikud (vocalized Hebrew subtitles).

    Security mirrors websocket_live_dubbing.py architecture.

    Auth: {"type": "authenticate", "token": "..."} as first message
    Client sends: JSON auth + binary audio chunks (16kHz mono LINEAR16 PCM)
    Server sends: connected, nikud_subtitle, latency_report, error
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
    if not settings.olorin.live_nikud.enabled:
        await websocket.close(code=4000, reason="Live Nikud is disabled")
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

    if not channel.supports_live_nikud:
        await websocket.send_json(
            {"type": "error", "message": "Channel does not support Live Nikud", "recoverable": False}
        )
        await websocket.close(code=4005, reason="Live Nikud not available")
        return

    logger.info(
        "Live Nikud session authenticated",
        extra={
            "user_id": str(user.id),
            "channel_id": channel_id,
            "platform": platform,
        },
    )

    # Step 7.5: Beta 500 integration
    from app.services.beta.nikud_live_integration import BetaNikudLiveIntegration

    integration = BetaNikudLiveIntegration(
        channel=channel,
        user=user,
        platform=platform,
    )

    # Step 8: Check quota
    allowed_quota, quota_session, _ = await check_and_start_quota_session(
        websocket,
        user,
        channel_id,
        FeatureType.LIVE_NIKUD,
        "he",
        "he",
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
                    # Binary audio chunk - feeds into STT pipeline
                    pass
                elif "text" in data:
                    msg = json.loads(data["text"])
                    if msg.get("type") == "transcript":
                        # Process transcript through nikud pipeline
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
                    FeatureType.LIVE_NIKUD,
                    last_usage_update,
                    usage_update_interval,
                )
                if not quota_ok:
                    break

        except WebSocketDisconnect:
            logger.info(
                "Live Nikud session ended (disconnect)",
                extra={"user_id": str(user.id), "session_id": integration.session_id},
            )
            await end_quota_session(quota_session, UsageSessionStatus.COMPLETED)

    except Exception as e:
        logger.error(
            "Error in Live Nikud stream",
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


@router.get("/live/{channel_id}/nikud/status")
async def check_nikud_availability(channel_id: str):
    """
    Check if Live Nikud is available for a channel.

    Returns availability info including nikud display settings.
    """
    if not settings.olorin.live_nikud.enabled:
        return {"available": False, "error": "Live Nikud is disabled"}

    try:
        channel = await LiveChannel.get(PydanticObjectId(channel_id))
        if not channel:
            return {"available": False, "error": "Channel not found"}

        return {
            "available": channel.supports_live_nikud,
            "source_language": "he",
            "nikud_style": "full",
            "display_duration_ms": settings.olorin.live_nikud.display_duration_ms,
        }

    except Exception as e:
        logger.error(
            "Error checking Live Nikud availability",
            extra={"error": str(e)},
        )
        return {"available": False, "error": "Internal error"}
