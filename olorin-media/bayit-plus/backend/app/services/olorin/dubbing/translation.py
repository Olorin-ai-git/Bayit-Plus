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
        """
        Translate using Google Cloud Translate.

        Handles large texts by chunking to stay within API limits (200KB).
        """
        # Google Cloud Translation API limit: 204,800 bytes (200KB)
        MAX_BYTES = 180000  # Use 180KB to be safe with UTF-8 encoding

        text_bytes = text.encode('utf-8')

        # Debug logging
        logger.info(f"Translation text size: {len(text_bytes):,} bytes")
        logger.info(f"MAX_BYTES limit: {MAX_BYTES:,} bytes")
        logger.info(f"Will chunk: {len(text_bytes) > MAX_BYTES}")

        # If text is small enough, translate directly
        if len(text_bytes) <= MAX_BYTES:
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

        # Text is too large - chunk it at sentence boundaries
        logger.info(
            f"Text size ({len(text_bytes):,} bytes) exceeds limit. Chunking for translation..."
        )

        chunks = self._chunk_text(text, MAX_BYTES)
        logger.info(f"Split text into {len(chunks)} chunks")

        # Translate each chunk
        translated_chunks = []
        for i, chunk in enumerate(chunks, 1):
            logger.info(f"Translating chunk {i}/{len(chunks)} ({len(chunk.encode('utf-8'))} bytes)")

            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda c=chunk: self._google_client.translate(
                    c,
                    source_language=source_lang,
                    target_language=self.target_language,
                ),
            )

            translated_chunks.append(result.get("translatedText", chunk))

        # Combine translated chunks
        combined_translation = " ".join(translated_chunks)
        logger.info(f"Combined {len(chunks)} translated chunks successfully")

        return combined_translation

    def _chunk_text(self, text: str, max_bytes: int) -> list[str]:
        """
        Split text into chunks that respect sentence boundaries and byte limits.

        Args:
            text: Text to chunk
            max_bytes: Maximum bytes per chunk

        Returns:
            List of text chunks
        """
        import re

        # Split into sentences (handles Hebrew and English punctuation)
        sentence_pattern = r'[.!?…]+\s+|[׃׀]+\s+'
        sentences = re.split(sentence_pattern, text)
        sentences = [s.strip() for s in sentences if s.strip()]

        chunks = []
        current_chunk = []
        current_bytes = 0

        for sentence in sentences:
            sentence_bytes = len(sentence.encode('utf-8'))

            # If single sentence exceeds limit, split it further
            if sentence_bytes > max_bytes:
                # If we have accumulated sentences, save them first
                if current_chunk:
                    chunks.append(" ".join(current_chunk))
                    current_chunk = []
                    current_bytes = 0

                # Split long sentence into smaller pieces at word boundaries
                words = sentence.split()
                word_chunk = []
                word_bytes = 0

                for word in words:
                    word_with_space = word + " "
                    word_size = len(word_with_space.encode('utf-8'))

                    if word_bytes + word_size > max_bytes:
                        if word_chunk:
                            chunks.append(" ".join(word_chunk))
                            word_chunk = [word]
                            word_bytes = word_size
                        else:
                            # Single word too large - force add it
                            chunks.append(word)
                            word_bytes = 0
                    else:
                        word_chunk.append(word)
                        word_bytes += word_size

                if word_chunk:
                    chunks.append(" ".join(word_chunk))

            # Normal case: add sentence to current chunk
            elif current_bytes + sentence_bytes + 1 > max_bytes:  # +1 for space
                if current_chunk:
                    chunks.append(" ".join(current_chunk))
                current_chunk = [sentence]
                current_bytes = sentence_bytes
            else:
                current_chunk.append(sentence)
                current_bytes += sentence_bytes + 1  # +1 for space

        # Add remaining chunk
        if current_chunk:
            chunks.append(" ".join(current_chunk))

        return chunks

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
