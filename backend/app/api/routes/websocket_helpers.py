"""
WebSocket Helper Functions for Live Dubbing

Extracted helpers for WebSocket lifecycle management, authentication, quota,
and error handling. Keeps the main websocket_live_dubbing.py route clean.
"""

import asyncio
import logging
import time
from typing import Optional, Tuple

from beanie import PydanticObjectId
from fastapi import WebSocketDisconnect
from jose import JWTError, jwt

from app.core.config import settings
from app.models.content import LiveChannel
from app.models.live_dubbing import LiveDubbingSession
from app.models.live_feature_quota import FeatureType, UsageSessionStatus
from app.models.user import User
from app.services.live_dubbing_service import LiveDubbingService
from app.services.live_feature_quota_service import LiveFeatureQuotaService

logger = logging.getLogger(__name__)

# Track active sessions per channel
_active_sessions: dict[str, set[str]] = {}


async def get_user_from_token(token: str) -> Optional[User]:
    """Validate JWT token and return user."""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id = payload.get("sub")
        if not user_id:
            return None

        user = await User.get(user_id)
        if not user or not user.is_active:
            return None

        return user
    except JWTError:
        return None


async def check_authentication_message(websocket) -> Tuple[Optional[str], bool]:
    """
    Wait for authentication message with JWT token.

    Returns: (token, error_occurred)
    - If success: (token, False)
    - If error: (None, True)
    """
    try:
        auth_timeout = settings.olorin.dubbing.websocket_auth_timeout_seconds
        auth_message = await asyncio.wait_for(
            websocket.receive_json(), timeout=auth_timeout
        )

        if auth_message.get("type") != "authenticate" or not auth_message.get("token"):
            await websocket.send_json({
                "type": "error",
                "message": "Authentication required. Send: {type: 'authenticate', token: '...'}",
                "recoverable": False,
            })
            await websocket.close(code=4001, reason="Authentication required")
            return None, True

        return auth_message["token"], False

    except asyncio.TimeoutError:
        await websocket.send_json({
            "type": "error",
            "message": "Authentication timeout",
            "recoverable": False,
        })
        await websocket.close(code=4001, reason="Authentication timeout")
        return None, True
    except Exception as e:
        logger.warning(f"Authentication error: {e}")
        await websocket.close(code=4001, reason="Authentication error")
        return None, True


async def check_subscription_tier(
    websocket, user: User, required_tiers: list[str]
) -> bool:
    """
    Check if user has required subscription tier.

    Returns: True if allowed, False if denied (already sent error to websocket)
    """
    if user.subscription_tier not in required_tiers:
        await websocket.send_json({
            "type": "error",
            "message": "Premium subscription required for live dubbing",
            "recoverable": False,
        })
        await websocket.close(code=4003, reason="Premium subscription required")
        logger.info(f"Premium subscription denied for user {user.id} ({user.subscription_tier})")
        return False
    return True


async def validate_channel_for_dubbing(
    websocket, channel_id: str, target_lang: str
) -> Tuple[Optional[LiveChannel], bool]:
    """
    Verify channel exists, supports dubbing, and target language is available.

    Returns: (channel, error_occurred)
    - If success: (channel, False)
    - If error: (None, True)
    """
    try:
        channel = await LiveChannel.get(PydanticObjectId(channel_id))
    except Exception:
        channel = None

    if not channel:
        await websocket.close(code=4004, reason="Channel not found")
        return None, True

    if not channel.supports_live_dubbing:
        await websocket.send_json({
            "type": "error",
            "message": "Channel does not support live dubbing",
            "recoverable": False,
        })
        await websocket.close(code=4005, reason="Channel does not support live dubbing")
        return None, True

    # Validate target language
    supported_langs = channel.available_dubbing_languages or ["en", "es", "ar", "ru", "fr", "de"]
    if target_lang not in supported_langs:
        await websocket.send_json({
            "type": "error",
            "message": f"Language {target_lang} not available. Supported: {supported_langs}",
            "recoverable": False,
        })
        await websocket.close(code=4006, reason="Language not available")
        return None, True

    return channel, False


async def check_and_start_quota_session(
    websocket,
    user: User,
    channel_id: str,
    feature_type: FeatureType,
    source_language: str,
    target_language: str,
    platform: str,
) -> Tuple[bool, Optional[LiveDubbingSession], dict]:
    """
    Check quota and start session tracking.

    Returns: (allowed, quota_session, usage_stats)
    """
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

    # Start quota session tracking
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


async def initialize_dubbing_session(
    websocket,
    channel: LiveChannel,
    user: User,
    target_language: str,
    voice_id: Optional[str],
    platform: str,
) -> Tuple[
    LiveDubbingService,
    asyncio.Task,
    asyncio.Task,
    asyncio.Task,
]:
    """
    Initialize dubbing service and start processing tasks.

    Returns: (dubbing_service, pipeline_task, latency_task, sender_task)
    """
    # Use channel's default voice or provided voice
    effective_voice_id = voice_id or channel.default_dubbing_voice_id

    dubbing_service = LiveDubbingService(
        channel=channel,
        user=user,
        target_language=target_language,
        voice_id=effective_voice_id,
        platform=platform,
    )

    # Start dubbing session
    connection_info = await dubbing_service.start()

    # Send connection confirmation
    await websocket.send_json(connection_info)
    logger.info(
        f"Dubbing session started: {dubbing_service.session_id}, "
        f"sync_delay={connection_info['sync_delay_ms']}ms"
    )

    # Track active session
    channel_id = str(channel.id)
    if channel_id not in _active_sessions:
        _active_sessions[channel_id] = set()
    _active_sessions[channel_id].add(dubbing_service.session_id)

    # Start pipeline processing task
    pipeline_task = asyncio.create_task(dubbing_service.run_pipeline())

    # Start latency report task (every 10 seconds)
    async def send_latency_reports():
        while dubbing_service.is_running:
            await asyncio.sleep(10)
            if dubbing_service.is_running:
                report = dubbing_service.get_latency_report()
                try:
                    await websocket.send_json(report.model_dump())
                except Exception:
                    break

    latency_task = asyncio.create_task(send_latency_reports())

    # Start message sender task
    async def send_messages():
        async for message in dubbing_service.receive_messages():
            try:
                await websocket.send_json(message.model_dump())
            except Exception:
                break

    sender_task = asyncio.create_task(send_messages())

    return dubbing_service, pipeline_task, latency_task, sender_task


async def update_quota_during_session(
    websocket,
    user: User,
    quota_session,
    feature_type: FeatureType,
    last_update: float,
    update_interval: float,
) -> Tuple[bool, float]:
    """
    Update quota periodically during session.

    Returns: (quota_ok, new_last_update_time)
    """
    current_time = asyncio.get_event_loop().time()

    if not quota_session or current_time - last_update < update_interval:
        return True, last_update

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
        return True, current_time


async def end_quota_session(
    quota_session, status: UsageSessionStatus
):
    """End quota session with given status."""
    if quota_session:
        try:
            await LiveFeatureQuotaService.end_session(
                session_id=quota_session.session_id,
                status=status,
            )
        except Exception as e:
            logger.error(f"Error ending quota session: {e}")


async def cleanup_dubbing_session(
    channel_id: str,
    dubbing_service: Optional[LiveDubbingService],
    pipeline_task: Optional[asyncio.Task],
    latency_task: Optional[asyncio.Task],
    sender_task: Optional[asyncio.Task],
):
    """Clean up dubbing session and cancel all tasks."""
    # Cancel pipeline task
    if pipeline_task and not pipeline_task.done():
        pipeline_task.cancel()
        try:
            await pipeline_task
        except asyncio.CancelledError:
            pass

    # Cancel latency task
    if latency_task and not latency_task.done():
        latency_task.cancel()
        try:
            await latency_task
        except asyncio.CancelledError:
            pass

    # Cancel sender task
    if sender_task and not sender_task.done():
        sender_task.cancel()
        try:
            await sender_task
        except asyncio.CancelledError:
            pass

    if dubbing_service:
        # Remove from active sessions
        if channel_id in _active_sessions:
            _active_sessions[channel_id].discard(dubbing_service.session_id)
            if not _active_sessions[channel_id]:
                del _active_sessions[channel_id]

        # Stop dubbing service
        try:
            summary = await dubbing_service.stop()
            logger.info(f"Dubbing session summary: {summary}")
        except Exception as e:
            logger.error(f"Error stopping dubbing service: {e}")


def get_active_session_count(channel_id: str) -> int:
    """Get count of active sessions for a channel."""
    return len(_active_sessions.get(channel_id, set()))
