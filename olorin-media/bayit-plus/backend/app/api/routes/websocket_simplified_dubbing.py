"""
WebSocket endpoint for simplified Hebrew dubbing (Ivrit Kalla)
Real-time audio -> transcription -> simplification -> TTS (slower, clearer Hebrew)
"""

import asyncio
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


@router.websocket("/ws/live/{channel_id}/simplified-hebrew")
async def websocket_simplified_hebrew(
    websocket: WebSocket,
    channel_id: str,
    voice_id: str | None = Query(None),
    platform: str = Query("web"),
    vocabulary_level: str = Query("alef"),
):
    """
    WebSocket endpoint for simplified Hebrew audio (Ivrit Kalla).

    Security mirrors websocket_live_dubbing.py:
    - wss:// enforcement, JWT auth via message, rate limiting, subscription check

    Auth: {"type": "authenticate", "token": "..."} as first message
    Client sends: JSON auth + binary audio chunks (16kHz mono LINEAR16 PCM)
    Server sends: connected, simplified_audio, simplified_text, latency_report, error
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
    if not settings.olorin.simplified_hebrew.enabled:
        await websocket.close(code=4000, reason="Simplified Hebrew is disabled")
        return

    # Step 2: Accept connection
    await websocket.accept()

    # Step 3: Authenticate via message
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

    if not channel.supports_simplified_hebrew:
        await websocket.send_json(
            {"type": "error", "message": "Channel does not support simplified Hebrew", "recoverable": False}
        )
        await websocket.close(code=4005, reason="Simplified Hebrew not available")
        return

    # Validate vocabulary level
    valid_levels = ["alef", "bet", "gimel"]
    if vocabulary_level not in valid_levels:
        vocabulary_level = "alef"

    logger.info(
        "Simplified Hebrew session authenticated",
        extra={
            "user_id": str(user.id),
            "channel_id": channel_id,
            "vocabulary_level": vocabulary_level,
        },
    )

    # Step 7.5: Beta 500 integration
    from app.services.beta.simplified_dubbing_integration import (
        BetaSimplifiedDubbingIntegration,
    )

    integration = BetaSimplifiedDubbingIntegration(
        channel=channel,
        user=user,
        vocabulary_level=vocabulary_level,
        voice_id=voice_id,
        platform=platform,
    )

    # Step 8: Check quota
    allowed_quota, quota_session, _ = await check_and_start_quota_session(
        websocket,
        user,
        channel_id,
        FeatureType.SIMPLIFIED_DUBBING,
        "he",
        "he",  # Source and target are both Hebrew
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

        # Process incoming audio chunks
        # The simplified dubbing pipeline transcribes and simplifies in real-time
        try:
            while True:
                data = await websocket.receive()

                if "bytes" in data:
                    # Binary audio chunk - process through STT + simplification pipeline
                    # In a full implementation, this feeds into ChannelSTTManager
                    # and processes transcripts through simplification
                    pass
                elif "text" in data:
                    import json

                    msg = json.loads(data["text"])
                    if msg.get("type") == "transcript":
                        # Process transcript through simplification
                        async for chunk in integration.process_transcript(
                            msg.get("text", "")
                        ):
                            await websocket.send_json(chunk)

                # Update quota periodically
                quota_ok, last_usage_update = await update_quota_during_session(
                    websocket,
                    user,
                    quota_session,
                    FeatureType.SIMPLIFIED_DUBBING,
                    last_usage_update,
                    usage_update_interval,
                )
                if not quota_ok:
                    break

        except WebSocketDisconnect:
            logger.info(
                "Simplified Hebrew session ended (disconnect)",
                extra={"user_id": str(user.id), "session_id": integration.session_id},
            )
            await end_quota_session(quota_session, UsageSessionStatus.COMPLETED)

    except Exception as e:
        logger.error(
            "Error in simplified Hebrew stream",
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


@router.get("/live/{channel_id}/simplified-hebrew/status")
async def check_simplified_hebrew_availability(channel_id: str):
    """
    Check if simplified Hebrew is available for a channel.

    Returns availability info including vocabulary levels and voice options.
    """
    if not settings.olorin.simplified_hebrew.enabled:
        return {"available": False, "error": "Simplified Hebrew is disabled"}

    try:
        channel = await LiveChannel.get(PydanticObjectId(channel_id))
        if not channel:
            return {"available": False, "error": "Channel not found"}

        return {
            "available": channel.supports_simplified_hebrew,
            "source_language": "he",
            "vocabulary_levels": ["alef", "bet", "gimel"],
            "default_vocabulary_level": settings.olorin.simplified_hebrew.vocabulary_level,
            "speaking_rate": settings.olorin.simplified_hebrew.speaking_rate,
            "voice_id": (
                channel.simplified_hebrew_voice_id
                or settings.olorin.simplified_hebrew.voice_id
            ),
        }

    except Exception as e:
        logger.error(
            "Error checking simplified Hebrew availability",
            extra={"error": str(e)},
        )
        return {"available": False, "error": "Internal error"}
