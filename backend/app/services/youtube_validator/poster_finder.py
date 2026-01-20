"""
YouTube Poster Finder

Functions for finding YouTube content with missing thumbnails/posters.
"""

import logging
from typing import Dict, Any, Optional

from app.models.content import Content
from app.services.youtube_validator.url_parser import extract_video_id


logger = logging.getLogger(__name__)


async def find_youtube_content_missing_posters(
    limit: int = 100,
    include_kids: bool = True
) -> Dict[str, Any]:
    """
    Find YouTube content items that are missing proper thumbnails/posters.

    Args:
        limit: Maximum number of items to return
        include_kids: Include kids content

    Returns:
        List of content items needing poster fixes
    """
    logger.info("Finding YouTube content with missing posters...")

    # Query for YouTube content
    base_query: Dict[str, Any] = {
        "is_published": True,
        "$or": [
            {"stream_url": {"$regex": "youtube\\.com|youtu\\.be"}},
        ]
    }

    if not include_kids:
        base_query["is_kids_content"] = {"$ne": True}

    # Find items with missing or bad thumbnails
    missing_query = {
        **base_query,
        "$or": [
            {"thumbnail": None},
            {"thumbnail": ""},
            {"thumbnail": {"$exists": False}},
            {"poster_url": None},
            {"poster_url": ""},
            {"poster_url": {"$exists": False}},
        ]
    }

    missing_items = await Content.find(missing_query).limit(limit).to_list()

    results = []
    for item in missing_items:
        video_id = extract_video_id(item.stream_url) if item.stream_url else None
        results.append({
            "content_id": str(item.id),
            "title": item.title,
            "video_id": video_id,
            "current_thumbnail": item.thumbnail,
            "current_poster": item.poster_url,
            "is_kids": item.is_kids_content,
            "category_id": item.category_id
        })

    return {
        "success": True,
        "total_found": len(results),
        "items": results,
        "message": f"Found {len(results)} YouTube items with missing posters"
    }
