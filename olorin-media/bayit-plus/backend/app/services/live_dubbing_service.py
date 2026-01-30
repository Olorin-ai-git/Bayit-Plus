"""
Live Dubbing Service

Real-time audio dubbing pipeline for live channels:
Audio → STT (ElevenLabs Scribe v2) → Translation → TTS (ElevenLabs)

Part of the Olorin.ai platform capabilities.
"""

import asyncio
import base64
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Any, AsyncIterator, Dict, Optional, Protocol

from app.core.config import settings
from app.models.content import LiveChannel
from app.models.live_dubbing import (DubbedAudioMessage, DubbingMessage,
                                     DubbingMetrics, LatencyReport,
                                     LiveDubbingSession)
from app.models.user import User
from app.services.live_dubbing.channel_stt_manager import \
    get_channel_stt_manager
from app.services.live_dubbing.session_store import get_session_store
from app.services.olorin.resilience import (ELEVENLABS_BREAKER,
                                            CircuitBreakerError,
                                            circuit_breaker)

logger = logging.getLogger(__name__)


class STTProvider(Protocol):
    """Protocol for speech-to-text providers."""

    async def connect(self, source_lang: str) -> None: ...
    async def send_audio_chunk(self, audio_data: bytes) -> None: ...
    async def receive_transcripts(self) -> AsyncIterator[tuple[str, str]]: ...
    async def close(self) -> None: ...
    @property
    def is_connected(self) -> bool: ...


class TTSProvider(Protocol):
    """Protocol for text-to-speech providers."""

    async def connect(self, voice_id: Optional[str]) -> None: ...
    async def send_text_chunk(self, text: str, flush: bool) -> None: ...
    async def finish_stream(self) -> None: ...
    async def receive_audio(self) -> AsyncIterator[bytes]: ...
    async def close(self) -> None: ...
    @property
    def is_connected(self) -> bool: ...


class TranslationProvider(Protocol):
    """Protocol for translation providers."""

    async def translate_text(
        self, text: str, source_lang: str, target_lang: str
    ) -> str: ...


def get_stt_provider() -> STTProvider:
    """Factory function to get the configured STT provider."""
    from bayit_voice import ElevenLabsRealtimeService, SimpleVoiceConfig

    config = SimpleVoiceConfig(
        api_key=settings.ELEVENLABS_API_KEY,
        default_voice_id=settings.ELEVENLABS_DEFAULT_VOICE_ID,
    )
    return ElevenLabsRealtimeService(config)


def get_tts_provider() -> TTSProvider:
    """Factory function to get the configured TTS provider."""
    from bayit_voice import ElevenLabsTTSStreamingService, SimpleVoiceConfig

    config = SimpleVoiceConfig(
        api_key=settings.ELEVENLABS_API_KEY,
        default_voice_id=settings.ELEVENLABS_DEFAULT_VOICE_ID,
    )
    return ElevenLabsTTSStreamingService(config)


def get_translation_provider() -> TranslationProvider:
    """Factory function to get the configured translation provider."""
    from app.services.live_translation_service import LiveTranslationService

    return LiveTranslationService()


class LiveDubbingService:
    """
    Orchestrates real-time live channel dubbing.

    Pipeline: Audio → STT (ElevenLabs Scribe v2) → Translation → TTS (ElevenLabs)

    Reuses existing infrastructure:
    - ElevenLabsRealtimeService (STT) from bayit_voice
    - LiveTranslationService (Translation)
    - ElevenLabsTTSStreamingService (TTS) from bayit_voice
    """

    def __init__(
        self,
        channel: LiveChannel,
        user: User,
        target_language: str,
        voice_id: Optional[str] = None,
        platform: str = "web",
        stt_provider: Optional[STTProvider] = None,
        tts_provider: Optional[TTSProvider] = None,
        translation_provider: Optional[TranslationProvider] = None,
    ):
        """
        Initialize live dubbing service.

        Args:
            channel: The live channel being dubbed
            user: The user requesting dubbing
            target_language: Target language for dubbing (e.g., "en", "es")
            voice_id: Optional ElevenLabs voice ID override
            platform: Client platform (web, ios, tvos, android)
            stt_provider: Optional STT provider (for testing)
            tts_provider: Optional TTS provider (for testing)
            translation_provider: Optional translation provider (for testing)
        """
        self.channel = channel
        self.user = user
        self.target_language = target_language
        self.voice_id = voice_id or settings.ELEVENLABS_DEFAULT_VOICE_ID
        self.platform = platform

        # Generate unique session ID
        self.session_id = f"live_dub_{uuid.uuid4().hex[:12]}"

        # Get source language from channel
        self.source_language = channel.dubbing_source_language or "he"

        # Calculate sync delay
        self.sync_delay_ms = (
            channel.dubbing_sync_delay_ms
            or settings.olorin.dubbing.live_dubbing_default_sync_delay_ms
        )

        # Initialize providers (dependency injection)
        # Note: STT provider is replaced by ChannelSTTManager for cost optimization
        self._stt_provider = stt_provider or get_stt_provider()
        self._tts_provider = tts_provider or get_tts_provider()
        self._translation_provider = translation_provider or get_translation_provider()

        # Channel STT manager (shared per channel - 99% cost reduction)
        self._channel_stt_manager = None
        self._transcript_queue: Optional[asyncio.Queue] = None

        # Session state
        self._session: Optional[LiveDubbingSession] = None
        self._running = False
        self._sequence = 0

        # Metrics tracking
        self._metrics = DubbingMetrics()
        self._latency_samples: list[Dict[str, float]] = []

        # Output queue for dubbed audio messages
        self._output_queue: asyncio.Queue[DubbingMessage] = asyncio.Queue()

        # Tasks
        self._pipeline_task: Optional[asyncio.Task] = None
        self._audio_buffer: list[bytes] = []

        logger.info(
            f"LiveDubbingService initialized: session={self.session_id}, "
            f"channel={channel.id}, source={self.source_language}, "
            f"target={target_language}, voice={self.voice_id}, "
            f"platform={platform}"
        )

    async def start(self) -> Dict[str, Any]:
        """
        Start the dubbing session.

        Uses ChannelSTTManager for shared STT connection (99% cost reduction).
        Each session subscribes to channel's shared STT broadcast.

        Returns connection info including session ID and sync delay.
        """
        if self._running:
            logger.warning(f"Session {self.session_id} already running")
            return self._get_connection_info()

        try:
            # Create session record in database
            self._session = LiveDubbingSession(
                session_id=self.session_id,
                user_id=str(self.user.id),
                channel_id=str(self.channel.id),
                source_language=self.source_language,
                target_language=self.target_language,
                voice_id=self.voice_id,
                sync_delay_ms=self.sync_delay_ms,
                platform=self.platform,
                status="active",
            )
            await self._session.insert()

            # Step 1: Get channel STT manager (creates if needed)
            # This is the key optimization: ONE STT connection per channel
            logger.info(
                f"Getting ChannelSTTManager for channel {self.channel.id} "
                f"(shared STT, 99% cost reduction)"
            )
            self._channel_stt_manager = await get_channel_stt_manager(
                str(self.channel.id), self.source_language
            )

            # Step 2: Subscribe to channel's STT broadcast
            # Each session gets its own transcript queue
            logger.info(
                f"Subscribing session {self.session_id} to channel STT broadcast"
            )
            self._transcript_queue = await self._channel_stt_manager.subscribe(
                self.session_id
            )

            # Step 3: TTS provider connection is created per-transcript (not per-session)
            # This avoids ElevenLabs 20-second timeout between transcripts
            logger.info(
                f"TTS will connect per-transcript for session {self.session_id} "
                "(avoids 20s timeout)"
            )

            # Step 4: Save initial session state to Redis for recovery on reconnect
            session_store = await get_session_store()
            await session_store.save_session_state(
                self.session_id,
                {
                    "user_id": str(self.user.id),
                    "channel_id": str(self.channel.id),
                    "source_language": self.source_language,
                    "target_language": self.target_language,
                    "voice_id": self.voice_id,
                    "platform": self.platform,
                    "status": "active",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "last_activity_at": datetime.now(timezone.utc).isoformat(),
                },
                ttl_seconds=settings.olorin.dubbing.redis_session_ttl_seconds,
            )

            self._running = True

            logger.info(
                f"Dubbing session started: {self.session_id} "
                f"(using shared STT for channel {self.channel.id})"
            )
            return self._get_connection_info()

        except Exception as e:
            logger.error(f"Failed to start dubbing session: {str(e)}")
            if self._session:
                self._session.status = "error"
                self._session.last_error = str(e)
                self._session.last_error_at = datetime.now(timezone.utc)
                await self._session.save()
            raise

    async def stop(self) -> Dict[str, Any]:
        """
        Stop the dubbing session.

        Unsubscribes from ChannelSTTManager and cleans up resources.

        Returns session summary with metrics.
        """
        self._running = False

        # Cancel pipeline task if running
        if self._pipeline_task and not self._pipeline_task.done():
            self._pipeline_task.cancel()
            try:
                await self._pipeline_task
            except asyncio.CancelledError:
                pass

        # Unsubscribe from channel STT manager
        if self._channel_stt_manager:
            try:
                await self._channel_stt_manager.unsubscribe(self.session_id)
                logger.info(
                    f"Unsubscribed session {self.session_id} from "
                    f"channel {self.channel.id} STT broadcast"
                )
            except Exception as e:
                logger.error(f"Error unsubscribing from STT manager: {e}")

        # TTS provider is created/closed per-transcript (not per-session)
        # STT provider is managed by ChannelSTTManager
        # No cleanup needed here

        # Update session record and remove from Redis
        if self._session:
            self._session.status = "completed"
            self._session.ended_at = datetime.now(timezone.utc)
            self._session.metrics = self._metrics
            await self._session.save()

        # Remove from Redis session store
        try:
            session_store = await get_session_store()
            await session_store.delete_session_state(self.session_id)
        except Exception as e:
            logger.warning(f"Error cleaning up Redis session state: {e}")

        logger.info(
            f"Dubbing session ended: {self.session_id}, "
            f"segments={self._metrics.segments_synthesized}, "
            f"audio_seconds={self._metrics.audio_seconds_processed:.1f}s"
        )

        return {
            "session_id": self.session_id,
            "status": "completed",
            "metrics": self._metrics.model_dump(),
        }

    async def process_audio_chunk(self, audio_data: bytes) -> None:
        """
        Process incoming audio chunk through the dubbing pipeline.

        Audio is sent to ChannelSTTManager for shared STT processing.
        All sessions on the same channel share the same STT transcription.

        Args:
            audio_data: Binary audio data (16kHz mono LINEAR16 PCM)
        """
        if not self._running:
            logger.warning(f"Session {self.session_id} not running, ignoring audio")
            return

        # Update last activity time in both database and Redis
        if self._session:
            self._session.last_activity_at = datetime.now(timezone.utc)

        # Update last activity in Redis for session recovery
        try:
            session_store = await get_session_store()
            await session_store.update_session_activity(self.session_id)
        except Exception as e:
            logger.warning(f"Error updating Redis session activity: {e}")

        # Track audio processing
        # 16kHz sample rate, 2 bytes per sample (16-bit) = 32KB per second
        self._metrics.audio_seconds_processed += len(audio_data) / (16000 * 2)

        # Send to ChannelSTTManager (shared STT, not direct to provider)
        if self._channel_stt_manager:
            try:
                await self._channel_stt_manager.send_audio_chunk(audio_data)
            except Exception as e:
                logger.error(f"Error sending audio to channel STT manager: {e}")
                self._metrics.errors_count += 1
        else:
            logger.error(
                f"ChannelSTTManager not initialized for session {self.session_id}"
            )
            self._metrics.errors_count += 1

    async def run_pipeline(self) -> None:
        """
        Run the main dubbing pipeline.

        Processes transcripts from channel STT manager → Translation → TTS → Output queue.
        Consumes from shared ChannelSTTManager's broadcast queue for cost optimization.
        """
        logger.info(f"Starting dubbing pipeline for session {self.session_id}")

        if not self._transcript_queue:
            logger.error(
                f"Transcript queue not initialized for session {self.session_id}"
            )
            return

        try:
            while self._running:
                try:
                    # Wait for transcript from channel manager's broadcast queue
                    transcript_msg = await asyncio.wait_for(
                        self._transcript_queue.get(), timeout=1.0
                    )

                    # Extract from TranscriptMessage
                    transcript = transcript_msg.text
                    detected_lang = transcript_msg.language

                    if not transcript.strip():
                        continue

                    segment_start = time.time()
                    stt_latency = 0  # STT latency is handled by the provider

                    self._metrics.segments_transcribed += 1

                    # Step 2: Translation
                    translation_start = time.time()
                    actual_source = (
                        detected_lang
                        if detected_lang != "auto"
                        else self.source_language
                    )

                    if actual_source == self.target_language:
                        translated = transcript
                    else:
                        translated = await self._translation_provider.translate_text(
                            transcript, actual_source, self.target_language
                        )

                    translation_latency = (time.time() - translation_start) * 1000
                    self._metrics.segments_translated += 1

                    logger.info(
                        f"Translated [{actual_source}→{self.target_language}]: "
                        f"{transcript[:50]}... → {translated[:50]}..."
                    )

                    # Step 3: TTS with circuit breaker protection
                    tts_start = time.time()
                    audio_chunks: list[bytes] = []

                    try:
                        # Use circuit breaker for TTS calls
                        await self._synthesize_audio(translated, audio_chunks)
                    except CircuitBreakerError as e:
                        logger.warning(f"TTS circuit breaker open: {e}")
                        self._metrics.errors_count += 1
                        # Send error message to client
                        await self._output_queue.put(
                            DubbingMessage(
                                type="error",
                                error=f"Text-to-speech service temporarily unavailable. Please try again.",
                            )
                        )
                        continue

                    tts_latency = (time.time() - tts_start) * 1000

                    if audio_chunks:
                        # Combine audio chunks
                        combined_audio = b"".join(audio_chunks)
                        audio_b64 = base64.b64encode(combined_audio).decode("utf-8")

                        total_latency = (time.time() - segment_start) * 1000

                        # Create dubbed audio message
                        self._sequence += 1
                        message = DubbedAudioMessage(
                            data=audio_b64,
                            original_text=transcript,
                            translated_text=translated,
                            sequence=self._sequence,
                            latency_ms=int(total_latency),
                        )

                        await self._output_queue.put(
                            DubbingMessage(
                                type="dubbed_audio", data=message.model_dump()
                            )
                        )

                        self._metrics.segments_synthesized += 1

                        # Update latency metrics
                        self._update_latency_metrics(
                            stt_latency, translation_latency, tts_latency
                        )

                        logger.debug(
                            f"Dubbed segment {self._sequence}: latency={total_latency:.0f}ms "
                            f"(trans={translation_latency:.0f}ms, tts={tts_latency:.0f}ms)"
                        )

                except asyncio.TimeoutError:
                    # No transcript available in timeout period - continue waiting
                    continue
                except Exception as e:
                    logger.error(f"Error processing transcript: {str(e)}")
                    self._metrics.errors_count += 1
                    # Continue processing other transcripts
                    continue

        except asyncio.CancelledError:
            logger.info(f"Pipeline cancelled for session {self.session_id}")
        except Exception as e:
            logger.error(f"Pipeline error: {str(e)}")
            self._metrics.errors_count += 1

            if self._session:
                self._session.last_error = str(e)
                self._session.last_error_at = datetime.now(timezone.utc)

            # Send error message to client
            await self._output_queue.put(DubbingMessage(type="error", error=str(e)))

    @circuit_breaker(ELEVENLABS_BREAKER)
    async def _synthesize_audio(self, text: str, audio_chunks: list[bytes]) -> None:
        """
        Synthesize text to speech with circuit breaker protection.

        Creates a NEW TTS connection for each transcript to avoid 20-second timeout.
        ElevenLabs streaming TTS expects continuous input or it disconnects.

        Args:
            text: Text to synthesize
            audio_chunks: List to append audio chunks to

        Raises:
            CircuitBreakerError: If circuit breaker is open
            Exception: If TTS service fails
        """
        # Create fresh TTS connection for this transcript (avoids 20s timeout)
        tts = get_tts_provider()
        try:
            await tts.connect(self.voice_id)
            await tts.send_text_chunk(text, flush=True)

            async for audio_chunk in tts.receive_audio():
                audio_chunks.append(audio_chunk)
        finally:
            # Close TTS connection after receiving audio
            await tts.close()

    def _update_latency_metrics(
        self, stt_ms: float, translation_ms: float, tts_ms: float
    ) -> None:
        """Update running average latency metrics."""
        total_ms = stt_ms + translation_ms + tts_ms

        self._latency_samples.append(
            {
                "stt": stt_ms,
                "translation": translation_ms,
                "tts": tts_ms,
                "total": total_ms,
            }
        )

        # Keep last 100 samples
        if len(self._latency_samples) > 100:
            self._latency_samples.pop(0)

        # Calculate averages
        n = len(self._latency_samples)
        self._metrics.avg_stt_latency_ms = (
            sum(s["stt"] for s in self._latency_samples) / n
        )
        self._metrics.avg_translation_latency_ms = (
            sum(s["translation"] for s in self._latency_samples) / n
        )
        self._metrics.avg_tts_latency_ms = (
            sum(s["tts"] for s in self._latency_samples) / n
        )
        self._metrics.avg_total_latency_ms = (
            sum(s["total"] for s in self._latency_samples) / n
        )

    async def receive_messages(self) -> AsyncIterator[DubbingMessage]:
        """
        Async iterator to receive dubbed audio messages.

        Yields DubbingMessage objects containing dubbed audio or errors.
        """
        while self._running or not self._output_queue.empty():
            try:
                message = await asyncio.wait_for(self._output_queue.get(), timeout=0.5)
                yield message
            except asyncio.TimeoutError:
                if not self._running and self._output_queue.empty():
                    break
                continue
            except Exception as e:
                logger.error(f"Error receiving message: {e}")
                break

    def get_latency_report(self) -> LatencyReport:
        """Get current latency statistics."""
        return LatencyReport(
            avg_stt_ms=int(self._metrics.avg_stt_latency_ms),
            avg_translation_ms=int(self._metrics.avg_translation_latency_ms),
            avg_tts_ms=int(self._metrics.avg_tts_latency_ms),
            avg_total_ms=int(self._metrics.avg_total_latency_ms),
            segments_processed=self._metrics.segments_synthesized,
        )

    def _get_connection_info(self) -> Dict[str, Any]:
        """Get connection info for client."""
        return {
            "type": "connected",
            "session_id": self.session_id,
            "source_lang": self.source_language,
            "target_lang": self.target_language,
            "voice_id": self.voice_id,
            "sync_delay_ms": self.sync_delay_ms,
        }

    @property
    def is_running(self) -> bool:
        """Check if session is currently running."""
        return self._running
