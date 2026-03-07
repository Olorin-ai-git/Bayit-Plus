"""
Channel Index Service

Fuzzy-matches channel names against the global channel index using
exact, normalized, and trigram similarity strategies.
"""

import re
from typing import Dict, List, Optional, Tuple

from app.core.logging_config import get_logger
from app.models.byoc_channel_index import ChannelIndexEntry

logger = get_logger(__name__)

TRIGRAM_THRESHOLD = 0.7

_STRIP_SUFFIXES = re.compile(
    r"\s*[\[\(]?\b(hd|sd|fhd|uhd|4k|h\.?265|hevc|720p?|1080p?|2160p?)\b[\]\)]?",
    re.IGNORECASE,
)
_STRIP_PREFIXES = re.compile(
    r"^[A-Z]{2,3}\s*[:\|]\s*", re.IGNORECASE
)
_STRIP_BRACKETED = re.compile(r"\s*[\[\(][A-Za-z0-9\s]{1,6}[\]\)]")
_STRIP_EXTRA = re.compile(r"\s+")


def normalize_channel_name(name: str) -> str:
    """Strip resolution tags, country prefixes, bracketed tags, and normalize whitespace."""
    result = _STRIP_SUFFIXES.sub("", name)
    result = _STRIP_PREFIXES.sub("", result)
    result = _STRIP_BRACKETED.sub("", result)
    result = _STRIP_EXTRA.sub(" ", result).strip().lower()
    return result


def trigram_similarity(a: str, b: str) -> float:
    """Calculate trigram (3-gram) similarity between two strings."""
    if not a or not b:
        return 0.0
    a_lower, b_lower = a.lower(), b.lower()
    if a_lower == b_lower:
        return 1.0
    a_trigrams = {a_lower[i : i + 3] for i in range(len(a_lower) - 2)}
    b_trigrams = {b_lower[i : i + 3] for i in range(len(b_lower) - 2)}
    if not a_trigrams or not b_trigrams:
        return 0.0
    intersection = a_trigrams & b_trigrams
    union = a_trigrams | b_trigrams
    return len(intersection) / len(union)


class ChannelIndexService:
    """Matches channel names against the global channel index."""

    def __init__(self):
        self._index_cache: Optional[List[ChannelIndexEntry]] = None

    async def _load_index(self) -> List[ChannelIndexEntry]:
        """Load the full channel index into memory for matching."""
        if self._index_cache is None:
            self._index_cache = await ChannelIndexEntry.find_all().to_list()
            logger.info(
                "Channel index loaded entries=%d", len(self._index_cache)
            )
        return self._index_cache

    def invalidate_cache(self) -> None:
        """Clear the in-memory index cache."""
        self._index_cache = None

    async def match_channel(
        self, name: str,
    ) -> Optional[Tuple[ChannelIndexEntry, float]]:
        """Match a channel name against the index.

        Returns (entry, confidence) or None if no match.
        Strategy: exact -> normalized -> trigram.
        """
        index = await self._load_index()
        normalized = normalize_channel_name(name)

        for entry in index:
            if name.lower() == entry.canonical_name.lower():
                return entry, 1.0
            for alias in entry.aliases:
                if name.lower() == alias.lower():
                    return entry, 0.95

        for entry in index:
            entry_normalized = normalize_channel_name(entry.canonical_name)
            if normalized == entry_normalized:
                return entry, 0.9
            for alias in entry.aliases:
                if normalized == normalize_channel_name(alias):
                    return entry, 0.85

        best_match: Optional[Tuple[ChannelIndexEntry, float]] = None
        for entry in index:
            sim = trigram_similarity(normalized, normalize_channel_name(entry.canonical_name))
            if sim >= TRIGRAM_THRESHOLD:
                if best_match is None or sim > best_match[1]:
                    best_match = (entry, sim)
            for alias in entry.aliases:
                alias_sim = trigram_similarity(normalized, normalize_channel_name(alias))
                if alias_sim >= TRIGRAM_THRESHOLD:
                    if best_match is None or alias_sim > best_match[1]:
                        best_match = (entry, alias_sim)

        return best_match

    async def match_batch(
        self, names: List[str],
    ) -> Dict[int, Tuple[ChannelIndexEntry, float]]:
        """Match multiple channel names. Returns {index: (entry, confidence)}."""
        results: Dict[int, Tuple[ChannelIndexEntry, float]] = {}
        for i, name in enumerate(names):
            match = await self.match_channel(name)
            if match:
                results[i] = match
        return results

    async def search(self, query: str, limit: int = 10) -> List[ChannelIndexEntry]:
        """Search channel index by name substring."""
        normalized = normalize_channel_name(query)
        index = await self._load_index()
        scored: List[Tuple[float, ChannelIndexEntry]] = []
        for entry in index:
            sim = trigram_similarity(normalized, normalize_channel_name(entry.canonical_name))
            if sim > 0.3:
                scored.append((sim, entry))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [entry for _, entry in scored[:limit]]

    async def increment_match_counts(self, entry_ids: list) -> None:
        """Increment match_count for matched entries."""
        for eid in entry_ids:
            await ChannelIndexEntry.find_one(
                ChannelIndexEntry.id == eid,
            ).update({"$inc": {"match_count": 1}})
