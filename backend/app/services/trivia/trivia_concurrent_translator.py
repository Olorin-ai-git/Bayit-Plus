"""
Concurrent Trivia Translator
Handles parallel translation to multiple languages
"""

import asyncio
from typing import Dict

from app.core.logging_config import get_logger

logger = get_logger(__name__)


class TriviaConcurrentTranslator:
    """Handles concurrent translation to multiple target languages."""

    def __init__(self, translation_service):
        """
        Initialize concurrent translator.

        Args:
            translation_service: TriviaTranslationService instance for translations
        """
        self.translation_service = translation_service

    async def translate_to_all_languages(
        self,
        english_text: str,
        target_languages: list = None,
        content_id: str = None,
        partner_id: str = "system"
    ) -> Dict[str, str]:
        """
        Translate English text to multiple languages concurrently.

        Args:
            english_text: Source text in English
            target_languages: List of target language codes (default: ["he", "es"])
            content_id: Content ID for tracking
            partner_id: Partner ID for metering

        Returns:
            Dictionary mapping language codes to translations

        Example:
            >>> translator = TriviaConcurrentTranslator(service)
            >>> result = await translator.translate_to_all_languages("This is a fact")
            >>> print(result)
            {"he": "זו עובדה", "es": "Este es un hecho"}
        """
        if target_languages is None:
            target_languages = ["he", "es"]

        # Create translation tasks for all languages
        tasks = {
            lang: self.translation_service.translate_from_english(
                english_text, lang, content_id, partner_id
            )
            for lang in target_languages
        }

        # Execute all translations concurrently
        results = await asyncio.gather(
            *tasks.values(),
            return_exceptions=True
        )

        # Build result dictionary and handle exceptions
        translations = {}
        for lang, result in zip(tasks.keys(), results):
            if isinstance(result, Exception):
                logger.error(
                    f"{lang.upper()} translation failed: {result}",
                    extra={"content_id": content_id, "language": lang}
                )
                translations[lang] = english_text  # Fallback to English
            else:
                translations[lang] = result

        return translations
