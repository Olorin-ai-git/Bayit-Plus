"""
Discovery helpers: autocomplete suggestions and filter option aggregation.

Extracted from pipeline.py to keep all modules under 200 lines.
"""

import asyncio
import re
from typing import Any, Dict, List

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.content import Content

logger = get_logger(__name__)


async def get_suggestions(query: str, limit: int = 5) -> List[str]:
    """Get autocomplete suggestions via Atlas Search autocomplete."""
    if len(query) < 2:
        return []

    config = settings.olorin.search_ranking
    collection = Content.get_pymongo_collection()

    pipeline = [
        {"$search": {
            "index": config.content_search_index,
            "autocomplete": {
                "query": query,
                "path": ["title", "title_en", "title_es"],
                "fuzzy": {"maxEdits": 1, "prefixLength": 2},
            },
        }},
        {"$match": {"is_published": True}},
        {"$project": {"title": 1, "title_en": 1}},
        {"$limit": limit * 2},
    ]

    try:
        docs = await collection.aggregate(pipeline).to_list(length=limit * 2)
    except Exception as exc:
        logger.warning(
            "Autocomplete $search failed, using $regex fallback",
            extra={"query": query, "error": str(exc)},
        )
        return await _suggestions_regex_fallback(query, limit)

    seen: set[str] = set()
    suggestions: List[str] = []
    for doc in docs:
        for field in ("title", "title_en"):
            val = doc.get(field)
            if val and val not in seen:
                seen.add(val)
                suggestions.append(val)
                if len(suggestions) >= limit:
                    return suggestions
    return suggestions


async def get_filter_options() -> Dict[str, Any]:
    """Aggregate available filter values from the content collection."""
    collection = Content.get_pymongo_collection()

    genres_pipe = [
        {"$match": {"is_published": True, "genres": {"$exists": True, "$ne": None}}},
        {"$unwind": "$genres"},
        {"$group": {"_id": "$genres"}},
        {"$sort": {"_id": 1}},
    ]
    year_pipe = [
        {"$match": {"is_published": True, "year": {"$exists": True, "$ne": None}}},
        {"$group": {"_id": None, "min_year": {"$min": "$year"}, "max_year": {"$max": "$year"}}},
    ]
    langs_pipe = [
        {"$match": {"is_published": True, "available_subtitle_languages": {"$exists": True, "$ne": []}}},
        {"$unwind": "$available_subtitle_languages"},
        {"$group": {"_id": "$available_subtitle_languages"}},
        {"$sort": {"_id": 1}},
    ]

    try:
        genres_res, year_res, langs_res = await asyncio.gather(
            collection.aggregate(genres_pipe).to_list(length=500),
            collection.aggregate(year_pipe).to_list(length=10),
            collection.aggregate(langs_pipe).to_list(length=500),
        )
    except Exception as exc:
        logger.error("Failed to get filter options", extra={"error": str(exc)})
        return _default_filter_options()

    genres = [r["_id"] for r in genres_res if r["_id"]]
    year_min = year_res[0]["min_year"] if year_res else 1900
    year_max = year_res[0]["max_year"] if year_res else 2026
    subtitle_languages = [r["_id"] for r in langs_res if r["_id"]]

    return {
        "genres": genres,
        "year_range": {"min": year_min, "max": year_max},
        "subtitle_languages": subtitle_languages,
        "content_types": ["vod", "live", "radio", "podcast"],
        "subscription_tiers": ["basic", "premium", "family"],
    }


async def _suggestions_regex_fallback(query: str, limit: int) -> List[str]:
    """Fallback autocomplete via $regex when Atlas Search unavailable."""
    escaped = re.escape(query)
    docs = await Content.find(
        {"is_published": True, "$or": [
            {"title": {"$regex": f"^{escaped}", "$options": "i"}},
            {"title_en": {"$regex": f"^{escaped}", "$options": "i"}},
        ]},
    ).limit(limit).to_list()

    seen: set[str] = set()
    suggestions: List[str] = []
    for doc in docs:
        for val in (doc.title, doc.title_en):
            if val and val not in seen:
                seen.add(val)
                suggestions.append(val)
    return suggestions[:limit]


def _default_filter_options() -> Dict[str, Any]:
    return {
        "genres": [],
        "year_range": {"min": 1900, "max": 2026},
        "subtitle_languages": [],
        "content_types": ["vod", "live", "radio", "podcast"],
        "subscription_tiers": ["basic", "premium", "family"],
    }
