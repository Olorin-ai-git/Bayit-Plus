"""
Trivia Translation Service with Security Controls
Supports English→Hebrew and English→Spanish translation with rate limiting
"""

import asyncio
import html
import logging
import re
from typing import Dict, Optional
from uuid import uuid4

from anthropic import AsyncAnthropic
from anthropic.types import TextBlock

from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.olorin.metering.service import MeteringService

logger = get_logger(__name__)


class TriviaTextSanitizer:
    """Sanitize trivia text before translation to prevent injection attacks."""

    # Dangerous patterns (security check)
    # These patterns match complete dangerous constructs, not just opening tags
    DANGEROUS_PATTERNS = [
        r'<script[^>]*>.*?</script>',  # Match entire script tags with content
        r'<script[^>]*>',               # Also match unclosed script tags
        r'javascript:[^\s<>]*',         # Match javascript: URLs with content
        r'data:text/html[^\s<>]*',      # Match data:text/html URLs
        r'<iframe[^>]*>.*?</iframe>',   # Match entire iframe tags with content
        r'<iframe[^>]*>',               # Also match unclosed iframe tags
        r'onerror\s*=\s*["\'][^"\']*["\']',  # Match onerror= with value
        r'onload\s*=\s*["\'][^"\']*["\']',   # Match onload= with value
        r'\{%[^}]*%\}',                 # Template injection (Jinja2)
        r'\{\{[^}]*\}\}',               # Template injection (Handlebars)
        r'exec\s*\([^)]*\)',            # Match exec() with content
        r'eval\s*\([^)]*\)',            # Match eval() with content
    ]

    @staticmethod
    def sanitize(text: str) -> str:
        """
        Sanitize text for safe translation.

        Args:
            text: Input text to sanitize

        Returns:
            Sanitized text safe for translation

        Security measures:
            - Dangerous pattern removal (BEFORE encoding)
            - HTML encoding
            - Length limiting (DoS prevention)
            - Whitespace normalization
        """
        if not text:
            return ""

        sanitized = text

        # Remove dangerous patterns FIRST (before HTML encoding)
        for pattern in TriviaTextSanitizer.DANGEROUS_PATTERNS:
            if re.search(pattern, sanitized, re.IGNORECASE):
                logger.warning(
                    "Dangerous pattern detected in trivia text",
                    extra={
                        "pattern": pattern,
                        "text_preview": sanitized[:50] + "..."
                    }
                )
                # Remove pattern completely
                sanitized = re.sub(pattern, '[removed]', sanitized, flags=re.IGNORECASE)

        # HTML encode after pattern removal
        sanitized = html.escape(sanitized)

        # Limit length (DoS prevention)
        if len(sanitized) > 1000:
            logger.warning(
                f"Trivia text too long ({len(sanitized)} chars), truncating",
                extra={"original_length": len(sanitized)}
            )
            sanitized = sanitized[:1000]

        # Remove excessive whitespace
        sanitized = ' '.join(sanitized.split())

        return sanitized


class RateLimitExceeded(Exception):
    """Raised when translation rate limit is exceeded."""
    pass


class SimpleRateLimiter:
    """
    Simple in-memory rate limiter for translation service.
    TODO: Integrate with Olorin PartnerRateLimiter for production.
    """

    def __init__(self, max_requests: int, window_seconds: int, resource_type: str):
        """Initialize rate limiter."""
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.resource_type = resource_type
        self._requests: Dict[str, List[float]] = {}

    async def allow(self, key: str) -> bool:
        """
        Check if request is allowed under rate limit.

        Args:
            key: Unique key for rate limiting (e.g., content_id)

        Returns:
            True if request allowed, False if rate limit exceeded
        """
        import time

        current_time = time.time()
        cutoff_time = current_time - self.window_seconds

        # Get request history for this key
        if key not in self._requests:
            self._requests[key] = []

        # Clean old requests
        self._requests[key] = [
            req_time for req_time in self._requests[key]
            if req_time > cutoff_time
        ]

        # Check if under limit
        if len(self._requests[key]) >= self.max_requests:
            return False

        # Record this request
        self._requests[key].append(current_time)
        return True


class TriviaTranslationService:
    """
    Secure translation service for trivia facts.
    Supports English→Hebrew and English→Spanish with rate limiting and metering.

    Features:
        - Input sanitization (XSS/injection prevention)
        - Rate limiting (100 translations/hour)
        - Cost metering (Olorin metering service)
        - Output validation (malicious content detection)
        - Concurrent translation (parallel Hebrew + Spanish)
        - Comprehensive logging (no sensitive data)
    """

    def __init__(self):
        """Initialize with security controls."""
        if not settings.ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY not configured")

        self.client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.sanitizer = TriviaTextSanitizer()

        # Simple rate limiter (100 translations per hour)
        # TODO: Integrate with Olorin PartnerRateLimiter for production
        self.rate_limiter = SimpleRateLimiter(
            max_requests=100,
            window_seconds=3600,
            resource_type="trivia_translation"
        )

        # Metering service for cost tracking
        self.metering = MeteringService()

        # Supported translations
        self.supported_translations = {
            "he": "Hebrew",
            "es": "Spanish"
        }

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

        # Rate limiting
        rate_limit_key = f"trivia_{content_id or 'general'}"
        if not await self.rate_limiter.allow(rate_limit_key):
            logger.error(
                "Translation rate limit exceeded",
                extra={"content_id": content_id, "target_lang": target_lang}
            )
            raise RateLimitExceeded("Translation rate limit exceeded")

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
            if not self._validate_translation_output(sanitized_text, translation, target_lang):
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
        # Translate to both languages concurrently
        he_task = self.translate_from_english(
            english_text, "he", content_id, partner_id
        )
        es_task = self.translate_from_english(
            english_text, "es", content_id, partner_id
        )

        # Wait for both
        he_translation, es_translation = await asyncio.gather(
            he_task, es_task, return_exceptions=True
        )

        # Handle exceptions
        if isinstance(he_translation, Exception):
            logger.error(
                f"Hebrew translation failed: {he_translation}",
                extra={"content_id": content_id}
            )
            he_translation = english_text

        if isinstance(es_translation, Exception):
            logger.error(
                f"Spanish translation failed: {es_translation}",
                extra={"content_id": content_id}
            )
            es_translation = english_text

        return {
            "he": he_translation,
            "es": es_translation
        }

    def _validate_translation_output(
        self,
        original: str,
        translated: str,
        target_lang: str
    ) -> bool:
        """
        Validate translation output is safe and reasonable.

        Args:
            original: Original English text
            translated: Translated text
            target_lang: Target language code

        Returns:
            True if translation is valid, False otherwise

        Validation checks:
            - No malicious content (script tags, javascript:, etc.)
            - Not empty
            - Reasonable length ratio (0.3-3.0x original)
        """
        # Check for injection attempts
        if re.search(r'<script|javascript:|data:', translated, re.IGNORECASE):
            logger.error(
                f"Malicious content detected in {target_lang} translation",
                extra={"target_lang": target_lang}
            )
            return False

        # Check for empty translation
        if not translated or not translated.strip():
            logger.error(
                f"Empty {target_lang} translation",
                extra={"target_lang": target_lang}
            )
            return False

        # Check length ratio (prevent truncation attacks)
        length_ratio = len(translated) / max(len(original), 1)

        # Ratio too high (> 3.0x) is invalid (possible padding attack)
        if length_ratio > 3.0:
            logger.error(
                f"Translation length ratio too high",
                extra={
                    "target_lang": target_lang,
                    "ratio": length_ratio,
                    "original_len": len(original),
                    "translated_len": len(translated)
                }
            )
            return False

        # Ratio too low (< 0.3x) is suspicious but allowed (log warning)
        if length_ratio < 0.3:
            logger.warning(
                f"Translation length ratio suspiciously low",
                extra={
                    "target_lang": target_lang,
                    "ratio": length_ratio,
                    "original_len": len(original),
                    "translated_len": len(translated)
                }
            )

        return True
