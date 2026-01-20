"""
Series Linker Constants

Episode title patterns and dataclasses used throughout the series linker service.
"""

import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional

# Episode title patterns for extracting series name and episode info
EPISODE_PATTERNS = [
    # S01E01, s01e01, S1E1
    re.compile(r"^(.+?)\s*[Ss](\d{1,2})[Ee](\d{1,3})"),
    # 1x01 format
    re.compile(r"^(.+?)\s*(\d{1,2})x(\d{1,3})"),
    # Season 1 Episode 1 format
    re.compile(r"^(.+?)\s*[-–]\s*[Ss]eason\s*(\d{1,2})\s*[Ee]pisode\s*(\d{1,3})"),
    # EP01, Ep.01 format (assumes season 1)
    re.compile(r"^(.+?)\s*[Ee][Pp]\.?\s*(\d{1,3})$"),
]


@dataclass
class UnlinkedEpisode:
    """Represents an episode without a parent series."""

    content_id: str
    title: str
    title_en: Optional[str] = None
    extracted_series_name: Optional[str] = None
    season: Optional[int] = None
    episode: Optional[int] = None
    created_at: Optional[datetime] = None


@dataclass
class DuplicateGroup:
    """Represents a group of duplicate episodes."""

    series_id: str
    series_title: str
    season: int
    episode: int
    episode_ids: List[str]
    episode_titles: List[str]
    created_dates: List[datetime]
    file_sizes: List[Optional[int]]
    resolutions: List[Optional[int]]


@dataclass
class LinkingResult:
    """Result of a linking operation."""

    success: bool
    episode_id: str
    series_id: Optional[str] = None
    series_title: Optional[str] = None
    action: str = ""
    confidence: float = 0.0
    dry_run: bool = False
    error: Optional[str] = None


@dataclass
class DeduplicationResult:
    """Result of a deduplication operation."""

    success: bool
    duplicates_found: int = 0
    duplicates_resolved: int = 0
    kept_episode_ids: List[str] = field(default_factory=list)
    removed_episode_ids: List[str] = field(default_factory=list)
    dry_run: bool = False
    errors: List[str] = field(default_factory=list)
