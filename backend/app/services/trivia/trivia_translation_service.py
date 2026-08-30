"""
Trivia Translation Service with Security Controls
Supports English→Hebrew and English→Spanish translation with rate limiting
"""

from typing import Dict, Optional
from uuid import uuid4

from anthropic import AsyncAnthropic
from anthropic.types import TextBlock

from app.core.ai_clients import get_anthropic_client

from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.olorin.metering.service import MeteringService
from app.services.olorin.pipeline_cost_tracker import track_claude_usage
from app.models.integration_partner import RateLimitConfig
from app.services.olorin.rate_limiter import PartnerRateLimiter
from app.services.trivia.trivia_text_sanitizer import TriviaTextSanitizer
from app.services.trivia.trivia_translation_validator import TriviaTranslationValidator
from app.services.trivia.trivia_concurrent_translator import TriviaConcurrentTranslator

logger = get_logger(__name__)


class RateLimitExceeded(Exception):
    """Raised when translation rate limit is exceeded."""


class TriviaTranslationService:
    """
    Secure translation service for trivia facts.
    Supports English→Hebrew and English→Spanish with rate limiting and metering.

    Features:
        - Input sanitization (XSS/injection prevention)
        - Rate limiting via Olorin PartnerRateLimiter
        - Cost metering (Olorin metering service)
        - Output validation (malicious content detection)
        - Concurrent translation (parallel Hebrew + Spanish)
        - Comprehensive logging (no sensitive data)
    """

    def __init__(
        self,
        anthropic_client: Optional[AsyncAnthropic] = None,
        rate_limiter: Optional[PartnerRateLimiter] = None,
        metering_service: Optional[MeteringService] = None
    ):
        """
        Initialize with security controls and dependency injection.

        Args:
            anthropic_client: AsyncAnthropic client for translations (injected)
            rate_limiter: Olorin PartnerRateLimiter for rate limiting (injected)
            metering_service: Olorin MeteringService for cost tracking (injected)

        Raises:
            ValueError: If ANTHROPIC_API_KEY not configured and client not provided
        """
        # Dependency injection with fallback to defaults
        if anthropic_client is None:
            if not settings.ANTHROPIC_API_KEY:
                raise ValueError("ANTHROPIC_API_KEY not configured")
            self.client = get_anthropic_client(api_key=settings.ANTHROPIC_API_KEY)
        else:
            self.client = anthropic_client

        self.sanitizer = TriviaTextSanitizer()
        self.validator = TriviaTranslationValidator()

        # Use Olorin PartnerRateLimiter (limits enforced per-request via RateLimitConfig)
        self.rate_limiter = rate_limiter or PartnerRateLimiter()

        # Metering service for cost tracking
        self.metering = metering_service or MeteringService()

        # Supported translations
        self.supported_translations = {
            "he": "Hebrew",
            "es": "Spanish"
        }

        # Concurrent translator for parallel translations
        self.concurrent_translator = TriviaConcurrentTranslator(self)

        logger.info(
            "TriviaTranslationService initialized",
            extra={
                "supported_languages": list(self.supported_translations.keys()),
                "rate_limit": "100/hour"
            }
        )

    async def translate_from_english(
        self,
        english_text: str,
        target_lang: str,
        content_id: Optional[str] = None,
        partner_id: str = "system"
    ) -> str:
        """
        Translate English text to Hebrew or Spanish with security controls.

        Args:
            english_text: Source text in English
            target_lang: Target language code ("he" or "es")
            content_id: Content ID for rate limiting
            partner_id: Partner ID for metering

        Returns:
            Translated text or original on failure

        Raises:
            ValueError: If target_lang is not supported
            RateLimitExceeded: If rate limit exceeded
        """
        # Validate target language
        if target_lang not in self.supported_translations:
            raise ValueError(
                f"Unsupported target language: {target_lang}. "
                f"Supported: {list(self.supported_translations.keys())}"
            )

        # Rate limiting using Olorin PartnerRateLimiter
        rate_limit_key = f"trivia_{content_id or 'general'}"
        is_allowed, limit_msg = await self.rate_limiter.check_rate_limit(
            partner_id=partner_id,
            capability=rate_limit_key,
            rate_limits=RateLimitConfig(),
        )
        if not is_allowed:
            logger.error(
                "Translation rate limit exceeded",
                extra={
                    "content_id": content_id,
                    "target_lang": target_lang,
                    "limit_detail": limit_msg,
                }
            )
            raise RateLimitExceeded(limit_msg or "Translation rate limit exceeded")

        # Sanitize input
        sanitized_text = self.sanitizer.sanitize(english_text)

        if not sanitized_text:
            logger.warning(
                "Text empty after sanitization",
                extra={"original_length": len(english_text)}
            )
            return english_text

        # Translation prompt
        target_language_name = self.supported_translations[target_lang]
        prompt = f"""Translate the following English text to {target_language_name}.

IMPORTANT RULES:
1. Return ONLY the translation, nothing else
2. No explanations, no additional text
3. Preserve the meaning and tone
4. For names, transliterate appropriately
5. If already in {target_language_name}, return as is

English text: {sanitized_text}

{target_language_name} translation:"""

        try:
            # Create translation request
            request_id = str(uuid4())

            logger.info(
                "Translation request",
                extra={
                    "request_id": request_id,
                    "source_lang": "en",
                    "target_lang": target_lang,
                    "text_length": len(sanitized_text),
                    "content_id": content_id
                }
            )

            # Call Claude API
            message = await self.client.messages.create(
                model=settings.CLAUDE_MODEL,
                max_tokens=settings.CLAUDE_MAX_TOKENS_SHORT,
                messages=[{"role": "user", "content": prompt}]
            )
            track_claude_usage(message.usage.input_tokens, message.usage.output_tokens)

            # Extract response
            content_block = message.content[0]
            if not isinstance(content_block, TextBlock):
                logger.error(
                    "Unexpected response type",
                    extra={
                        "request_id": request_id,
                        "response_type": type(content_block).__name__
                    }
                )
                return sanitized_text

            # Clean response
            translation = content_block.text.strip()
            translation = translation.replace("Translation:", "").replace("translation:", "")
            translation = translation.strip().strip('"').strip("'")

            # Validate output
            if not self.validator.validate_translation_output(sanitized_text, translation, target_lang):
                logger.warning(
                    f"Translation validation failed for {target_lang}",
                    extra={"request_id": request_id}
                )
                return sanitized_text

            # Record metering
            estimated_tokens = len(sanitized_text) // 4
            await self.metering.record_usage(
                partner_id=partner_id,
                resource_type="trivia_translation",
                quantity=estimated_tokens,
                metadata={
                    "request_id": request_id,
                    "target_lang": target_lang,
                    "source_lang": "en"
                }
            )

            # Record rate-limit usage after success
            await self.rate_limiter.record_request(
                partner_id=partner_id,
                capability=rate_limit_key,
            )

            logger.info(
                "Translation complete",
                extra={
                    "request_id": request_id,
                    "result_length": len(translation),
                    "target_lang": target_lang
                }
            )

            return translation

        except Exception as e:
            logger.error(
                f"Translation to {target_lang} failed",
                extra={
                    "error_type": type(e).__name__,
                    "content_id": content_id,
                    "target_lang": target_lang
                }
            )
            # Fallback to original
            return sanitized_text

    async def translate_trivia_fact(
        self,
        english_text: str,
        content_id: Optional[str] = None,
        partner_id: str = "system"
    ) -> Dict[str, str]:
        """
        Translate English trivia to Hebrew and Spanish concurrently.

        Args:
            english_text: Source text in English
            content_id: Content ID for tracking
            partner_id: Partner ID for metering

        Returns:
            Dictionary with "he" and "es" translations

        Example:
            >>> service = TriviaTranslationService()
            >>> result = await service.translate_trivia_fact("This is a fact")
            >>> print(result)
            {"he": "זו עובדה", "es": "Este es un hecho"}
        """
        # Delegate to concurrent translator
        return await self.concurrent_translator.translate_to_all_languages(
            english_text,
            target_languages=["he", "es"],
            content_id=content_id,
            partner_id=partner_id
        )
