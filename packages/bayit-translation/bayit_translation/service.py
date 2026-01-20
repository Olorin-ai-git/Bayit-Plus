"""
Universal Translation Service for content localization.
Supports translating Hebrew content to English and Spanish using Claude API.
"""

import asyncio
import logging
from typing import Optional, Dict, Any

from anthropic import Anthropic
from anthropic.types import TextBlock

from bayit_translation.config import TranslationConfig

logger = logging.getLogger(__name__)


class TranslationService:
    """Service for translating content using Claude API with configurable settings."""

    def __init__(self, config: TranslationConfig):
        """Initialize with translation configuration via dependency injection."""
        if not config.anthropic_api_key:
            raise ValueError("Anthropic API key not configured")

        self.config = config
        self.client = Anthropic(api_key=config.anthropic_api_key)
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
        """Translate text from Hebrew to target language using Claude."""
        if not text or text.strip() == "":
            return ""

        if max_tokens is None:
            max_tokens = self.config.claude_max_tokens_short

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
                model=self.config.claude_model,
                max_tokens=max_tokens,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )

            content_block = message.content[0]
            if not isinstance(content_block, TextBlock):
                logger.error(f"Unexpected response type: {type(content_block)}")
                return ""

            response_text = content_block.text.strip()
            response_text = response_text.replace("Translation:", "").replace("translation:", "")
            response_text = response_text.strip().strip('"').strip("'")

            return response_text
        except Exception as e:
            logger.error(f"Error translating '{text[:50]}...' to {target_language}: {e}")
            return ""

    async def translate_field(
        self,
        source_text: Optional[str],
        target_language_code: str,
        max_tokens: Optional[int] = None
    ) -> Optional[str]:
        """Async wrapper for translating a single field."""
        if not source_text or not source_text.strip():
            return None

        await asyncio.sleep(0.5)
        return self.translate_text(source_text, target_language_code, max_tokens)

    async def translate_fields(
        self,
        fields: Dict[str, str],
        target_language_code: str
    ) -> Dict[str, str]:
        """Translate multiple fields at once."""
        translations = {}

        for field_name, hebrew_text in fields.items():
            if not hebrew_text or not hebrew_text.strip():
                translations[field_name] = ""
                continue

            max_tokens = (
                self.config.claude_max_tokens_long
                if "description" in field_name.lower()
                else self.config.claude_max_tokens_short
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
        """Calculate translation statistics."""
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
        """Validate translation quality by checking length ratios."""
        if not translated_text or not original_text:
            return False

        length_ratio = len(translated_text) / len(original_text)

        if length_ratio < min_length_ratio or length_ratio > max_length_ratio:
            return False

        if translated_text == original_text:
            return True

        return True
