"""Content cleanup service for title parsing and metadata extraction."""

import re
from typing import Dict, Optional


class ContentCleanupService:
    """Service for cleaning and parsing content titles."""

    def clean_title(self, title: str) -> Dict[str, Optional[str]]:
        """
        Extract series name from episode title.

        Handles common patterns:
        - "Series Name - S01E01 - Episode Title"
        - "Series Name S01E01 Episode Title"
        - "Series Name: Episode Title"
        - "Series Name - Episode Title"

        Args:
            title: Full episode or content title

        Returns:
            Dictionary with extracted components:
            - series_name: The extracted series name
            - episode_title: The episode title (if found)
            - season: Season number (if found)
            - episode: Episode number (if found)
        """
        result = {
            "series_name": None,
            "episode_title": None,
            "season": None,
            "episode": None
        }

        # Pattern 1: "Series Name - S01E01 - Episode Title" or "Series Name S01E01"
        season_episode_pattern = r'^(.+?)\s*[-:]?\s*[Ss](\d+)[Ee](\d+)\s*[-:]?\s*(.*)$'
        match = re.match(season_episode_pattern, title)
        if match:
            result["series_name"] = match.group(1).strip()
            result["season"] = int(match.group(2))
            result["episode"] = int(match.group(3))
            if match.group(4):
                result["episode_title"] = match.group(4).strip()
            return result

        # Pattern 2: "Series Name - Episode Title" or "Series Name: Episode Title"
        delimiter_pattern = r'^(.+?)\s*[-:]\s*(.+)$'
        match = re.match(delimiter_pattern, title)
        if match:
            result["series_name"] = match.group(1).strip()
            result["episode_title"] = match.group(2).strip()
            return result

        # Pattern 3: No clear delimiter, use full title as series name
        result["series_name"] = title.strip()
        return result

    def extract_year_from_title(self, title: str) -> Optional[int]:
        """
        Extract year from title if present.

        Args:
            title: Content title

        Returns:
            Year as integer if found, None otherwise
        """
        # Pattern: "(2020)" or "[2020]" at end of title
        year_pattern = r'[\(\[](\d{4})[\)\]]$'
        match = re.search(year_pattern, title)
        if match:
            return int(match.group(1))
        return None

    def remove_year_from_title(self, title: str) -> str:
        """
        Remove year suffix from title.

        Args:
            title: Content title

        Returns:
            Title with year removed
        """
        year_pattern = r'\s*[\(\[](\d{4})[\)\]]\s*$'
        return re.sub(year_pattern, '', title).strip()

    def clean_title_for_tmdb_search(self, title: str) -> str:
        """
        Clean title for TMDB search by removing release group tags,
        quality indicators, and other metadata.

        Args:
            title: Raw content title

        Returns:
            Cleaned title suitable for TMDB search
        """
        # Remove quality indicators (1080p, 720p, 4K, etc.)
        title = re.sub(r'\b\d{3,4}p\b', '', title, flags=re.IGNORECASE)
        title = re.sub(r'\bp\b', '', title, flags=re.IGNORECASE)  # Catch leftover 'p'
        title = re.sub(r'\b4K\b', '', title, flags=re.IGNORECASE)
        title = re.sub(r'\bUHD\b', '', title, flags=re.IGNORECASE)
        title = re.sub(r'\bHD\b', '', title, flags=re.IGNORECASE)
        title = re.sub(r'\bMB\b', '', title, flags=re.IGNORECASE)  # Remove MB remnant

        # Remove file size indicators (800MB, 1.5GB, etc.)
        title = re.sub(r'\b\d+(\.\d+)?(MB|GB)\b', '', title, flags=re.IGNORECASE)

        # Remove codec and audio format tags
        title = re.sub(r'\b(x264|x265|H\.264|H\.265|HEVC|AVC)\b', '', title, flags=re.IGNORECASE)
        title = re.sub(r'\b(DD|DD\+|DD5\.1|DTS|AAC|AC3|TrueHD|Atmos)\b', '', title, flags=re.IGNORECASE)

        # Remove release group indicators (usually after dash or in brackets)
        # Patterns: "- MX]", "- FGT", "[YIFY]", "(anoXmous)", etc.
        title = re.sub(r'[-\s]*\[[\w\s]+\]', '', title)
        title = re.sub(r'[-\s]*\([\w\s]+\)', '', title)
        title = re.sub(r'[-\s]+[\w]+\]$', '', title)  # Catch "- MX]" pattern

        # Remove common release group tags
        release_groups = [
            'YIFY', 'YTS', 'RARBG', 'FGT', 'MX', 'SPARKS', 'AMZN', 'NF', 'WEB',
            'BluRay', 'BRRip', 'WEBRip', 'WEB-DL', 'HDRip', 'DVDRip',
            'XViD', 'DivX', 'EXTENDED', 'UNRATED', 'REMASTERED',
            'anoXmous', 'LooKMaNe', 'INSPiRAL'
        ]
        for group in release_groups:
            title = re.sub(rf'\b{re.escape(group)}\b', '', title, flags=re.IGNORECASE)

        # Remove "Vol 1", "Vol. 1", "Part 1" etc. for initial search
        # (Can be added back if no results found)
        # title = re.sub(r'\bVol\.?\s*\d+\b', '', title, flags=re.IGNORECASE)
        # title = re.sub(r'\bPart\s*\d+\b', '', title, flags=re.IGNORECASE)

        # Remove multiple spaces and dashes
        title = re.sub(r'\s+', ' ', title)
        title = re.sub(r'[-\s]+$', '', title)  # Trailing dashes
        title = re.sub(r'^[-\s]+', '', title)  # Leading dashes

        return title.strip()
