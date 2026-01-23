"""
WebSocket endpoint for live subtitle translation (Premium feature)
Real-time audio → transcription → translation → subtitle streaming
"""

import asyncio
import logging
from typing import Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt

from app.core.config import settings
from app.models.content import LiveChannel
from app.models.live_feature_quota import FeatureType, UsageSessionStatus
from app.models.user import User
from app.services.live_feature_quota_service import LiveFeatureQuotaService
from app.services.live_translation_service import LiveTranslationService

router = APIRouter()
logger = logging.getLogger(__name__)


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


@router.websocket("/ws/live/{channel_id}/subtitles")
async def websocket_live_subtitles(
    websocket: WebSocket,
    channel_id: str,
    token: str = Query(...),
    target_lang: str = Query("en"),
):
    """
    WebSocket endpoint for live subtitle translation (Premium feature).

    Client sends:
    - Binary audio chunks (16kHz, mono, LINEAR16)

    Server sends JSON messages:
    - {"type": "connected", "source_lang": "he", "target_lang": "en"}
    - {"type": "subtitle", "data": {"text": "...", "original_text": "...", ...}}
    - {"type": "error", "message": "..."}
    """
    # Step 1: Authenticate user
    user = await get_user_from_token(token)
    if not user:
        await websocket.close(code=4001, reason="Authentication failed")
        return

    # Step 2: Check subscription tier (Premium feature)
    if user.subscription_tier not in ["premium", "family"]:
        await websocket.close(code=4003, reason="Premium subscription required")
        return

    # Step 3: Verify channel exists
    try:
        channel = await LiveChannel.get(PydanticObjectId(channel_id))
    except Exception:
        channel = None

    if not channel:
        await websocket.close(code=4004, reason="Channel not found")
        return

    # Step 3.5: Check quota before accepting connection
    allowed, error_msg, usage_stats = await LiveFeatureQuotaService.check_quota(
        user_id=str(user.id),
        feature_type=FeatureType.SUBTITLE,
        estimated_duration_minutes=1.0,
    )

    if not allowed:
        await websocket.accept()
        await websocket.send_json({
            "type": "quota_exceeded",
            "message": error_msg,
            "usage_stats": usage_stats,
            "recoverable": False,
        })
        await websocket.close(code=4029, reason="Quota exceeded")
        logger.warning(f"Quota exceeded for user {user.id}: {error_msg}")
        return

    # Step 4: Accept connection
    await websocket.accept()
    logger.info(
        f"Live subtitle connection established: user={user.id}, channel={channel_id}"
    )

    # Step 4.5: Start session tracking
    session = None
    try:
        session = await LiveFeatureQuotaService.start_session(
            user_id=str(user.id),
            channel_id=channel_id,
            feature_type=FeatureType.SUBTITLE,
            source_language=channel.primary_language or "he",
            target_language=target_lang,
            platform="web",
        )
        logger.info(f"Started quota session {session.session_id}")
    except Exception as e:
        logger.error(f"Failed to start quota session: {e}")

    # Step 5: Initialize translation service
    try:
        logger.info(f"🔧 Initializing translation service for channel {channel_id}")
        translation_service = LiveTranslationService()
        source_lang = channel.primary_language or "he"

        # Verify service is actually available
        service_status = translation_service.verify_service_availability()
        logger.info(f"📊 Service availability: {service_status}")

        if not service_status.get("speech_to_text"):
            stt_provider = service_status.get(
                "stt_provider", translation_service.provider
            )
            error_msg = f"Speech-to-text service ({stt_provider}) is not available"
            logger.error(f"❌ {error_msg}")
            await websocket.send_json({"type": "error", "message": error_msg})
            await websocket.close(code=4000, reason="Speech service unavailable")
            return

        # Send connection confirmation with both provider details
        await websocket.send_json(
            {
                "type": "connected",
                "source_lang": source_lang,
                "target_lang": target_lang,
                "channel_id": channel_id,
                "stt_provider": translation_service.provider,
                "translation_provider": translation_service.translation_provider,
                # Deprecated: kept for backwards compatibility
                "provider": translation_service.provider,
            }
        )
        logger.info(
            f"✅ Translation service initialized: "
            f"STT={translation_service.provider}, "
            f"Translate={translation_service.translation_provider}"
        )

        # Step 6: Create audio stream from WebSocket
        last_usage_update = asyncio.get_event_loop().time()
        usage_update_interval = 10.0  # Update usage every 10 seconds

        async def audio_stream_generator():
            """Generator that yields audio chunks from WebSocket."""
            nonlocal last_usage_update
            chunk_count = 0
            total_bytes = 0
            try:
                while True:
                    audio_chunk = await websocket.receive_bytes()
                    chunk_count += 1
                    total_bytes += len(audio_chunk)

                    # Log every 50 chunks to avoid spam
                    if chunk_count % 50 == 0:
                        logger.info(
                            f"📦 Received {chunk_count} audio chunks ({total_bytes} bytes total)"
                        )

                    # Update usage periodically (every 10 seconds)
                    current_time = asyncio.get_event_loop().time()
                    if session and current_time - last_usage_update >= usage_update_interval:
                        try:
                            await LiveFeatureQuotaService.update_session(
                                session_id=session.session_id,
                                audio_seconds_delta=usage_update_interval,
                                segments_delta=0,
                            )
                            # Check if still under quota
                            allowed, error_msg, _ = await LiveFeatureQuotaService.check_quota(
                                user_id=str(user.id),
                                feature_type=FeatureType.SUBTITLE,
                                estimated_duration_minutes=0,
                            )
                            if not allowed:
                                await websocket.send_json({
                                    "type": "quota_exceeded",
                                    "message": "Usage limit reached during session",
                                    "recoverable": False,
                                })
                                raise WebSocketDisconnect(code=4029, reason="Quota exceeded")
                            last_usage_update = current_time
                        except Exception as e:
                            logger.error(f"Error updating usage: {e}")

                    yield audio_chunk
            except WebSocketDisconnect:
                logger.info(
                    f"✅ WebSocket disconnected: user={user.id}, received {chunk_count} chunks, {total_bytes} bytes total"
                )
            except Exception as e:
                logger.error(
                    f"❌ Error receiving audio: {str(e)}, chunks received: {chunk_count}"
                )

        # Step 7: Process audio and stream subtitles
        try:
            async for (
                subtitle_cue
            ) in translation_service.process_live_audio_to_subtitles(
                audio_stream_generator(),
                source_lang=source_lang,
                target_lang=target_lang,
            ):
                # Send subtitle cue to client
                await websocket.send_json({"type": "subtitle", "data": subtitle_cue})

        except WebSocketDisconnect:
            logger.info(
                f"Live subtitle session ended: user={user.id}, channel={channel_id}"
            )
            if session:
                try:
                    await LiveFeatureQuotaService.end_session(
                        session_id=session.session_id,
                        status=UsageSessionStatus.COMPLETED,
                    )
                except Exception as e:
                    logger.error(f"Error ending session: {e}")

        except Exception as e:
            logger.error(f"Error in live subtitle stream: {str(e)}")
            if session:
                try:
                    await LiveFeatureQuotaService.end_session(
                        session_id=session.session_id,
                        status=UsageSessionStatus.ERROR,
                    )
                except Exception as se:
                    logger.error(f"Error ending session: {se}")
            try:
                await websocket.send_json(
                    {"type": "error", "message": "Translation service error"}
                )
            except Exception:
                pass

    except Exception as e:
        logger.error(f"Failed to initialize translation service: {str(e)}")
        if session:
            try:
                await LiveFeatureQuotaService.end_session(
                    session_id=session.session_id,
                    status=UsageSessionStatus.ERROR,
                )
            except Exception as se:
                logger.error(f"Error ending session: {se}")
        try:
            await websocket.send_json(
                {"type": "error", "message": "Service unavailable"}
            )
            await websocket.close(code=4000, reason="Service initialization failed")
        except Exception:
            pass


@router.get("/live/{channel_id}/subtitles/status")
async def check_subtitle_availability(channel_id: str):
    """
    Check if live subtitle translation is available for a channel.

    Returns:
        {
            "available": true,
            "source_language": "he",
            "supported_target_languages": ["en", "es", "ar"]
        }
    """
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
