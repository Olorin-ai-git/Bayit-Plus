"""
Batch headline translation for culture/city content shelves.

Translates Hebrew headlines to the requested language using a single
Claude API call per batch. Results are cached in-memory with TTL to
avoid repeated translation of the same headlines.
"""

import hashlib
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

from app.core.config import settings

logger = logging.getLogger(__name__)

_translation_cache: Dict[str, Tuple[Dict[str, str], datetime]] = {}
_CACHE_TTL = timedelta(hours=6)


def _cache_key(titles: List[str], lang: str) -> str:
    """Generate a stable cache key from a list of titles and target language."""
    combined = "|".join(titles) + f"||{lang}"
    return hashlib.sha256(combined.encode()).hexdigest()


def _get_cached(key: str) -> Optional[Dict[str, str]]:
    """Return cached translations if still valid, else None."""
    entry = _translation_cache.get(key)
    if entry is None:
        return None
    translations, ts = entry
    if datetime.utcnow() - ts > _CACHE_TTL:
        del _translation_cache[key]
        return None
    return translations


async def translate_headlines(
    titles: List[str],
    target_lang: str,
) -> Dict[str, str]:
    """
    Translate a batch of Hebrew headlines to the target language.

    Uses a single Claude API call for the entire batch.
    Returns a dict mapping original Hebrew title -> translated title.
    Titles that fail translation are mapped to their original text.

    Args:
        titles: List of Hebrew headline strings
        target_lang: ISO 639-1 language code (e.g. "en", "es")

    Returns:
        Dict mapping original title to translated title
    """
    if not titles or target_lang == "he":
        return {t: t for t in titles}

    # Check cache
    key = _cache_key(titles, target_lang)
    cached = _get_cached(key)
    if cached is not None:
        return cached

    lang_names = {
        "en": "English",
        "es": "Spanish",
        "fr": "French",
        "zh": "Chinese",
        "it": "Italian",
        "hi": "Hindi",
        "ta": "Tamil",
        "bn": "Bengali",
        "ja": "Japanese",
    }
    target_name = lang_names.get(target_lang, "English")

    # Build batch prompt
    numbered = "\n".join(f"{i + 1}. {t}" for i, t in enumerate(titles))
    prompt = (
        f"Translate these Hebrew news headlines to {target_name}. "
        f"Return ONLY the translations, one per line, numbered to match. "
        f"Keep it concise and journalistic. "
        f"Transliterate proper nouns appropriately.\n\n{numbered}"
    )

    try:
        from anthropic import Anthropic
        from anthropic.types import TextBlock

        client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        message = client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=settings.CLAUDE_MAX_TOKENS_LONG,
            messages=[{"role": "user", "content": prompt}],
        )

        content_block = message.content[0]
        if not isinstance(content_block, TextBlock):
            logger.error("Unexpected response type from Claude for headline translation")
            return {t: t for t in titles}

        lines = content_block.text.strip().split("\n")
        translations: Dict[str, str] = {}

        for line in lines:
            line = line.strip()
            if not line:
                continue
            # Parse "1. translated text" format
            parts = line.split(".", 1)
            if len(parts) == 2 and parts[0].strip().isdigit():
                idx = int(parts[0].strip()) - 1
                if 0 <= idx < len(titles):
                    translations[titles[idx]] = parts[1].strip()

        # Fill missing translations with originals
        for t in titles:
            if t not in translations:
                translations[t] = t

        _translation_cache[key] = (translations, datetime.utcnow())
        logger.info(
            "Translated %d/%d headlines to %s", len(translations), len(titles), target_lang
        )
        return translations

    except Exception as e:
        logger.error("Headline batch translation failed: %s", e)
        return {t: t for t in titles}
