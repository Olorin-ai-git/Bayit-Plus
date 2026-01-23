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
from datetime import datetime
from typing import Any, AsyncIterator, Dict, Optional, Protocol

from app.core.config import settings
from app.models.content import LiveChannel
from app.models.live_dubbing import (
    DubbedAudioMessage,
    DubbingMessage,
    DubbingMetrics,
    LatencyReport,
    LiveDubbingSession,
)
from app.models.user import User

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
        self.sync_delay_ms = channel.dubbing_sync_delay_ms or settings.olorin.dubbing.live_dubbing_default_sync_delay_ms

        # Initialize providers (dependency injection)
        self._stt_provider = stt_provider or get_stt_provider()
        self._tts_provider = tts_provider or get_tts_provider()
        self._translation_provider = translation_provider or get_translation_provider()

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
            f"target={target_language}, voice={self.voice_id}"
        )

    async def start(self) -> Dict[str, Any]:
        """
        Start the dubbing session.

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

            # Connect STT provider
            logger.info(f"Connecting STT provider for session {self.session_id}")
            await self._stt_provider.connect(self.source_language)

            # Connect TTS provider
            logger.info(f"Connecting TTS provider for session {self.session_id}")
            await self._tts_provider.connect(self.voice_id)

            self._running = True

            logger.info(f"Dubbing session started: {self.session_id}")
            return self._get_connection_info()

        except Exception as e:
            logger.error(f"Failed to start dubbing session: {str(e)}")
            if self._session:
                self._session.status = "error"
                self._session.last_error = str(e)
                self._session.last_error_at = datetime.utcnow()
                await self._session.save()
            raise

    async def stop(self) -> Dict[str, Any]:
        """
        Stop the dubbing session.

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

        # Close providers
        try:
            await self._stt_provider.close()
        except Exception as e:
            logger.debug(f"Error closing STT provider: {e}")

        try:
            await self._tts_provider.close()
        except Exception as e:
            logger.debug(f"Error closing TTS provider: {e}")

        # Update session record
        if self._session:
            self._session.status = "completed"
            self._session.ended_at = datetime.utcnow()
            self._session.metrics = self._metrics
            await self._session.save()

        logger.info(
            f"Dubbing session ended: {self.session_id}, "
            f"segments={self._metrics.segments_synthesized}"
        )

        return {
            "session_id": self.session_id,
            "status": "completed",
            "metrics": self._metrics.model_dump(),
        }

    async def process_audio_chunk(self, audio_data: bytes) -> None:
        """
        Process incoming audio chunk through the dubbing pipeline.

        Audio is sent to STT provider for transcription.
        """
        if not self._running:
            logger.warning(f"Session {self.session_id} not running, ignoring audio")
            return

        # Update last activity time
        if self._session:
            self._session.last_activity_at = datetime.utcnow()

        # Track audio processing
        self._metrics.audio_seconds_processed += len(audio_data) / (16000 * 2)  # 16kHz, 16-bit

        # Send to STT provider
        try:
            await self._stt_provider.send_audio_chunk(audio_data)
        except Exception as e:
            logger.error(f"Error sending audio to STT: {e}")
            self._metrics.errors_count += 1

    async def run_pipeline(self) -> None:
        """
        Run the main dubbing pipeline.

        Processes transcripts from STT → Translation → TTS → Output queue.
        """
        logger.info(f"Starting dubbing pipeline for session {self.session_id}")

        try:
            async for transcript, detected_lang in self._stt_provider.receive_transcripts():
                if not self._running:
                    break

                if not transcript.strip():
                    continue

                segment_start = time.time()
                stt_latency = 0  # STT latency is handled by the provider

                self._metrics.segments_transcribed += 1

                # Step 2: Translation
                translation_start = time.time()
                actual_source = detected_lang if detected_lang != "auto" else self.source_language

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

                # Step 3: TTS
                tts_start = time.time()
                audio_chunks: list[bytes] = []

                await self._tts_provider.send_text_chunk(translated, flush=True)

                async for audio_chunk in self._tts_provider.receive_audio():
                    audio_chunks.append(audio_chunk)

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
                        DubbingMessage(type="dubbed_audio", data=message.model_dump())
                    )

                    self._metrics.segments_synthesized += 1

                    # Update latency metrics
                    self._update_latency_metrics(stt_latency, translation_latency, tts_latency)

                    logger.debug(
                        f"Dubbed segment {self._sequence}: latency={total_latency:.0f}ms "
                        f"(trans={translation_latency:.0f}ms, tts={tts_latency:.0f}ms)"
                    )

        except asyncio.CancelledError:
            logger.info(f"Pipeline cancelled for session {self.session_id}")
        except Exception as e:
            logger.error(f"Pipeline error: {str(e)}")
            self._metrics.errors_count += 1

            if self._session:
                self._session.last_error = str(e)
                self._session.last_error_at = datetime.utcnow()

            # Send error message to client
            await self._output_queue.put(
                DubbingMessage(type="error", error=str(e))
            )

    def _update_latency_metrics(
        self, stt_ms: float, translation_ms: float, tts_ms: float
    ) -> None:
        """Update running average latency metrics."""
        total_ms = stt_ms + translation_ms + tts_ms

        self._latency_samples.append({
            "stt": stt_ms,
            "translation": translation_ms,
            "tts": tts_ms,
            "total": total_ms,
        })

        # Keep last 100 samples
        if len(self._latency_samples) > 100:
            self._latency_samples.pop(0)

        # Calculate averages
        n = len(self._latency_samples)
        self._metrics.avg_stt_latency_ms = sum(s["stt"] for s in self._latency_samples) / n
        self._metrics.avg_translation_latency_ms = sum(s["translation"] for s in self._latency_samples) / n
        self._metrics.avg_tts_latency_ms = sum(s["tts"] for s in self._latency_samples) / n
        self._metrics.avg_total_latency_ms = sum(s["total"] for s in self._latency_samples) / n

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
