"""
Live Channel Search
Direct LiveChannel collection lookup and 3-tier live search fallback.
Extracted from play_content_handler for single-responsibility adherence.
"""

import re
from typing import Any, Dict, List

from app.core.logging_config import get_logger
from app.models.content import LiveChannel
from app.services.unified_search_service import SearchFilters, UnifiedSearchService
from app.services.llm_search_service import LLMSearchService
from ..channel_keywords import normalize_number_words

logger = get_logger(__name__)


def _extract_live_results(result) -> List[Dict[str, Any]]:
    """Extract results list from search response (handles Pydantic models and dicts)."""
    if hasattr(result, 'results'):
        items = result.results
    elif isinstance(result, dict):
        items = result.get("results", [])
    else:
        return []
    def _to_dict(item):
        if isinstance(item, dict):
            return item
        return item.model_dump() if hasattr(item, 'model_dump') else dict(item)
    return [_to_dict(i) for i in items]


async def lookup_live_channel(query: str) -> List[Dict[str, Any]]:
    """Direct LiveChannel collection lookup by name/number regex."""
    normalized = normalize_number_words(query)
    digits = re.findall(r"\d+", normalized)
    escaped = re.escape(normalized)
    conditions: List[Dict[str, Any]] = [{"is_active": True}]
    name_or: List[Dict[str, Any]] = [
        {"name": {"$regex": escaped, "$options": "i"}},
        {"name_en": {"$regex": escaped, "$options": "i"}},
        {"name_es": {"$regex": escaped, "$options": "i"}},
    ]
    if digits:
        num_pat = rf"\b{re.escape(digits[0])}\b"
        name_or.extend([{"name": {"$regex": num_pat}}, {"name_en": {"$regex": num_pat}}])
    conditions.append({"$or": name_or})
    results = await LiveChannel.find({"$and": conditions}).sort([("order", 1)]).limit(5).to_list()
    return [
        {"id": str(ch.id), "title": ch.name, "content_type": "live", "is_series": False}
        for ch in results
    ]


async def search_live(query: str) -> List[Dict[str, Any]]:
    """3-tier live channel search: direct lookup -> unified -> LLM EPG."""
    # Tier 1: Direct LiveChannel lookup (fast, no LLM)
    results = await lookup_live_channel(query)
    if results:
        return results

    # Tier 2: UnifiedSearchService regex search (no LLM)
    try:
        search_service = UnifiedSearchService()
        filters = SearchFilters(content_types=["live"])
        result = await search_service.search(query=query, filters=filters, limit=5)
        items = _extract_live_results(result)
        if items:
            return items
    except Exception as e:
        logger.warning(
            "Unified live search failed",
            extra={"query": query, "error_type": type(e).__name__},
        )

    # Tier 3: LLM EPG search (last resort)
    try:
        llm_service = LLMSearchService()
        result = await llm_service.search(query=query, limit=5)
        return _extract_live_results(result)
    except Exception as e:
        logger.error(
            "LLM live search also failed",
            extra={"query": query, "error_type": type(e).__name__},
            exc_info=True,
        )
        return []
