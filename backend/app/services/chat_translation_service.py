"""Chat translation service using Claude API for language detection and translation."""

import asyncio
import logging
from typing import Dict, List, Optional, Tuple

import anthropic

from app.core.config import settings
from app.models.chat_translation import (LanguageDetectionResult,
                                         TranslationResult)
from app.models.user import User
from app.services.translation_cache_service import translation_cache_service

logger = logging.getLogger(__name__)


class ChatTranslationService:
    """
    Translation service for chat messages using Claude API.

    Features:
    - Language detection with caching
    - Translation with two-tier caching
    - User preference awareness
    - Graceful degradation on failure
    """

    SUPPORTED_LANGUAGES = {
        "he": "Hebrew",
        "en": "English",
        "es": "Spanish",
        "ru": "Russian",
        "fr": "French",
        "ar": "Arabic",
    }

    DEFAULT_SOURCE_LANGUAGE = "he"

    @staticmethod
    def _get_client() -> anthropic.Anthropic:
        """Get Anthropic client instance."""
        return anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    @classmethod
    async def detect_language(cls, text: str) -> LanguageDetectionResult:
        """
        Detect the language of the given text using Claude API.

        Args:
            text: The text to detect language for

        Returns:
            LanguageDetectionResult with detected language code and confidence
        """
        if not text or not text.strip():
            return LanguageDetectionResult(
                detected_language=cls.DEFAULT_SOURCE_LANGUAGE,
                confidence=0.0,
                is_cached=False,
            )

        # Check cache first (language detection is cached with empty target)
        cached = await translation_cache_service.get_cached_translation(
            text, "detect", "lang"
        )
        if cached:
            return LanguageDetectionResult(
                detected_language=cached, confidence=1.0, is_cached=True
            )

        supported_codes = ", ".join(cls.SUPPORTED_LANGUAGES.keys())
        prompt = f"""Detect the language of this text and respond with ONLY the ISO 639-1 language code.
Supported languages: {supported_codes}
If unsure or not in the list, respond with "he" (Hebrew).

Text: {text}

Language code:"""

        try:
            client = cls._get_client()

            response = await asyncio.wait_for(
                asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: client.messages.create(
                        model=settings.CLAUDE_MODEL,
                        max_tokens=10,
                        messages=[{"role": "user", "content": prompt}],
                    ),
                ),
                timeout=settings.CHAT_TRANSLATION_TIMEOUT_SECONDS,
            )

            if response.content and len(response.content) > 0:
                detected = response.content[0].text.strip().lower()

                # Validate detected language
                if detected not in cls.SUPPORTED_LANGUAGES:
                    detected = cls.DEFAULT_SOURCE_LANGUAGE

                # Cache the detection result
                await translation_cache_service.store_translation(
                    text, "detect", "lang", detected
                )

                return LanguageDetectionResult(
                    detected_language=detected, confidence=0.9, is_cached=False
                )

        except asyncio.TimeoutError:
            logger.warning("Language detection timed out")
        except Exception as e:
            logger.error(f"Language detection error: {e}")

        return LanguageDetectionResult(
            detected_language=cls.DEFAULT_SOURCE_LANGUAGE,
            confidence=0.5,
            is_cached=False,
        )

    @classmethod
    async def _translate_with_claude(
        cls, text: str, source_lang: str, target_lang: str
    ) -> str:
        """
        Translate text using Claude API.

        Args:
            text: Text to translate
            source_lang: Source language code
            target_lang: Target language code

        Returns:
            Translated text
        """
        source_name = cls.SUPPORTED_LANGUAGES.get(source_lang, source_lang)
        target_name = cls.SUPPORTED_LANGUAGES.get(target_lang, target_lang)

        prompt = f"""Translate this chat message from {source_name} to {target_name}.
Keep the tone casual and conversational. Preserve emojis and special characters.
Respond with ONLY the translation, nothing else.

Original ({source_name}): {text}

Translation ({target_name}):"""

        client = cls._get_client()

        response = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: client.messages.create(
                model=settings.CLAUDE_MODEL,
                max_tokens=settings.CLAUDE_MAX_TOKENS_SHORT,
                messages=[{"role": "user", "content": prompt}],
            ),
        )

        if response.content and len(response.content) > 0:
            return response.content[0].text.strip()

        return text

    @classmethod
    async def translate_message(
        cls, message: str, source_lang: str, target_lang: str
    ) -> TranslationResult:
        """
        Translate a message from source to target language.

        Uses two-tier caching for performance.
        Returns original message on failure (graceful degradation).

        Args:
            message: The message to translate
            source_lang: Source language code
            target_lang: Target language code

        Returns:
            TranslationResult with original and translated text
        """
        if not settings.CHAT_TRANSLATION_ENABLED:
            return TranslationResult(
                original_text=message,
                translated_text=message,
                source_language=source_lang,
                target_language=target_lang,
                is_cached=False,
            )

        if source_lang == target_lang or not message.strip():
            return TranslationResult(
                original_text=message,
                translated_text=message,
                source_language=source_lang,
                target_language=target_lang,
                is_cached=True,
            )

        try:
            translated, is_cached = await asyncio.wait_for(
                translation_cache_service.get_or_translate(
                    message, source_lang, target_lang, cls._translate_with_claude
                ),
                timeout=settings.CHAT_TRANSLATION_TIMEOUT_SECONDS,
            )

            return TranslationResult(
                original_text=message,
                translated_text=translated,
                source_language=source_lang,
                target_language=target_lang,
                is_cached=is_cached,
            )

        except asyncio.TimeoutError:
            logger.warning(f"Translation timed out for message: {message[:50]}...")
        except Exception as e:
            logger.error(f"Translation error: {e}")

        # Graceful degradation: return original message on failure
        return TranslationResult(
            original_text=message,
            translated_text=message,
            source_language=source_lang,
            target_language=target_lang,
            is_cached=False,
        )

    @classmethod
    async def should_translate_for_user(cls, user_id: str) -> Tuple[bool, str]:
        """
        Check if auto-translation is enabled for a user.

        Args:
            user_id: The user ID to check

        Returns:
            Tuple of (should_translate, preferred_language)
        """
        try:
            user = await User.get(user_id)
            if not user:
                return False, cls.DEFAULT_SOURCE_LANGUAGE

            auto_translate = user.preferences.get("auto_translate_enabled", True)
            preferred_lang = user.preferred_language or cls.DEFAULT_SOURCE_LANGUAGE

            return auto_translate, preferred_lang

        except Exception as e:
            logger.error(f"Error checking user translation preferences: {e}")
            return False, cls.DEFAULT_SOURCE_LANGUAGE

    @classmethod
    async def translate_for_recipients(
        cls, message: str, source_lang: str, recipient_user_ids: List[str]
    ) -> Dict[str, TranslationResult]:
        """
        Translate a message for multiple recipients based on their preferences.

        Args:
            message: The message to translate
            source_lang: Source language code
            recipient_user_ids: List of recipient user IDs

        Returns:
            Dict mapping user_id to TranslationResult
        """
        results: Dict[str, TranslationResult] = {}

        if not recipient_user_ids:
            return results

        # Gather user preferences
        user_prefs: Dict[str, Tuple[bool, str]] = {}
        for user_id in recipient_user_ids:
            should_translate, target_lang = await cls.should_translate_for_user(user_id)
            user_prefs[user_id] = (should_translate, target_lang)

        # Group users by target language to minimize API calls
        lang_groups: Dict[str, List[str]] = {}
        for user_id, (should_translate, target_lang) in user_prefs.items():
            if should_translate and target_lang != source_lang:
                if target_lang not in lang_groups:
                    lang_groups[target_lang] = []
                lang_groups[target_lang].append(user_id)
            else:
                # No translation needed, use original
                results[user_id] = TranslationResult(
                    original_text=message,
                    translated_text=message,
                    source_language=source_lang,
                    target_language=source_lang,
                    is_cached=True,
                )

        # Translate for each language group
        for target_lang, user_ids in lang_groups.items():
            translation_result = await cls.translate_message(
                message, source_lang, target_lang
            )
            for user_id in user_ids:
                results[user_id] = translation_result

        return results

    @classmethod
    async def detect_and_translate(
        cls, message: str, target_lang: str
    ) -> TranslationResult:
        """
        Detect source language and translate to target.

        Args:
            message: The message to translate
            target_lang: Target language code

        Returns:
            TranslationResult with detected source and translated text
        """
        # Detect source language
        detection = await cls.detect_language(message)

        # Translate to target
        return await cls.translate_message(
            message, detection.detected_language, target_lang
        )

    @classmethod
    async def get_translation_for_display(
        cls, message: str, source_lang: str, recipient_user_id: str
    ) -> Dict:
        """
        Get translation formatted for display in chat UI.

        Args:
            message: Original message
            source_lang: Source language code
            recipient_user_id: Recipient's user ID

        Returns:
            Dict with display_message, is_translated, and translation_available
        """
        should_translate, target_lang = await cls.should_translate_for_user(
            recipient_user_id
        )

        if not should_translate or source_lang == target_lang:
            return {
                "display_message": message,
                "is_translated": False,
                "translation_available": source_lang != target_lang,
            }

        result = await cls.translate_message(message, source_lang, target_lang)

        return {
            "display_message": result.translated_text,
            "is_translated": result.translated_text != message,
            "translation_available": True,
        }


# Global instance
chat_translation_service = ChatTranslationService()
