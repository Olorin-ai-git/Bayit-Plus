"""
WebSocket endpoint for live channel dubbing (Premium feature)
Real-time audio → transcription → translation → dubbed audio streaming

Supports continuous flow architecture for zero-interruption playback:
- sync_status messages from client to update playback position
- buffer_status messages to client with buffer health
- Rate limiting on sync_status to prevent client flooding
"""

import logging
import time

from beanie import PydanticObjectId
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.api.routes.websocket_helpers import (BYOC_CHANNEL_ID,
                                              check_and_start_quota_session,
                                              check_authentication_message,
                                              check_subscription_tier,
                                              cleanup_dubbing_session,
                                              create_byoc_channel_stub,
                                              end_quota_session,
                                              get_active_session_count,
                                              get_user_from_token,
                                              get_user_session_count,
                                              initialize_dubbing_session,
                                              update_quota_during_session,
                                              validate_byoc_stream_url,
                                              validate_channel_for_dubbing)
from app.core.config import settings
from app.models.content import LiveChannel
from app.models.live_feature_quota import FeatureType, UsageSessionStatus
from app.services.rate_limiter_live import get_rate_limiter

router = APIRouter()
logger = logging.getLogger(__name__)


class SyncStatusRateLimiter:
    """Rate limiter for sync_status messages per session."""

    def __init__(self, max_per_second: float):
        self._max_per_second = max_per_second
        self._min_interval_ms = 1000 / max_per_second
        self._last_sync_time_ms: float = 0

    def check_allowed(self) -> bool:
        """Check if sync_status is allowed (rate limiting)."""
        now_ms = time.time() * 1000
        if now_ms - self._last_sync_time_ms >= self._min_interval_ms:
            self._last_sync_time_ms = now_ms
            return True
        return False


def validate_video_timestamp(value: int) -> bool:
    """
    Validate video timestamp is within acceptable range.

    Args:
        value: Video timestamp in milliseconds

    Returns:
        True if valid, False otherwise
    """
    if not isinstance(value, int):
        return False
    if value < 0:
        return False
    if value > settings.olorin.dubbing.max_video_timestamp_ms:
        return False
    return True


@router.websocket("/ws/live/{channel_id}/dubbing")
async def websocket_live_dubbing(
    websocket: WebSocket,
    channel_id: str,
    target_lang: str = Query("en"),
    voice_id: str | None = Query(None),
    platform: str = Query("web"),
    continuous_flow: bool = Query(True),
    stream_url: str | None = Query(None),
):
    """
    WebSocket endpoint for live channel dubbing (Premium feature).

    Security Features:
    - Enforces wss:// (secure WebSocket) in production
    - Validates JWT token from authentication message
    - Rate limits connections and audio chunks per user
    - Rate limits sync_status messages to prevent flooding
    - Validates channel and subscription tier

    Auth: {"type": "authenticate", "token": "..."} as first message (SECURITY: not in URL)
    Client sends:
    - JSON auth message first
    - Binary audio chunks (16kHz mono LINEAR16 PCM)
    - JSON sync_status: {"type": "sync_status", "current_video_time_ms": 45000}
    Server sends: connected, dubbed_audio, transcript, latency_report, buffer_status, error
    """
    # SECURITY: Step 0 - Enforce wss:// in production (allow ws:// for localhost)
    # Cloud Run terminates TLS at the load balancer, so the ASGI scope sees
    # ws:// even though clients connect over wss://. Check X-Forwarded-Proto
    # to determine the original client protocol.
    is_localhost = websocket.client and websocket.client.host in ("127.0.0.1", "::1", "localhost")
    if settings.olorin.dubbing.require_secure_websocket and not settings.DEBUG and not is_localhost:
        forwarded_proto = websocket.headers.get("x-forwarded-proto", "")
        is_secure = websocket.url.scheme == "wss" or forwarded_proto == "https"
        if not is_secure:
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
        str(user.id), feature="dubbing"
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

    # Step 6: Check subscription tier (Plus feature)
    if not await check_subscription_tier(websocket, user, ["plus"]):
        return

    # Step 6.5: Enforce per-user concurrent session limit
    max_per_user = settings.olorin.dubbing.max_sessions_per_user
    current_user_sessions = get_user_session_count(str(user.id))
    if current_user_sessions >= max_per_user:
        await websocket.send_json(
            {
                "type": "error",
                "message": f"Maximum {max_per_user} concurrent dubbing sessions allowed",
                "recoverable": False,
            }
        )
        await websocket.close(code=4029, reason="Per-user session limit exceeded")
        logger.warning(
            f"Per-user dubbing session limit exceeded: user={user.id}, "
            f"active={current_user_sessions}, max={max_per_user}"
        )
        return

    # Step 7: Verify channel (BYOC bypass or standard validation)
    is_byoc = channel_id == BYOC_CHANNEL_ID
    if is_byoc:
        if not stream_url:
            await websocket.send_json(
                {"type": "error", "message": "Stream URL required for BYOC", "recoverable": False}
            )
            await websocket.close(code=4002, reason="Stream URL required for BYOC")
            return
        valid, url_error = validate_byoc_stream_url(stream_url)
        if not valid:
            await websocket.send_json(
                {"type": "error", "message": url_error, "recoverable": False}
            )
            await websocket.close(code=4002, reason=url_error)
            return
        channel = create_byoc_channel_stub(stream_url)
    else:
        channel, channel_error = await validate_channel_for_dubbing(
            websocket, channel_id, target_lang
        )
        if channel_error:
            return

    effective_channel_id = channel.id if is_byoc else channel_id
    logger.info(
        f"Live dubbing session authenticated: user={user.id}, "
        f"channel={effective_channel_id}, target_lang={target_lang}, byoc={is_byoc}"
    )

    # Step 8: Check quota and start session tracking
    allowed, quota_session, _ = await check_and_start_quota_session(
        websocket,
        user,
        effective_channel_id,
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

    # Rate limiter for sync_status messages
    sync_rate_limiter = SyncStatusRateLimiter(
        settings.olorin.dubbing.sync_status_max_per_second
    )

    try:
        # Initialize session and start tasks with continuous flow parameter
        dubbing_service, pipeline_task, latency_task, sender_task = (
            await initialize_dubbing_session(
                websocket, channel, user, target_lang, voice_id, platform,
                enable_continuous_flow=continuous_flow
            )
        )

        import asyncio
        import json

        last_usage_update = asyncio.get_event_loop().time()

        # Process incoming messages (binary audio or JSON sync_status)
        try:
            while True:
                # Receive message (can be binary or text)
                message = await websocket.receive()

                if "bytes" in message:
                    # Binary audio chunk
                    audio_chunk = message["bytes"]
                    await dubbing_service.process_audio_chunk(audio_chunk)

                elif "text" in message:
                    # JSON message (sync_status or other)
                    try:
                        msg_data = json.loads(message["text"])
                        msg_type = msg_data.get("type")

                        if msg_type == "sync_status":
                            # Rate limit sync_status messages
                            if not sync_rate_limiter.check_allowed():
                                logger.debug(
                                    f"sync_status rate limited: session={dubbing_service.session_id}"
                                )
                                continue

                            # Validate video timestamp
                            video_time_ms = msg_data.get("current_video_time_ms")
                            if not validate_video_timestamp(video_time_ms):
                                logger.warning(
                                    f"Invalid video timestamp: {video_time_ms}, "
                                    f"session={dubbing_service.session_id}"
                                )
                                continue

                            # Update playback position for continuous flow
                            dubbing_service.update_video_timestamp(video_time_ms)

                            # Send buffer status back to client
                            buffer_status = dubbing_service.get_buffer_status()
                            if buffer_status:
                                await websocket.send_json({
                                    "type": "buffer_status",
                                    **buffer_status
                                })

                    except json.JSONDecodeError:
                        logger.warning(
                            f"Invalid JSON message: session={dubbing_service.session_id}"
                        )

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

    except WebSocketDisconnect as e:
        logger.info(
            f"Live dubbing WebSocket disconnected: user={user.id}, "
            f"code={e.code}, reason={e.reason or 'none'}"
        )
        await end_quota_session(quota_session, UsageSessionStatus.COMPLETED)
    except Exception as e:
        logger.error(f"Error in live dubbing stream: {type(e).__name__}: {str(e)}")
        await end_quota_session(quota_session, UsageSessionStatus.ERROR)
        try:
            await websocket.send_json(
                {"type": "error", "message": str(e), "recoverable": False}
            )
        except Exception:
            pass
    finally:
        await cleanup_dubbing_session(
            effective_channel_id, dubbing_service, pipeline_task, latency_task, sender_task
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

        active_count = await get_active_session_count(channel_id)

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
