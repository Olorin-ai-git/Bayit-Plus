"""
Realtime Dubbing Service for Olorin.ai Platform

Provides real-time audio dubbing from Hebrew to English/Spanish.
Target latency: <2 seconds from speech end to dubbed audio start.

Pipeline:
  Audio Stream → ElevenLabs STT (~150ms) → Translation → ElevenLabs TTS (~300ms) → Dubbed Audio
"""

import asyncio
import base64
import logging
import time
import uuid
from dataclasses import dataclass, field
from typing import Optional, AsyncIterator, Literal

from app.core.config import settings
from app.models.integration_partner import IntegrationPartner
from app.services.elevenlabs_realtime_service import ElevenLabsRealtimeService
from app.services.elevenlabs_tts_streaming_service import ElevenLabsTTSStreamingService
from app.services.olorin.metering_service import metering_service

logger = logging.getLogger(__name__)

# Translation provider imports
try:
    from google.cloud import translate_v2 as translate
    GOOGLE_TRANSLATE_AVAILABLE = True
except ImportError:
    GOOGLE_TRANSLATE_AVAILABLE = False
    logger.warning("Google Cloud Translate not available")

try:
    from anthropic import AsyncAnthropic
    CLAUDE_AVAILABLE = True
except ImportError:
    CLAUDE_AVAILABLE = False
    logger.warning("Anthropic Claude not available")


@dataclass
class DubbingMessage:
    """Message type for dubbing pipeline communication."""

    type: Literal[
        "transcript",
        "translation",
        "dubbed_audio",
        "session_started",
        "session_ended",
        "error",
        "latency_report",
    ]
    data: Optional[str] = None  # Base64 audio data
    original_text: Optional[str] = None
    translated_text: Optional[str] = None
    source_language: Optional[str] = None
    target_language: Optional[str] = None
    timestamp_ms: Optional[float] = None
    latency_ms: Optional[float] = None
    message: Optional[str] = None
    session_id: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        result = {"type": self.type}
        for key in [
            "data",
            "original_text",
            "translated_text",
            "source_language",
            "target_language",
            "timestamp_ms",
            "latency_ms",
            "message",
            "session_id",
        ]:
            value = getattr(self, key)
            if value is not None:
                result[key] = value
        return result


@dataclass
class DubbingMetrics:
    """Metrics for a dubbing session."""

    segments_processed: int = 0
    total_audio_seconds: float = 0.0
    total_characters_translated: int = 0
    total_characters_synthesized: int = 0

    stt_latencies_ms: list = field(default_factory=list)
    translation_latencies_ms: list = field(default_factory=list)
    tts_latencies_ms: list = field(default_factory=list)
    total_latencies_ms: list = field(default_factory=list)

    error_count: int = 0
    reconnection_count: int = 0

    @property
    def avg_stt_latency_ms(self) -> Optional[float]:
        if not self.stt_latencies_ms:
            return None
        return sum(self.stt_latencies_ms) / len(self.stt_latencies_ms)

    @property
    def avg_translation_latency_ms(self) -> Optional[float]:
        if not self.translation_latencies_ms:
            return None
        return sum(self.translation_latencies_ms) / len(self.translation_latencies_ms)

    @property
    def avg_tts_latency_ms(self) -> Optional[float]:
        if not self.tts_latencies_ms:
            return None
        return sum(self.tts_latencies_ms) / len(self.tts_latencies_ms)

    @property
    def avg_total_latency_ms(self) -> Optional[float]:
        if not self.total_latencies_ms:
            return None
        return sum(self.total_latencies_ms) / len(self.total_latencies_ms)


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
    ):
        """
        Initialize dubbing service.

        Args:
            partner: Integration partner document
            source_language: Source language code (default: Hebrew)
            target_language: Target language code (default: English)
            voice_id: ElevenLabs voice ID (default: Rachel multilingual)
        """
        self.partner = partner
        self.source_language = source_language
        self.target_language = target_language
        self.voice_id = voice_id or settings.ELEVENLABS_DEFAULT_VOICE_ID

        # Generate session ID
        self.session_id = f"dub_{uuid.uuid4().hex[:12]}"

        # Services
        self.stt_service: Optional[ElevenLabsRealtimeService] = None
        self.tts_service: Optional[ElevenLabsTTSStreamingService] = None

        # Translation client
        self._translation_client = None
        self._claude_client = None

        # State
        self._running = False
        self._metrics = DubbingMetrics()

        # Output queue
        self._output_queue: asyncio.Queue[DubbingMessage] = asyncio.Queue()

        # Tasks
        self._stt_task: Optional[asyncio.Task] = None
        self._current_segment_start_time: Optional[float] = None

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
            # Create metering session
            await metering_service.create_dubbing_session(
                partner_id=self.partner.partner_id,
                session_id=self.session_id,
                source_language=self.source_language,
                target_language=self.target_language,
                voice_id=self.voice_id,
            )

            # Initialize STT service
            self.stt_service = ElevenLabsRealtimeService()
            await self.stt_service.connect(source_lang=self.source_language)

            # Initialize translation client
            await self._init_translation_client()

            self._running = True

            # Start transcript processing
            self._stt_task = asyncio.create_task(self._process_transcripts())

            # Send session started message
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
        """
        Stop the dubbing pipeline.

        Returns:
            Session summary with metrics
        """
        self._running = False

        # Cancel tasks
        if self._stt_task:
            self._stt_task.cancel()
            try:
                await self._stt_task
            except asyncio.CancelledError:
                pass

        # Close services
        if self.stt_service:
            await self.stt_service.close()
            self.stt_service = None

        if self.tts_service:
            await self.tts_service.close()
            self.tts_service = None

        # End metering session
        status = "error" if error_message else "ended"
        session = await metering_service.end_dubbing_session(
            session_id=self.session_id,
            status=status,
            error_message=error_message,
        )

        # Update session with metrics
        if session:
            await metering_service.update_dubbing_session(
                session_id=self.session_id,
                segments_processed=self._metrics.segments_processed,
                characters_translated=self._metrics.total_characters_translated,
                characters_synthesized=self._metrics.total_characters_synthesized,
                avg_stt_latency_ms=self._metrics.avg_stt_latency_ms,
                avg_translation_latency_ms=self._metrics.avg_translation_latency_ms,
                avg_tts_latency_ms=self._metrics.avg_tts_latency_ms,
                avg_total_latency_ms=self._metrics.avg_total_latency_ms,
                error_count=self._metrics.error_count,
                reconnection_count=self._metrics.reconnection_count,
            )

        # Send session ended message
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
        if not self._running or not self.stt_service:
            return

        # Track segment start time
        if self._current_segment_start_time is None:
            self._current_segment_start_time = time.time() * 1000

        await self.stt_service.send_audio_chunk(audio_data)

    async def receive_messages(self) -> AsyncIterator[DubbingMessage]:
        """
        Async iterator to receive dubbing output messages.

        Yields:
            DubbingMessage objects to send to client
        """
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

    async def _process_transcripts(self) -> None:
        """Background task to process STT transcripts."""
        if not self.stt_service:
            return

        try:
            async for transcript, detected_lang in self.stt_service.receive_transcripts():
                if not self._running:
                    break

                # Record STT latency
                stt_end_time = time.time() * 1000
                stt_latency = (
                    stt_end_time - self._current_segment_start_time
                    if self._current_segment_start_time
                    else 0
                )
                self._metrics.stt_latencies_ms.append(stt_latency)

                # Send transcript message
                await self._output_queue.put(
                    DubbingMessage(
                        type="transcript",
                        original_text=transcript,
                        source_language=detected_lang or self.source_language,
                        timestamp_ms=stt_end_time,
                    )
                )

                # Process translation and TTS
                asyncio.create_task(
                    self._process_translation_tts(
                        transcript,
                        detected_lang or self.source_language,
                        stt_end_time,
                    )
                )

                # Reset segment timing
                self._current_segment_start_time = None

        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error processing transcripts: {e}")
            self._metrics.error_count += 1
            await self._output_queue.put(
                DubbingMessage(
                    type="error",
                    message=str(e),
                )
            )

    async def _process_translation_tts(
        self,
        transcript: str,
        source_lang: str,
        stt_end_time: float,
    ) -> None:
        """
        Translate transcript and generate TTS audio.

        Args:
            transcript: Original transcript text
            source_lang: Detected source language
            stt_end_time: Timestamp when STT completed (ms)
        """
        try:
            # Translate
            translation_start = time.time() * 1000
            translated_text = await self._translate(transcript, source_lang)
            translation_end = time.time() * 1000
            translation_latency = translation_end - translation_start

            self._metrics.translation_latencies_ms.append(translation_latency)
            self._metrics.total_characters_translated += len(transcript)

            # Send translation message
            await self._output_queue.put(
                DubbingMessage(
                    type="translation",
                    original_text=transcript,
                    translated_text=translated_text,
                    source_language=source_lang,
                    target_language=self.target_language,
                    latency_ms=translation_latency,
                )
            )

            # Generate TTS
            tts_start = time.time() * 1000
            audio_chunks = []

            # Initialize TTS service for this segment
            self.tts_service = ElevenLabsTTSStreamingService()
            await self.tts_service.connect(voice_id=self.voice_id)

            # Send text and collect audio
            await self.tts_service.send_text_chunk(translated_text, flush=True)
            await self.tts_service.finish_stream()

            first_audio_time: Optional[float] = None
            async for audio_chunk in self.tts_service.receive_audio():
                if first_audio_time is None:
                    first_audio_time = time.time() * 1000
                    tts_latency = first_audio_time - tts_start
                    self._metrics.tts_latencies_ms.append(tts_latency)

                audio_chunks.append(audio_chunk)

                # Stream audio chunk to client immediately
                audio_b64 = base64.b64encode(audio_chunk).decode("utf-8")
                total_latency = (time.time() * 1000) - stt_end_time

                await self._output_queue.put(
                    DubbingMessage(
                        type="dubbed_audio",
                        data=audio_b64,
                        original_text=transcript,
                        translated_text=translated_text,
                        source_language=source_lang,
                        target_language=self.target_language,
                        latency_ms=total_latency,
                    )
                )

            await self.tts_service.close()
            self.tts_service = None

            # Update metrics
            self._metrics.segments_processed += 1
            self._metrics.total_characters_synthesized += len(translated_text)

            if first_audio_time:
                total_latency = first_audio_time - stt_end_time
                self._metrics.total_latencies_ms.append(total_latency)

                # Send latency report
                await self._output_queue.put(
                    DubbingMessage(
                        type="latency_report",
                        latency_ms=total_latency,
                        message=f"STT: {self._metrics.stt_latencies_ms[-1]:.0f}ms, "
                        f"Translation: {translation_latency:.0f}ms, "
                        f"TTS: {self._metrics.tts_latencies_ms[-1]:.0f}ms",
                    )
                )

                logger.debug(
                    f"Dubbing segment completed: {len(transcript)} chars, "
                    f"total latency: {total_latency:.0f}ms"
                )

        except Exception as e:
            logger.error(f"Error in translation/TTS pipeline: {e}")
            self._metrics.error_count += 1
            await self._output_queue.put(
                DubbingMessage(
                    type="error",
                    message=str(e),
                )
            )

    async def _init_translation_client(self) -> None:
        """Initialize translation client based on configuration."""
        provider = getattr(settings, "LIVE_TRANSLATION_PROVIDER", "google")

        if provider == "google" and GOOGLE_TRANSLATE_AVAILABLE:
            self._translation_client = translate.Client()
            logger.info("Using Google Translate for dubbing")
        elif provider == "claude" and CLAUDE_AVAILABLE:
            api_key = settings.ANTHROPIC_API_KEY
            if api_key:
                self._claude_client = AsyncAnthropic(api_key=api_key)
                logger.info("Using Claude for dubbing translation")
        else:
            # Fallback to Google if available
            if GOOGLE_TRANSLATE_AVAILABLE:
                self._translation_client = translate.Client()
                logger.info("Using Google Translate (fallback) for dubbing")
            else:
                raise RuntimeError("No translation provider available")

    async def _translate(self, text: str, source_lang: str) -> str:
        """
        Translate text to target language.

        Args:
            text: Text to translate
            source_lang: Source language code

        Returns:
            Translated text
        """
        if not text.strip():
            return ""

        if self._claude_client:
            return await self._translate_with_claude(text, source_lang)
        elif self._translation_client:
            return await self._translate_with_google(text, source_lang)
        else:
            raise RuntimeError("No translation client initialized")

    async def _translate_with_google(self, text: str, source_lang: str) -> str:
        """Translate using Google Cloud Translate."""
        # Run in thread pool since google-cloud-translate is synchronous
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self._translation_client.translate(
                text,
                source_language=source_lang,
                target_language=self.target_language,
            ),
        )
        return result.get("translatedText", text)

    async def _translate_with_claude(self, text: str, source_lang: str) -> str:
        """Translate using Claude for higher quality."""
        language_names = {
            "he": "Hebrew",
            "en": "English",
            "es": "Spanish",
        }
        source_name = language_names.get(source_lang, source_lang)
        target_name = language_names.get(self.target_language, self.target_language)

        prompt = f"""Translate the following {source_name} text to {target_name}.
Preserve the speaker's tone and intent. Output only the translation, nothing else.

Text: {text}"""

        response = await self._claude_client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}],
        )

        return response.content[0].text.strip()

    @property
    def is_running(self) -> bool:
        """Check if service is running."""
        return self._running

    @property
    def metrics(self) -> DubbingMetrics:
        """Get current metrics."""
        return self._metrics
