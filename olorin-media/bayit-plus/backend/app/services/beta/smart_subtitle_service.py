"""
Smart Subtitle Service

Orchestrates dual-view subtitles with shoresh highlighting:
1. Audio -> STT (Hebrew transcription via LiveTranslationService)
2. Simplify Hebrew (via HebrewSimplificationService)
3. Translate to target language (via LiveTranslationService)
4. Extract shoresh (via ShoreshAnalyzer)
5. Emit dual subtitle cue with highlight data

For ages 10+ reading/grammar skill building.
"""

import logging
import time
from typing import AsyncIterator, Dict, List, Optional

from app.core.config import settings
from app.services.beta.hebrew_simplification_service import HebrewSimplificationService
from app.services.beta.shoresh_analyzer import ShoreshAnalyzer, ShoreshResult

logger = logging.getLogger(__name__)

# Conditional imports
try:
    from app.services.live_translation_service import LiveTranslationService

    TRANSLATION_AVAILABLE = True
except ImportError:
    TRANSLATION_AVAILABLE = False
    logger.warning("LiveTranslationService not available for Smart Subs")


class SmartSubtitleCue:
    """A dual-line subtitle cue with shoresh highlight data."""

    def __init__(
        self,
        simplified_hebrew: str,
        translated_text: str,
        target_language: str,
        shoresh_highlights: List[dict],
        timestamp: float,
        display_duration_ms: int,
        original_hebrew: str = "",
    ):
        self.simplified_hebrew = simplified_hebrew
        self.translated_text = translated_text
        self.target_language = target_language
        self.shoresh_highlights = shoresh_highlights
        self.timestamp = timestamp
        self.display_duration_ms = display_duration_ms
        self.original_hebrew = original_hebrew

    def to_dict(self) -> dict:
        """Serialize for WebSocket transmission."""
        return {
            "type": "smart_subtitle",
            "data": {
                "simplified_hebrew": self.simplified_hebrew,
                self.target_language: self.translated_text,
                "target_language": self.target_language,
                "shoresh_highlights": self.shoresh_highlights,
                "timestamp": self.timestamp,
                "display_duration_ms": self.display_duration_ms,
                "original_hebrew": self.original_hebrew,
            },
        }


class SmartSubtitleService:
    """
    Orchestrates the Smart Subs pipeline.

    Pipeline: Audio -> STT -> Simplify Hebrew -> Translate -> Shoresh -> Dual Cue

    Dependencies injected through constructor for testability.
    """

    def __init__(
        self,
        simplification_service: Optional[HebrewSimplificationService] = None,
        shoresh_analyzer: Optional[ShoreshAnalyzer] = None,
        translation_service=None,
        target_language: str = "en",
        show_shoresh: bool = True,
        vocabulary_level: str = "alef",
    ):
        self._simplification_service = simplification_service or HebrewSimplificationService(
            vocabulary_level=vocabulary_level,
        )
        self._shoresh_analyzer = shoresh_analyzer or ShoreshAnalyzer()
        self._translation_service = translation_service
        self._target_language = target_language
        self._show_shoresh = show_shoresh

        # Configuration
        config = settings.olorin.smart_subs
        self._display_duration_ms = config.dual_subtitle_display_duration_ms
        self._shoresh_highlight_color = config.shoresh_highlight_color

        self._running = False
        self._session_id: Optional[str] = None
        self._segments_processed = 0

    @property
    def is_running(self) -> bool:
        """Check if service is running."""
        return self._running

    @property
    def session_id(self) -> Optional[str]:
        """Get current session ID."""
        return self._session_id

    async def start(self, session_id: str) -> None:
        """Start the Smart Subtitle service."""
        self._session_id = session_id
        self._running = True
        self._segments_processed = 0

        await self._simplification_service.start(session_id)

        logger.info(
            "Smart Subtitle service started",
            extra={
                "session_id": session_id,
                "target_language": self._target_language,
                "show_shoresh": self._show_shoresh,
            },
        )

    async def stop(self) -> dict:
        """
        Stop the Smart Subtitle service.

        Returns:
            Session summary
        """
        self._running = False
        await self._simplification_service.stop()

        summary = {
            "session_id": self._session_id,
            "segments_processed": self._segments_processed,
            "target_language": self._target_language,
        }

        self._session_id = None
        logger.info(
            "Smart Subtitle service stopped",
            extra=summary,
        )

        return summary

    async def process_transcript(
        self,
        hebrew_transcript: str,
    ) -> Optional[SmartSubtitleCue]:
        """
        Process a Hebrew transcript segment through the full Smart Subs pipeline.

        Pipeline:
        1. Simplify Hebrew
        2. Translate to target language
        3. Extract shoresh highlights (if enabled)
        4. Build dual subtitle cue

        Args:
            hebrew_transcript: Raw Hebrew transcript from STT

        Returns:
            SmartSubtitleCue or None if processing fails
        """
        if not hebrew_transcript or not hebrew_transcript.strip():
            return None

        if not self._running:
            return None

        timestamp = time.time()

        try:
            # Step 1: Simplify Hebrew text
            simplified_hebrew = await self._simplification_service.simplify_text(
                hebrew_transcript
            )

            # Step 2: Translate simplified Hebrew to target language
            translated_text = await self._translate_text(
                simplified_hebrew, self._target_language
            )

            # Step 3: Extract shoresh highlights (if enabled)
            shoresh_highlights: List[dict] = []
            if self._show_shoresh:
                shoresh_results = await self._shoresh_analyzer.analyze_sentence(
                    simplified_hebrew
                )
                shoresh_highlights = [r.to_dict() for r in shoresh_results]

            self._segments_processed += 1

            # Step 4: Build dual subtitle cue
            cue = SmartSubtitleCue(
                simplified_hebrew=simplified_hebrew,
                translated_text=translated_text,
                target_language=self._target_language,
                shoresh_highlights=shoresh_highlights,
                timestamp=timestamp,
                display_duration_ms=self._display_duration_ms,
                original_hebrew=hebrew_transcript,
            )

            logger.debug(
                "Smart subtitle cue generated",
                extra={
                    "session_id": self._session_id,
                    "segment": self._segments_processed,
                    "shoresh_count": len(shoresh_highlights),
                },
            )

            return cue

        except Exception as e:
            logger.error(
                "Smart subtitle processing failed",
                extra={
                    "session_id": self._session_id,
                    "error": str(e),
                    "transcript_length": len(hebrew_transcript),
                },
            )
            return None

    async def _translate_text(self, hebrew_text: str, target_lang: str) -> str:
        """
        Translate Hebrew text to target language.

        Uses the existing LiveTranslationService translation pipeline.

        Args:
            hebrew_text: Simplified Hebrew text
            target_lang: Target language code

        Returns:
            Translated text
        """
        if target_lang == "he":
            # No translation needed if target is Hebrew
            return hebrew_text

        if self._translation_service and hasattr(
            self._translation_service, "translate_text"
        ):
            try:
                translated = await self._translation_service.translate_text(
                    text=hebrew_text,
                    source_lang="he",
                    target_lang=target_lang,
                )
                return translated
            except Exception as e:
                logger.warning(
                    "Translation failed, returning Hebrew text",
                    extra={"error": str(e), "target_lang": target_lang},
                )
                return hebrew_text

        # Fallback: Use Anthropic for translation if no translation service
        try:
            from anthropic import AsyncAnthropic

            client = AsyncAnthropic()
            response = await client.messages.create(
                model=settings.olorin.smart_subs.shoresh_claude_model,
                max_tokens=settings.olorin.smart_subs.shoresh_claude_max_tokens,
                temperature=0.1,
                messages=[
                    {
                        "role": "user",
                        "content": (
                            f"Translate the following Hebrew text to {target_lang}. "
                            "Output ONLY the translation, nothing else.\n\n"
                            f"{hebrew_text}"
                        ),
                    }
                ],
            )
            return response.content[0].text.strip()

        except Exception as e:
            logger.error(
                "All translation methods failed",
                extra={"error": str(e)},
            )
            return hebrew_text
