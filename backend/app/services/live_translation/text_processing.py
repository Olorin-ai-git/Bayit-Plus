"""Text processing utilities for live subtitles."""
import logging
from typing import List

from app.core.config import settings

logger = logging.getLogger(__name__)


def chunk_text_for_subtitles(
    text: str, max_length: int | None = None
) -> List[str]:
    """
    Split long text into smaller chunks suitable for subtitles.

    Splits at natural breakpoints (punctuation, then spaces) to maintain readability.
    Returns a list of text chunks, each under max_length characters.
    """
    # Use configuration if max_length not provided
    if max_length is None:
        max_length = settings.olorin.subtitle.max_subtitle_length
    preferred_length = settings.olorin.subtitle.preferred_subtitle_length

    if len(text) <= max_length:
        return [text]

    chunks = []
    remaining = text.strip()

    while remaining:
        if len(remaining) <= max_length:
            chunks.append(remaining)
            break

        # Find best split point within max_length
        split_point = max_length

        # Priority 1: Split at sentence-ending punctuation (. ! ?)
        for punct in [". ", "! ", "? ", "। ", "。", "؟ "]:
            pos = remaining.rfind(punct, 0, max_length)
            if pos > preferred_length // 2:
                split_point = pos + len(punct)
                break
        else:
            # Priority 2: Split at comma or semicolon
            for punct in [", ", "; ", "، ", "、"]:
                pos = remaining.rfind(punct, 0, max_length)
                if pos > preferred_length // 2:
                    split_point = pos + len(punct)
                    break
            else:
                # Priority 3: Split at space
                pos = remaining.rfind(" ", preferred_length // 2, max_length)
                if pos > 0:
                    split_point = pos + 1
                # If no space found, just hard cut at max_length

        chunk = remaining[:split_point].strip()
        if chunk:
            chunks.append(chunk)
        remaining = remaining[split_point:].strip()

    return chunks


def deduplicate_transcript(text: str, min_pattern_length: int | None = None) -> str:
    """
    Remove repetitive patterns from transcript text caused by buffer stuttering or echo.

    Detects and removes patterns like:
    - "זה יכול להיות זה יכול להיות" → "זה יכול להיות"
    - "specific more specific more" → "specific more"

    Args:
        text: The transcript text to deduplicate
        min_pattern_length: Minimum length of pattern to consider (default from config)

    Returns:
        Deduplicated text with repetitive patterns removed
    """
    # Use configuration default if min_pattern_length not provided
    if min_pattern_length is None:
        min_pattern_length = settings.olorin.subtitle.dedup_min_pattern_length

    if len(text) < min_pattern_length * 2:
        return text

    # Check for exact repetitions (word for word)
    words = text.split()
    if len(words) < 4:
        return text

    # Find longest repeating suffix
    for pattern_size in range(len(words) // 2, 0, -1):
        pattern = words[-pattern_size:]
        pattern_text = " ".join(pattern)

        if len(pattern_text) < min_pattern_length:
            continue

        # Check if this pattern appears at the end multiple times
        remaining = words[:-pattern_size]
        if len(remaining) >= pattern_size:
            potential_duplicate = remaining[-pattern_size:]
            if pattern == potential_duplicate:
                # Found repetition - remove duplicates
                logger.debug(
                    f"Deduplication: Found repeating pattern '{pattern_text[:30]}...', "
                    f"removing {pattern_size} words"
                )
                # Keep only one instance of the pattern
                deduplicated_words = words[:-pattern_size]
                return " ".join(deduplicated_words)

    # Check for partial repetitions (at least 70% overlap)
    text_len = len(text)
    for i in range(text_len // 2, min_pattern_length, -1):
        suffix = text[-i:]
        # Check if suffix appears earlier in the text with at least 70% match
        for j in range(len(text) - i - 1, -1, -1):
            substring = text[j : j + i]
            if len(substring) < min_pattern_length:
                break
            # Calculate similarity (simple character overlap)
            matches = sum(1 for a, b in zip(suffix, substring) if a == b)
            similarity = matches / len(suffix)
            if similarity >= 0.7:
                logger.debug(
                    f"Deduplication: Found {similarity*100:.0f}% similar pattern, "
                    f"truncating {i} characters"
                )
                return text[: j + i]

    return text
