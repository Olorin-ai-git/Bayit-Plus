"""
FFmpeg Constants, Codecs, and Presets

This module provides centralized configuration constants for FFmpeg operations.
All values that could be considered configuration are sourced from environment
variables via the settings module.
"""

import logging
from typing import Set

from app.core.config import settings

logger = logging.getLogger(__name__)


# Language code mapping (ISO 639-2 to ISO 639-1)
# These are standard ISO mappings and are not environment-dependent
LANGUAGE_CODE_MAP: dict[str, str] = {
    # Common 3-letter codes to 2-letter codes
    "eng": "en",
    "spa": "es",
    "heb": "he",
    "fra": "fr",
    "fre": "fr",
    "ger": "de",
    "deu": "de",
    "ita": "it",
    "por": "pt",
    "rus": "ru",
    "ara": "ar",
    "chi": "zh",
    "zho": "zh",
    "jpn": "ja",
    "kor": "ko",
    "dut": "nl",
    "nld": "nl",
    "pol": "pl",
    "swe": "sv",
    "dan": "da",
    "fin": "fi",
    "nor": "no",
    "nno": "no",
    "cze": "cs",
    "ces": "cs",
    "tur": "tr",
    "gre": "el",
    "ell": "el",
    "hun": "hu",
    "rum": "ro",
    "ron": "ro",
    "tha": "th",
    "vie": "vi",
    "ind": "id",
    "may": "ms",
    "msa": "ms",
    "ukr": "uk",
    "bul": "bg",
    "hrv": "hr",
    "slv": "sl",
    "lit": "lt",
    "lav": "lv",
    "est": "et",
    "slk": "sk",
}

# Text-based subtitle codecs that can be converted to SRT
# These are FFmpeg codec identifiers, not configuration
TEXT_BASED_SUBTITLE_CODECS: Set[str] = {
    "subrip",
    "srt",
    "ass",
    "ssa",
    "webvtt",
    "vtt",
    "mov_text",
    "text",
    "sami",
    "microdvd",
    "subviewer",
}

# Bitmap-based subtitle codecs that CANNOT be converted to text
# These are FFmpeg codec identifiers, not configuration
BITMAP_SUBTITLE_CODECS: Set[str] = {
    "dvd_subtitle",
    "dvdsub",
    "hdmv_pgs_subtitle",
    "pgs",
    "xsub",
    "dvb_subtitle",
}

# Priority languages for subtitle extraction (ordered by priority)
# Hebrew, English, Spanish - core supported languages for the platform
PRIORITY_LANGUAGES: list[str] = ["he", "en", "es"]


def normalize_language_code(code: str) -> str:
    """
    Normalize language code to 2-letter ISO 639-1 format.

    Accepts both 2-letter (ISO 639-1) and 3-letter (ISO 639-2) codes.

    Args:
        code: Language code to normalize (e.g., 'eng', 'en', 'heb')

    Returns:
        Normalized 2-letter ISO 639-1 code (e.g., 'en', 'he')
    """
    code_lower = code.lower().strip()

    # If it's already 2 letters, return as-is
    if len(code_lower) == 2:
        return code_lower

    # If it's 3 letters, try to map it
    if len(code_lower) == 3:
        return LANGUAGE_CODE_MAP.get(code_lower, code_lower)

    # Otherwise return as-is
    return code_lower


def is_text_based_subtitle(codec: str) -> bool:
    """
    Check if subtitle codec is text-based (can be converted to SRT).

    Bitmap-based subtitles (dvd_subtitle, hdmv_pgs_subtitle) cannot be
    converted to text formats like SRT.

    Args:
        codec: Subtitle codec name from ffprobe

    Returns:
        True if codec is text-based, False if bitmap-based
    """
    codec_lower = codec.lower()

    if codec_lower in BITMAP_SUBTITLE_CODECS:
        return False
    if codec_lower in TEXT_BASED_SUBTITLE_CODECS:
        return True

    # Unknown codec - assume text-based (will fail gracefully if wrong)
    logger.warning(f"Unknown subtitle codec '{codec}', assuming text-based")
    return True
