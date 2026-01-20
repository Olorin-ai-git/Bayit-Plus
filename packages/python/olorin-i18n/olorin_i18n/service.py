"""Main internationalization service for Olorin ecosystem."""

from typing import Any, Optional

from .config import I18nConfig
from .loader import TranslationFileLoader
from .types import (
    LanguageCode,
    LanguageMetadata,
    LanguageNotFoundError,
    MultilingualDict,
    TranslationDict,
    TranslationKeyError,
)


class I18nService:
    """Main internationalization service providing translation and language support.

    This service implements the TranslationProvider and LanguageProvider protocols
    for use throughout the Olorin ecosystem.
    """

    # Language metadata following shared/i18n/index.ts structure
    _LANGUAGE_METADATA = {
        "he": {
            "code": "he",
            "name": "עברית",
            "nativeName": "עברית",
            "flag": "🇮🇱",
            "rtl": True,
            "coverage": 100,
        },
        "en": {
            "code": "en",
            "name": "English",
            "nativeName": "English",
            "flag": "🇺🇸",
            "rtl": False,
            "coverage": 100,
        },
        "es": {
            "code": "es",
            "name": "Español",
            "nativeName": "Español",
            "flag": "🇪🇸",
            "rtl": False,
            "coverage": 97,
        },
        "zh": {
            "code": "zh",
            "name": "中文",
            "nativeName": "中文",
            "flag": "🇨🇳",
            "rtl": False,
            "coverage": 55,
        },
        "fr": {
            "code": "fr",
            "name": "Français",
            "nativeName": "Français",
            "flag": "🇫🇷",
            "rtl": False,
            "coverage": 27,
        },
        "it": {
            "code": "it",
            "name": "Italiano",
            "nativeName": "Italiano",
            "flag": "🇮🇹",
            "rtl": False,
            "coverage": 23,
        },
        "hi": {
            "code": "hi",
            "name": "हिन्दी",
            "nativeName": "हिन्दी",
            "flag": "🇮🇳",
            "rtl": False,
            "coverage": 19,
        },
        "ta": {
            "code": "ta",
            "name": "தமிழ்",
            "nativeName": "தமிழ்",
            "flag": "🇮🇳",
            "rtl": False,
            "coverage": 15,
        },
        "bn": {
            "code": "bn",
            "name": "বাংলা",
            "nativeName": "বাংলা",
            "flag": "🇧🇩",
            "rtl": False,
            "coverage": 15,
        },
        "ja": {
            "code": "ja",
            "name": "日本語",
            "nativeName": "日本語",
            "flag": "🇯🇵",
            "rtl": False,
            "coverage": 47,
        },
    }

    def __init__(self, config: I18nConfig):
        """Initialize i18n service.

        Args:
            config: I18n configuration

        Raises:
            ConfigurationError: If configuration is invalid
        """
        config.validate_config()
        self.config = config
        self.loader = TranslationFileLoader(config)
        self._missing_keys_log: list[tuple[str, LanguageCode]] = []

    def get_translation(
        self, key: str, language_code: LanguageCode, default: Optional[str] = None
    ) -> str:
        """Get a translation for a specific key and language.

        Args:
            key: Translation key using dot notation (e.g., 'common.loading')
            language_code: Language code (e.g., 'he', 'en')
            default: Default value if key not found

        Returns:
            Translated string

        Raises:
            LanguageNotFoundError: If language not supported
            TranslationKeyError: If key not found and no default provided
        """
        if language_code not in self.config.supported_languages:
            raise LanguageNotFoundError(f"Unsupported language: {language_code}")

        try:
            translations = self.loader.load_language(language_code)
        except LanguageNotFoundError:
            # If requested language fails, try fallback
            if language_code != self.config.fallback_language:
                translations = self.loader.load_language(self.config.fallback_language)
            else:
                raise

        # Navigate through nested dictionary using dot notation
        value = translations
        for part in key.split("."):
            if isinstance(value, dict):
                value = value.get(part)
            else:
                value = None
                break

        if value is None or not isinstance(value, str):
            if self.config.track_missing_keys:
                self._missing_keys_log.append((key, language_code))

            if default is not None:
                return default

            raise TranslationKeyError(
                f"Translation key not found: '{key}' for language '{language_code}'"
            )

        return value

    def get_multilingual(self, key: str, default: Optional[str] = None) -> MultilingualDict:
        """Get translations for a key in all supported languages.

        Args:
            key: Translation key
            default: Default value if key not found in any language

        Returns:
            Dictionary mapping language codes to translations
        """
        result: MultilingualDict = {}

        for language_code in self.config.supported_languages:
            try:
                result[language_code] = self.get_translation(key, language_code)
            except TranslationKeyError:
                if default is not None:
                    result[language_code] = default
                # Skip if no default provided

        return result

    def get_language_info(self, language_code: LanguageCode) -> LanguageMetadata:
        """Get metadata for a language.

        Args:
            language_code: Language code

        Returns:
            Language metadata

        Raises:
            LanguageNotFoundError: If language not supported
        """
        if language_code not in self._LANGUAGE_METADATA:
            raise LanguageNotFoundError(f"Unsupported language: {language_code}")

        metadata = self._LANGUAGE_METADATA[language_code]
        return LanguageMetadata(**metadata)  # type: ignore

    def is_rtl(self, language_code: LanguageCode) -> bool:
        """Check if a language is right-to-left.

        Args:
            language_code: Language code

        Returns:
            True if language is RTL

        Raises:
            LanguageNotFoundError: If language not supported
        """
        return self.get_language_info(language_code)["rtl"]

    def get_all_languages(self) -> list[LanguageMetadata]:
        """Get metadata for all supported languages.

        Returns:
            List of language metadata
        """
        return [
            self.get_language_info(lang_code)
            for lang_code in self.config.supported_languages
        ]

    def get_missing_keys(self) -> list[tuple[str, LanguageCode]]:
        """Get log of missing translation keys (if tracking enabled).

        Returns:
            List of (key, language_code) tuples
        """
        return self._missing_keys_log.copy()

    def clear_missing_keys_log(self) -> None:
        """Clear missing keys log."""
        self._missing_keys_log.clear()

    def get_coverage(self, language_code: LanguageCode) -> int:
        """Get translation coverage percentage for a language.

        Args:
            language_code: Language code

        Returns:
            Coverage percentage (0-100)
        """
        return self.get_language_info(language_code)["coverage"]
