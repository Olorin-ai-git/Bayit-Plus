"""
i18n Translation Resolution Utility

Resolves translation keys from shared/i18n locale files.
Supports Hebrew (he), English (en), and Spanish (es).
"""

import json
import logging
from functools import lru_cache
from pathlib import Path
from typing import Dict, Optional

logger = logging.getLogger(__name__)

# Path to shared i18n locale files
I18N_DIR = Path(__file__).parent.parent.parent.parent / "shared" / "i18n" / "locales"

# Supported languages
SUPPORTED_LANGUAGES = ["he", "en", "es"]
DEFAULT_LANGUAGE = "en"


@lru_cache(maxsize=10)
def load_locale(language: str) -> Dict:
    """
    Load and cache a locale file.

    Args:
        language: Language code (he, en, es)

    Returns:
        Dictionary containing all translations for the language
    """
    if language not in SUPPORTED_LANGUAGES:
        logger.warning(f"Unsupported language '{language}', falling back to {DEFAULT_LANGUAGE}")
        language = DEFAULT_LANGUAGE

    locale_file = I18N_DIR / f"{language}.json"

    if not locale_file.exists():
        logger.error(f"Locale file not found: {locale_file}")
        return {}

    try:
        with open(locale_file, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading locale file {locale_file}: {e}")
        return {}


def get_translation(key: str, language: str = DEFAULT_LANGUAGE, fallback: Optional[str] = None) -> str:
    """
    Get a translation for a specific key and language.

    Args:
        key: Translation key (e.g., "taxonomy.sections.movies")
        language: Language code (he, en, es)
        fallback: Optional fallback value if translation not found

    Returns:
        Translated string or fallback/key if not found
    """
    locale = load_locale(language)

    # Navigate nested dictionary using dot notation
    keys = key.split(".")
    value = locale

    for k in keys:
        if isinstance(value, dict) and k in value:
            value = value[k]
        else:
            # Translation not found
            if fallback:
                return fallback
            logger.warning(f"Translation not found for key '{key}' in language '{language}'")
            return key  # Return key itself as fallback

    return str(value)


def resolve_name_key(name_key: str, language: str = DEFAULT_LANGUAGE) -> str:
    """
    Resolve a name_key to its translated value.

    Convenience wrapper around get_translation for taxonomy names.

    Args:
        name_key: Translation key (e.g., "taxonomy.sections.movies")
        language: Language code (he, en, es)

    Returns:
        Translated name
    """
    return get_translation(name_key, language)


def get_multilingual_names(name_key: str) -> Dict[str, str]:
    """
    Get translations for all supported languages.

    Args:
        name_key: Translation key

    Returns:
        Dictionary with language codes as keys and translations as values
        Example: {"he": "סרטים", "en": "Movies", "es": "Películas"}
    """
    return {
        "he": get_translation(name_key, "he"),
        "en": get_translation(name_key, "en"),
        "es": get_translation(name_key, "es"),
    }


def clear_cache():
    """Clear the locale cache. Useful for testing or hot-reloading."""
    load_locale.cache_clear()
    logger.info("i18n locale cache cleared")
