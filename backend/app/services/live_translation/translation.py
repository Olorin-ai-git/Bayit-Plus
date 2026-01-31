"""Translation service with caching and provider fallback."""
import asyncio
import html
import logging
import time
from typing import Optional

from app.core.config import settings
from app.services.translation_cache_service import translation_cache_service
from .constants import LANGUAGE_NAMES

logger = logging.getLogger(__name__)


class TranslationService:
    """Translation with caching and multi-provider fallback."""

    def __init__(self, translation_manager):
        """
        Initialize translation service.

        Args:
            translation_manager: TranslationProviderManager instance
        """
        self.translation_manager = translation_manager

    async def translate(
        self,
        text: str,
        source_lang: str,
        target_lang: str,
        timeout_seconds: float | None = None,
        enable_fallback: bool = True,
        channel_id: Optional[str] = None,
        cache_ttl_seconds: int = 300,
    ) -> str:
        """
        Translate text using configured translation provider with automatic fallback.

        Provider fallback chain: Google → OpenAI → Claude
        Uses translation cache for improved performance.

        Args:
            text: Text to translate
            source_lang: Source language code (e.g., "he")
            target_lang: Target language code (e.g., "en")
            timeout_seconds: Timeout for translation (default 100ms for live dubbing)
            enable_fallback: Enable fallback to alternative providers (default True)
            channel_id: Optional channel ID for channel-specific caching (live features)
            cache_ttl_seconds: Cache TTL in seconds (default 300s = 5min for live)

        Returns:
            Translated text, or original text if all providers fail
        """
        # Use configuration default if timeout not provided
        if timeout_seconds is None:
            timeout_seconds = settings.olorin.subtitle.translation_timeout_seconds

        # Check cache first
        try:
            cached = await translation_cache_service.get_cached_translation(
                text, source_lang, target_lang, channel_id=channel_id
            )
            if cached is not None:
                logger.debug(f"Cache hit: {text[:30]}... → {cached[:30]}...")
                return cached
        except Exception as e:
            logger.warning(f"Cache error: {e}")

        # Define fallback chain based on configured provider
        providers = []
        if self.translation_manager.provider == "google":
            providers = ["google", "openai", "claude"]
        elif self.translation_manager.provider == "openai":
            providers = ["openai", "google", "claude"]
        else:  # claude
            providers = ["claude", "google", "openai"]

        # Try each provider in fallback chain
        for i, provider in enumerate(providers):
            try:
                start_time = time.time()
                translated = await self._translate_with_provider(
                    text, source_lang, target_lang, provider, timeout_seconds
                )
                latency_ms = (time.time() - start_time) * 1000

                # Cache successful translation
                try:
                    await translation_cache_service.store_translation(
                        text, source_lang, target_lang, translated,
                        channel_id=channel_id, ttl_seconds=cache_ttl_seconds
                    )
                except Exception as e:
                    logger.warning(f"Cache store: {e}")

                log_msg = f"{provider} latency: {latency_ms:.0f}ms"
                (logger.warning if i > 0 else logger.debug)(
                    f"Fallback {log_msg}" if i > 0 else log_msg
                )

                return translated

            except asyncio.TimeoutError:
                logger.warning(f"{provider} timeout after {timeout_seconds*1000:.0f}ms")
                if not enable_fallback or i == len(providers) - 1:
                    return text
            except Exception as e:
                logger.error(f"{provider} error: {str(e)}")
                if not enable_fallback or i == len(providers) - 1:
                    return text

        logger.error("All providers failed")
        return text

    async def _translate_with_provider(
        self, text: str, source_lang: str, target_lang: str,
        provider: str, timeout_seconds: float
    ) -> str:
        """Translate with specific provider (google, openai, or claude)."""
        source_name = LANGUAGE_NAMES.get(source_lang, source_lang)
        target_name = LANGUAGE_NAMES.get(target_lang, target_lang)

        if provider == "google" and self.translation_manager.translate_client:
            # Google Cloud Translate (synchronous, fast ~30ms)
            result = self.translation_manager.translate_client.translate(
                text, source_language=source_lang, target_language=target_lang
            )
            translated = html.unescape(result["translatedText"])
            logger.debug(f"Google Translate: {text[:30]}... → {translated[:30]}...")
            return translated

        elif provider == "openai" and self.translation_manager.openai_client:
            # OpenAI translation (async with timeout)
            response = await asyncio.wait_for(
                self.translation_manager.openai_client.chat.completions.create(
                    model=settings.olorin.subtitle.translation_model,
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                f"You are a professional translator. "
                                f"Translate the following text from {source_name} to {target_name}. "
                                f"Return ONLY the translated text, nothing else."
                            ),
                        },
                        {"role": "user", "content": text},
                    ],
                    temperature=settings.olorin.subtitle.translation_temperature,
                    max_tokens=500,
                ),
                timeout=timeout_seconds,
            )
            translated = response.choices[0].message.content.strip()
            logger.debug(f"OpenAI Translate: {text[:30]}... → {translated[:30]}...")
            return translated

        elif provider == "claude" and self.translation_manager.anthropic_client:
            # Claude translation (async with timeout)
            response = await asyncio.wait_for(
                self.translation_manager.anthropic_client.messages.create(
                    model=settings.CLAUDE_MODEL,
                    max_tokens=500,
                    messages=[
                        {
                            "role": "user",
                            "content": (
                                f"Translate the following text from {source_name} to {target_name}. "
                                f"Return ONLY the translated text, nothing else.\n\n"
                                f"Text to translate: {text}"
                            ),
                        }
                    ],
                ),
                timeout=timeout_seconds,
            )
            translated = response.content[0].text.strip()
            logger.debug(f"Claude Translate: {text[:30]}... → {translated[:30]}...")
            return translated

        else:
            raise ValueError(f"Provider {provider} not available or not initialized")
