"""
WebSocket endpoint for live subtitle translation (Premium feature)
Real-time audio → transcription → translation → subtitle streaming
"""
import logging
import asyncio
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import jwt, JWTError

from app.core.config import settings
from app.models.user import User
from app.models.content import LiveChannel
from app.services.live_translation_service import LiveTranslationService
from beanie import PydanticObjectId

router = APIRouter()
logger = logging.getLogger(__name__)


async def get_user_from_token(token: str) -> Optional[User]:
    """Validate JWT token and return user."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
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
    target_lang: str = Query("en")
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

    # Step 4: Accept connection
    await websocket.accept()
    logger.info(f"Live subtitle connection established: user={user.id}, channel={channel_id}")

    # Step 5: Initialize translation service
    try:
        logger.info(f"🔧 Initializing translation service for channel {channel_id}")
        translation_service = LiveTranslationService()
        source_lang = channel.primary_language or "he"

        # Verify service is actually available
        service_status = translation_service.verify_service_availability()
        logger.info(f"📊 Service availability: {service_status}")

        if not service_status.get("speech_to_text"):
            error_msg = f"Speech-to-text service ({translation_service.provider}) is not available"
            logger.error(f"❌ {error_msg}")
            await websocket.send_json({
                "type": "error",
                "message": error_msg
            })
            await websocket.close(code=4000, reason="Speech service unavailable")
            return

        # Send connection confirmation
        await websocket.send_json({
            "type": "connected",
            "source_lang": source_lang,
            "target_lang": target_lang,
            "channel_id": channel_id,
            "provider": translation_service.provider
        })
        logger.info(f"✅ Translation service initialized successfully with provider: {translation_service.provider}")

        # Step 6: Create audio stream from WebSocket
        async def audio_stream_generator():
            """Generator that yields audio chunks from WebSocket."""
            chunk_count = 0
            total_bytes = 0
            try:
                while True:
                    audio_chunk = await websocket.receive_bytes()
                    chunk_count += 1
                    total_bytes += len(audio_chunk)

                    # Log every 50 chunks to avoid spam
                    if chunk_count % 50 == 0:
                        logger.info(f"📦 Received {chunk_count} audio chunks ({total_bytes} bytes total)")

                    yield audio_chunk
            except WebSocketDisconnect:
                logger.info(f"✅ WebSocket disconnected: user={user.id}, received {chunk_count} chunks, {total_bytes} bytes total")
            except Exception as e:
                logger.error(f"❌ Error receiving audio: {str(e)}, chunks received: {chunk_count}")

        # Step 7: Process audio and stream subtitles
        try:
            async for subtitle_cue in translation_service.process_live_audio_to_subtitles(
                audio_stream_generator(),
                source_lang=source_lang,
                target_lang=target_lang
            ):
                # Send subtitle cue to client
                await websocket.send_json({
                    "type": "subtitle",
                    "data": subtitle_cue
                })

        except WebSocketDisconnect:
            logger.info(f"Live subtitle session ended: user={user.id}, channel={channel_id}")

        except Exception as e:
            logger.error(f"Error in live subtitle stream: {str(e)}")
            try:
                await websocket.send_json({
                    "type": "error",
                    "message": "Translation service error"
                })
            except Exception:
                pass

    except Exception as e:
        logger.error(f"Failed to initialize translation service: {str(e)}")
        try:
            await websocket.send_json({
                "type": "error",
                "message": "Service unavailable"
            })
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
            "supported_target_languages": channel.available_translation_languages
        }

    except Exception as e:
        logger.error(f"Error checking subtitle availability: {str(e)}")
        return {"available": False, "error": "Internal error"}
