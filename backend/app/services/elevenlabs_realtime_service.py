"""
ElevenLabs Realtime Speech-to-Text Service
Real-time audio transcription using ElevenLabs Scribe v2 WebSocket API

Provides ultra-low latency (~150ms) speech-to-text with excellent Hebrew support (3.1% WER).
Includes automatic reconnection with exponential backoff for production reliability.
"""

import asyncio
import json
import logging
from typing import AsyncIterator, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

# Conditional import for websockets
try:
    import websockets
    from websockets import ClientConnection
    from websockets.exceptions import (
        ConnectionClosed,
        ConnectionClosedError,
        ConnectionClosedOK,
    )
    WEBSOCKETS_AVAILABLE = True
except ImportError:
    WEBSOCKETS_AVAILABLE = False
    ClientConnection = None  # type: ignore
    logger.warning("websockets library not available - install with: pip install websockets")

# ElevenLabs WebSocket endpoint for realtime STT
ELEVENLABS_REALTIME_STT_URL = "wss://api.elevenlabs.io/v1/speech-to-text/realtime"

# Language code mapping for ElevenLabs
# ElevenLabs uses ISO 639-1 codes (2-letter)
ELEVENLABS_LANGUAGE_CODES = {
    "he": "he",  # Hebrew - 3.1% WER (excellent)
    "en": "en",  # English
    "ar": "ar",  # Arabic
    "es": "es",  # Spanish
    "ru": "ru",  # Russian
    "fr": "fr",  # French
    "de": "de",  # German
    "it": "it",  # Italian
    "pt": "pt",  # Portuguese
    "yi": "yi",  # Yiddish
}

# Reconnection configuration
MAX_RECONNECT_ATTEMPTS = 5
INITIAL_RECONNECT_DELAY_SEC = 1.0
MAX_RECONNECT_DELAY_SEC = 30.0
RECONNECT_BACKOFF_MULTIPLIER = 2.0


class ElevenLabsRealtimeService:
    """
    Real-time speech-to-text service using ElevenLabs Scribe v2 WebSocket API.

    Features:
    - Ultra-low latency (~150ms)
    - Excellent Hebrew support (3.1% WER)
    - 90+ languages supported
    - Automatic reconnection with exponential backoff
    - Entity detection and keyterm prompting
    """

    def __init__(self):
        """Initialize the ElevenLabs realtime STT service."""
        if not WEBSOCKETS_AVAILABLE:
            raise ImportError(
                "websockets library not installed. Install with: pip install websockets"
            )

        if not settings.ELEVENLABS_API_KEY:
            raise ValueError("ELEVENLABS_API_KEY not configured")

        self.api_key = settings.ELEVENLABS_API_KEY
        self.websocket: Optional[ClientConnection] = None
        self._connected = False
        self._receive_task: Optional[asyncio.Task] = None
        self._transcript_queue: asyncio.Queue = asyncio.Queue()
        self._error_queue: asyncio.Queue = asyncio.Queue()
        self._running = False
        self._source_lang: str = "he"
        self._reconnect_attempts = 0
        self._audio_buffer: list[bytes] = []

        logger.info("ElevenLabsRealtimeService initialized")

    async def connect(self, source_lang: str = "he") -> None:
        """
        Establish WebSocket connection to ElevenLabs realtime STT.

        Args:
            source_lang: Source language code (he, en, ar, es, etc.)
        """
        if self._connected:
            logger.warning("Already connected to ElevenLabs realtime STT")
            return

        self._source_lang = source_lang
        lang_code = ELEVENLABS_LANGUAGE_CODES.get(source_lang, source_lang)

        # Build WebSocket URL with authentication and configuration
        ws_url = (
            f"{ELEVENLABS_REALTIME_STT_URL}"
            f"?model_id=scribe_v2"
            f"&language_code={lang_code}"
        )

        try:
            # Connect with API key in headers
            self.websocket = await websockets.connect(
                ws_url,
                extra_headers={
                    "xi-api-key": self.api_key,
                },
                ping_interval=20,
                ping_timeout=30,
                close_timeout=10,
            )

            self._connected = True
            self._running = True
            self._reconnect_attempts = 0

            # Start receive task to handle incoming transcripts
            self._receive_task = asyncio.create_task(self._receive_loop())

            logger.info(f"Connected to ElevenLabs realtime STT (language: {lang_code})")

        except Exception as e:
            logger.error(f"Failed to connect to ElevenLabs realtime STT: {str(e)}")
            self._connected = False
            raise

    async def _attempt_reconnect(self) -> bool:
        """
        Attempt to reconnect with exponential backoff.

        Returns:
            True if reconnection succeeded, False otherwise
        """
        if self._reconnect_attempts >= MAX_RECONNECT_ATTEMPTS:
            logger.error(
                f"Max reconnection attempts ({MAX_RECONNECT_ATTEMPTS}) exceeded"
            )
            return False

        self._reconnect_attempts += 1
        delay = min(
            INITIAL_RECONNECT_DELAY_SEC * (RECONNECT_BACKOFF_MULTIPLIER ** (self._reconnect_attempts - 1)),
            MAX_RECONNECT_DELAY_SEC
        )

        logger.warning(
            f"Attempting reconnection {self._reconnect_attempts}/{MAX_RECONNECT_ATTEMPTS} "
            f"in {delay:.1f}s..."
        )

        await asyncio.sleep(delay)

        try:
            # Close existing connection if any
            if self.websocket:
                try:
                    await self.websocket.close()
                except Exception:
                    pass
                self.websocket = None

            self._connected = False

            # Reconnect
            await self.connect(self._source_lang)

            # Replay buffered audio if any
            if self._audio_buffer:
                logger.info(f"Replaying {len(self._audio_buffer)} buffered audio chunks")
                for chunk in self._audio_buffer[-50:]:  # Replay last 50 chunks max
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

        try:
            async for message in self.websocket:
                if not self._running:
                    break

                try:
                    data = json.loads(message)

                    # Handle different message types from ElevenLabs
                    msg_type = data.get("type", "")

                    if msg_type == "transcript":
                        # Final transcript
                        transcript_text = data.get("text", "").strip()
                        if transcript_text:
                            await self._transcript_queue.put(transcript_text)
                            logger.debug(f"ElevenLabs final transcript: {transcript_text}")

                    elif msg_type == "partial":
                        # Partial transcript (interim results)
                        # Skip partial results for now, only emit finals
                        pass

                    elif msg_type == "error":
                        error_msg = data.get("message", "Unknown error")
                        error_code = data.get("code", "unknown")
                        logger.error(
                            f"ElevenLabs realtime error [{error_code}]: {error_msg}"
                        )
                        await self._error_queue.put({
                            "type": "error",
                            "code": error_code,
                            "message": error_msg
                        })

                    elif msg_type == "session_started":
                        session_id = data.get("session_id", "unknown")
                        logger.info(f"ElevenLabs session started: {session_id}")

                    elif msg_type == "session_ended":
                        logger.info("ElevenLabs session ended by server")

                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON from ElevenLabs: {message[:100]}")

        except ConnectionClosedOK:
            logger.info("ElevenLabs WebSocket connection closed normally")
        except ConnectionClosedError as e:
            logger.warning(f"ElevenLabs WebSocket connection closed with error: {e}")
            # Attempt reconnection if still supposed to be running
            if self._running:
                self._connected = False
                reconnected = await self._attempt_reconnect()
                if not reconnected:
                    await self._error_queue.put({
                        "type": "connection_failed",
                        "message": "Failed to reconnect after connection error"
                    })
        except ConnectionClosed as e:
            logger.info(f"ElevenLabs WebSocket connection closed: {e}")
        except Exception as e:
            logger.error(f"Error in ElevenLabs receive loop: {str(e)}")
            if self._running:
                self._connected = False
                await self._attempt_reconnect()
        finally:
            self._connected = False

    async def send_audio_chunk(self, audio_data: bytes, buffer: bool = True) -> None:
        """
        Send audio chunk to ElevenLabs for transcription.

        Args:
            audio_data: Raw PCM audio bytes (16kHz, mono, 16-bit signed)
            buffer: Whether to buffer the chunk for potential replay on reconnect
        """
        if buffer:
            # Keep a rolling buffer for reconnection replay
            self._audio_buffer.append(audio_data)
            if len(self._audio_buffer) > 100:
                self._audio_buffer.pop(0)

        if not self._connected or not self.websocket:
            logger.warning("Not connected to ElevenLabs - buffering audio")
            return

        try:
            # ElevenLabs expects raw PCM audio as binary
            await self.websocket.send(audio_data)

        except ConnectionClosed:
            logger.warning("Connection closed while sending audio")
            self._connected = False
            if self._running:
                await self._attempt_reconnect()
        except Exception as e:
            logger.error(f"Error sending audio to ElevenLabs: {str(e)}")
            raise

    async def receive_transcripts(self) -> AsyncIterator[str]:
        """
        Async iterator to receive transcripts from ElevenLabs.

        Yields:
            Transcribed text segments as they arrive
        """
        while self._running or not self._transcript_queue.empty():
            try:
                # Wait for transcript with timeout
                transcript = await asyncio.wait_for(
                    self._transcript_queue.get(),
                    timeout=0.5
                )
                yield transcript

            except asyncio.TimeoutError:
                # No transcript available, check if still running
                if not self._running and self._transcript_queue.empty():
                    break

                # Check for errors
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
        self._audio_buffer.clear()
        logger.info("ElevenLabs realtime connection closed")

    async def transcribe_audio_stream(
        self,
        audio_stream: AsyncIterator[bytes],
        source_lang: str = "he"
    ) -> AsyncIterator[str]:
        """
        Transcribe streaming audio in real-time using ElevenLabs WebSocket.

        Args:
            audio_stream: Async iterator yielding audio chunks (PCM, 16kHz, mono)
            source_lang: Source language code

        Yields:
            Transcribed text segments with ultra-low latency (~150ms)
        """
        sender_task = None
        try:
            # Connect to ElevenLabs
            await self.connect(source_lang)

            # Start sending audio in background task
            async def send_audio():
                chunk_count = 0
                total_bytes = 0
                try:
                    async for audio_chunk in audio_stream:
                        if not self._running:
                            break
                        await self.send_audio_chunk(audio_chunk)
                        chunk_count += 1
                        total_bytes += len(audio_chunk)

                        if chunk_count % 100 == 0:
                            logger.debug(
                                f"ElevenLabs: sent {chunk_count} chunks ({total_bytes} bytes)"
                            )

                except Exception as e:
                    logger.error(f"Error in audio sender: {str(e)}")
                finally:
                    logger.info(
                        f"Audio streaming complete: {chunk_count} chunks, {total_bytes} bytes"
                    )

            # Start audio sender task
            sender_task = asyncio.create_task(send_audio())

            # Yield transcripts as they arrive
            async for transcript in self.receive_transcripts():
                yield transcript

            # Wait for sender to complete
            await sender_task

        except Exception as e:
            logger.error(f"ElevenLabs transcription error: {str(e)}")
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
            return bool(settings.ELEVENLABS_API_KEY) and WEBSOCKETS_AVAILABLE
        except Exception as e:
            logger.error(f"ElevenLabs service unavailable: {str(e)}")
            return False

    @property
    def is_connected(self) -> bool:
        """Check if currently connected to ElevenLabs WebSocket."""
        return self._connected

    @property
    def reconnect_attempts(self) -> int:
        """Get the current number of reconnection attempts."""
        return self._reconnect_attempts
