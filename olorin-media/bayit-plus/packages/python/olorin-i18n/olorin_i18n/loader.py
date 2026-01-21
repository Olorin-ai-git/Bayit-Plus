"""Translation file loader with caching support."""

import json
from pathlib import Path
from time import time
from typing import Optional

from .config import I18nConfig
from .types import (
    LanguageCode,
    LanguageNotFoundError,
    MultilingualDict,
    TranslationDict,
)


class CacheEntry:
    """Cache entry with TTL support."""

    def __init__(self, data: TranslationDict, ttl_seconds: int):
        """Initialize cache entry.

        Args:
            data: Translation data
            ttl_seconds: Time to live in seconds (0 = no expiration)
        """
        self.data = data
        self.created_at = time()
        self.ttl_seconds = ttl_seconds

    def is_expired(self) -> bool:
        """Check if cache entry has expired."""
        if self.ttl_seconds == 0:
            return False
        return (time() - self.created_at) > self.ttl_seconds


class TranslationFileLoader:
    """Loads translation files from disk with optional caching."""

    def __init__(self, config: I18nConfig):
        """Initialize loader.

        Args:
            config: I18n configuration
        """
        self.config = config
        self.locales_path = config.default_locales_path
        self._cache: dict[LanguageCode, CacheEntry] = {}

    def load_language(self, language_code: LanguageCode) -> TranslationDict:
        """Load translation dictionary for a specific language.

        Args:
            language_code: Language code (e.g., 'he', 'en')

        Returns:
            Dictionary of translations

        Raises:
            LanguageNotFoundError: If language file not found
        """
        # Check cache first
        if self.config.cache_enabled and language_code in self._cache:
            cache_entry = self._cache[language_code]
            if not cache_entry.is_expired():
                return cache_entry.data

        # Load from file
        locale_file = self.locales_path / f"{language_code}.json"

        if not locale_file.exists():
            raise LanguageNotFoundError(
                f"Translation file not found: {locale_file} for language '{language_code}'"
            )

        try:
            with open(locale_file, "r", encoding="utf-8") as f:
                translations = json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            raise LanguageNotFoundError(
                f"Error loading translation file {locale_file}: {e}"
            ) from e

        # Cache the loaded translations
        if self.config.cache_enabled:
            self._cache[language_code] = CacheEntry(translations, self.config.cache_ttl_seconds)

        return translations

    def load_all_languages(self) -> MultilingualDict:
        """Load translations for all supported languages.

        Returns:
            Dictionary mapping language codes to translation dictionaries
        """
        result: MultilingualDict = {}

        for language_code in self.config.supported_languages:
            try:
                result[language_code] = self.load_language(language_code)
            except LanguageNotFoundError:
                # Continue loading other languages even if one is missing
                continue

        return result

    def clear_cache(self, language_code: Optional[LanguageCode] = None) -> None:
        """Clear cache entries.

        Args:
            language_code: Specific language to clear, or None to clear all
        """
        if language_code:
            self._cache.pop(language_code, None)
        else:
            self._cache.clear()

    def cache_stats(self) -> dict[str, int]:
        """Get cache statistics.

        Returns:
            Dictionary with cache stats (size, expired_entries)
        """
        expired_count = sum(
            1 for entry in self._cache.values() if entry.is_expired()
        )

        return {
            "total_entries": len(self._cache),
            "expired_entries": expired_count,
        }
