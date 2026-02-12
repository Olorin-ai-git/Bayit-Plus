"""Text utility functions for Hebrew phonetic mirror processing.

Provides Levenshtein edit distance computation, Hebrew text normalization
(nikud removal, punctuation stripping, whitespace collapsing), and
phoneme issue classification for pronunciation scoring.
"""

import re
from typing import Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.phonetic_mirror_attempt import PhonemeIssueType

logger = get_logger(__name__)


def levenshtein_distance(s1: str, s2: str) -> int:
    """Compute Levenshtein edit distance between two strings.

    Uses the iterative two-row matrix approach for O(min(m,n)) space.
    """
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)

    previous_row = list(range(len(s2) + 1))

    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]


def normalize_hebrew(text: str) -> str:
    """Normalize Hebrew text for comparison.

    Removes nikud (vowel points), strips non-Hebrew characters and
    punctuation, and collapses whitespace to single spaces.
    """
    cleaned = re.sub(r"[\u0591-\u05C7]", "", text)
    cleaned = re.sub(r"[^\u0590-\u05FF\s]", "", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def classify_phoneme_issue(
    heard: str,
    expected: str,
    similarity: float,
) -> Optional[PhonemeIssueType]:
    """Classify the type of pronunciation issue between heard and expected text.

    Analyzes character-level differences to determine whether the issue
    involves vowels, consonants, extra/missing sounds, or stress placement.
    """
    if similarity >= settings.PHONEME_SIMILARITY_MATCH_THRESHOLD:
        return None

    heard_chars = set(heard)
    expected_chars = set(expected)
    vowel_chars = set("\u05B0\u05B1\u05B2\u05B3\u05B4\u05B5\u05B6\u05B7\u05B8\u05B9\u05BA\u05BB")

    vowel_diff = (heard_chars ^ expected_chars) & vowel_chars
    consonant_diff = (heard_chars ^ expected_chars) - vowel_chars

    if vowel_diff and not consonant_diff:
        return PhonemeIssueType.VOWEL_SWAP

    if consonant_diff and not vowel_diff:
        return PhonemeIssueType.CONSONANT_SWAP

    if len(heard) > len(expected) + 1:
        return PhonemeIssueType.EXTRA_SOUND

    if len(heard) < len(expected) - 1:
        return PhonemeIssueType.MISSING_SOUND

    return PhonemeIssueType.STRESS_WRONG
