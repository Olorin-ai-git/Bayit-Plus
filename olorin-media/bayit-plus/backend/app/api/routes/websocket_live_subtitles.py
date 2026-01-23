"""
WebSocket endpoint for live subtitle translation (Premium feature)
Real-time audio → transcription → translation → subtitle streaming
"""

import asyncio
import logging

from beanie import PydanticObjectId
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.models.content import LiveChannel
from app.models.live_feature_quota import FeatureType, UsageSessionStatus
from app.services.live_feature_quota_service import LiveFeatureQuotaService
from app.services.live_translation_service import LiveTranslationService
from app.services.rate_limiter_live import get_rate_limiter
from app.api.routes.websocket_helpers import (
    check_authentication_message,
    check_subscription_tier,
    end_quota_session,
    get_user_from_token,
)

router = APIRouter()
logger = logging.getLogger(__name__)


async def create_audio_stream_with_quota_updates(websocket, session, user):
    """Generator yields audio chunks and updates quota every 10s."""
    last_update = asyncio.get_event_loop().time()
    try:
        while True:
            audio_chunk = await websocket.receive_bytes()
            current = asyncio.get_event_loop().time()
            if session and current - last_update >= 10.0:
                try:
                    await LiveFeatureQuotaService.update_session(session_id=session.session_id, audio_seconds_delta=10.0, segments_delta=0)
                    allowed, error_msg, _ = await LiveFeatureQuotaService.check_quota(user_id=str(user.id), feature_type=FeatureType.SUBTITLE, estimated_duration_minutes=0)
                    if not allowed:
                        await websocket.send_json({"type": "quota_exceeded", "message": "Usage limit reached", "recoverable": False})
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
    target_lang: str = Query("en"),
):
    """
    Live subtitle translation. Client sends: auth message + binary audio chunks.
    Server sends: connected, subtitle, error
    """
    # Accept connection (then authenticate via message)
    await websocket.accept()

    # Authenticate via message (SECURITY: token via message, not URL)
    token, auth_error = await check_authentication_message(websocket)
    if auth_error:
        return

    # Validate token
    user = await get_user_from_token(token)
    if not user:
        await websocket.send_json({
            "type": "error",
            "message": "Invalid or expired token",
            "recoverable": False,
        })
        await websocket.close(code=4001, reason="Authentication failed")
        return

    # Check rate limit (5 connections per minute)
    rate_limiter = await get_rate_limiter()
    allowed, error_msg, reset_in = await rate_limiter.check_websocket_connection(str(user.id))
    if not allowed:
        await websocket.send_json({
            "type": "error",
            "message": error_msg,
            "recoverable": True,
            "retry_after_seconds": reset_in,
        })
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

    # Check quota and start session
    allowed, error_msg, usage_stats = await LiveFeatureQuotaService.check_quota(
        user_id=str(user.id), feature_type=FeatureType.SUBTITLE, estimated_duration_minutes=1.0
    )
    if not allowed:
        await websocket.send_json({"type": "quota_exceeded", "message": error_msg, "usage_stats": usage_stats, "recoverable": False})
        await websocket.close(code=4029, reason="Quota exceeded")
        return

    try:
        session = await LiveFeatureQuotaService.start_session(
            user_id=str(user.id), channel_id=channel_id, feature_type=FeatureType.SUBTITLE,
            source_language=channel.primary_language or "he", target_language=target_lang, platform="web"
        )
    except Exception as e:
        logger.error(f"Failed to start quota session: {e}")
        return

    logger.info(f"Live subtitle connection: user={user.id}, channel={channel_id}")

    # Initialize translation service
    try:
        translation_service = LiveTranslationService()
        source_lang = channel.primary_language or "he"

        # Verify service availability
        if not translation_service.verify_service_availability().get("speech_to_text"):
            await websocket.send_json({"type": "error", "message": "Speech-to-text service unavailable"})
            await websocket.close(code=4000, reason="Speech service unavailable")
            return

        # Send connection confirmation
        await websocket.send_json({
            "type": "connected",
            "source_lang": source_lang,
            "target_lang": target_lang,
            "channel_id": channel_id,
            "stt_provider": translation_service.provider,
            "translation_provider": translation_service.translation_provider,
        })
        logger.info(f"Translation service initialized for channel {channel_id}")

        # Process audio and stream subtitles
        try:
            async for subtitle_cue in translation_service.process_live_audio_to_subtitles(
                create_audio_stream_with_quota_updates(websocket, session, user),
                source_lang=source_lang,
                target_lang=target_lang,
            ):
                await websocket.send_json({"type": "subtitle", "data": subtitle_cue})

        except WebSocketDisconnect:
            logger.info(f"Live subtitle session ended: user={user.id}, channel={channel_id}")
            await end_quota_session(session, UsageSessionStatus.COMPLETED)
        except Exception as e:
            logger.error(f"Error in subtitle stream: {str(e)}")
            await end_quota_session(session, UsageSessionStatus.ERROR)
            try:
                await websocket.send_json({"type": "error", "message": "Translation error"})
            except Exception:
                pass
    except Exception as e:
        logger.error(f"Failed to initialize service: {str(e)}")
        await end_quota_session(session, UsageSessionStatus.ERROR)
        try:
            await websocket.send_json({"type": "error", "message": "Service unavailable"})
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
