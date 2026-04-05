"""Memory Reference Service

Server-authoritative replacement for the client-side 3-word n-gram heuristic
in useMemoryInference.ts. Given a character response and a list of prior
user turns (from the current session), returns the longest phrase shared
between them — the phrase the character appears to be "calling back" to.

Algorithm mirrors the client heuristic so rollout does not churn the UI:
- Normalize (lowercase, strip punctuation, collapse whitespace)
- Minimum phrase length: 3 words
- Prefer longest matching phrase
- Tiebreak by recency (most recent prior turn wins)

Returns the highlighted_phrase as a substring of the ORIGINAL response_text
(original casing/punctuation preserved) so the client can exact-match-highlight.
"""

import re
from typing import List, Optional, Tuple

from app.services.vod_interaction.pause_ask_models import MemoryReference

MIN_PHRASE_WORDS = 3

# Matches runs of non-word characters (punctuation + extra whitespace).
_PUNCT_RE = re.compile(r"[^\w\s]+")
_WS_RE = re.compile(r"\s+")


def _normalize(text: str) -> str:
    """Lowercase, strip punctuation, collapse whitespace."""
    lowered = text.lower()
    depunct = _PUNCT_RE.sub(" ", lowered)
    collapsed = _WS_RE.sub(" ", depunct).strip()
    return collapsed


def _locate_original_phrase(
    original_text: str, normalized_phrase: str,
) -> Optional[str]:
    """Find the original-casing substring of `original_text` that normalizes
    to `normalized_phrase`. Returns None if no alignment is found.
    """
    words = original_text.split()
    target_word_count = len(normalized_phrase.split())
    for start in range(len(words) - target_word_count + 1):
        candidate = " ".join(words[start:start + target_word_count])
        if _normalize(candidate) == normalized_phrase:
            return candidate
    return None


def _longest_shared_ngram(
    response_norm: str, message_norm: str,
) -> Optional[str]:
    """Longest contiguous n-gram (≥ MIN_PHRASE_WORDS words) shared between
    a message and a response (both normalized). None if no match.
    """
    msg_words = message_norm.split()
    if len(msg_words) < MIN_PHRASE_WORDS:
        return None

    # Scan from longest possible n-gram down to minimum
    for n in range(len(msg_words), MIN_PHRASE_WORDS - 1, -1):
        for i in range(len(msg_words) - n + 1):
            ngram = " ".join(msg_words[i:i + n])
            # Use substring match bounded by word boundaries
            if f" {ngram} " in f" {response_norm} ":
                return ngram
    return None


def find_reference(
    response_text: str, prior_user_messages: List[str],
) -> Optional[MemoryReference]:
    """Find the longest 3+ word phrase shared between the response and any
    prior user turn. Prefers longest match, tiebreaking by recency.

    Args:
        response_text: The character's new response text.
        prior_user_messages: Prior user turns in chronological order
            (oldest first). The index in this list becomes
            referenced_turn_index in the returned MemoryReference.

    Returns:
        MemoryReference with turn_index + highlighted_phrase (in original
        casing, extracted from response_text), or None if no match.
    """
    if not prior_user_messages:
        return None

    response_norm = _normalize(response_text)
    if not response_norm:
        return None

    best: Optional[Tuple[int, str]] = None  # (turn_index, normalized_phrase)
    for idx, msg in enumerate(prior_user_messages):
        msg_norm = _normalize(msg)
        phrase = _longest_shared_ngram(response_norm, msg_norm)
        if phrase is None:
            continue
        if best is None or len(phrase) > len(best[1]):
            best = (idx, phrase)
            continue
        # Equal length — prefer more recent (higher idx)
        if len(phrase) == len(best[1]) and idx > best[0]:
            best = (idx, phrase)

    if best is None:
        return None

    turn_index, normalized_phrase = best
    original_phrase = _locate_original_phrase(response_text, normalized_phrase)
    if original_phrase is None:
        # Fall back to normalized phrase if we cannot align (shouldn't
        # happen in practice since the phrase came from the normalized
        # response).
        original_phrase = normalized_phrase

    return MemoryReference(
        referenced_turn_index=turn_index,
        highlighted_phrase=original_phrase,
    )
