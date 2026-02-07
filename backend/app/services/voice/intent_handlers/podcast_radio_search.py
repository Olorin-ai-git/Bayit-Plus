"""
Podcast, Radio & Audiobook Search
Direct collection lookup and 2-tier search fallback for podcasts, radio, and audiobooks.
Extracted following live_channel_search.py pattern for single-responsibility.
"""

import re
from typing import Any, Dict, List

from app.core.logging_config import get_logger
from app.models.content import Content, Podcast, RadioStation
from app.services.unified_search_service import SearchFilters, UnifiedSearchService

logger = get_logger(__name__)

# Strip type keywords from query so "podcast Kan" -> "Kan" for title matching
_TYPE_KEYWORD_RE = re.compile(
    r"\b(?:podcast|\u05e4\u05d5\u05d3\u05e7\u05d0\u05e1\u05d8"
    r"|radio|\u05e8\u05d3\u05d9\u05d5"
    r"|station|\u05ea\u05d7\u05e0\u05d4"
    r"|audiobook|audio\s+book|\u05e1\u05e4\u05e8\s+\u05e9\u05de\u05e2"
    r"|audiolibro|estacion)\b\s*",
    re.IGNORECASE,
)


def _clean_type_keyword(query: str) -> str:
    """Strip podcast/radio type keywords from query for cleaner title matching."""
    cleaned = _TYPE_KEYWORD_RE.sub("", query).strip()
    return cleaned if len(cleaned) >= 2 else query


def _extract_results(result) -> List[Dict[str, Any]]:
    """Extract results list from search response (handles Pydantic models and dicts)."""
    if hasattr(result, "results"):
        items = result.results
    elif isinstance(result, dict):
        items = result.get("results", [])
    else:
        return []

    def _to_dict(item):
        if isinstance(item, dict):
            return item
        return item.model_dump() if hasattr(item, "model_dump") else dict(item)

    return [_to_dict(i) for i in items]


async def lookup_podcast(query: str) -> List[Dict[str, Any]]:
    """Direct Podcast collection lookup by title/author regex."""
    cleaned = _clean_type_keyword(query)
    escaped = re.escape(cleaned)
    results = await Podcast.find(
        {
            "$and": [
                {"is_active": True},
                {
                    "$or": [
                        {"title": {"$regex": escaped, "$options": "i"}},
                        {"title_en": {"$regex": escaped, "$options": "i"}},
                        {"title_es": {"$regex": escaped, "$options": "i"}},
                        {"author": {"$regex": escaped, "$options": "i"}},
                    ]
                },
            ]
        }
    ).sort([("order", 1)]).limit(5).to_list()
    return [
        {
            "id": str(p.id),
            "title": p.title,
            "content_type": "podcast",
            "is_series": False,
        }
        for p in results
    ]


async def lookup_radio(query: str) -> List[Dict[str, Any]]:
    """Direct RadioStation collection lookup by name regex."""
    cleaned = _clean_type_keyword(query)
    escaped = re.escape(cleaned)
    results = await RadioStation.find(
        {
            "$and": [
                {"is_active": True},
                {
                    "$or": [
                        {"name": {"$regex": escaped, "$options": "i"}},
                        {"name_en": {"$regex": escaped, "$options": "i"}},
                        {"name_es": {"$regex": escaped, "$options": "i"}},
                    ]
                },
            ]
        }
    ).sort([("order", 1)]).limit(5).to_list()
    return [
        {
            "id": str(r.id),
            "title": r.name,
            "content_type": "radio",
            "is_series": False,
        }
        for r in results
    ]


async def search_podcasts(query: str) -> List[Dict[str, Any]]:
    """2-tier podcast search: direct lookup -> unified search."""
    results = await lookup_podcast(query)
    if results:
        return results
    try:
        service = UnifiedSearchService()
        filters = SearchFilters(content_types=["podcast"])
        cleaned = _clean_type_keyword(query)
        result = await service.search(query=cleaned, filters=filters, limit=5)
        return _extract_results(result)
    except Exception as e:
        logger.warning(
            "Unified podcast search failed",
            extra={"query": query, "error_type": type(e).__name__},
        )
        return []


async def search_radio(query: str) -> List[Dict[str, Any]]:
    """2-tier radio search: direct lookup -> unified search."""
    results = await lookup_radio(query)
    if results:
        return results
    try:
        service = UnifiedSearchService()
        filters = SearchFilters(content_types=["radio"])
        cleaned = _clean_type_keyword(query)
        result = await service.search(query=cleaned, filters=filters, limit=5)
        return _extract_results(result)
    except Exception as e:
        logger.warning(
            "Unified radio search failed",
            extra={"query": query, "error_type": type(e).__name__},
        )
        return []


async def lookup_audiobook(query: str) -> List[Dict[str, Any]]:
    """Direct Content collection lookup for audiobooks by title/author/narrator."""
    cleaned = _clean_type_keyword(query)
    escaped = re.escape(cleaned)
    results = await Content.find(
        {
            "$and": [
                {"is_published": True},
                {"content_format": "audiobook"},
                {
                    "$or": [
                        {"title": {"$regex": escaped, "$options": "i"}},
                        {"title_en": {"$regex": escaped, "$options": "i"}},
                        {"title_es": {"$regex": escaped, "$options": "i"}},
                        {"author": {"$regex": escaped, "$options": "i"}},
                        {"narrator": {"$regex": escaped, "$options": "i"}},
                    ]
                },
            ]
        }
    ).sort([("view_count", -1)]).limit(5).to_list()
    return [
        {
            "id": str(ab.id),
            "title": ab.title,
            "content_type": "audiobook",
            "is_series": False,
        }
        for ab in results
    ]


async def search_audiobooks(query: str) -> List[Dict[str, Any]]:
    """2-tier audiobook search: direct lookup -> unified search."""
    results = await lookup_audiobook(query)
    if results:
        return results
    try:
        service = UnifiedSearchService()
        filters = SearchFilters(content_types=["vod"])
        cleaned = _clean_type_keyword(query)
        result = await service.search(query=cleaned, filters=filters, limit=5)
        return _extract_results(result)
    except Exception as e:
        logger.warning(
            "Unified audiobook search failed",
            extra={"query": query, "error_type": type(e).__name__},
        )
        return []
