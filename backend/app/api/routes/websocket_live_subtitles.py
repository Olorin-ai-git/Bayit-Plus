"""
WebSocket endpoint for live subtitle translation (Premium feature)
Real-time audio → transcription → translation → subtitle streaming
"""

import asyncio
import logging
import time
from collections import OrderedDict
from threading import RLock
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
from app.services.live_translation import LiveTranslationService
from app.services.rate_limiter_live import get_rate_limiter

router = APIRouter()
logger = logging.getLogger(__name__)


class QuotaCache:
    """
    Thread-safe LRU cache for quota check results.

    Features:
    - LRU (Least Recently Used) eviction policy
    - Thread-safe operations with RLock
    - Configurable max size and TTL
    - Cache statistics (hits, misses, evictions)
    - O(1) get/set operations
    """

    def __init__(self, max_size: int | None = None, ttl_seconds: float | None = None):
        """
        Initialize quota cache.

        Args:
            max_size: Maximum number of entries (default: from settings)
            ttl_seconds: Time-to-live for entries in seconds (default: from settings)
        """
        from app.core.config import settings

        self.max_size = max_size or settings.olorin.subtitle.quota_cache_max_size
        self.ttl_seconds = ttl_seconds or settings.olorin.subtitle.quota_cache_ttl_seconds
        self._cache: OrderedDict[str, Tuple[bool, Optional[str], Dict, float]] = OrderedDict()
        self._lock = RLock()
        self._stats = {"hits": 0, "misses": 0, "evictions": 0}

    def get(self, user_id: str) -> Optional[Tuple[bool, Optional[str], Dict]]:
        """
        Get cached quota check result if still valid.

        Args:
            user_id: User ID to look up

        Returns:
            Tuple of (allowed, error_msg, usage_stats) if valid, None otherwise
        """
        with self._lock:
            if user_id not in self._cache:
                self._stats["misses"] += 1
                logger.debug(
                    "Quota cache miss - user not in cache",
                    extra={
                        "user_id": user_id,
                        "cache_hits": self._stats["hits"],
                        "cache_misses": self._stats["misses"],
                        "cache_size": len(self._cache),
                        "reason": "not_found",
                    },
                )
                return None

            allowed, error_msg, usage_stats, timestamp = self._cache[user_id]

            # Check if entry expired
            if time.time() - timestamp >= self.ttl_seconds:
                del self._cache[user_id]
                self._stats["misses"] += 1
                logger.debug(
                    "Quota cache miss - entry expired",
                    extra={
                        "user_id": user_id,
                        "cache_hits": self._stats["hits"],
                        "cache_misses": self._stats["misses"],
                        "cache_size": len(self._cache),
                        "reason": "expired",
                        "ttl_seconds": self.ttl_seconds,
                    },
                )
                return None

            # Move to end (most recently used)
            self._cache.move_to_end(user_id)
            self._stats["hits"] += 1
            logger.debug(
                "Quota cache hit",
                extra={
                    "user_id": user_id,
                    "cache_hits": self._stats["hits"],
                    "cache_misses": self._stats["misses"],
                    "cache_size": len(self._cache),
                    "quota_allowed": allowed,
                },
            )
            return (allowed, error_msg, usage_stats)

    def set(self, user_id: str, allowed: bool, error_msg: Optional[str], usage_stats: Dict) -> None:
        """
        Cache quota check result with timestamp.

        Args:
            user_id: User ID
            allowed: Whether quota allows the action
            error_msg: Error message if not allowed
            usage_stats: Usage statistics
        """
        with self._lock:
            # Remove if exists (to update timestamp)
            was_update = user_id in self._cache
            if was_update:
                del self._cache[user_id]

            # Add new entry
            self._cache[user_id] = (allowed, error_msg, usage_stats, time.time())
            logger.debug(
                "Quota cache entry set",
                extra={
                    "user_id": user_id,
                    "quota_allowed": allowed,
                    "cache_size": len(self._cache),
                    "max_size": self.max_size,
                    "is_update": was_update,
                },
            )

            # LRU eviction if over max size
            if len(self._cache) > self.max_size:
                # Remove oldest entry (first item in OrderedDict)
                oldest_key = next(iter(self._cache))
                del self._cache[oldest_key]
                self._stats["evictions"] += 1
                logger.debug(
                    "Quota cache LRU eviction",
                    extra={
                        "evicted_user_id": oldest_key,
                        "cache_size": len(self._cache),
                        "max_size": self.max_size,
                        "total_evictions": self._stats["evictions"],
                    },
                )

    def clear(self, user_id: Optional[str] = None) -> None:
        """
        Clear cache entry for specific user or entire cache.

        Args:
            user_id: User ID to clear, or None to clear all
        """
        with self._lock:
            if user_id:
                if user_id in self._cache:
                    del self._cache[user_id]
            else:
                self._cache.clear()
                self._stats = {"hits": 0, "misses": 0, "evictions": 0}

    def stats(self) -> Dict[str, int]:
        """Get cache statistics."""
        with self._lock:
            return {
                **self._stats,
                "size": len(self._cache),
                "max_size": self.max_size,
            }


# Global quota cache instance
_quota_cache = QuotaCache()

# Allowed language codes for source_lang parameter (security validation)
ALLOWED_LANGUAGES = {"he", "en", "ar", "es", "ru", "fr", "de", "it", "pt", "yi", "ja", "bn", "ta", "hi"}


def validate_language_code(lang: str) -> str:
    """
    Validate language code to prevent injection attacks.

    Args:
        lang: Language code to validate

    Returns:
        Validated language code

    Raises:
        ValueError: If language code is invalid
    """
    # Check format (2-5 lowercase letters)
    if not lang or not isinstance(lang, str):
        raise ValueError(f"Invalid language code: must be a non-empty string")

    if not lang.islower() or not lang.isalpha():
        raise ValueError(
            f"Invalid language code '{lang}': must contain only lowercase letters"
        )

    if len(lang) < 2 or len(lang) > 5:
        raise ValueError(
            f"Invalid language code '{lang}': must be 2-5 characters long"
        )

    # Check against allowed languages
    if lang not in ALLOWED_LANGUAGES:
        raise ValueError(
            f"Unsupported language '{lang}'. Allowed languages: {', '.join(sorted(ALLOWED_LANGUAGES))}"
        )

    return lang


def get_cached_quota_check(user_id: str) -> Optional[Tuple[bool, Optional[str], Dict]]:
    """Get cached quota check result if still valid."""
    return _quota_cache.get(user_id)


def cache_quota_check(
    user_id: str, allowed: bool, error_msg: Optional[str], usage_stats: Dict
) -> None:
    """Cache quota check result with timestamp."""
    _quota_cache.set(user_id, allowed, error_msg, usage_stats)


async def create_audio_stream_with_quota_updates(websocket, session, user):
    """
    Generator yields audio chunks and updates quota periodically.
    Also sends periodic pings to maintain connection health.
    """
    last_update = asyncio.get_event_loop().time()
    last_ping = asyncio.get_event_loop().time()
    heartbeat_interval = settings.olorin.subtitle.heartbeat_interval_seconds
    quota_update_interval = settings.olorin.subtitle.quota_update_interval_seconds

    try:
        while True:
            # Use receive() to handle both binary (audio) and text (pong) messages
            message = await websocket.receive()
            current = asyncio.get_event_loop().time()

            # Handle text messages (e.g., pong responses) - skip them
            if message.get("type") == "websocket.receive":
                if "text" in message:
                    # Text message (pong response) - just ignore it
                    continue
                elif "bytes" in message:
                    audio_chunk = message["bytes"]
                else:
                    continue
            else:
                # Disconnect or other message type
                break

            # Send heartbeat ping at configured interval
            if current - last_ping >= heartbeat_interval:
                try:
                    await websocket.send_json({"type": "ping", "timestamp": current})
                    last_ping = current
                except Exception as e:
                    logger.warning(f"Failed to send heartbeat ping: {e}")

            if session and current - last_update >= quota_update_interval:
                try:
                    await live_feature_quota_service.update_session(
                        session_id=session.session_id,
                        audio_seconds_delta=quota_update_interval,
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
                        _quota_cache.clear(str(user.id))

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
    hebrew_mode: str = Query("regular", description="Hebrew display mode: regular, nikud, or shoresh"),
    enable_predictive: bool = Query(
        True, description="Enable predictive subtitles (partial + final)"
    ),
):
    """
    Live subtitle translation. Client sends: auth message + binary audio chunks.
    Server sends: connected, subtitle, error

    Hebrew Mode Support:
    - hebrew_mode parameter: "regular", "nikud", or "shoresh"
    - Applied server-side to Hebrew subtitles before sending to client
    - Uses nikud_service and shoresh_service for transformations

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

    # SECURITY: Validate language parameters (prevent injection attacks)
    try:
        source_lang = validate_language_code(source_lang)
        target_lang = validate_language_code(target_lang)
    except ValueError as e:
        await websocket.send_json(
            {
                "type": "error",
                "message": str(e),
                "recoverable": False,
            }
        )
        await websocket.close(code=4002, reason="Invalid language parameter")
        logger.warning(
            f"Invalid language parameter from user {user.id}: source={source_lang}, target={target_lang}. Error: {e}"
        )
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
            # Clean up session before returning (prevent resource leak)
            await end_quota_session(session, UsageSessionStatus.ERROR)
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
                "stt_provider": translation_service.stt_manager.provider,
                "translation_provider": translation_service.translation_manager.provider,
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
                # Classify error based on exception type (not string matching)
                if isinstance(e, (ConnectionError, asyncio.TimeoutError, TimeoutError)):
                    error_msg = "Connection interrupted. Please try reconnecting."
                    recoverable = True
                elif isinstance(e, WebSocketDisconnect):
                    if e.code == 4029:  # Quota exceeded code
                        error_msg = "Usage limit reached. Please try again later."
                        recoverable = False
                    else:
                        error_msg = "Connection closed unexpectedly. Please try reconnecting."
                        recoverable = True
                elif isinstance(e, (ValueError, TypeError)):
                    error_msg = "Invalid data received. Please refresh and try again."
                    recoverable = True
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
