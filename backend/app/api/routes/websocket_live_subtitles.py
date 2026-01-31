"""
WebSocket endpoint for live subtitle translation (Premium feature)
Real-time audio → transcription → translation → subtitle streaming
"""

import asyncio
import logging
import time
from typing import Dict, Optional, Tuple

from beanie import PydanticObjectId
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.api.routes.websocket_helpers import (check_authentication_message,
                                              check_subscription_tier,
                                              end_quota_session,
                                              get_user_from_token)
from app.core.config import settings
from app.models.content import LiveChannel
from app.models.live_feature_quota import FeatureType, UsageSessionStatus
from app.services.live_feature_quota_service import live_feature_quota_service
from app.services.live_translation_service import LiveTranslationService
from app.services.rate_limiter_live import get_rate_limiter

router = APIRouter()
logger = logging.getLogger(__name__)

# Simple in-memory cache for quota checks to reduce database load
# Format: {user_id: (allowed, error_msg, usage_stats, timestamp)}
_quota_check_cache: Dict[str, Tuple[bool, Optional[str], Dict, float]] = {}
QUOTA_CACHE_TTL_SECONDS = 30.0  # Cache quota checks for 30 seconds


def get_cached_quota_check(user_id: str) -> Optional[Tuple[bool, Optional[str], Dict]]:
    """Get cached quota check result if still valid."""
    if user_id in _quota_check_cache:
        allowed, error_msg, usage_stats, timestamp = _quota_check_cache[user_id]
        if time.time() - timestamp < QUOTA_CACHE_TTL_SECONDS:
            logger.debug(f"Quota check cache hit for user {user_id}")
            return (allowed, error_msg, usage_stats)
        else:
            # Cache expired, remove it
            del _quota_check_cache[user_id]
    return None


def cache_quota_check(
    user_id: str, allowed: bool, error_msg: Optional[str], usage_stats: Dict
) -> None:
    """Cache quota check result with timestamp."""
    _quota_check_cache[user_id] = (allowed, error_msg, usage_stats, time.time())
    # Clean up old cache entries (keep cache size reasonable)
    if len(_quota_check_cache) > 1000:
        current_time = time.time()
        expired_keys = [
            k for k, v in _quota_check_cache.items()
            if current_time - v[3] > QUOTA_CACHE_TTL_SECONDS
        ]
        for k in expired_keys:
            del _quota_check_cache[k]


async def create_audio_stream_with_quota_updates(websocket, session, user):
    """
    Generator yields audio chunks and updates quota every 10s.
    Also sends periodic pings to maintain connection health.
    """
    last_update = asyncio.get_event_loop().time()
    last_ping = asyncio.get_event_loop().time()
    try:
        while True:
            audio_chunk = await websocket.receive_bytes()
            current = asyncio.get_event_loop().time()

            # Send heartbeat ping every 30 seconds
            if current - last_ping >= 30.0:
                try:
                    await websocket.send_json({"type": "ping", "timestamp": current})
                    last_ping = current
                except Exception as e:
                    logger.warning(f"Failed to send heartbeat ping: {e}")

            if session and current - last_update >= 10.0:
                try:
                    await live_feature_quota_service.update_session(
                        session_id=session.session_id,
                        audio_seconds_delta=10.0,
                        segments_delta=0,
                    )

                    # Try to get cached quota check first
                    cached_result = get_cached_quota_check(str(user.id))
                    if cached_result is not None:
                        allowed, error_msg, _ = cached_result
                    else:
                        # Cache miss - perform actual quota check
                        allowed, error_msg, usage_stats = (
                            await live_feature_quota_service.check_quota(
                                user_id=str(user.id),
                                feature_type=FeatureType.SUBTITLE,
                                estimated_duration_minutes=0,
                            )
                        )
                        # Cache the result
                        cache_quota_check(str(user.id), allowed, error_msg, usage_stats)

                    if not allowed:
                        # Clear cache on quota exceeded
                        if str(user.id) in _quota_check_cache:
                            del _quota_check_cache[str(user.id)]

                        await websocket.send_json(
                            {
                                "type": "quota_exceeded",
                                "message": "Usage limit reached",
                                "recoverable": False,
                            }
                        )
                        raise WebSocketDisconnect(code=4029, reason="Quota exceeded")
                    last_update = current
                except Exception as e:
                    logger.error(f"Error updating usage: {e}")
            yield audio_chunk
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: user={user.id}")
    except Exception as e:
        logger.error(f"Error receiving audio: {str(e)}")


@router.websocket("/ws/live/{channel_id}/subtitles")
async def websocket_live_subtitles(
    websocket: WebSocket,
    channel_id: str,
    source_lang: str = Query("he", description="Source language (input audio language)"),
    target_lang: str = Query("en", description="Target language (output subtitle language)"),
    enable_predictive: bool = Query(
        True, description="Enable predictive subtitles (partial + final)"
    ),
):
    """
    Live subtitle translation. Client sends: auth message + binary audio chunks.
    Server sends: connected, subtitle, error

    Security Features:
    - Enforces wss:// (secure WebSocket) in production
    - Validates JWT token from authentication message
    - Rate limits connections and audio chunks per user
    - Validates channel and subscription tier
    """
    # SECURITY: Step 0 - Enforce wss:// in production (allow ws:// for localhost)
    is_localhost = websocket.client and websocket.client.host in ("127.0.0.1", "::1", "localhost")
    if settings.olorin.dubbing.require_secure_websocket and not settings.DEBUG and not is_localhost:
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

    # Accept connection (then authenticate via message)
    await websocket.accept()

    # Authenticate via message (SECURITY: token via message, not URL)
    token, auth_error = await check_authentication_message(websocket)
    if auth_error:
        return

    # Validate token
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

    # Check rate limit (5 connections per minute)
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

    # Check subscription tier (Premium feature)
    if not await check_subscription_tier(websocket, user, ["premium", "family"]):
        return

    # Verify channel exists
    try:
        channel = await LiveChannel.get(PydanticObjectId(channel_id))
    except Exception:
        channel = None

    if not channel:
        await websocket.close(code=4004, reason="Channel not found")
        return

    # Check quota and start session (try cache first)
    cached_result = get_cached_quota_check(str(user.id))
    if cached_result is not None:
        allowed, error_msg, usage_stats = cached_result
    else:
        allowed, error_msg, usage_stats = await live_feature_quota_service.check_quota(
            user_id=str(user.id),
            feature_type=FeatureType.SUBTITLE,
            estimated_duration_minutes=1.0,
        )
        cache_quota_check(str(user.id), allowed, error_msg, usage_stats)

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
        return

    try:
        session = await live_feature_quota_service.start_session(
            user_id=str(user.id),
            channel_id=channel_id,
            feature_type=FeatureType.SUBTITLE,
            source_language=source_lang,
            target_language=target_lang,
            platform="web",
        )
    except Exception as e:
        logger.error(f"Failed to start quota session: {e}")
        return

    logger.info(
        f"Live subtitle connection: user={user.id}, channel={channel_id}, "
        f"source_lang={source_lang}, target_lang={target_lang}"
    )

    # Initialize translation service
    try:
        translation_service = LiveTranslationService()

        # Verify service availability
        if not translation_service.verify_service_availability().get("speech_to_text"):
            await websocket.send_json(
                {"type": "error", "message": "Speech-to-text service unavailable"}
            )
            await websocket.close(code=4000, reason="Speech service unavailable")
            return

        # Send connection confirmation
        await websocket.send_json(
            {
                "type": "connected",
                "source_lang": source_lang,
                "target_lang": target_lang,
                "channel_id": channel_id,
                "stt_provider": translation_service.provider,
                "translation_provider": translation_service.translation_provider,
                "enable_predictive": enable_predictive,
            }
        )
        logger.info(
            f"Translation service initialized for channel {channel_id} "
            f"(predictive: {enable_predictive})"
        )

        # Process audio and stream subtitles
        consecutive_errors = 0
        max_consecutive_errors = 5
        try:
            async for (
                subtitle_cue
            ) in translation_service.process_live_audio_to_subtitles(
                create_audio_stream_with_quota_updates(websocket, session, user),
                source_lang=source_lang,
                target_lang=target_lang,
                enable_predictive_subtitles=enable_predictive,
            ):
                # Send subtitle with appropriate type
                subtitle_type = subtitle_cue.get("subtitle_type", "final")
                try:
                    await websocket.send_json(
                        {"type": f"{subtitle_type}_subtitle", "data": subtitle_cue}
                    )
                    consecutive_errors = 0  # Reset error counter on success
                except Exception as send_error:
                    consecutive_errors += 1
                    logger.warning(
                        f"Failed to send subtitle (attempt {consecutive_errors}/{max_consecutive_errors}): {send_error}"
                    )
                    if consecutive_errors >= max_consecutive_errors:
                        logger.error("Max consecutive send errors reached, closing connection")
                        raise

        except WebSocketDisconnect:
            logger.info(
                f"Live subtitle session ended: user={user.id}, channel={channel_id}"
            )
            await end_quota_session(session, UsageSessionStatus.COMPLETED)
        except Exception as e:
            error_type = type(e).__name__
            logger.error(f"Error in subtitle stream ({error_type}): {str(e)}")
            await end_quota_session(session, UsageSessionStatus.ERROR)
            try:
                # Send user-friendly error message based on error type
                if "connection" in str(e).lower() or "timeout" in str(e).lower():
                    error_msg = "Connection interrupted. Please try reconnecting."
                    recoverable = True
                elif "quota" in str(e).lower():
                    error_msg = "Usage limit reached. Please try again later."
                    recoverable = False
                else:
                    error_msg = "An error occurred during live translation. Please try again."
                    recoverable = True

                await websocket.send_json(
                    {
                        "type": "error",
                        "message": error_msg,
                        "error_type": error_type,
                        "recoverable": recoverable,
                    }
                )
            except Exception:
                pass
    except Exception as e:
        logger.error(f"Failed to initialize service: {str(e)}")
        await end_quota_session(session, UsageSessionStatus.ERROR)
        try:
            await websocket.send_json(
                {"type": "error", "message": "Service unavailable"}
            )
            await websocket.close(code=4000, reason="Service initialization failed")
        except Exception:
            pass


@router.get("/live/{channel_id}/subtitles/status")
async def check_subtitle_availability(channel_id: str):
    """Check if live subtitle translation is available for a channel."""
    try:
        channel = await LiveChannel.get(PydanticObjectId(channel_id))
        if not channel:
            return {"available": False, "error": "Channel not found"}

        return {
            "available": channel.supports_live_subtitles,
            "source_language": channel.primary_language or "he",
            "supported_target_languages": channel.available_translation_languages,
        }

    except Exception as e:
        logger.error(f"Error checking subtitle availability: {str(e)}")
        return {"available": False, "error": "Internal error"}
