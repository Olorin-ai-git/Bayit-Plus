"""
Hebrew Simplification Service (Ivrit Kalla)

AI-powered Hebrew audio simplification pipeline:
1. STT: Transcribe Hebrew audio (ElevenLabs Scribe v2 via LiveTranslationService)
2. Simplify: Claude rewrites transcript with simpler vocabulary/structure
3. TTS: Re-synthesize as clearer, slower Hebrew audio (ElevenLabs)

Yields simplified audio chunks + simplified text for subtitle fallback.
"""

import asyncio
import logging
from typing import AsyncIterator, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

# Conditional imports
try:
    from anthropic import AsyncAnthropic

    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
    logger.warning("Anthropic not available for Hebrew simplification")

try:
    from app.services.elevenlabs_realtime_service import ElevenLabsRealtimeService

    ELEVENLABS_AVAILABLE = True
except ImportError:
    ELEVENLABS_AVAILABLE = False
    logger.warning("ElevenLabs realtime service not available")

# Simplification prompts per vocabulary level
_SIMPLIFICATION_PROMPTS = {
    "alef": (
        "You are a Hebrew language simplifier for beginners (Alef level).\n"
        "Rewrite the following Hebrew text using:\n"
        "- Only the 500 most common Hebrew words\n"
        "- Simple present tense when possible\n"
        "- Short sentences (max 8 words)\n"
        "- No slang, idioms, or colloquialisms\n"
        "- Standard binyanim (Pa'al preferred)\n"
        "Keep the EXACT same meaning. Output ONLY the simplified Hebrew text."
    ),
    "bet": (
        "You are a Hebrew language simplifier for intermediate learners (Bet level).\n"
        "Rewrite the following Hebrew text using:\n"
        "- Common vocabulary (top 2000 words)\n"
        "- Clear sentence structure\n"
        "- Replace slang with standard Hebrew\n"
        "- Moderate sentence length (max 12 words)\n"
        "Keep the EXACT same meaning. Output ONLY the simplified Hebrew text."
    ),
    "gimel": (
        "You are a Hebrew language simplifier for advanced learners (Gimel level).\n"
        "Rewrite the following Hebrew text using:\n"
        "- Standard vocabulary (avoid obscure terms)\n"
        "- Clear but natural sentence structure\n"
        "- Replace heavy slang only\n"
        "Keep the EXACT same meaning. Output ONLY the simplified Hebrew text."
    ),
}


class HebrewSimplificationService:
    """
    Real-time Hebrew audio simplification pipeline.

    Transcribes Hebrew audio, simplifies vocabulary and pacing,
    then re-synthesizes as clearer Hebrew audio.

    Dependencies injected through constructor for testability.
    """

    def __init__(
        self,
        anthropic_client: Optional[AsyncAnthropic] = None,
        tts_service=None,
        stt_service=None,
        vocabulary_level: str = "alef",
        voice_id: Optional[str] = None,
    ):
        self._anthropic = anthropic_client
        self._tts_service = tts_service
        self._stt_service = stt_service

        # Configuration from settings
        config = settings.olorin.simplified_hebrew
        self._vocabulary_level = vocabulary_level or config.vocabulary_level
        self._voice_id = voice_id or config.voice_id
        self._speaking_rate = config.speaking_rate
        self._claude_model = config.claude_model
        self._claude_max_tokens = config.claude_max_tokens
        self._claude_temperature = config.claude_temperature

        self._running = False
        self._session_id: Optional[str] = None

    @property
    def is_running(self) -> bool:
        """Check if service is running."""
        return self._running

    @property
    def session_id(self) -> Optional[str]:
        """Get current session ID."""
        return self._session_id

    async def _get_anthropic(self) -> Optional[AsyncAnthropic]:
        """Lazy-initialize Anthropic client."""
        if self._anthropic is None and ANTHROPIC_AVAILABLE:
            self._anthropic = AsyncAnthropic()
        return self._anthropic

    async def simplify_text(self, hebrew_text: str) -> str:
        """
        Simplify Hebrew text using Claude.

        Args:
            hebrew_text: Original Hebrew transcript

        Returns:
            Simplified Hebrew text

        Raises:
            RuntimeError: If Claude API unavailable
        """
        client = await self._get_anthropic()
        if not client:
            raise RuntimeError("Anthropic client not available for Hebrew simplification")

        prompt = _SIMPLIFICATION_PROMPTS.get(
            self._vocabulary_level,
            _SIMPLIFICATION_PROMPTS["alef"],
        )

        try:
            response = await client.messages.create(
                model=self._claude_model,
                max_tokens=self._claude_max_tokens,
                temperature=self._claude_temperature,
                messages=[
                    {
                        "role": "user",
                        "content": f"{prompt}\n\nOriginal Hebrew:\n{hebrew_text}",
                    }
                ],
            )

            simplified = response.content[0].text.strip()

            logger.debug(
                "Hebrew text simplified",
                extra={
                    "original_length": len(hebrew_text),
                    "simplified_length": len(simplified),
                    "level": self._vocabulary_level,
                },
            )

            return simplified

        except Exception as e:
            logger.error(
                "Hebrew simplification failed",
                extra={"error": str(e), "text_length": len(hebrew_text)},
            )
            # Return original text as graceful degradation
            return hebrew_text

    async def process_transcript_to_audio(
        self,
        transcript: str,
    ) -> AsyncIterator[dict]:
        """
        Process a Hebrew transcript segment: simplify and synthesize audio.

        Args:
            transcript: Hebrew transcript segment from STT

        Yields:
            Dict with keys:
            - type: "simplified_audio" or "simplified_text"
            - data: Base64 audio chunk or simplified text
            - original_text: Original transcript
            - simplified_text: Simplified version
        """
        if not transcript or not transcript.strip():
            return

        # Step 1: Simplify the Hebrew text
        simplified_text = await self.simplify_text(transcript)

        # Yield the simplified text immediately (for subtitle fallback)
        yield {
            "type": "simplified_text",
            "simplified_text": simplified_text,
            "original_text": transcript,
            "vocabulary_level": self._vocabulary_level,
        }

        # Step 2: Synthesize simplified text to audio via TTS
        if self._tts_service and ELEVENLABS_AVAILABLE:
            try:
                import base64

                async for audio_chunk in self._tts_service.synthesize_streaming(
                    text=simplified_text,
                    voice_id=self._voice_id,
                    speaking_rate=self._speaking_rate,
                ):
                    yield {
                        "type": "simplified_audio",
                        "data": base64.b64encode(audio_chunk).decode("ascii"),
                        "simplified_text": simplified_text,
                        "original_text": transcript,
                        "vocabulary_level": self._vocabulary_level,
                    }

            except Exception as e:
                logger.error(
                    "TTS synthesis failed for simplified Hebrew",
                    extra={"error": str(e)},
                )

    async def start(self, session_id: str) -> None:
        """Start the simplification service session."""
        self._session_id = session_id
        self._running = True
        logger.info(
            "Hebrew simplification service started",
            extra={
                "session_id": session_id,
                "vocabulary_level": self._vocabulary_level,
                "voice_id": self._voice_id,
                "speaking_rate": self._speaking_rate,
            },
        )

    async def stop(self) -> dict:
        """
        Stop the simplification service.

        Returns:
            Session summary
        """
        self._running = False
        session_id = self._session_id
        self._session_id = None

        logger.info(
            "Hebrew simplification service stopped",
            extra={"session_id": session_id},
        )

        return {
            "session_id": session_id,
            "vocabulary_level": self._vocabulary_level,
        }
