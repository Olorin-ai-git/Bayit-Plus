"""
Translation Providers

Google Cloud Translate and Claude translation for dubbing.
Includes circuit breaker protection, dedicated thread pool,
parallel chunk processing, and two-tier translation caching.
"""

import asyncio
import logging
import re
from concurrent.futures import ThreadPoolExecutor
from typing import Optional, Tuple

from app.core.config import settings
from app.services.olorin.resilience import (GOOGLE_TRANSLATE_BREAKER,
                                            circuit_breaker)

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

# P1-4: Dedicated translation thread pool (module-level singleton)
_translation_executor: Optional[ThreadPoolExecutor] = None


def _get_translation_executor() -> ThreadPoolExecutor:
    """Get or create the dedicated translation thread pool."""
    global _translation_executor
    if _translation_executor is None:
        pool_size = settings.olorin.dubbing.translation_thread_pool_size
        _translation_executor = ThreadPoolExecutor(
            max_workers=pool_size,
            thread_name_prefix="dubbing-translate",
        )
    return _translation_executor


class TranslationProvider:
    """Handles translation via Google or Claude with caching and resilience."""

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
                logger.info(
                    "Using Google Translate (fallback) for dubbing"
                )
            else:
                raise RuntimeError("No translation provider available")

    async def translate(
        self, text: str, source_lang: str
    ) -> Tuple[str, bool]:
        """
        Translate text to target language.

        Args:
            text: Text to translate
            source_lang: Source language code

        Returns:
            Tuple of (translated_text, was_cached)
        """
        if not text.strip():
            return "", False

        # P2-4: Check translation cache first
        if settings.olorin.dubbing.translation_cache_enabled:
            try:
                from app.services.translation_cache_service import (
                    translation_cache_service,
                )

                cached = await translation_cache_service.get_cached_translation(
                    text, source_lang, self.target_language
                )
                if cached is not None:
                    return cached, True
            except Exception as e:
                logger.warning(f"Translation cache lookup failed: {e}")

        # Perform translation
        if self._claude_client:
            translated = await self._translate_with_claude(
                text, source_lang
            )
        elif self._google_client:
            translated = await self._translate_with_google(
                text, source_lang
            )
        else:
            raise RuntimeError("No translation client initialized")

        # P2-4: Store in cache
        if settings.olorin.dubbing.translation_cache_enabled:
            try:
                from app.services.translation_cache_service import (
                    translation_cache_service,
                )

                await translation_cache_service.store_translation(
                    text,
                    source_lang,
                    self.target_language,
                    translated,
                )
            except Exception as e:
                logger.warning(f"Translation cache store failed: {e}")

        return translated, False

    # P1-3: Circuit breaker on Google Translate
    @circuit_breaker(GOOGLE_TRANSLATE_BREAKER)
    async def _translate_with_google(
        self, text: str, source_lang: str
    ) -> str:
        """
        Translate using Google Cloud Translate.

        Uses P1-4 dedicated thread pool and P2-1 parallel chunk processing.
        """
        # Google Cloud Translation API limit: 204,800 bytes (200KB)
        max_bytes = 180000  # 180KB safe limit for UTF-8

        text_bytes = text.encode("utf-8")
        executor = _get_translation_executor()

        # If text is small enough, translate directly
        if len(text_bytes) <= max_bytes:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                executor,
                lambda: self._google_client.translate(
                    text,
                    source_language=source_lang,
                    target_language=self.target_language,
                ),
            )
            return result.get("translatedText", text)

        # P2-1: Parallel chunk translation
        logger.info(
            f"Text size ({len(text_bytes):,} bytes) exceeds limit. "
            f"Chunking for parallel translation..."
        )

        chunks = self._chunk_text(text, max_bytes)
        logger.info(f"Split text into {len(chunks)} chunks")

        max_parallel = settings.olorin.dubbing.max_parallel_translation_chunks
        semaphore = asyncio.Semaphore(max_parallel)

        async def translate_chunk(chunk: str) -> str:
            async with semaphore:
                loop = asyncio.get_event_loop()
                result = await loop.run_in_executor(
                    executor,
                    lambda c=chunk: self._google_client.translate(
                        c,
                        source_language=source_lang,
                        target_language=self.target_language,
                    ),
                )
                return result.get("translatedText", chunk)

        translated_chunks = await asyncio.gather(
            *[translate_chunk(chunk) for chunk in chunks]
        )

        combined_translation = " ".join(translated_chunks)
        logger.info(
            f"Combined {len(chunks)} translated chunks successfully"
        )

        return combined_translation

    def _chunk_text(self, text: str, max_bytes: int) -> list[str]:
        """Split text into chunks at sentence boundaries."""
        sentence_pattern = r"[.!?…]+\s+|[׃׀]+\s+"
        sentences = re.split(sentence_pattern, text)
        sentences = [s.strip() for s in sentences if s.strip()]

        chunks = []
        current_chunk: list[str] = []
        current_bytes = 0

        for sentence in sentences:
            sentence_bytes = len(sentence.encode("utf-8"))

            if sentence_bytes > max_bytes:
                if current_chunk:
                    chunks.append(" ".join(current_chunk))
                    current_chunk = []
                    current_bytes = 0

                words = sentence.split()
                word_chunk: list[str] = []
                word_bytes = 0

                for word in words:
                    word_size = len((word + " ").encode("utf-8"))
                    if word_bytes + word_size > max_bytes:
                        if word_chunk:
                            chunks.append(" ".join(word_chunk))
                            word_chunk = [word]
                            word_bytes = word_size
                        else:
                            chunks.append(word)
                            word_bytes = 0
                    else:
                        word_chunk.append(word)
                        word_bytes += word_size

                if word_chunk:
                    chunks.append(" ".join(word_chunk))

            elif current_bytes + sentence_bytes + 1 > max_bytes:
                if current_chunk:
                    chunks.append(" ".join(current_chunk))
                current_chunk = [sentence]
                current_bytes = sentence_bytes
            else:
                current_chunk.append(sentence)
                current_bytes += sentence_bytes + 1

        if current_chunk:
            chunks.append(" ".join(current_chunk))

        return chunks

    async def _translate_with_claude(
        self, text: str, source_lang: str
    ) -> str:
        """Translate using Claude for higher quality."""
        source_name = LANGUAGE_NAMES.get(source_lang, source_lang)
        target_name = LANGUAGE_NAMES.get(
            self.target_language, self.target_language
        )

        prompt = (
            f"Translate the following {source_name} text to {target_name}.\n"
            "Preserve the speaker's tone and intent. "
            "Output only the translation, nothing else.\n\n"
            f"Text: {text}"
        )

        response = await self._claude_client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}],
        )

        return response.content[0].text.strip()
