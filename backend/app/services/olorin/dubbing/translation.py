"""
Translation Providers

Google Cloud Translate and Claude translation for dubbing.
"""

import asyncio
import logging
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

# Translation provider imports
try:
    from google.cloud import translate_v2 as translate
    GOOGLE_TRANSLATE_AVAILABLE = True
except ImportError:
    translate = None
    GOOGLE_TRANSLATE_AVAILABLE = False
    logger.warning("Google Cloud Translate not available")

try:
    from anthropic import AsyncAnthropic
    CLAUDE_AVAILABLE = True
except ImportError:
    AsyncAnthropic = None
    CLAUDE_AVAILABLE = False
    logger.warning("Anthropic Claude not available")

LANGUAGE_NAMES = {
    "he": "Hebrew",
    "en": "English",
    "es": "Spanish",
}


class TranslationProvider:
    """Handles translation via Google or Claude."""

    def __init__(self, target_language: str):
        self.target_language = target_language
        self._google_client = None
        self._claude_client: Optional[AsyncAnthropic] = None

    async def initialize(self) -> None:
        """Initialize the appropriate translation client."""
        provider = getattr(settings, "LIVE_TRANSLATION_PROVIDER", "google")

        if provider == "google" and GOOGLE_TRANSLATE_AVAILABLE:
            self._google_client = translate.Client()
            logger.info("Using Google Translate for dubbing")
        elif provider == "claude" and CLAUDE_AVAILABLE:
            api_key = settings.ANTHROPIC_API_KEY
            if api_key:
                self._claude_client = AsyncAnthropic(api_key=api_key)
                logger.info("Using Claude for dubbing translation")
        else:
            if GOOGLE_TRANSLATE_AVAILABLE:
                self._google_client = translate.Client()
                logger.info("Using Google Translate (fallback) for dubbing")
            else:
                raise RuntimeError("No translation provider available")

    async def translate(self, text: str, source_lang: str) -> str:
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
        elif self._google_client:
            return await self._translate_with_google(text, source_lang)
        else:
            raise RuntimeError("No translation client initialized")

    async def _translate_with_google(self, text: str, source_lang: str) -> str:
        """Translate using Google Cloud Translate."""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self._google_client.translate(
                text,
                source_language=source_lang,
                target_language=self.target_language,
            ),
        )
        return result.get("translatedText", text)

    async def _translate_with_claude(self, text: str, source_lang: str) -> str:
        """Translate using Claude for higher quality."""
        source_name = LANGUAGE_NAMES.get(source_lang, source_lang)
        target_name = LANGUAGE_NAMES.get(self.target_language, self.target_language)

        prompt = f"""Translate the following {source_name} text to {target_name}.
Preserve the speaker's tone and intent. Output only the translation, nothing else.

Text: {text}"""

        response = await self._claude_client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}],
        )

        return response.content[0].text.strip()
