"""
i18n Translation Resolution Utility

Unified translation resolution using olorin-i18n package.
Supports 10 languages: Hebrew (he), English (en), Spanish (es), Chinese (zh),
French (fr), Italian (it), Hindi (hi), Tamil (ta), Bengali (bn), Japanese (ja).

Requires I18nService to be initialized from settings:
    from app.core.config import settings
    i18n_service = I18nService(config=settings.i18n)
"""

import logging
from typing import Dict, Optional

from olorin_i18n import (
    I18nConfig,
    I18nService,
    LanguageCode,
    TranslationKeyError,
)

logger = logging.getLogger(__name__)

# Global service instance (lazily initialized)
_i18n_service: Optional[I18nService] = None


def _get_i18n_service() -> I18nService:
    """Get or initialize the global i18n service."""
    global _i18n_service

    if _i18n_service is None:
        # Import here to avoid circular imports
        from app.core.config import settings

        _i18n_service = I18nService(config=settings.i18n)

    return _i18n_service


def get_translation(
    key: str, language: str = "he", fallback: Optional[str] = None
) -> str:
    """
    Get a translation for a specific key and language.

    Args:
        key: Translation key using dot notation (e.g., "taxonomy.sections.movies")
        language: Language code (he, en, es, zh, fr, it, hi, ta, bn, ja)
        fallback: Optional fallback value if translation not found

    Returns:
        Translated string or fallback value if provided, otherwise the key itself
    """
    try:
        service = _get_i18n_service()
        return service.get_translation(
            key, language=language as LanguageCode, default=fallback
        )
    except (TranslationKeyError, Exception) as e:
        logger.warning(f"Translation error for key '{key}' in language '{language}': {e}")
        if fallback:
            return fallback
        return key  # Return key itself as ultimate fallback


def resolve_name_key(
    name_key: Optional[str],
    language: str = "he",
    slug: Optional[str] = None,
    taxonomy_type: str = "sections",
) -> str:
    """
    Resolve a name_key to its translated value.

    Convenience wrapper around get_translation for taxonomy names.
    If name_key is None, generates a default key from slug.

    Args:
        name_key: Translation key (e.g., "taxonomy.sections.movies") or None
        language: Language code (he, en, es, zh, fr, it, hi, ta, bn, ja)
        slug: Slug to generate default key if name_key is None
        taxonomy_type: Type of taxonomy (sections, subcategories, genres, audiences)

    Returns:
        Translated name or slug if translation not found, or "Unknown" if neither available
    """
    # Generate default key from slug if name_key is None
    if name_key is None:
        if slug:
            name_key = f"taxonomy.{taxonomy_type}.{slug}"
        else:
            return "Unknown"

    return get_translation(name_key, language, fallback=slug or name_key)


def get_multilingual_names(
    name_key: Optional[str], slug: Optional[str] = None, taxonomy_type: str = "sections"
) -> Dict[str, str]:
    """
    Get translations for all supported languages.

    Args:
        name_key: Translation key or None
        slug: Slug to generate default key if name_key is None
        taxonomy_type: Type of taxonomy (sections, subcategories, genres, audiences)

    Returns:
        Dictionary with language codes as keys and translations as values
        Example: {"he": "סרטים", "en": "Movies", "es": "Películas", ...}
    """
    service = _get_i18n_service()

    # Generate default key from slug if name_key is None
    if name_key is None and slug:
        name_key = f"taxonomy.{taxonomy_type}.{slug}"

    if name_key is None:
        # Return Unknown for all languages
        return {lang.code: "Unknown" for lang in service.get_all_languages()}

    # Get translations for all supported languages
    try:
        multilingual = service.get_multilingual(name_key, default=slug or name_key)
        # Ensure all language codes are present
        result = {lang.code: multilingual.get(lang.code, slug or name_key)
                  for lang in service.get_all_languages()}
        return result
    except Exception as e:
        logger.warning(f"Error getting multilingual names for key '{name_key}': {e}")
        return {lang.code: slug or name_key for lang in service.get_all_languages()}


def get_language_info(language_code: str) -> Dict[str, bool]:
    """
    Get language metadata.

    Args:
        language_code: Language code (he, en, es, zh, fr, it, hi, ta, bn, ja)

    Returns:
        Dictionary with language metadata (code, name, rtl, coverage, etc.)
    """
    service = _get_i18n_service()
    try:
        info = service.get_language_info(language_code=language_code as LanguageCode)
        return dict(info)  # type: ignore
    except Exception as e:
        logger.warning(f"Error getting language info for '{language_code}': {e}")
        return {"code": language_code, "name": "Unknown", "rtl": False, "coverage": 0}


def is_rtl(language_code: str) -> bool:
    """
    Check if a language uses right-to-left direction.

    Args:
        language_code: Language code (he, en, es, zh, fr, it, hi, ta, bn, ja)

    Returns:
        True if language is right-to-left, False otherwise
    """
    service = _get_i18n_service()
    try:
        return service.is_rtl(language_code=language_code as LanguageCode)
    except Exception:
        # Default to LTR if error
        return False


def clear_cache() -> None:
    """Clear the i18n service cache. Useful for testing or configuration changes."""
    service = _get_i18n_service()
    service.loader.clear_cache()
    logger.info("i18n locale cache cleared")


def reset_service() -> None:
    """Reset the global i18n service instance. Useful for testing."""
    global _i18n_service
    _i18n_service = None
    logger.info("i18n service instance reset")
