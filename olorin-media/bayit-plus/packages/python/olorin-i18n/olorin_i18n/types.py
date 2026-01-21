"""Type definitions for olorin-i18n package."""

from typing import Any, Dict, Literal, TypedDict

# Language codes supported by Olorin ecosystem
LanguageCode = Literal[
    "he",  # Hebrew
    "en",  # English
    "es",  # Spanish
    "zh",  # Chinese
    "fr",  # French
    "it",  # Italian
    "hi",  # Hindi
    "ta",  # Tamil
    "bn",  # Bengali
    "ja",  # Japanese
]

# All supported language codes as tuple for runtime validation
SUPPORTED_LANGUAGES: tuple[LanguageCode, ...] = (
    "he",
    "en",
    "es",
    "zh",
    "fr",
    "it",
    "hi",
    "ta",
    "bn",
    "ja",
)

# Translation dictionary type
TranslationDict = Dict[str, Any]

# Multilingual translations type (language code -> translation dict)
MultilingualDict = Dict[LanguageCode, TranslationDict]


class LanguageMetadata(TypedDict):
    """Metadata for a supported language."""

    code: LanguageCode
    name: str
    nativeName: str
    flag: str
    rtl: bool
    coverage: int


class I18nException(Exception):
    """Base exception for i18n operations."""

    pass


class LanguageNotFoundError(I18nException):
    """Raised when a requested language is not supported."""

    pass


class TranslationKeyError(I18nException):
    """Raised when a translation key is not found."""

    pass


class ConfigurationError(I18nException):
    """Raised when i18n configuration is invalid."""

    pass
