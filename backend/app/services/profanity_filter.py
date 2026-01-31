"""
Multi-language profanity filter for channel chat.

Uses better-profanity for English and extends with custom word lists
for Hebrew, Arabic, and Russian romanized terms.

Configuration-driven: respects settings.olorin.channel_chat.profanity_filter_enabled.
"""

import re
from typing import List

from better_profanity import profanity

from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

# Custom word lists for non-English languages (romanized common slurs)
# These are minimal lists of the most common offensive terms.
_HEBREW_WORDS: List[str] = [
    "ben zona", "benzona", "kus", "kusemek", "zayin", "manyak",
    "ben kelev", "sharmouta", "sharmuta",
]

_ARABIC_WORDS: List[str] = [
    "kuss", "sharmouta", "sharmuta", "ibn sharmouta",
    "kos omak", "ya kalb", "ya hmar",
]

_RUSSIAN_ROMANIZED_WORDS: List[str] = [
    "blyad", "suka", "pizda", "nahui", "ebal",
    "pizdec", "mudak", "debil",
]

_ALL_CUSTOM_WORDS = _HEBREW_WORDS + _ARABIC_WORDS + _RUSSIAN_ROMANIZED_WORDS

# Compile a case-insensitive pattern for multi-word custom terms
_CUSTOM_PATTERN = re.compile(
    "|".join(re.escape(w) for w in _ALL_CUSTOM_WORDS),
    re.IGNORECASE,
)

_initialized = False


def _ensure_initialized() -> None:
    """Load profanity word lists on first use."""
    global _initialized
    if _initialized:
        return

    profanity.load_censor_words()
    profanity.add_censor_words(_ALL_CUSTOM_WORDS)
    _initialized = True
    logger.info(
        "Profanity filter initialized",
        extra={"custom_words_count": len(_ALL_CUSTOM_WORDS)},
    )


def contains_profanity(text: str) -> bool:
    """
    Check if text contains profanity in any supported language.

    Args:
        text: Text to check

    Returns:
        True if profanity detected, False otherwise
    """
    if not settings.olorin.channel_chat.profanity_filter_enabled:
        return False

    _ensure_initialized()

    # Check via better-profanity (English + custom words added)
    if profanity.contains_profanity(text):
        return True

    # Additional check for multi-word custom terms the library may miss
    if _CUSTOM_PATTERN.search(text):
        return True

    return False


def censor_profanity(text: str) -> str:
    """
    Replace profane words with asterisks.

    Args:
        text: Text to censor

    Returns:
        Censored text with profane words replaced by asterisks
    """
    if not settings.olorin.channel_chat.profanity_filter_enabled:
        return text

    _ensure_initialized()

    # First pass: better-profanity handles English + single custom words
    result = profanity.censor(text)

    # Second pass: censor multi-word custom terms the library may miss
    def _replace_with_stars(match: re.Match) -> str:
        return "*" * len(match.group(0))

    result = _CUSTOM_PATTERN.sub(_replace_with_stars, result)

    return result
