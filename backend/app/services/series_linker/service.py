"""
Series Linker Service

Main coordinator class that provides the public API for series linking.
"""

import logging
from typing import Any, Dict, List, Optional, Tuple

from app.core.config import settings
from app.models.content import Content
from app.services.series_linker.batch_operations import (
    auto_link_unlinked_episodes, find_matching_series)
from app.services.series_linker.constants import (DeduplicationResult,
                                                  DuplicateGroup,
                                                  LinkingResult,
                                                  UnlinkedEpisode)
from app.services.series_linker.deduplication import (
    resolve_duplicate_episode_group, select_episode_to_keep)
from app.services.series_linker.duplicate_resolver import (
    auto_resolve_duplicate_episodes, find_duplicate_episodes,
    validate_episode_uniqueness)
from app.services.series_linker.episode_matcher import \
    extract_series_info_from_title
from app.services.series_linker.linking import link_episode_to_series
from app.services.series_linker.validation import (
    find_episodes_with_incomplete_data, find_unlinked_episodes)

logger = logging.getLogger(__name__)


class SeriesLinkerService:
    """Service for linking episodes to series and deduplicating episodes."""

    def __init__(self) -> None:
        """Initialize with configuration from settings."""
        self._title_similarity_threshold = (
            settings.SERIES_LINKER_TITLE_SIMILARITY_THRESHOLD
        )
        self._auto_link_confidence_threshold = (
            settings.SERIES_LINKER_AUTO_LINK_CONFIDENCE_THRESHOLD
        )
        self._auto_link_batch_size = settings.SERIES_LINKER_AUTO_LINK_BATCH_SIZE
        self._duplicate_resolution_strategy = (
            settings.SERIES_LINKER_DUPLICATE_RESOLUTION_STRATEGY
        )
        self._create_missing_series = settings.SERIES_LINKER_CREATE_MISSING_SERIES

    async def find_unlinked_episodes(self, limit: int = 100) -> List[UnlinkedEpisode]:
        """Find episodes without a series_id."""
        return await find_unlinked_episodes(limit=limit)

    def _extract_series_info_from_title(
        self, title: str
    ) -> Tuple[Optional[str], Optional[int], Optional[int]]:
        """Extract series name, season, and episode from title."""
        return extract_series_info_from_title(title)

    async def find_matching_series(
        self, series_name: str, use_tmdb: bool = True
    ) -> Tuple[Optional[Content], float]:
        """Find a matching series by name."""
        return await find_matching_series(
            series_name,
            use_tmdb=use_tmdb,
            similarity_threshold=self._title_similarity_threshold,
        )

    async def link_episode_to_series(
        self,
        episode_id: str,
        series_id: str,
        season: Optional[int] = None,
        episode_num: Optional[int] = None,
        audit_id: Optional[str] = None,
        dry_run: bool = False,
        reason: str = "",
    ) -> LinkingResult:
        """Link an episode to its parent series."""
        return await link_episode_to_series(
            episode_id=episode_id,
            series_id=series_id,
            season=season,
            episode_num=episode_num,
            audit_id=audit_id,
            dry_run=dry_run,
            reason=reason,
        )

    async def auto_link_unlinked_episodes(
        self,
        limit: Optional[int] = None,
        audit_id: Optional[str] = None,
        dry_run: bool = False,
    ) -> Dict[str, Any]:
        """Automatically link unlinked episodes."""
        if limit is None:
            limit = self._auto_link_batch_size
        return await auto_link_unlinked_episodes(
            limit=limit,
            audit_id=audit_id,
            dry_run=dry_run,
            confidence_threshold=self._auto_link_confidence_threshold,
        )

    async def find_duplicate_episodes(
        self, series_id: Optional[str] = None
    ) -> List[DuplicateGroup]:
        """Find duplicate episodes."""
        return await find_duplicate_episodes(series_id=series_id)

    def _select_episode_to_keep(
        self, episodes: List[Content], strategy: Optional[str] = None
    ) -> Content:
        """Select which episode to keep from duplicates."""
        if strategy is None:
            strategy = self._duplicate_resolution_strategy
        return select_episode_to_keep(episodes, strategy)

    async def resolve_duplicate_episode_group(
        self,
        episode_ids: List[str],
        keep_id: Optional[str] = None,
        action: str = "unpublish",
        audit_id: Optional[str] = None,
        dry_run: bool = False,
        reason: str = "",
    ) -> DeduplicationResult:
        """Resolve a group of duplicate episodes."""
        return await resolve_duplicate_episode_group(
            episode_ids=episode_ids,
            keep_id=keep_id,
            action=action,
            audit_id=audit_id,
            dry_run=dry_run,
            reason=reason,
        )

    async def auto_resolve_duplicate_episodes(
        self,
        strategy: Optional[str] = None,
        audit_id: Optional[str] = None,
        dry_run: bool = False,
    ) -> Dict[str, Any]:
        """Automatically resolve all duplicate episodes."""
        if strategy is None:
            strategy = self._duplicate_resolution_strategy
        return await auto_resolve_duplicate_episodes(
            strategy=strategy,
            audit_id=audit_id,
            dry_run=dry_run,
        )

    async def find_episodes_with_incomplete_data(self) -> List[Dict[str, Any]]:
        """Find episodes with missing season or episode numbers."""
        return await find_episodes_with_incomplete_data()

    async def validate_episode_uniqueness(self) -> Dict[str, Any]:
        """Validate unique (series_id, season, episode) combinations."""
        return await validate_episode_uniqueness()


_series_linker_service: Optional[SeriesLinkerService] = None


def get_series_linker_service() -> SeriesLinkerService:
    """Get or create the singleton SeriesLinkerService instance."""
    global _series_linker_service
    if _series_linker_service is None:
        _series_linker_service = SeriesLinkerService()
    return _series_linker_service
