"""
Content Title Cleanup Service
Cleans up content titles by removing release tags, extracting series info, etc.
"""

import re
from typing import Dict, Optional, Tuple


class ContentCleanupService:
    """Service for cleaning up content titles and metadata."""

    # Release group patterns to remove
    RELEASE_PATTERNS = [
        r"\[YTS\.?MX\]",
        r"\[eztv\.?re\]",
        r"-GalaxyTV",
        r"-ION265",
        r"AMZN",
        r"NF",
        r"WEB-?DL",
        r"BluRay",
        r"BRRip",
        r"HDRip",
    ]

    # Quality/codec tags to remove
    QUALITY_PATTERNS = [
        r"REPACK",
        r"PROPER",
        r"AAC5?\.?1",
        r"AC3",
        r"XviD",
        r"x264",
        r"x265",
        r"HEVC",
        r"H\.?264",
        r"H\.?265",
        r"10bit",
        r"1080p",
        r"720p",
        r"2160p",
        r"4K",
        r"Rip",
        r"-EVO",
    ]

    # Episode pattern (e.g., S01E01, S1E1)
    EPISODE_PATTERN = r"S(\d+)E(\d+)"

    @classmethod
    def clean_title(cls, title: str) -> Dict[str, any]:
        """
        Clean a content title and extract metadata.

        Args:
            title: The original title

        Returns:
            Dictionary with:
            - clean_title: Cleaned title
            - is_series: Whether this is a series episode
            - series_name: Extracted series name (if episode)
            - season: Season number (if episode)
            - episode: Episode number (if episode)
            - original_title: Original title for reference
        """
        result = {
            "clean_title": title,
            "is_series": False,
            "series_name": None,
            "season": None,
            "episode": None,
            "original_title": title,
        }

        # Check for episode pattern
        episode_match = re.search(cls.EPISODE_PATTERN, title, re.IGNORECASE)
        if episode_match:
            result["is_series"] = True
            result["season"] = int(episode_match.group(1))
            result["episode"] = int(episode_match.group(2))

            # Extract series name (everything before S01E01)
            series_name = title[: episode_match.start()].strip()

            # Clean the series name
            series_name = cls._remove_tags(series_name)
            result["series_name"] = series_name.strip()
            result["clean_title"] = (
                f"{series_name} S{result['season']:02d}E{result['episode']:02d}"
            )
        else:
            # Not an episode, just clean the title
            clean = cls._remove_tags(title)
            result["clean_title"] = clean.strip()

        return result

    @classmethod
    def _remove_tags(cls, text: str) -> str:
        """Remove release group and quality tags from text."""
        # Remove release patterns
        for pattern in cls.RELEASE_PATTERNS:
            text = re.sub(pattern, "", text, flags=re.IGNORECASE)

        # Remove quality patterns
        for pattern in cls.QUALITY_PATTERNS:
            text = re.sub(pattern, "", text, flags=re.IGNORECASE)

        # Remove common separators at the end
        text = re.sub(r"[-_\.]+$", "", text)

        # Remove extra spaces
        text = re.sub(r"\s+", " ", text)

        return text.strip()

    @classmethod
    def extract_year_from_title(cls, title: str) -> Optional[int]:
        """
        Extract year from title if present.

        Args:
            title: The title to search

        Returns:
            Year as integer or None
        """
        # Look for 4-digit year (1900-2099)
        year_match = re.search(r"\b(19\d{2}|20\d{2})\b", title)
        if year_match:
            return int(year_match.group(1))
        return None

    @classmethod
    def normalize_series_name(cls, series_name: str) -> str:
        """
        Normalize series name for better TMDB matching.

        Args:
            series_name: The series name

        Returns:
            Normalized series name
        """
        # Remove "The" prefix for better matching
        normalized = re.sub(r"^The\s+", "", series_name, flags=re.IGNORECASE)

        # Remove special characters except spaces and hyphens
        normalized = re.sub(r"[^\w\s\-']", "", normalized)

        # Normalize spaces
        normalized = re.sub(r"\s+", " ", normalized)

        return normalized.strip()
