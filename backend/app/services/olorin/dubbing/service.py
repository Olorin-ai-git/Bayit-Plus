"""
Realtime Dubbing Service

Main service class that orchestrates real-time audio dubbing.
"""

import asyncio
import logging
import time
import uuid
from typing import AsyncIterator, Optional

from app.core.config import settings
from app.models.integration_partner import IntegrationPartner
from app.services.olorin.dubbing import pipeline
from app.services.olorin.dubbing.adaptive_vad import AdaptiveVAD
from app.services.olorin.dubbing.audio_quality import validate_audio_quality
from app.services.olorin.dubbing.models import DubbingMessage, DubbingMetrics
from app.services.olorin.dubbing.prometheus_metrics import (
    record_audio_chunk,
    record_audio_quality_warning,
    record_queue_depth,
    record_session_ended,
    record_session_started,
)
from app.services.olorin.dubbing.stt_provider import (STTProvider,
                                                      get_stt_provider)
from app.services.olorin.dubbing.translation import TranslationProvider
from app.services.olorin.dubbing.voice_settings import VoiceSettings
from app.services.olorin.metering_service import metering_service

logger = logging.getLogger(__name__)


class RealtimeDubbingService:
    """
    Orchestrates real-time audio dubbing.

    Designed for third-party integration with:
    - WebSocket-based audio streaming
    - <2s latency from speech end to dubbed audio
    - Support for Hebrew→English and Hebrew→Spanish
    """

    def __init__(
        self,
        partner: IntegrationPartner,
        source_language: str = "he",
        target_language: str = "en",
        voice_id: Optional[str] = None,
        stt_provider: Optional[STTProvider] = None,
        voice_settings: Optional[VoiceSettings] = None,
    ):
        self.partner = partner
        self.source_language = source_language
        self.target_language = target_language
        self.voice_id = voice_id or settings.ELEVENLABS_DEFAULT_VOICE_ID

        self.session_id = f"dub_{uuid.uuid4().hex[:12]}"

        self._stt_provider: Optional[STTProvider] = stt_provider
        self._translation_provider = TranslationProvider(target_language)

        # P3-2: Per-session voice customization
        self._voice_settings = voice_settings

        # P3-5: Adaptive VAD with calibration phase
        self._adaptive_vad = AdaptiveVAD()

        self._running = False
        self._metrics = DubbingMetrics()

        # P0-3: Bounded output queue
        dubbing_config = settings.olorin.dubbing
        self._output_queue: asyncio.Queue[DubbingMessage] = asyncio.Queue(
            maxsize=dubbing_config.output_queue_maxsize
        )
        self._stt_task: Optional[asyncio.Task] = None
        self._idle_task: Optional[asyncio.Task] = None
        self._current_segment_start_time: Optional[float] = None

        # P0-5: Idle timeout tracking
        self._last_activity: float = time.time()

        # P0-6: Audio validation config
        self._max_audio_chunk_bytes = dubbing_config.max_audio_chunk_bytes

        logger.info(
            f"RealtimeDubbingService initialized: session={self.session_id}, "
            f"partner={partner.partner_id}, {source_language}→{target_language}"
        )

    async def start(self) -> None:
        """Start the dubbing pipeline."""
        if self._running:
            logger.warning("Dubbing service already running")
            return

        try:
            await metering_service.create_dubbing_session(
                partner_id=self.partner.partner_id,
                session_id=self.session_id,
                source_language=self.source_language,
                target_language=self.target_language,
                voice_id=self.voice_id,
            )

            if self._stt_provider is None:
                self._stt_provider = get_stt_provider()
            await self._stt_provider.connect(source_lang=self.source_language)

            await self._translation_provider.initialize()

            self._running = True
            self._last_activity = time.time()

            # P2-3: Record Prometheus session start
            record_session_started(self.partner.partner_id)

            self._stt_task = asyncio.create_task(
                pipeline.process_transcripts(
                    stt_provider=self._stt_provider,
                    output_queue=self._output_queue,
                    metrics=self._metrics,
                    source_language=self.source_language,
                    target_language=self.target_language,
                    voice_id=self.voice_id,
                    translation_provider=self._translation_provider,
                    running_check=lambda: self._running,
                    get_segment_start_time=lambda: self._current_segment_start_time,
                    reset_segment_time=self._reset_segment_time,
                    voice_settings=self._voice_settings,
                )
            )

            # P0-5: Start idle timeout monitor
            self._idle_task = asyncio.create_task(self._check_idle_timeout())

            await self._output_queue.put(
                DubbingMessage(
                    type="session_started",
                    session_id=self.session_id,
                    source_language=self.source_language,
                    target_language=self.target_language,
                )
            )

            logger.info(f"Dubbing session started: {self.session_id}")

        except Exception as e:
            logger.error(f"Failed to start dubbing service: {e}")
            await self.stop(error_message=str(e))
            raise

    async def stop(self, error_message: Optional[str] = None) -> dict:
        """Stop the dubbing pipeline."""
        self._running = False

        # Cancel idle monitor
        if self._idle_task:
            self._idle_task.cancel()
            try:
                await self._idle_task
            except asyncio.CancelledError:
                pass

        if self._stt_task:
            self._stt_task.cancel()
            try:
                await self._stt_task
            except asyncio.CancelledError:
                pass

        if self._stt_provider:
            await self._stt_provider.close()
            self._stt_provider = None

        # P2-2: Compute percentile metrics at session end
        percentiles = self._metrics.compute_percentiles()

        # P2-3: Record Prometheus session end
        status = "error" if error_message else "ended"
        record_session_ended(self.partner.partner_id, status=status)

        session = await metering_service.end_dubbing_session(
            session_id=self.session_id,
            status=status,
            error_message=error_message,
        )

        if session:
            update_kwargs = {
                "segments_processed": self._metrics.segments_processed,
                "characters_translated": self._metrics.total_characters_translated,
                "characters_synthesized": self._metrics.total_characters_synthesized,
                "avg_stt_latency_ms": self._metrics.avg_stt_latency_ms,
                "avg_translation_latency_ms": self._metrics.avg_translation_latency_ms,
                "avg_tts_latency_ms": self._metrics.avg_tts_latency_ms,
                "avg_total_latency_ms": self._metrics.avg_total_latency_ms,
                "error_count": self._metrics.error_count,
                "reconnection_count": self._metrics.reconnection_count,
            }
            # Include percentile data if available
            update_kwargs.update(percentiles)

            await metering_service.update_dubbing_session(
                session_id=self.session_id,
                **update_kwargs,
            )

        await self._output_queue.put(
            DubbingMessage(
                type="session_ended",
                session_id=self.session_id,
                message=error_message,
            )
        )

        logger.info(f"Dubbing session ended: {self.session_id}")

        return {
            "session_id": self.session_id,
            "partner_id": self.partner.partner_id,
            "segments_processed": self._metrics.segments_processed,
            "audio_seconds": self._metrics.total_audio_seconds,
            "avg_latency_ms": self._metrics.avg_total_latency_ms,
            "error_count": self._metrics.error_count,
            "estimated_cost_usd": session.estimated_cost_usd if session else 0.0,
        }

    async def process_audio_chunk(self, audio_data: bytes) -> None:
        """
        Process an incoming audio chunk.

        Args:
            audio_data: Raw PCM audio bytes (16kHz, mono, 16-bit signed)
        """
        if not self._running or not self._stt_provider:
            return

        # P0-6: Audio chunk validation
        if len(audio_data) == 0:
            return
        # 16-bit PCM samples = 2 bytes each; odd byte count is invalid
        if len(audio_data) % 2 != 0:
            logger.warning(f"Invalid PCM: odd byte count ({len(audio_data)})")
            return
        if len(audio_data) > self._max_audio_chunk_bytes:
            logger.warning(f"Audio chunk too large: {len(audio_data)} bytes")
            return

        # P0-5: Update activity timestamp
        self._last_activity = time.time()

        # P2-3: Record audio chunk metric
        record_audio_chunk()

        # P2-6: Audio quality verification (log warnings, don't reject)
        quality = validate_audio_quality(audio_data)
        for warning in quality.warnings:
            record_audio_quality_warning(warning_type="quality")

        # P3-5: Adaptive VAD - unified process_chunk (Code Review #5)
        vad_result = self._adaptive_vad.process_chunk(audio_data)
        if vad_result is False:
            # Silence detected post-calibration - skip STT to reduce costs
            return
        # vad_result is None (calibrating) or True (speech) - forward audio

        # P2-3: Update queue depth gauge
        record_queue_depth(self._output_queue.qsize())

        if self._current_segment_start_time is None:
            self._current_segment_start_time = time.time() * 1000

        await self._stt_provider.send_audio_chunk(audio_data)

    async def receive_messages(self) -> AsyncIterator[DubbingMessage]:
        """Async iterator to receive dubbing output messages."""
        while self._running or not self._output_queue.empty():
            try:
                message = await asyncio.wait_for(
                    self._output_queue.get(),
                    timeout=0.5,
                )
                yield message
            except asyncio.TimeoutError:
                if not self._running and self._output_queue.empty():
                    break
                continue
            except Exception as e:
                logger.error(f"Error receiving message: {e}")
                break

    async def _check_idle_timeout(self) -> None:
        """P0-5: Background task to auto-stop idle sessions."""
        dubbing_config = settings.olorin.dubbing
        check_interval = dubbing_config.idle_check_interval_seconds
        idle_timeout = dubbing_config.session_idle_timeout_seconds

        while self._running:
            await asyncio.sleep(check_interval)
            elapsed = time.time() - self._last_activity
            if elapsed > idle_timeout:
                logger.warning(
                    f"Session {self.session_id} idle timeout "
                    f"({elapsed:.0f}s > {idle_timeout}s)"
                )
                await self.stop(error_message="Session idle timeout")
                break

    def _reset_segment_time(self) -> None:
        """Reset the segment start time."""
        self._current_segment_start_time = None

    @property
    def is_running(self) -> bool:
        """Check if service is running."""
        return self._running

    @property
    def metrics(self) -> DubbingMetrics:
        """Get current metrics."""
        return self._metrics
