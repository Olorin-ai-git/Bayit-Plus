"""
Episode Matcher Module

Provides episode-to-series matching logic using title pattern extraction
and similarity matching.
"""

import difflib
import logging
import re
from typing import Optional, Tuple

from app.core.config import settings
from app.models.content import Content
from app.services.series_linker.constants import EPISODE_PATTERNS

logger = logging.getLogger(__name__)


def extract_series_info_from_title(
    title: str,
) -> Tuple[Optional[str], Optional[int], Optional[int]]:
    """
    Extract series name, season, and episode from a title string.

    Uses pre-compiled regex patterns from constants module to parse
    common episode title formats like:
    - "Series Name S01E01"
    - "Series Name 1x01"
    - "Series Name - Season 1 Episode 1"
    - "Series Name EP01"

    Args:
        title: The episode title to parse

    Returns:
        Tuple of (series_name, season, episode) - any can be None if not found
    """
    if not title:
        return None, None, None

    title = title.strip()

    for pattern in EPISODE_PATTERNS:
        match = pattern.match(title)
        if match:
            groups = match.groups()

            if len(groups) == 3:
                # Full match: series, season, episode
                series_name = groups[0].strip().strip('-').strip()
                season = int(groups[1])
                episode = int(groups[2])
                return series_name, season, episode

            elif len(groups) == 2:
                # EP format: series, episode (assume season 1)
                series_name = groups[0].strip().strip('-').strip()
                episode = int(groups[1])
                return series_name, 1, episode

    return None, None, None


async def find_matching_series_by_similarity(
    series_name: str,
    similarity_threshold: Optional[float] = None,
) -> Tuple[Optional[Content], float]:
    """
    Find a matching series using title similarity matching.

    Searches all series in the database and returns the best match
    based on title similarity using SequenceMatcher.

    Args:
        series_name: The series name to match
        similarity_threshold: Minimum similarity ratio (0-1) required for a match.
                            Uses SERIES_LINKER_TITLE_SIMILARITY_THRESHOLD from settings
                            if not provided.

    Returns:
        Tuple of (matching Content or None, similarity ratio 0-1)
    """
    if not series_name:
        return None, 0.0

    if similarity_threshold is None:
        similarity_threshold = settings.SERIES_LINKER_TITLE_SIMILARITY_THRESHOLD

    # Normalize the name for matching
    normalized_name = series_name.lower().strip()

    # Strategy 1: Exact match (case-insensitive)
    exact_match = await Content.find_one({
        "is_series": True,
        "$or": [
            {"title": {"$regex": f"^{re.escape(series_name)}$", "$options": "i"}},
            {"title_en": {"$regex": f"^{re.escape(series_name)}$", "$options": "i"}},
        ]
    })

    if exact_match:
        logger.info(f"Found exact series match: '{exact_match.title}' for '{series_name}'")
        return exact_match, 1.0

    # Strategy 2: Similarity matching
    all_series = await Content.find({"is_series": True}).to_list()

    best_match = None
    best_ratio = 0.0

    for series in all_series:
        # Check both Hebrew and English titles
        for title in [series.title, series.title_en]:
            if title:
                ratio = difflib.SequenceMatcher(
                    None,
                    normalized_name,
                    title.lower(),
                ).ratio()

                if ratio > best_ratio:
                    best_ratio = ratio
                    best_match = series

    if best_match and best_ratio >= similarity_threshold:
        logger.info(
            f"Found similar series: '{best_match.title}' "
            f"for '{series_name}' (similarity: {best_ratio:.2f})"
        )
        return best_match, best_ratio

    return None, best_ratio
