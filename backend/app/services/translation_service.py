"""
Universal Translation Service for Bayit+ Content Localization

This service provides translation capabilities for all content types using Claude API.
Supports translating Hebrew content to English and Spanish.
"""

import asyncio
from typing import Optional, Dict, Any, List
from anthropic import Anthropic

from app.core.config import settings


class TranslationService:
    """Service for translating content using Claude API."""

    def __init__(self):
        """Initialize the translation service with Claude client."""
        self.client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = settings.CLAUDE_MODEL
        self.max_tokens_short = settings.CLAUDE_MAX_TOKENS_SHORT
        self.max_tokens_long = settings.CLAUDE_MAX_TOKENS_LONG
        self.supported_languages = {
            "en": "English",
            "es": "Spanish"
        }

    def translate_text(
        self,
        text: str,
        target_language_code: str,
        max_tokens: Optional[int] = None
    ) -> str:
        """
        Translate text from Hebrew to target language using Claude.

        Args:
            text: Hebrew text to translate
            target_language_code: Language code (en, es)
            max_tokens: Maximum tokens for response

        Returns:
            Translated text or empty string on failure
        """
        if not text or text.strip() == "":
            return ""

        if max_tokens is None:
            max_tokens = self.max_tokens_short

        target_language = self.supported_languages.get(target_language_code)
        if not target_language:
            raise ValueError(f"Unsupported language code: {target_language_code}")

        prompt = f"""Translate the following Hebrew text to {target_language}.
Return ONLY the translation, nothing else. No explanations, no additional text.
If it's a person's name, transliterate it appropriately for {target_language}.
If it's already in {target_language}, return it as is.

Hebrew text: {text}

{target_language} translation:"""

        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )

            response_text = message.content[0].text.strip()
            response_text = response_text.replace("Translation:", "").replace("translation:", "")
            response_text = response_text.strip().strip('"').strip("'")

            return response_text
        except Exception as e:
            print(f"    ✗ Error translating '{text[:50]}...' to {target_language}: {e}")
            return ""

    async def translate_field(
        self,
        source_text: Optional[str],
        target_language_code: str,
        max_tokens: Optional[int] = None
    ) -> Optional[str]:
        """
        Async wrapper for translating a single field.

        Args:
            source_text: Source text to translate
            target_language_code: Language code (en, es)
            max_tokens: Maximum tokens for response

        Returns:
            Translated text or None if source is empty
        """
        if not source_text or not source_text.strip():
            return None

        await asyncio.sleep(0.5)
        return self.translate_text(source_text, target_language_code, max_tokens)

    async def translate_fields(
        self,
        fields: Dict[str, str],
        target_language_code: str
    ) -> Dict[str, str]:
        """
        Translate multiple fields at once.

        Args:
            fields: Dictionary of field_name: hebrew_text
            target_language_code: Language code (en, es)

        Returns:
            Dictionary of field_name: translated_text
        """
        translations = {}

        for field_name, hebrew_text in fields.items():
            if not hebrew_text or not hebrew_text.strip():
                translations[field_name] = ""
                continue

            max_tokens = (
                self.max_tokens_long
                if "description" in field_name.lower()
                else self.max_tokens_short
            )

            translation = await self.translate_field(
                hebrew_text,
                target_language_code,
                max_tokens
            )
            translations[field_name] = translation or ""

        return translations

    def get_translation_stats(
        self,
        original_count: int,
        translated_count: int,
        field_count: int
    ) -> Dict[str, Any]:
        """
        Calculate translation statistics.

        Args:
            original_count: Total items processed
            translated_count: Items that received translations
            field_count: Total fields translated

        Returns:
            Dictionary with statistics
        """
        return {
            "total_items": original_count,
            "translated_items": translated_count,
            "skipped_items": original_count - translated_count,
            "total_fields_translated": field_count,
            "success_rate": (translated_count / original_count * 100) if original_count > 0 else 0
        }

    def validate_translation(
        self,
        original_text: str,
        translated_text: str,
        min_length_ratio: float = 0.3,
        max_length_ratio: float = 3.0
    ) -> bool:
        """
        Validate translation quality by checking length ratios.

        Args:
            original_text: Original Hebrew text
            translated_text: Translated text
            min_length_ratio: Minimum acceptable length ratio
            max_length_ratio: Maximum acceptable length ratio

        Returns:
            True if translation appears valid, False otherwise
        """
        if not translated_text or not original_text:
            return False

        length_ratio = len(translated_text) / len(original_text)

        if length_ratio < min_length_ratio or length_ratio > max_length_ratio:
            return False

        if translated_text == original_text:
            return True

        return True


translation_service = TranslationService()
