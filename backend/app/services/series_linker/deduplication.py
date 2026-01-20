"""
Deduplication Module

Provides core duplicate episode resolution logic.
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.models.content import Content
from app.models.librarian import LibrarianAction
from app.services.series_linker.constants import DeduplicationResult
from beanie import PydanticObjectId

logger = logging.getLogger(__name__)


def select_episode_to_keep(
    episodes: List[Content], strategy: Optional[str] = None
) -> Content:
    """
    Select which episode to keep from a group of duplicates.

    Strategies: keep_highest_quality, keep_oldest, keep_newest, keep_most_complete

    Args:
        episodes: List of duplicate Content objects
        strategy: Resolution strategy (uses config if not provided)

    Returns:
        The Content object to keep
    """
    if strategy is None:
        strategy = settings.SERIES_LINKER_DUPLICATE_RESOLUTION_STRATEGY

    if strategy == "keep_highest_quality":

        def quality_key(e: Content) -> tuple:
            size = e.file_size or 0
            height = (e.video_metadata or {}).get("height", 0) or 0
            return (size, height)

        return max(episodes, key=quality_key)

    elif strategy == "keep_oldest":
        return min(episodes, key=lambda e: e.created_at or datetime.min)

    elif strategy == "keep_newest":
        return max(episodes, key=lambda e: e.created_at or datetime.min)

    elif strategy == "keep_most_complete":

        def completeness_score(e: Content) -> float:
            score = 0.0
            if e.description:
                score += 1
            if e.thumbnail or e.poster_url:
                score += 1
            if e.backdrop:
                score += 1
            if e.tmdb_id:
                score += 1
            if e.has_subtitles:
                score += 1
            if e.file_size:
                score += e.file_size / 1_000_000_000
            return score

        return max(episodes, key=completeness_score)

    return max(episodes, key=lambda e: (e.file_size or 0))


async def resolve_duplicate_episode_group(
    episode_ids: List[str],
    keep_id: Optional[str] = None,
    action: str = "unpublish",
    audit_id: Optional[str] = None,
    dry_run: bool = False,
    reason: str = "",
) -> DeduplicationResult:
    """
    Resolve a group of duplicate episodes.

    Args:
        episode_ids: List of duplicate episode IDs
        keep_id: ID of episode to keep (if None, auto-select)
        action: What to do with duplicates ("unpublish" or "delete")
        audit_id: Audit ID for tracking
        dry_run: If True, don't make changes
        reason: Reason for the resolution

    Returns:
        DeduplicationResult with details
    """
    result = DeduplicationResult(
        success=True,
        duplicates_found=len(episode_ids),
        dry_run=dry_run,
    )

    try:
        # Batch fetch all episodes in a single query (avoid N+1 queries)
        episode_object_ids = [PydanticObjectId(eid) for eid in episode_ids]
        episodes = await Content.find({"_id": {"$in": episode_object_ids}}).to_list()

        if len(episodes) < 2:
            result.success = False
            result.errors.append("Need at least 2 episodes to resolve duplicates")
            return result

        if keep_id:
            keep_episode = next((e for e in episodes if str(e.id) == keep_id), None)
            if not keep_episode:
                result.success = False
                result.errors.append(f"Episode {keep_id} not found in group")
                return result
        else:
            keep_episode = select_episode_to_keep(episodes)

        result.kept_episode_ids = [str(keep_episode.id)]

        for episode in episodes:
            if str(episode.id) == str(keep_episode.id):
                continue

            if dry_run:
                result.removed_episode_ids.append(str(episode.id))
                result.duplicates_resolved += 1
                continue

            before_state = {"is_published": episode.is_published}

            if action == "delete":
                await episode.delete()
                after_state: Dict[str, Any] = {"deleted": True}
            else:
                episode.is_published = False
                episode.updated_at = datetime.utcnow()
                await episode.save()
                after_state = {"is_published": False}

            result.removed_episode_ids.append(str(episode.id))
            result.duplicates_resolved += 1

            if audit_id:
                lib_action = LibrarianAction(
                    audit_id=audit_id,
                    action_type=f"resolve_duplicate_{action}",
                    content_id=str(episode.id),
                    content_type="episode",
                    issue_type="duplicate_episode",
                    description=reason or f"Duplicate of '{keep_episode.title}'",
                    before_state=before_state,
                    after_state=after_state,
                    confidence_score=1.0,
                    auto_approved=True,
                    timestamp=datetime.utcnow(),
                )
                await lib_action.insert()

        logger.info(
            f"Resolved duplicates: kept {keep_episode.id}, {action}ed {result.duplicates_resolved}"
        )

    except Exception as e:
        logger.error(f"Error resolving duplicate group: {e}", exc_info=True)
        result.success = False
        result.errors.append(str(e))

    return result
