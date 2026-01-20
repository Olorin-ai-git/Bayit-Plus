"""
Subtitle Enrichment Service
Efficiently enriches content with available subtitle language information.
"""

import logging
from typing import Dict, List

from app.models.subtitles import SubtitleTrackDoc

logger = logging.getLogger(__name__)


async def get_subtitle_languages_for_contents(
    content_ids: List[str],
) -> Dict[str, List[str]]:
    """
    Batch fetch available subtitle languages for multiple content items.
    Returns mapping of content_id -> list of language codes.

    Args:
        content_ids: List of content IDs to fetch subtitles for

    Returns:
        Dictionary mapping content_id to list of language codes (e.g., {"content_123": ["en", "he", "es"]})
    """
    if not content_ids:
        return {}

    try:
        # Use aggregation pipeline to fetch ONLY content_id and language fields
        # This avoids fetching the huge 'cues' array which contains thousands of entries per track
        pipeline = [
            {"$match": {"content_id": {"$in": content_ids}}},
            {"$project": {"content_id": 1, "language": 1, "_id": 0}},
        ]

        # Run aggregation
        cursor = SubtitleTrackDoc.get_settings().pymongo_collection.aggregate(pipeline)
        all_subtitle_tracks = await cursor.to_list(length=None)

        # Build subtitle map: content_id -> list of unique language codes
        subtitle_map: Dict[str, set] = {}
        for track in all_subtitle_tracks:
            content_id = track.get("content_id")
            language = track.get("language")
            if content_id and language:
                if content_id not in subtitle_map:
                    subtitle_map[content_id] = set()
                subtitle_map[content_id].add(language)

        # Convert sets to lists for JSON serialization
        result = {
            content_id: list(languages)
            for content_id, languages in subtitle_map.items()
        }

        logger.debug(
            f"Fetched subtitle languages for {len(result)} content items out of {len(content_ids)} requested"
        )

        return result

    except Exception as e:
        logger.error(f"Error fetching subtitle languages: {e}", exc_info=True)
        # Return empty dict on error to avoid breaking content fetching
        return {}


async def enrich_content_items_with_subtitles(items: List[Dict]) -> List[Dict]:
    """
    Enrich content items with available subtitle languages.

    Args:
        items: List of content dictionaries with 'id' field

    Returns:
        Same list of items with 'available_subtitle_languages' field added
    """
    if not items:
        return items

    # Extract content IDs
    content_ids = [item.get("id") for item in items if item.get("id")]

    if not content_ids:
        return items

    # Batch fetch subtitle languages
    subtitle_map = await get_subtitle_languages_for_contents(content_ids)

    # Enrich each item
    for item in items:
        content_id = item.get("id")
        if content_id:
            item["available_subtitle_languages"] = subtitle_map.get(content_id, [])
            item["has_subtitles"] = len(subtitle_map.get(content_id, [])) > 0

    return items
