"""
User Dubbing WebSocket Endpoint

Real-time bidirectional communication for:
- Audio dubbing (PCM audio in, dubbed audio out)
- Live subtitles (PCM audio in, translated text out)
"""

import asyncio
import base64
import json
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.user import User
from app.services.dubbing.user_dubbing_service import UserDubbingService

# Import existing dubbing services
try:
    from app.services.realtime_dubbing_service import RealtimeDubbingService
except ImportError:
    RealtimeDubbingService = None

try:
    from app.services.translation_service import TranslationService
except ImportError:
    TranslationService = None

logger = get_logger(__name__)
router = APIRouter()


class DubbingWebSocketManager:
    """
    Manages WebSocket connection for real-time dubbing and subtitles

    Handles:
    - Audio PCM input (Int16, 16kHz, mono)
    - Audio dubbing output (base64 encoded audio)
    - Live subtitle output (translated text)
    - Connection lifecycle
    """

    def __init__(
        self,
        websocket: WebSocket,
        session_id: str,
        user: User,
        dubbing_service: UserDubbingService,
    ):
        self.websocket = websocket
        self.session_id = session_id
        self.user = user
        self.dubbing_service = dubbing_service
        self.session = None
        self.realtime_dubbing = None
        self.translation_service = None
        self.is_connected = False
        self.audio_chunks_count = 0
        self.subtitles_count = 0

    async def connect(self):
        """Accept WebSocket connection and initialize services"""
        try:
            await self.websocket.accept()
            self.is_connected = True

            # Get session
            self.session = await self.dubbing_service.get_session(self.session_id)
            if not self.session:
                await self.send_error("Session not found")
                await self.close()
                return False

            # Update session status
            self.session.websocket_connected = True
            self.session.updated_at = datetime.now(timezone.utc)
            await self.session.save()

            # Initialize services based on session type
            if self.session.session_type.audio_dubbing and RealtimeDubbingService:
                self.realtime_dubbing = RealtimeDubbingService(
                    source_language=self.session.source_language,
                    target_language=self.session.target_language,
                    voice_id=self.session.voice_id,
                )

            if self.session.session_type.live_subtitles and TranslationService:
                self.translation_service = TranslationService()

            # Send connection confirmation
            await self.send_status("connected", "WebSocket connection established")

            logger.info(
                f"WebSocket connected for session {self.session_id}",
                extra={
                    "user_id": str(self.user.id),
                    "audio_dubbing": self.session.session_type.audio_dubbing,
                    "live_subtitles": self.session.session_type.live_subtitles,
                },
            )

            return True

        except Exception as e:
            logger.error(
                f"Error connecting WebSocket for session {self.session_id}: {e}",
                exc_info=True,
            )
            return False

    async def handle_audio_chunk(self, pcm_data: bytes):
        """
        Handle incoming PCM audio chunk

        Args:
            pcm_data: Raw PCM audio (Int16, 16kHz, mono)
        """
        try:
            self.audio_chunks_count += 1

            # Process audio dubbing
            if self.session.session_type.audio_dubbing and self.realtime_dubbing:
                try:
                    # Process PCM → Transcript → Translation → TTS
                    dubbed_audio = await self.realtime_dubbing.process_audio_chunk(
                        pcm_data
                    )

                    if dubbed_audio:
                        # Encode as base64 and send
                        base64_audio = base64.b64encode(dubbed_audio).decode("utf-8")
                        await self.send_audio(base64_audio)

                except Exception as e:
                    logger.error(
                        f"Error processing audio dubbing: {e}", exc_info=True
                    )

            # Generate live subtitles
            if self.session.session_type.live_subtitles:
                try:
                    # Transcribe audio
                    transcript = await self._transcribe_audio(pcm_data)

                    if transcript:
                        # Translate text
                        translated_text = await self._translate_text(
                            transcript,
                            self.session.source_language,
                            self.session.session_type.subtitle_language
                            or self.session.target_language,
                        )

                        if translated_text:
                            self.subtitles_count += 1
                            await self.send_subtitle(translated_text)

                except Exception as e:
                    logger.error(
                        f"Error generating subtitle: {e}", exc_info=True
                    )

            # Update session statistics (every 10 chunks)
            if self.audio_chunks_count % 10 == 0:
                await self.dubbing_service.update_session_activity(
                    self.session_id,
                    audio_chunks_processed=10,
                    subtitles_generated=self.subtitles_count,
                    bytes_transferred=len(pcm_data),
                )
                self.subtitles_count = 0  # Reset counter

        except Exception as e:
            logger.error(
                f"Error handling audio chunk for session {self.session_id}: {e}",
                exc_info=True,
            )
            await self.send_error(f"Audio processing error: {str(e)}")

    async def _transcribe_audio(self, pcm_data: bytes) -> Optional[str]:
        """
        Transcribe audio to text

        Args:
            pcm_data: Raw PCM audio

        Returns:
            Transcribed text or None
        """
        # TODO: Implement actual transcription using ElevenLabs or OpenAI Whisper
        # For now, return placeholder
        return None

    async def _translate_text(
        self, text: str, source_lang: str, target_lang: str
    ) -> Optional[str]:
        """
        Translate text

        Args:
            text: Text to translate
            source_lang: Source language code
            target_lang: Target language code

        Returns:
            Translated text or None
        """
        if self.translation_service:
            try:
                result = await self.translation_service.translate(
                    text, source_lang, target_lang
                )
                return result.get("translated_text")
            except Exception as e:
                logger.error(f"Translation error: {e}", exc_info=True)
                return None
        return None

    async def send_audio(self, base64_audio: str):
        """Send dubbed audio to client"""
        await self.websocket.send_json(
            {"type": "audio", "data": base64_audio, "timestamp": datetime.now(timezone.utc).isoformat()}
        )

    async def send_subtitle(self, text: str):
        """Send subtitle to client"""
        await self.websocket.send_json(
            {"type": "subtitle", "data": text, "timestamp": datetime.now(timezone.utc).isoformat()}
        )

    async def send_transcript(self, text: str):
        """Send transcript (original language) to client"""
        await self.websocket.send_json(
            {"type": "transcript", "data": text, "timestamp": datetime.now(timezone.utc).isoformat()}
        )

    async def send_error(self, error: str):
        """Send error message to client"""
        await self.websocket.send_json(
            {"type": "error", "error": error, "timestamp": datetime.now(timezone.utc).isoformat()}
        )

    async def send_status(self, status: str, message: str = ""):
        """Send status update to client"""
        await self.websocket.send_json(
            {
                "type": "status",
                "status": status,
                "message": message,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        )

    async def close(self):
        """Close WebSocket connection"""
        try:
            if self.is_connected:
                await self.websocket.close()
                self.is_connected = False

            # Update session status
            if self.session:
                self.session.websocket_connected = False
                self.session.updated_at = datetime.now(timezone.utc)
                await self.session.save()

            logger.info(
                f"WebSocket closed for session {self.session_id}",
                extra={
                    "user_id": str(self.user.id),
                    "audio_chunks_processed": self.audio_chunks_count,
                },
            )

        except Exception as e:
            logger.error(
                f"Error closing WebSocket for session {self.session_id}: {e}",
                exc_info=True,
            )


@router.websocket("/ws/{session_id}")
async def dubbing_websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for real-time dubbing and subtitles

    **Protocol**:

    Client → Server (binary):
    - PCM audio chunks (Int16, 16kHz, mono)

    Server → Client (JSON):
    - {"type": "audio", "data": "<base64_audio>"}  # Dubbed audio
    - {"type": "subtitle", "data": "<text>"}       # Translated subtitle
    - {"type": "transcript", "data": "<text>"}     # Original transcript
    - {"type": "error", "error": "<message>"}      # Error message
    - {"type": "status", "status": "<state>"}      # Connection status

    **Authentication**:
    - JWT token in query params or first message
    """
    manager = None

    try:
        # Accept connection first
        await websocket.accept()

        # Wait for authentication message
        auth_message = await websocket.receive_json()

        if auth_message.get("type") != "auth":
            await websocket.send_json(
                {"type": "error", "error": "Authentication required"}
            )
            await websocket.close()
            return

        token = auth_message.get("token")
        if not token:
            await websocket.send_json(
                {"type": "error", "error": "Authentication token missing"}
            )
            await websocket.close()
            return

        # Authenticate user
        from app.core.security import decode_access_token

        payload = decode_access_token(token)
        if not payload:
            await websocket.send_json(
                {"type": "error", "error": "Invalid authentication token"}
            )
            await websocket.close()
            return

        user_id = payload.get("sub")
        user = await User.get(user_id)
        if not user or not user.is_active:
            await websocket.send_json(
                {"type": "error", "error": "User not found or inactive"}
            )
            await websocket.close()
            return

        # Create dubbing service and manager
        dubbing_service = UserDubbingService(user=user)
        manager = DubbingWebSocketManager(
            websocket, session_id, user, dubbing_service
        )

        # Connect (this will verify session exists)
        if not await manager.connect():
            return

        # Main message loop
        while True:
            try:
                # Receive message (can be binary audio or JSON control message)
                message = await websocket.receive()

                if "bytes" in message:
                    # Binary PCM audio data
                    pcm_data = message["bytes"]
                    await manager.handle_audio_chunk(pcm_data)

                elif "text" in message:
                    # JSON control message
                    data = json.loads(message["text"])
                    message_type = data.get("type")

                    if message_type == "ping":
                        await manager.send_status("pong")

                    elif message_type == "close":
                        break

                    else:
                        logger.warning(
                            f"Unknown message type: {message_type}",
                            extra={"session_id": session_id},
                        )

            except WebSocketDisconnect:
                logger.info(f"Client disconnected: {session_id}")
                break

            except Exception as e:
                logger.error(
                    f"Error in WebSocket message loop for session {session_id}: {e}",
                    exc_info=True,
                )
                await manager.send_error(f"Internal error: {str(e)}")
                break

    except WebSocketDisconnect:
        logger.info(f"Client disconnected during setup: {session_id}")

    except Exception as e:
        logger.error(
            f"Error in WebSocket endpoint for session {session_id}: {e}",
            exc_info=True,
        )

    finally:
        # Close connection and cleanup
        if manager:
            await manager.close()
