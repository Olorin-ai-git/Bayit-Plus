"""
ElevenLabs Realtime Speech-to-Text Service
Real-time audio transcription using ElevenLabs Scribe v2 WebSocket API with automatic reconnection.
"""

import asyncio
import base64
import json
import logging
import time
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

ELEVENLABS_REALTIME_STT_URL = "wss://api.elevenlabs.io/v1/speech-to-text/realtime"

ELEVENLABS_LANGUAGE_CODES = {
    "he": "he", "en": "en", "ar": "ar", "es": "es", "ru": "ru",
    "fr": "fr", "de": "de", "it": "it", "pt": "pt", "yi": "yi",
}

MAX_RECONNECT_ATTEMPTS = 5
INITIAL_RECONNECT_DELAY_SEC = 1.0
MAX_RECONNECT_DELAY_SEC = 30.0
RECONNECT_BACKOFF_MULTIPLIER = 2.0


class ElevenLabsRealtimeService:
    """Real-time speech-to-text service with ultra-low latency (~150ms) and auto-reconnection."""

    def __init__(self, config: VoiceConfig):
        """Initialize with voice configuration via dependency injection."""
        if not WEBSOCKETS_AVAILABLE:
            raise ImportError("websockets library not installed. Install with: pip install websockets")

        if not config.elevenlabs_api_key:
            raise ValueError("ElevenLabs API key not configured")

        self.config = config
        self.websocket: Optional[ClientConnection] = None
        self._connected = False
        self._session_confirmed = False
        self._session_event: asyncio.Event = asyncio.Event()
        self._receive_task: Optional[asyncio.Task] = None
        self._transcript_queue: asyncio.Queue = asyncio.Queue()
        self._error_queue: asyncio.Queue = asyncio.Queue()
        self._running = False
        self._source_lang: str = "he"
        self._reconnect_attempts = 0
        self._audio_buffer: list[bytes] = []
        self._reconnect_lock: asyncio.Lock = asyncio.Lock()
        self._pending_reconnect: bool = False
        self._last_commit_time: float = 0.0
        self._forced_commit_interval_sec: float = 2.0
        self._chunk_count_since_commit: int = 0
        self._max_chunks_before_commit: int = 30

        logger.info("ElevenLabsRealtimeService initialized")

    async def connect(self, source_lang: str = "auto", timeout: float = 10.0) -> None:
        """Establish WebSocket connection to ElevenLabs realtime STT."""
        if self._connected and self._session_confirmed:
            logger.warning("Already connected to ElevenLabs realtime STT")
            return

        self._source_lang = source_lang
        self._session_event.clear()
        self._session_confirmed = False

        ws_url = (
            f"{ELEVENLABS_REALTIME_STT_URL}?model_id=scribe_v2_realtime"
            f"&audio_format=pcm_16000&sample_rate=16000&commit_strategy=vad"
            f"&include_language_detection=true&vad_silence_threshold_secs=0.3&vad_threshold=0.25"
        )

        lang_code = "auto"
        if source_lang and source_lang != "auto":
            lang_code = ELEVENLABS_LANGUAGE_CODES.get(source_lang, source_lang)
            ws_url += f"&language_code={lang_code}"

        try:
            self.websocket = await websockets.connect(
                ws_url,
                additional_headers={"xi-api-key": self.config.elevenlabs_api_key},
                ping_interval=20,
                ping_timeout=30,
                close_timeout=10,
            )

            self._connected = True
            self._running = True
            self._reconnect_attempts = 0
            self._last_commit_time = 0.0
            self._chunk_count_since_commit = 0
            self._receive_task = asyncio.create_task(self._receive_loop())

            try:
                await asyncio.wait_for(self._session_event.wait(), timeout=timeout)
                logger.info(f"ElevenLabs session confirmed (language: {lang_code})")
            except asyncio.TimeoutError:
                logger.error(f"Timeout waiting for ElevenLabs session confirmation after {timeout}s")
                try:
                    error = self._error_queue.get_nowait()
                    logger.error(f"Connection error: {error}")
                except asyncio.QueueEmpty:
                    pass
                await self.close()
                raise ConnectionError(f"ElevenLabs session confirmation timeout after {timeout}s")

        except ConnectionError:
            raise
        except Exception as e:
            logger.error(f"Failed to connect to ElevenLabs realtime STT: {str(e)}")
            self._connected = False
            self._session_confirmed = False
            raise

    async def _attempt_reconnect(self) -> bool:
        """Attempt to reconnect with exponential backoff."""
        if self._reconnect_attempts >= MAX_RECONNECT_ATTEMPTS:
            logger.error(f"Max reconnection attempts ({MAX_RECONNECT_ATTEMPTS}) exceeded")
            return False

        self._reconnect_attempts += 1
        delay = min(
            INITIAL_RECONNECT_DELAY_SEC * (RECONNECT_BACKOFF_MULTIPLIER ** (self._reconnect_attempts - 1)),
            MAX_RECONNECT_DELAY_SEC
        )

        logger.warning(f"Attempting reconnection {self._reconnect_attempts}/{MAX_RECONNECT_ATTEMPTS} in {delay:.1f}s...")
        await asyncio.sleep(delay)

        try:
            if self._receive_task and not self._receive_task.done():
                self._receive_task.cancel()
                try:
                    await self._receive_task
                except asyncio.CancelledError:
                    pass
                self._receive_task = None

            if self.websocket:
                try:
                    await self.websocket.close()
                except Exception:
                    pass
                self.websocket = None

            self._connected = False
            self._session_confirmed = False

            await self.connect(self._source_lang)

            if self._audio_buffer:
                logger.info(f"Replaying {len(self._audio_buffer)} buffered audio chunks")
                for chunk in self._audio_buffer[-50:]:
                    try:
                        await self.send_audio_chunk(chunk, buffer=False)
                    except Exception:
                        break
                self._audio_buffer.clear()

            logger.info("Reconnection successful")
            return True

        except Exception as e:
            logger.error(f"Reconnection attempt {self._reconnect_attempts} failed: {str(e)}")
            return False

    async def _receive_loop(self) -> None:
        """Background task to receive transcripts from WebSocket."""
        if not self.websocket:
            return

        logger.info("ElevenLabs receive loop started")
        try:
            async for message in self.websocket:
                if not self._running:
                    break

                try:
                    data = json.loads(message)
                    msg_type = data.get("message_type", "")

                    if msg_type == "committed_transcript_with_timestamps":
                        transcript_text = data.get("text", "").strip()
                        detected_lang = data.get("language_code", "auto")

                        if transcript_text and len(transcript_text) >= 2:
                            await self._transcript_queue.put((transcript_text, detected_lang))
                            logger.info(f"ElevenLabs transcript [{detected_lang}]: {transcript_text}")

                    elif msg_type in ("error", "auth_error", "quota_exceeded", "rate_limited"):
                        error_msg = data.get("error", msg_type)
                        logger.error(f"ElevenLabs error [{msg_type}]: {error_msg}")
                        await self._error_queue.put({"type": "error", "code": msg_type, "message": error_msg})

                    elif msg_type == "session_started":
                        self._last_commit_time = time.time()
                        self._chunk_count_since_commit = 0
                        self._session_confirmed = True
                        self._session_event.set()
                        logger.info("ElevenLabs session started")

                except json.JSONDecodeError:
                    msg_preview = message[:100] if isinstance(message, str) else message[:100].decode('utf-8', errors='replace')
                    logger.warning(f"Invalid JSON from ElevenLabs: {msg_preview}")

        except ConnectionClosedOK:
            logger.info("ElevenLabs connection closed normally")
        except ConnectionClosedError as e:
            logger.warning(f"ElevenLabs connection closed with error: {e}")
            if self._running:
                self._connected = False
                if not await self._attempt_reconnect():
                    await self._error_queue.put({"type": "connection_failed", "message": "Failed to reconnect"})
        except Exception as e:
            logger.error(f"Error in receive loop: {str(e)}")
            if self._running:
                self._connected = False
                self._session_confirmed = False
                await self._attempt_reconnect()
        finally:
            self._connected = False
            self._session_confirmed = False

    async def send_audio_chunk(self, audio_data: bytes, buffer: bool = True) -> None:
        """Send audio chunk to ElevenLabs for transcription."""
        if buffer:
            self._audio_buffer.append(audio_data)
            if len(self._audio_buffer) > 100:
                self._audio_buffer.pop(0)

        if not self._connected or not self.websocket or not self._session_confirmed:
            if self._running and not self._pending_reconnect:
                logger.warning("Not connected - triggering reconnection")
                self._pending_reconnect = True
                asyncio.create_task(self._background_reconnect())
            return

        try:
            current_time = time.time()
            self._chunk_count_since_commit += 1

            should_force_commit = False
            if self._last_commit_time > 0:
                time_since_commit = current_time - self._last_commit_time
                if time_since_commit >= self._forced_commit_interval_sec:
                    should_force_commit = True
            else:
                self._last_commit_time = current_time

            if self._chunk_count_since_commit >= self._max_chunks_before_commit:
                should_force_commit = True

            audio_b64 = base64.b64encode(audio_data).decode("utf-8")
            message = {
                "message_type": "input_audio_chunk",
                "audio_base_64": audio_b64,
                "commit": should_force_commit,
                "sample_rate": 16000
            }
            await self.websocket.send(json.dumps(message))

            if should_force_commit:
                self._last_commit_time = current_time
                self._chunk_count_since_commit = 0

        except ConnectionClosed:
            logger.warning("Connection closed while sending audio")
            self._connected = False
            if self._running:
                await self._attempt_reconnect()
        except Exception as e:
            logger.error(f"Error sending audio: {str(e)}")
            raise

    async def _background_reconnect(self) -> None:
        """Background task to handle reconnection."""
        async with self._reconnect_lock:
            try:
                if self._connected and self._session_confirmed:
                    return

                logger.info("Starting background reconnection...")
                if not await self._attempt_reconnect():
                    logger.error("Background reconnection failed")
                    await self._error_queue.put({
                        "type": "connection_failed",
                        "message": "Failed to reconnect after multiple attempts"
                    })
            finally:
                self._pending_reconnect = False

    async def receive_transcripts(self) -> AsyncIterator[tuple[str, str]]:
        """Async iterator to receive transcripts."""
        while self._running or not self._transcript_queue.empty():
            try:
                transcript = await asyncio.wait_for(self._transcript_queue.get(), timeout=0.5)
                yield transcript
            except asyncio.TimeoutError:
                if not self._running and self._transcript_queue.empty():
                    break
                try:
                    error = self._error_queue.get_nowait()
                    if error.get("type") == "connection_failed":
                        logger.error("Connection failed, stopping transcription")
                        break
                except asyncio.QueueEmpty:
                    pass
                continue
            except Exception as e:
                logger.error(f"Error receiving transcript: {str(e)}")
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
                logger.debug(f"Error closing WebSocket: {str(e)}")
            self.websocket = None

        self._connected = False
        self._session_confirmed = False
        self._session_event.clear()
        self._pending_reconnect = False
        self._audio_buffer.clear()
        logger.info("ElevenLabs realtime connection closed")

    async def transcribe_audio_stream(
        self,
        audio_stream: AsyncIterator[bytes],
        source_lang: str = "auto"
    ) -> AsyncIterator[tuple[str, str]]:
        """Transcribe streaming audio in real-time."""
        sender_task = None
        try:
            await self.connect(source_lang)

            async def send_audio():
                chunk_count = 0
                try:
                    async for audio_chunk in audio_stream:
                        if not self._running:
                            break
                        await self.send_audio_chunk(audio_chunk)
                        chunk_count += 1
                except Exception as e:
                    logger.error(f"Error in audio sender: {str(e)}")

            sender_task = asyncio.create_task(send_audio())

            async for transcript in self.receive_transcripts():
                yield transcript

            await sender_task

        except Exception as e:
            logger.error(f"Transcription error: {str(e)}")
            raise
        finally:
            if sender_task and not sender_task.done():
                sender_task.cancel()
                try:
                    await sender_task
                except asyncio.CancelledError:
                    pass
            await self.close()

    def verify_service_availability(self) -> bool:
        """Verify ElevenLabs API is available."""
        try:
            return bool(self.config.elevenlabs_api_key) and WEBSOCKETS_AVAILABLE
        except Exception as e:
            logger.error(f"Service unavailable: {str(e)}")
            return False

    @property
    def is_connected(self) -> bool:
        """Check if currently connected with session confirmed."""
        return self._connected and self._session_confirmed

    @property
    def reconnect_attempts(self) -> int:
        """Get the current number of reconnection attempts."""
        return self._reconnect_attempts
