"""
Batch Operations Module

Provides batch processing utilities for series linking operations.
"""

import logging
from typing import Any, Dict, List, Optional, Tuple

from app.core.config import settings
from app.models.content import Content
from app.services.series_linker.episode_matcher import (
    extract_series_info_from_title,
    find_matching_series_by_similarity,
)
from app.services.series_linker.linking import link_episode_to_series
from app.services.series_linker.tmdb_integration import find_series_via_tmdb

logger = logging.getLogger(__name__)


async def find_matching_series(
    series_name: str,
    use_tmdb: bool = True,
    similarity_threshold: Optional[float] = None,
) -> Tuple[Optional[Content], float]:
    """
    Find a matching series using multiple strategies (local + TMDB).

    Args:
        series_name: The series name to match
        use_tmdb: Whether to search TMDB if no local match
        similarity_threshold: Minimum similarity ratio (0-1) required

    Returns:
        Tuple of (matching Content or None, confidence score 0-1)
    """
    if not series_name:
        return None, 0.0

    local_match, similarity = await find_matching_series_by_similarity(
        series_name,
        similarity_threshold,
    )

    if local_match:
        return local_match, similarity

    if use_tmdb:
        tmdb_match = await find_series_via_tmdb(series_name)
        if tmdb_match:
            return tmdb_match, 0.9

    return None, 0.0


async def auto_link_unlinked_episodes(
    limit: Optional[int] = None,
    audit_id: Optional[str] = None,
    dry_run: bool = False,
    confidence_threshold: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Automatically link unlinked episodes to their parent series.

    Args:
        limit: Maximum number of episodes to process
        audit_id: Audit ID for tracking
        dry_run: If True, don't actually make changes
        confidence_threshold: Minimum confidence required for auto-linking

    Returns:
        Dict with success, processed, linked, skipped, failed counts and details
    """
    from app.services.series_linker.validation import find_unlinked_episodes

    if limit is None:
        limit = settings.SERIES_LINKER_AUTO_LINK_BATCH_SIZE

    if confidence_threshold is None:
        confidence_threshold = settings.SERIES_LINKER_AUTO_LINK_CONFIDENCE_THRESHOLD

    results: Dict[str, Any] = {
        "success": True,
        "processed": 0,
        "linked": 0,
        "skipped": 0,
        "failed": 0,
        "dry_run": dry_run,
        "details": [],
    }

    try:
        unlinked = await find_unlinked_episodes(limit=limit)
        results["processed"] = len(unlinked)

        for episode in unlinked:
            series_name = episode.extracted_series_name
            if not series_name:
                series_name, _, _ = extract_series_info_from_title(
                    episode.title_en or ""
                )

            if not series_name:
                results["skipped"] += 1
                results["details"].append(
                    {
                        "episode_id": episode.content_id,
                        "title": episode.title,
                        "action": "skipped",
                        "reason": "Could not extract series name from title",
                    }
                )
                continue

            series, confidence = await find_matching_series(series_name)

            if not series or confidence < confidence_threshold:
                results["skipped"] += 1
                results["details"].append(
                    {
                        "episode_id": episode.content_id,
                        "title": episode.title,
                        "action": "skipped",
                        "reason": f"No match with sufficient confidence (best: {confidence:.2f})",
                    }
                )
                continue

            link_result = await link_episode_to_series(
                episode_id=episode.content_id,
                series_id=str(series.id),
                season=episode.season,
                episode_num=episode.episode,
                audit_id=audit_id,
                dry_run=dry_run,
                reason=f"Auto-linked with {confidence:.0%} confidence",
            )

            if link_result.success:
                results["linked"] += 1
                results["details"].append(
                    {
                        "episode_id": episode.content_id,
                        "title": episode.title,
                        "action": "linked" if not dry_run else "would_link",
                        "series_id": str(series.id),
                        "series_title": series.title,
                        "confidence": confidence,
                    }
                )
            else:
                results["failed"] += 1
                results["details"].append(
                    {
                        "episode_id": episode.content_id,
                        "title": episode.title,
                        "action": "failed",
                        "error": link_result.error,
                    }
                )

    except Exception as e:
        logger.error(f"Error in auto_link_unlinked_episodes: {e}", exc_info=True)
        results["success"] = False
        results["error"] = str(e)

    logger.info(
        f"Auto-link: {results['linked']}/{results['processed']} linked, "
        f"{results['skipped']} skipped, {results['failed']} failed"
    )

    return results
