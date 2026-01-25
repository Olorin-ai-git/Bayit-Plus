"""
ElevenLabs Text-to-Speech Streaming Service
Real-time TTS using ElevenLabs WebSocket API with input streaming.
"""

import asyncio
import base64
import json
import logging
from typing import AsyncIterator, Optional

from bayit_voice.config import VoiceConfig

logger = logging.getLogger(__name__)

try:
    import websockets
    from websockets import ClientConnection
    from websockets.exceptions import ConnectionClosed, ConnectionClosedError, ConnectionClosedOK
    WEBSOCKETS_AVAILABLE = True
except ImportError:
    WEBSOCKETS_AVAILABLE = False
    ClientConnection = None  # type: ignore
    logger.warning("websockets library not available - install with: pip install websockets")

ELEVENLABS_TTS_WS_URL = "wss://api.elevenlabs.io/v1/text-to-speech"

DEFAULT_VOICE_SETTINGS = {
    "stability": 0.5,
    "similarity_boost": 0.75,
    "style": 0.0,
    "use_speaker_boost": True,
}


class ElevenLabsTTSStreamingService:
    """
    Streaming TTS service using ElevenLabs WebSocket API.
    Ultra-low latency: First audio chunk arrives ~300ms after first text chunk.
    """

    def __init__(self, config: VoiceConfig):
        """Initialize with voice configuration via dependency injection."""
        if not WEBSOCKETS_AVAILABLE:
            raise ImportError("websockets library not installed. Install with: pip install websockets")

        if not config.elevenlabs_api_key:
            raise ValueError("ElevenLabs API key not configured")

        self.config = config
        self.websocket: Optional[ClientConnection] = None
        self._connected = False
        self._running = False
        self._audio_queue: asyncio.Queue = asyncio.Queue()
        self._error_queue: asyncio.Queue = asyncio.Queue()
        self._receive_task: Optional[asyncio.Task] = None

        logger.info("ElevenLabsTTSStreamingService initialized")

    async def connect(
        self,
        voice_id: Optional[str] = None,
        model_id: str = "eleven_turbo_v2_5",
        output_format: str = "mp3_44100_128",
        language_code: Optional[str] = None,
    ) -> None:
        """
        Establish WebSocket connection to ElevenLabs TTS.

        Args:
            voice_id: ElevenLabs voice ID
            model_id: Model to use (default: eleven_turbo_v2_5)
            output_format: Audio format (default: mp3_44100_128)
            language_code: Language code for proper pronunciation (e.g., 'he' for Hebrew, 'en' for English)
        """
        if self._connected:
            logger.warning("Already connected to ElevenLabs TTS")
            return

        voice = voice_id or self.config.elevenlabs_default_voice_id
        ws_url = (
            f"{ELEVENLABS_TTS_WS_URL}/{voice}/stream-input"
            f"?model_id={model_id}&output_format={output_format}"
        )

        try:
            self.websocket = await websockets.connect(
                ws_url,
                additional_headers={"xi-api-key": self.config.elevenlabs_api_key},
                ping_interval=20,
                ping_timeout=30,
                close_timeout=10,
            )

            init_message = {
                "text": " ",
                "voice_settings": DEFAULT_VOICE_SETTINGS,
                "generation_config": {"chunk_length_schedule": [120, 160, 250, 290]},
                "xi_api_key": self.config.elevenlabs_api_key,
            }

            # Add language_code if provided (ensures proper pronunciation)
            if language_code:
                init_message["language_code"] = language_code

            await self.websocket.send(json.dumps(init_message))

            self._connected = True
            self._running = True
            self._receive_task = asyncio.create_task(self._receive_loop())

            logger.info(f"Connected to ElevenLabs TTS (voice: {voice}, model: {model_id})")

        except Exception as e:
            logger.error(f"Failed to connect to ElevenLabs TTS: {str(e)}")
            self._connected = False
            raise

    async def _receive_loop(self) -> None:
        """Background task to receive audio chunks from WebSocket."""
        if not self.websocket:
            return

        logger.info("ElevenLabs TTS receive loop started")
        try:
            chunk_count = 0
            async for message in self.websocket:
                if not self._running:
                    break

                try:
                    data = json.loads(message)

                    if "audio" in data and data["audio"]:
                        audio_bytes = base64.b64decode(data["audio"])
                        await self._audio_queue.put(audio_bytes)
                        chunk_count += 1
                        if chunk_count == 1:
                            logger.info("First TTS audio chunk received")

                    if data.get("isFinal"):
                        logger.info(f"TTS generation complete: {chunk_count} audio chunks")
                        await self._audio_queue.put(None)

                    if "error" in data:
                        error_msg = data.get("error", "Unknown TTS error")
                        logger.error(f"ElevenLabs TTS error: {error_msg}")
                        await self._error_queue.put({"type": "error", "message": error_msg})

                except json.JSONDecodeError:
                    await self._audio_queue.put(message)

        except ConnectionClosedOK:
            logger.info("ElevenLabs TTS connection closed normally")
        except ConnectionClosedError as e:
            logger.warning(f"ElevenLabs TTS connection closed with error: {e}")
            await self._error_queue.put({"type": "connection_error", "message": str(e)})
        except ConnectionClosed as e:
            logger.info(f"ElevenLabs TTS connection closed: {e}")
        except Exception as e:
            logger.error(f"Error in TTS receive loop: {str(e)}")
        finally:
            self._connected = False

    async def send_text_chunk(self, text: str, flush: bool = False) -> None:
        """Send a text chunk to be synthesized."""
        if not self._connected or not self.websocket:
            logger.warning("Not connected to ElevenLabs TTS")
            return

        try:
            message = {"text": text, "try_trigger_generation": True}
            if flush:
                message["flush"] = True
            await self.websocket.send(json.dumps(message))

        except ConnectionClosed:
            logger.warning("Connection closed while sending text")
            self._connected = False
        except Exception as e:
            logger.error(f"Error sending text to TTS: {str(e)}")
            raise

    async def finish_stream(self) -> None:
        """Signal end of text input to finalize audio generation."""
        if not self._connected or not self.websocket:
            return

        try:
            await self.websocket.send(json.dumps({"text": "", "flush": True}))
            logger.info("Sent TTS stream finish signal")
        except Exception as e:
            logger.error(f"Error finishing TTS stream: {str(e)}")

    async def receive_audio(self) -> AsyncIterator[bytes]:
        """Async iterator to receive audio chunks as they are generated."""
        while self._running or not self._audio_queue.empty():
            try:
                audio_chunk = await asyncio.wait_for(self._audio_queue.get(), timeout=0.5)
                if audio_chunk is None:
                    break
                yield audio_chunk

            except asyncio.TimeoutError:
                if not self._running and self._audio_queue.empty():
                    break

                try:
                    error = self._error_queue.get_nowait()
                    logger.error(f"TTS error received: {error}")
                    break
                except asyncio.QueueEmpty:
                    pass

                continue

            except Exception as e:
                logger.error(f"Error receiving audio: {str(e)}")
                break

    async def close(self) -> None:
        """Close WebSocket connection and cleanup."""
        self._running = False

        if self._receive_task:
            self._receive_task.cancel()
            try:
                await self._receive_task
            except asyncio.CancelledError:
                pass
            self._receive_task = None

        if self.websocket:
            try:
                await self.websocket.close()
            except Exception as e:
                logger.debug(f"Error closing TTS WebSocket: {str(e)}")
            self.websocket = None

        self._connected = False
        logger.info("ElevenLabs TTS connection closed")

    async def synthesize_streaming(
        self,
        text_stream: AsyncIterator[str],
        voice_id: Optional[str] = None,
    ) -> AsyncIterator[bytes]:
        """Synthesize streaming text to streaming audio."""
        sender_task = None
        try:
            await self.connect(voice_id=voice_id)

            async def send_text():
                text_count = 0
                try:
                    async for text_chunk in text_stream:
                        if not self._running:
                            break
                        await self.send_text_chunk(text_chunk)
                        text_count += 1

                    await self.finish_stream()
                    logger.info(f"Sent {text_count} text chunks to TTS")

                except Exception as e:
                    logger.error(f"Error in text sender: {str(e)}")

            sender_task = asyncio.create_task(send_text())

            async for audio_chunk in self.receive_audio():
                yield audio_chunk

            await sender_task

        except Exception as e:
            logger.error(f"TTS streaming error: {str(e)}")
            raise

        finally:
            if sender_task and not sender_task.done():
                sender_task.cancel()
                try:
                    await sender_task
                except asyncio.CancelledError:
                    pass
            await self.close()

    @property
    def is_connected(self) -> bool:
        """Check if currently connected to ElevenLabs TTS WebSocket."""
        return self._connected

    def verify_service_availability(self) -> bool:
        """Verify ElevenLabs TTS API is available."""
        try:
            return bool(self.config.elevenlabs_api_key) and WEBSOCKETS_AVAILABLE
        except Exception as e:
            logger.error(f"ElevenLabs TTS service unavailable: {str(e)}")
            return False
