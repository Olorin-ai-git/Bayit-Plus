"""Olorin.ai Platform Internationalization Package.

Unified i18n library for multilingual support across all Olorin ecosystem platforms.

Example usage:

    from olorin_i18n import I18nService, I18nConfig

    # Initialize service
    config = I18nConfig(default_language="he")
    i18n = I18nService(config=config)

    # Get single translation
    text = i18n.get_translation("common.loading", "he")  # "טוען..."

    # Get multilingual translations
    multilingual = i18n.get_multilingual("common.loading")
    # {"he": "טוען...", "en": "Loading...", "es": "Cargando..."}

    # Get language info
    lang_info = i18n.get_language_info("he")
    is_rtl = i18n.is_rtl("he")  # True
"""

from .config import I18nConfig
from .loader import TranslationFileLoader
from .protocols import LanguageProvider, TranslationLoader, TranslationProvider
from .service import I18nService
from .types import (
    ConfigurationError,
    I18nException,
    LanguageCode,
    LanguageMetadata,
    LanguageNotFoundError,
    MultilingualDict,
    SUPPORTED_LANGUAGES,
    TranslationDict,
    TranslationKeyError,
)

__version__ = "1.0.0"
__author__ = "Olorin.ai"

__all__ = [
    # Configuration
    "I18nConfig",
    # Service
    "I18nService",
    "TranslationFileLoader",
    # Types
    "LanguageCode",
    "LanguageMetadata",
    "TranslationDict",
    "MultilingualDict",
    "SUPPORTED_LANGUAGES",
    # Protocols
    "TranslationLoader",
    "TranslationProvider",
    "LanguageProvider",
    # Exceptions
    "I18nException",
    "LanguageNotFoundError",
    "TranslationKeyError",
    "ConfigurationError",
]
