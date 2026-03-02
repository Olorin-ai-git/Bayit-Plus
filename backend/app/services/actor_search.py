"""
Actor Search Helper
Searches for actors by name using MongoDB aggregation on the ``cast`` field.
Returns results shaped for the unified search response.
"""

from typing import Any, Dict, List

from app.core.logging_config import get_logger
from app.models.content import Content
from app.services.tmdb_person_service import fetch_actor_tmdb_data

logger = get_logger(__name__)


async def actor_search_helper(
    query: str,
    limit: int = 10,
) -> List[Dict[str, Any]]:
    """
    Search for actors whose name matches *query* (case-insensitive).

    Returns a list of dicts matching the UnifiedSearchResult shape so they
    can be merged directly into unified search responses.
    """
    if not query or not query.strip():
        return []

    pipeline = [
        {"$match": {
            "cast": {"$exists": True, "$ne": []},
            "is_published": True,
            "content_format": {"$ne": "series"},
        }},
        {"$unwind": "$cast"},
        {"$match": {"cast": {"$regex": query, "$options": "i"}}},
        {
            "$group": {
                "_id": "$cast",
                "movie_count": {"$sum": 1},
                "sample_thumbnail": {"$first": "$thumbnail"},
            }
        },
        {"$sort": {"movie_count": -1}},
        {"$limit": limit},
    ]

    collection = Content.get_pymongo_collection()
    raw_actors = await collection.aggregate(pipeline).to_list(length=None)

    results: List[Dict[str, Any]] = []
    for actor in raw_actors:
        name = actor["_id"]
        tmdb = await fetch_actor_tmdb_data(name)

        results.append(
            {
                "id": name,
                "title": name,
                "description": f"{actor['movie_count']} films",
                "thumbnail": tmdb.get("profile_url") or actor.get("sample_thumbnail"),
                "backdrop": None,
                "category_name": None,
                "duration": None,
                "year": None,
                "rating": None,
                "genres": None,
                "content_type": "actor",
                "requires_subscription": None,
                "is_kids_content": None,
                "available_subtitle_languages": None,
                "has_subtitles": None,
                "is_featured": None,
                "author": None,
                "narrator": None,
            }
        )

    logger.info("Actor search for '%s' returned %d results", query, len(results))
    return results
