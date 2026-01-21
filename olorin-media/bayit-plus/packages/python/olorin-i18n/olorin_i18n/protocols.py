"""Protocol definitions for i18n services following Olorin design patterns."""

from typing import Any, Protocol

from .types import LanguageCode, LanguageMetadata, MultilingualDict, TranslationDict


class TranslationLoader(Protocol):
    """Protocol for loading translations from various sources."""

    def load_language(self, language_code: LanguageCode) -> TranslationDict:
        """
        Load translation dictionary for a specific language.

        Args:
            language_code: Language code (e.g., 'he', 'en', 'es')

        Returns:
            Dictionary of translations for the language

        Raises:
            LanguageNotFoundError: If language is not supported
        """
        ...

    def load_all_languages(self) -> MultilingualDict:
        """
        Load translations for all supported languages.

        Returns:
            Dictionary mapping language codes to translation dictionaries
        """
        ...


class TranslationProvider(Protocol):
    """Protocol for providing translations."""

    def get_translation(
        self, key: str, language_code: LanguageCode, default: str | None = None
    ) -> str:
        """
        Get a translation for a specific key and language.

        Args:
            key: Translation key (e.g., 'common.loading')
            language_code: Language code (e.g., 'he', 'en')
            default: Default value if key not found

        Returns:
            Translated string or default value

        Raises:
            TranslationKeyError: If key not found and no default provided
        """
        ...

    def get_multilingual(self, key: str, default: str | None = None) -> MultilingualDict:
        """
        Get translations for a key in all supported languages.

        Args:
            key: Translation key
            default: Default value if key not found

        Returns:
            Dictionary mapping language codes to translations
        """
        ...


class LanguageProvider(Protocol):
    """Protocol for providing language metadata."""

    def get_language_info(self, language_code: LanguageCode) -> LanguageMetadata:
        """
        Get metadata for a language.

        Args:
            language_code: Language code (e.g., 'he', 'en')

        Returns:
            Language metadata including name, native name, flag, RTL info, coverage

        Raises:
            LanguageNotFoundError: If language not supported
        """
        ...

    def is_rtl(self, language_code: LanguageCode) -> bool:
        """
        Check if a language is right-to-left.

        Args:
            language_code: Language code

        Returns:
            True if language is RTL, False otherwise
        """
        ...

    def get_all_languages(self) -> list[LanguageMetadata]:
        """
        Get metadata for all supported languages.

        Returns:
            List of language metadata objects
        """
        ...
