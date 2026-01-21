"""
YouTube Thumbnail Fixer

Functions for fixing missing or low-quality thumbnails on YouTube content.
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.models.content import Content
from app.services.youtube_validator.url_parser import extract_video_id
from app.services.youtube_validator.video_validator import \
    get_best_youtube_thumbnail

logger = logging.getLogger(__name__)


def thumbnail_needs_fix(current_thumbnail: str) -> bool:
    """
    Determine if a thumbnail needs fixing.

    Args:
        current_thumbnail: Current thumbnail URL

    Returns:
        True if thumbnail needs to be fixed
    """
    if not current_thumbnail:
        return True

    # Already has YouTube thumbnail, check if it's the best quality
    if "youtube.com/vi" in current_thumbnail or "img.youtube.com" in current_thumbnail:
        if (
            "maxresdefault" not in current_thumbnail
            and "sddefault" not in current_thumbnail
        ):
            return True
        return False

    # Invalid URL
    if not current_thumbnail.startswith("http"):
        return True

    return False


async def fix_youtube_thumbnails(
    limit: int = 100,
    category_id: Optional[str] = None,
    include_kids: bool = True,
    dry_run: bool = True,
) -> Dict[str, Any]:
    """
    Fix missing or low-quality thumbnails for YouTube content.

    Args:
        limit: Maximum number of items to process
        category_id: Optional category filter
        include_kids: Include kids content
        dry_run: If True, only report what would be fixed

    Returns:
        Summary of fixes applied
    """
    logger.info("Fixing YouTube thumbnails...")
    contents = await _fetch_youtube_content(limit, category_id, include_kids)
    logger.info(f"Found {len(contents)} YouTube items to check")

    results = _initialize_results(dry_run, len(contents))

    for content in contents:
        await _process_content_thumbnail(content, results, dry_run)

    action = "would fix" if dry_run else "fixed"
    results["message"] = (
        f"YouTube thumbnails: {action} {results['thumbnails_fixed']}, "
        f"already good {results['already_good']}, failed {results['failed']}"
    )
    logger.info(f"YouTube thumbnail fix complete: {results['message']}")
    return results


async def _fetch_youtube_content(
    limit: int, category_id: Optional[str], include_kids: bool
) -> List[Content]:
    """Fetch YouTube content from database."""
    query: Dict[str, Any] = {
        "is_published": True,
        "$or": [{"stream_url": {"$regex": "youtube\\.com|youtu\\.be"}}],
    }
    if category_id:
        query["category_id"] = category_id
    if not include_kids:
        query["is_kids_content"] = {"$ne": True}
    return await Content.find(query).limit(limit).to_list()


def _initialize_results(dry_run: bool, total: int) -> Dict[str, Any]:
    """Initialize results dictionary."""
    return {
        "success": True,
        "dry_run": dry_run,
        "total_checked": total,
        "thumbnails_fixed": 0,
        "already_good": 0,
        "failed": 0,
        "fixed_items": [],
        "errors": [],
    }


async def _process_content_thumbnail(
    content: Content, results: Dict[str, Any], dry_run: bool
) -> None:
    """Process a single content item's thumbnail."""
    try:
        video_id = extract_video_id(content.stream_url)
        if not video_id:
            results["errors"].append(
                {
                    "content_id": str(content.id),
                    "title": content.title,
                    "error": "Could not extract video ID",
                }
            )
            results["failed"] += 1
            return

        current_thumbnail = content.thumbnail or ""
        if not thumbnail_needs_fix(current_thumbnail):
            results["already_good"] += 1
            return

        best_thumbnail = await get_best_youtube_thumbnail(video_id)
        if not best_thumbnail:
            results["errors"].append(
                {
                    "content_id": str(content.id),
                    "title": content.title,
                    "error": "Could not fetch thumbnail",
                }
            )
            results["failed"] += 1
            return

        await _apply_thumbnail_fix(
            content, video_id, current_thumbnail, best_thumbnail, results, dry_run
        )

    except Exception as e:
        results["errors"].append(
            {"content_id": str(content.id), "title": content.title, "error": str(e)}
        )
        results["failed"] += 1


async def _apply_thumbnail_fix(
    content: Content,
    video_id: str,
    old_thumbnail: str,
    new_thumbnail: str,
    results: Dict[str, Any],
    dry_run: bool,
) -> None:
    """Apply thumbnail fix to content."""
    if dry_run:
        results["fixed_items"].append(
            {
                "content_id": str(content.id),
                "title": content.title,
                "video_id": video_id,
                "old_thumbnail": old_thumbnail or "(none)",
                "new_thumbnail": new_thumbnail,
                "would_fix": True,
            }
        )
    else:
        content.thumbnail = new_thumbnail
        content.backdrop = new_thumbnail
        content.poster_url = new_thumbnail
        content.updated_at = datetime.utcnow()
        await content.save()
        results["fixed_items"].append(
            {
                "content_id": str(content.id),
                "title": content.title,
                "video_id": video_id,
                "old_thumbnail": old_thumbnail or "(none)",
                "new_thumbnail": new_thumbnail,
                "fixed": True,
            }
        )
        logger.info(f"Fixed thumbnail for: {content.title[:50]}...")
    results["thumbnails_fixed"] += 1
