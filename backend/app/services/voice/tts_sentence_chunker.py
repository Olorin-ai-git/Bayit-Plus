"""
Sentence chunking utility for streaming TTS pipeline.

Splits text into sentence-level chunks suitable for incremental
text-to-speech synthesis, preserving natural sentence boundaries
while handling abbreviations, numbers, and ellipses.
"""

import re

from app.core.logging_config import get_logger

logger = get_logger(__name__)

# Common abbreviations that use periods but are not sentence endings
_ABBREVIATIONS = frozenset({
    "mr", "mrs", "ms", "dr", "st", "vs", "etc", "inc", "ltd",
    "jr", "sr", "prof", "gen", "gov", "sgt", "cpl", "pvt",
    "dept", "est", "approx", "assn", "blvd", "avg",
    "fig", "vol", "no", "jan", "feb", "mar", "apr", "jun",
    "jul", "aug", "sep", "oct", "nov", "dec",
})

_SENTENCE_TERMINATORS = re.compile(r"([.!?])(?:\s|\n|$)")

_ABBR_MARKER = "<<ABBR>>"
_ELLIPSIS_PLACEHOLDER = "<<ELLIPSIS>>"
_NUMBER_PLACEHOLDER = "<<NUM{}>>"

_MINIMUM_WORD_COUNT = 3


def _mask_abbreviations(text: str) -> tuple[str, list[tuple[str, str]]]:
    """Replace abbreviation periods with placeholders to prevent false splits."""
    replacements: list[tuple[str, str]] = []
    masked = text

    for abbrev in _ABBREVIATIONS:
        pattern = re.compile(
            rf"\b({re.escape(abbrev)})\.",
            re.IGNORECASE,
        )
        for match in pattern.finditer(masked):
            original = match.group(0)
            placeholder = f"{match.group(1)}<<ABBR>>"
            replacements.append((placeholder, original))
        masked = pattern.sub(r"\1<<ABBR>>", masked)

    return masked, replacements


def _mask_ellipses(text: str) -> tuple[str, int]:
    """Replace ellipsis sequences with a placeholder."""
    count = text.count("...")
    masked = text.replace("...", _ELLIPSIS_PLACEHOLDER)
    return masked, count


def _mask_numbers(text: str) -> tuple[str, list[tuple[str, str]]]:
    """Replace decimal numbers with placeholders to prevent false splits."""
    replacements: list[tuple[str, str]] = []
    pattern = re.compile(r"(\d+)\.(\d+)")
    index = 0

    def replace_match(match: re.Match) -> str:
        nonlocal index
        placeholder = _NUMBER_PLACEHOLDER.format(index)
        replacements.append((placeholder, match.group(0)))
        index += 1
        return placeholder

    masked = pattern.sub(replace_match, text)
    return masked, replacements


def _restore_placeholders(
    text: str,
    abbrev_replacements: list[tuple[str, str]],
    number_replacements: list[tuple[str, str]],
) -> str:
    """Restore all placeholders back to their original text."""
    result = text
    result = result.replace(_ELLIPSIS_PLACEHOLDER, "...")
    result = result.replace("<<ABBR>>", ".")

    for placeholder, original in abbrev_replacements:
        result = result.replace(placeholder, original)

    for placeholder, original in number_replacements:
        result = result.replace(placeholder, original)

    return result


def _word_count(text: str) -> int:
    """Count words in a text fragment."""
    return len(text.split())


def _split_on_boundaries(text: str) -> list[str]:
    """Split masked text on sentence-ending punctuation."""
    chunks: list[str] = []
    current_pos = 0

    for match in _SENTENCE_TERMINATORS.finditer(text):
        end_pos = match.end()
        chunk = text[current_pos:end_pos].strip()
        if chunk:
            chunks.append(chunk)
        current_pos = end_pos

    remaining = text[current_pos:].strip()
    if remaining:
        chunks.append(remaining)

    return chunks


def _merge_short_chunks(chunks: list[str]) -> list[str]:
    """Merge chunks with fewer than the minimum word count into the previous."""
    if len(chunks) <= 1:
        return chunks

    merged: list[str] = [chunks[0]]

    for chunk in chunks[1:]:
        if _word_count(chunk) < _MINIMUM_WORD_COUNT:
            merged[-1] = f"{merged[-1]} {chunk}"
        else:
            merged.append(chunk)

    return merged


def chunk_sentences(text: str) -> list[str]:
    """Split text into sentence-level chunks for streaming TTS.

    Handles abbreviations, ellipses, and decimal numbers. Merges
    fragments shorter than the minimum word count with the preceding
    sentence.

    Args:
        text: Input text to split into sentences.

    Returns:
        List of sentence strings. Empty list for blank input.
    """
    if not text or not text.strip():
        return []

    cleaned = text.strip()
    logger.debug("chunking_text", text_length=len(cleaned))

    masked, abbrev_replacements = _mask_abbreviations(cleaned)
    masked, _ = _mask_ellipses(masked)
    masked, number_replacements = _mask_numbers(masked)

    raw_chunks = _split_on_boundaries(masked)

    restored = [
        _restore_placeholders(chunk, abbrev_replacements, number_replacements)
        for chunk in raw_chunks
    ]

    result = _merge_short_chunks(restored)

    logger.debug("chunking_complete", chunk_count=len(result))
    return result


def _ends_with_sentence(text: str) -> bool:
    """Check whether text ends with a complete sentence boundary.

    Used by the streaming TTS pipeline to determine if a buffer
    is ready to be flushed for synthesis.

    Args:
        text: Text buffer to check.

    Returns:
        True if the text ends at a sentence boundary.
    """
    if not text or not text.strip():
        return False

    stripped = text.rstrip()
    return stripped.endswith((".", "!", "?"))
