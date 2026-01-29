"""
Transcript Compression Utilities (P2-5)

Language-aware filler word removal and normalization.
Applied between STT output and translation input.
"""

import logging
import re
from dataclasses import dataclass
from typing import Dict, Set

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class CompressionResult:
    """Result of transcript compression."""

    compressed_text: str
    original_length: int
    compressed_length: int
    fillers_removed: int
    compression_ratio: float


# Filler word sets per language (common speech disfluencies)
FILLER_WORDS: Dict[str, Set[str]] = {
    "en": {
        "um", "uh", "uhh", "umm", "hmm", "hm",
        "like", "you know", "i mean", "sort of",
        "kind of", "basically", "actually", "literally",
        "right", "okay so", "well",
    },
    "he": {
        "אממ", "אמ", "אהה", "אה",
        "כאילו", "יעני", "בעצם", "נו",
        "אוקיי", "טוב", "נכון",
    },
    "es": {
        "eh", "este", "mm", "pues",
        "bueno", "o sea", "digamos",
        "tipo", "como que", "verdad",
    },
    "ar": {
        "يعني", "هم", "آه", "إيه",
        "طيب", "بس", "يلا",
    },
}


def compress_transcript(
    text: str, language: str
) -> CompressionResult:
    """
    Remove filler words and normalize whitespace.

    Args:
        text: Raw transcript text from STT
        language: Language code (en, he, es, ar)

    Returns:
        CompressionResult with cleaned text and stats
    """
    if not settings.olorin.dubbing.transcript_compression_enabled:
        return CompressionResult(
            compressed_text=text,
            original_length=len(text),
            compressed_length=len(text),
            fillers_removed=0,
            compression_ratio=1.0,
        )

    if not text or not text.strip():
        return CompressionResult(
            compressed_text=text,
            original_length=0,
            compressed_length=0,
            fillers_removed=0,
            compression_ratio=1.0,
        )

    original_length = len(text)
    fillers = FILLER_WORDS.get(language, set())
    fillers_removed = 0
    compressed = text

    # Remove multi-word fillers first (longer patterns first)
    sorted_fillers = sorted(fillers, key=len, reverse=True)
    for filler in sorted_fillers:
        if " " in filler:
            # Multi-word filler: match as phrase with word boundaries
            pattern = re.compile(
                r"\b" + re.escape(filler) + r"\b",
                re.IGNORECASE,
            )
            matches = pattern.findall(compressed)
            if matches:
                fillers_removed += len(matches)
                compressed = pattern.sub("", compressed)
        else:
            # Single-word filler: match as standalone word
            pattern = re.compile(
                r"\b" + re.escape(filler) + r"\b",
                re.IGNORECASE,
            )
            matches = pattern.findall(compressed)
            if matches:
                fillers_removed += len(matches)
                compressed = pattern.sub("", compressed)

    # Normalize whitespace (collapse multiple spaces, strip)
    compressed = re.sub(r"\s+", " ", compressed).strip()

    # Remove leading/trailing punctuation artifacts
    compressed = re.sub(r"^[,.\s]+", "", compressed)
    compressed = re.sub(r"[,.\s]+$", "", compressed).strip()

    compressed_length = len(compressed)
    ratio = compressed_length / original_length if original_length > 0 else 1.0

    if fillers_removed > 0:
        logger.debug(
            f"Transcript compressed: {original_length} -> {compressed_length} "
            f"chars, {fillers_removed} fillers removed ({language})"
        )

    return CompressionResult(
        compressed_text=compressed,
        original_length=original_length,
        compressed_length=compressed_length,
        fillers_removed=fillers_removed,
        compression_ratio=ratio,
    )
