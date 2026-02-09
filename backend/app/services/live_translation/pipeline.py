"""Complete live audio to subtitle pipeline."""
import logging
import time
from typing import Any, AsyncIterator, Dict, Optional

from app.core.config import settings
from .text_processing import chunk_text_for_subtitles

logger = logging.getLogger(__name__)


class LiveSubtitlePipeline:
    """Complete pipeline: audio → transcription → translation → subtitles."""

    def __init__(self, transcription_pipeline, translation_service):
        """
        Initialize live subtitle pipeline.

        Args:
            transcription_pipeline: TranscriptionPipeline instance
            translation_service: TranslationService instance
        """
        self.transcription = transcription_pipeline
        self.translation = translation_service

    async def process(
        self,
        audio_stream: AsyncIterator[bytes],
        source_lang: str,
        target_lang: str,
        channel_id: Optional[str] = None,
        start_timestamp: float = 0.0,
        enable_predictive_subtitles: bool = True,
    ) -> AsyncIterator[Dict[str, Any]]:
        """
        Process audio stream to translated subtitles.

        For ElevenLabs provider, uses auto-detected language for translation.
        For other providers, uses the configured source_lang.

        Yields subtitle cues with format:
        {"text": "...", "original_text": "...", "timestamp": 123.45, ...}

        With predictive subtitles enabled, emits:
        1. Partial subtitle (type: "partial_subtitle") - immediately after STT
        2. Final subtitle (type: "final_subtitle") - after translation (~80ms later)

        Args:
            audio_stream: Async iterator of audio bytes
            source_lang: Source language code
            target_lang: Target language code
            channel_id: Optional channel ID for caching
            start_timestamp: Starting timestamp for subtitles
            enable_predictive_subtitles: Enable partial subtitle emission
        """
        session_start = time.time()

        try:
            async for result in self.transcription.transcribe(audio_stream, source_lang):
                # Handle different result formats:
                # - ElevenLabs: tuple of (transcript, detected_lang)
                # - Google/Whisper: just transcript string
                if isinstance(result, tuple):
                    transcript, detected_lang = result
                    # Use auto-detected language for translation
                    actual_source_lang = (
                        detected_lang if detected_lang != "auto" else source_lang
                    )
                else:
                    transcript = result
                    actual_source_lang = source_lang

                if not transcript.strip():
                    continue

                # Calculate base timestamp
                current_time = time.time() - session_start + start_timestamp
                stt_complete_time = time.time()

                # PREDICTIVE SUBTITLE: Emit partial subtitle immediately after STT
                if enable_predictive_subtitles and actual_source_lang != target_lang:
                    original_chunks = chunk_text_for_subtitles(transcript)
                    for i, orig_chunk in enumerate(original_chunks):
                        chunk_timestamp = current_time + (i * 0.3)
                        yield {
                            "text": orig_chunk,  # Original language text
                            "original_text": orig_chunk,
                            "timestamp": chunk_timestamp,
                            "source_lang": actual_source_lang,
                            "target_lang": actual_source_lang,  # Same as source (not translated yet)
                            "confidence": 0.95,
                            "chunk_index": i,
                            "total_chunks": len(original_chunks),
                            "is_partial": True,  # Flag for partial subtitle
                            "subtitle_type": "partial",  # For client filtering
                        }

                # Translate (skip if same language)
                if actual_source_lang == target_lang:
                    translated = transcript
                else:
                    # Use optimized timeout and caching for live subtitles
                    translated = await self.translation.translate(
                        transcript,
                        actual_source_lang,
                        target_lang,
                        timeout_seconds=settings.olorin.subtitle.translation_timeout_seconds,
                        enable_fallback=True,  # Enable provider fallback
                        channel_id=channel_id,
                        cache_ttl_seconds=300,  # 5 minutes for live features
                    )
                    translation_latency_ms = (time.time() - stt_complete_time) * 1000
                    logger.info(
                        f"🌍 Translated [{actual_source_lang}→{target_lang}] "
                        f"in {translation_latency_ms:.0f}ms: {translated[:50]}..."
                    )

                # Chunk long transcripts for better subtitle readability
                translated_chunks = chunk_text_for_subtitles(translated)
                original_chunks = chunk_text_for_subtitles(transcript)

                # FINAL SUBTITLE: Yield translated subtitle
                for i, trans_chunk in enumerate(translated_chunks):
                    # Clamp index so every final cue carries original text even
                    # when the translation produces more chunks than the source.
                    orig_chunk = original_chunks[min(i, len(original_chunks) - 1)]
                    # Stagger chunks by 0.3 seconds each for natural reading
                    chunk_timestamp = current_time + (i * 0.3)

                    yield {
                        "text": trans_chunk,
                        "original_text": orig_chunk,
                        "timestamp": chunk_timestamp,
                        "source_lang": actual_source_lang,
                        "target_lang": target_lang,
                        "confidence": 0.95,
                        "chunk_index": i,
                        "total_chunks": len(translated_chunks),
                        "is_partial": False,  # Flag for final subtitle
                        "subtitle_type": "final",  # For client filtering
                    }

        except Exception as e:
            logger.error(f"Live subtitle pipeline error: {str(e)}")
            raise
