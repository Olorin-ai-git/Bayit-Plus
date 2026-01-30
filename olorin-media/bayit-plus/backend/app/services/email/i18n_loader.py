"""
Email i18n Loader

Loads email-specific translations from shared-i18n locale files.
Falls back to default text if key not found.
"""

import json
from pathlib import Path
from typing import Optional

from app.core.logging_config import get_logger

logger = get_logger(__name__)

# Path to shared-i18n locales (relative from bayit-plus/backend/)
_LOCALES_DIR = (
    Path(__file__).resolve().parents[5]
    / "olorin-core"
    / "packages"
    / "shared-i18n"
    / "locales"
)

# Cached translations: {lang: {key: value}}
_translations: dict[str, dict] = {}

# RTL languages
_RTL_LANGUAGES = frozenset({"he", "ar", "fa", "ur"})


def _load_locale(lang: str) -> dict:
    """Load locale file and extract email namespace."""
    if lang in _translations:
        return _translations[lang]

    locale_file = _LOCALES_DIR / f"{lang}.json"
    if not locale_file.exists():
        logger.warning(
            "Locale file not found, falling back to empty",
            extra={"lang": lang, "path": str(locale_file)},
        )
        _translations[lang] = {}
        return _translations[lang]

    try:
        with open(locale_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        # Extract the 'email' namespace
        email_data = data.get("email", {})
        _translations[lang] = _flatten_dict(email_data, prefix="email")
        logger.info(
            "Loaded email translations",
            extra={"lang": lang, "keys": len(_translations[lang])},
        )
    except (json.JSONDecodeError, OSError) as exc:
        logger.error(
            "Failed to load locale file",
            extra={"lang": lang, "error": str(exc)},
        )
        _translations[lang] = {}

    return _translations[lang]


def _flatten_dict(d: dict, prefix: str = "") -> dict:
    """Flatten nested dict with dot-separated keys."""
    items: dict[str, str] = {}
    for key, value in d.items():
        full_key = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            items.update(_flatten_dict(value, full_key))
        else:
            items[full_key] = str(value)
    return items


def translate(key: str, lang: str = "en", default: str = "", **kwargs) -> str:
    """
    Get translated email string.

    Args:
        key: Dot-separated translation key (e.g. "email.welcome.subject")
        lang: Language code
        default: Fallback text if key not found
        **kwargs: Interpolation variables

    Returns:
        Translated string with interpolated variables
    """
    translations = _load_locale(lang)
    text = translations.get(key, default or key)

    # Simple interpolation: replace {var_name} with kwargs
    for var_key, var_value in kwargs.items():
        text = text.replace(f"{{{var_key}}}", str(var_value))

    return text


def is_rtl(lang: str) -> bool:
    """Check if language is right-to-left."""
    return lang in _RTL_LANGUAGES


def get_direction(lang: str) -> str:
    """Get text direction for language."""
    return "rtl" if is_rtl(lang) else "ltr"


def clear_cache() -> None:
    """Clear translation cache (for testing)."""
    _translations.clear()
