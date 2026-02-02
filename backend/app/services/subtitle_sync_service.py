"""
Subtitle Sync Service
Keeps Content.available_subtitle_languages in sync with SubtitleTrackDoc
"""

import logging
from typing import List, Optional

from app.models.content import Content
from app.models.subtitles import SubtitleTrackDoc

logger = logging.getLogger(__name__)


async def sync_content_subtitle_languages(content_id: str) -> dict:
    """
    Sync available_subtitle_languages field with actual subtitle tracks.

    Args:
        content_id: Content ID to sync

    Returns:
        dict with sync status and updated languages
    """
    try:
        content = await Content.get(content_id)
        if not content:
            return {
                "success": False,
                "error": "Content not found",
                "content_id": content_id
            }

        # Get actual subtitle tracks from SubtitleTrackDoc
        tracks = await SubtitleTrackDoc.get_for_content(content_id)
        actual_languages = sorted([track.language for track in tracks])

        # Get current cached languages
        current_languages = sorted(content.available_subtitle_languages or [])

        # Check if sync needed
        if actual_languages == current_languages:
            return {
                "success": True,
                "synced": False,
                "message": "Already in sync",
                "content_id": content_id,
                "languages": actual_languages
            }

        # Update content with actual languages
        content.available_subtitle_languages = actual_languages
        content.has_subtitles = len(actual_languages) > 0
        await content.save()

        logger.info(
            f"Synced subtitle languages for {content_id}",
            extra={
                "content_id": content_id,
                "old_languages": current_languages,
                "new_languages": actual_languages,
                "added": list(set(actual_languages) - set(current_languages)),
                "removed": list(set(current_languages) - set(actual_languages))
            }
        )

        return {
            "success": True,
            "synced": True,
            "content_id": content_id,
            "old_languages": current_languages,
            "new_languages": actual_languages,
            "added": list(set(actual_languages) - set(current_languages)),
            "removed": list(set(current_languages) - set(actual_languages))
        }

    except Exception as e:
        logger.error(
            f"Failed to sync subtitle languages for {content_id}",
            extra={"content_id": content_id, "error": str(e)}
        )
        return {
            "success": False,
            "error": str(e),
            "content_id": content_id
        }


async def sync_all_content_subtitle_languages(
    limit: Optional[int] = None,
    dry_run: bool = False
) -> dict:
    """
    Sync all content subtitle languages with actual tracks.

    Args:
        limit: Optional limit on number of content items to sync
        dry_run: If True, only report what would change without updating

    Returns:
        dict with sync statistics
    """
    try:
        # Get all published content
        query = {"is_published": True}
        content_items = await Content.find(query).to_list()

        if limit:
            content_items = content_items[:limit]

        results = {
            "total": len(content_items),
            "synced": 0,
            "already_in_sync": 0,
            "failed": 0,
            "details": []
        }

        for content in content_items:
            try:
                # Get actual subtitle tracks
                tracks = await SubtitleTrackDoc.get_for_content(str(content.id))
                actual_languages = sorted([track.language for track in tracks])
                current_languages = sorted(content.available_subtitle_languages or [])

                if actual_languages == current_languages:
                    results["already_in_sync"] += 1
                    continue

                sync_info = {
                    "content_id": str(content.id),
                    "title": content.title,
                    "old_languages": current_languages,
                    "new_languages": actual_languages,
                    "added": list(set(actual_languages) - set(current_languages)),
                    "removed": list(set(current_languages) - set(actual_languages))
                }

                if not dry_run:
                    # Update content
                    content.available_subtitle_languages = actual_languages
                    content.has_subtitles = len(actual_languages) > 0
                    await content.save()
                    results["synced"] += 1
                else:
                    results["synced"] += 1  # Would be synced

                results["details"].append(sync_info)

            except Exception as e:
                results["failed"] += 1
                logger.error(
                    f"Failed to sync {content.id}",
                    extra={"content_id": str(content.id), "error": str(e)}
                )

        logger.info(
            f"Bulk subtitle sync completed",
            extra={
                "dry_run": dry_run,
                "total": results["total"],
                "synced": results["synced"],
                "already_in_sync": results["already_in_sync"],
                "failed": results["failed"]
            }
        )

        return results

    except Exception as e:
        logger.error(f"Failed bulk subtitle sync", extra={"error": str(e)})
        return {
            "success": False,
            "error": str(e)
        }
