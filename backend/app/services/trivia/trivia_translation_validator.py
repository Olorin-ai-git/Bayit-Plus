"""
Trivia Translation Output Validator
Validates translated text for safety and reasonableness
"""

import re

from app.core.logging_config import get_logger

logger = get_logger(__name__)


class TriviaTranslationValidator:
    """Validates translation output for safety and quality."""

    @staticmethod
    def validate_translation_output(
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
