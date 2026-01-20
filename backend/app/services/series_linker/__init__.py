"""
Series Linker Package

Provides episode-to-series linking and episode deduplication capabilities.

Usage:
    from app.services.series_linker import SeriesLinkerService, get_series_linker_service

    service = get_series_linker_service()
    unlinked = await service.find_unlinked_episodes(limit=50)
    result = await service.auto_link_unlinked_episodes()
"""

from app.services.series_linker.service import (
    SeriesLinkerService,
    get_series_linker_service,
)
from app.services.series_linker.constants import (
    DeduplicationResult,
    DuplicateGroup,
    EPISODE_PATTERNS,
    LinkingResult,
    UnlinkedEpisode,
)
from app.services.series_linker.episode_matcher import (
    extract_series_info_from_title,
    find_matching_series_by_similarity,
)
from app.services.series_linker.tmdb_integration import find_series_via_tmdb
from app.services.series_linker.series_creator import create_series_from_tmdb
from app.services.series_linker.deduplication import (
    resolve_duplicate_episode_group,
    select_episode_to_keep,
)
from app.services.series_linker.duplicate_resolver import (
    auto_resolve_duplicate_episodes,
    find_duplicate_episodes,
    validate_episode_uniqueness,
)
from app.services.series_linker.batch_operations import (
    auto_link_unlinked_episodes,
    find_matching_series,
)
from app.services.series_linker.linking import link_episode_to_series
from app.services.series_linker.validation import (
    find_episodes_with_incomplete_data,
    find_unlinked_episodes,
)

__all__ = [
    "SeriesLinkerService",
    "get_series_linker_service",
    "UnlinkedEpisode",
    "DuplicateGroup",
    "LinkingResult",
    "DeduplicationResult",
    "EPISODE_PATTERNS",
    "extract_series_info_from_title",
    "find_matching_series_by_similarity",
    "find_series_via_tmdb",
    "create_series_from_tmdb",
    "find_duplicate_episodes",
    "select_episode_to_keep",
    "resolve_duplicate_episode_group",
    "auto_resolve_duplicate_episodes",
    "validate_episode_uniqueness",
    "find_matching_series",
    "link_episode_to_series",
    "auto_link_unlinked_episodes",
    "find_unlinked_episodes",
    "find_episodes_with_incomplete_data",
]
