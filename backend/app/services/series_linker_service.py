"""
Series Linker Service - Backward Compatibility Module

This module re-exports all symbols from the refactored series_linker package
to maintain backward compatibility with existing imports.

The actual implementation has been refactored into:
- app/services/series_linker/constants.py - Patterns and dataclasses
- app/services/series_linker/episode_matcher.py - Episode-to-series matching
- app/services/series_linker/tmdb_integration.py - TMDB API integration
- app/services/series_linker/series_creator.py - Series creation from TMDB
- app/services/series_linker/duplicate_resolver.py - Duplicate detection/resolution
- app/services/series_linker/batch_operations.py - Batch processing utilities
- app/services/series_linker/validation.py - Input validation
- app/services/series_linker/service.py - Main SeriesLinkerService class

Usage (unchanged):
    from app.services.series_linker_service import SeriesLinkerService
    from app.services.series_linker_service import get_series_linker_service
"""

# Re-export everything from the series_linker package for backward compatibility
from app.services.series_linker import (
    # Main service
    SeriesLinkerService,
    get_series_linker_service,
    # Dataclasses
    UnlinkedEpisode,
    DuplicateGroup,
    LinkingResult,
    DeduplicationResult,
    # Constants
    EPISODE_PATTERNS,
    # Episode matching
    extract_series_info_from_title,
    find_matching_series_by_similarity,
    # TMDB integration
    find_series_via_tmdb,
    # Series creation
    create_series_from_tmdb,
    # Duplicate resolution
    find_duplicate_episodes,
    select_episode_to_keep,
    resolve_duplicate_episode_group,
    auto_resolve_duplicate_episodes,
    validate_episode_uniqueness,
    # Batch operations
    find_matching_series,
    link_episode_to_series,
    auto_link_unlinked_episodes,
    # Validation
    find_unlinked_episodes,
    find_episodes_with_incomplete_data,
)

__all__ = [
    # Main service
    "SeriesLinkerService",
    "get_series_linker_service",
    # Dataclasses
    "UnlinkedEpisode",
    "DuplicateGroup",
    "LinkingResult",
    "DeduplicationResult",
    # Constants
    "EPISODE_PATTERNS",
    # Episode matching
    "extract_series_info_from_title",
    "find_matching_series_by_similarity",
    # TMDB integration
    "find_series_via_tmdb",
    # Series creation
    "create_series_from_tmdb",
    # Duplicate resolution
    "find_duplicate_episodes",
    "select_episode_to_keep",
    "resolve_duplicate_episode_group",
    "auto_resolve_duplicate_episodes",
    "validate_episode_uniqueness",
    # Batch operations
    "find_matching_series",
    "link_episode_to_series",
    "auto_link_unlinked_episodes",
    # Validation
    "find_unlinked_episodes",
    "find_episodes_with_incomplete_data",
]
