"""
Playlist Content Finder
Wraps search services for playlist content discovery.
Exports build_player_path for shared use with play_content_handler.
"""

from typing import Any, Dict, List

from app.core.logging_config import get_logger
from app.services.unified_search_service import SearchFilters, UnifiedSearchService
from app.services.vod_llm_search_service import VODLLMSearchService
from ..context import VoiceContext
from ..intent_keywords import detect_content_types

logger = get_logger(__name__)


async def find_content_for_playlist(
    query: str, context: VoiceContext
) -> List[Dict[str, Any]]:
    """
    Search for content matching the query using LLM and unified search.

    Follows the same search strategy as play_content_handler:
    1. Detect content types from query keywords
    2. Try LLM-powered VOD search first for better ranking
    3. Fall back to unified keyword search
    """
    content_types = detect_content_types(query, context.language)

    # Try LLM-powered VOD search first
    if "vod" in content_types:
        try:
            vod_llm = VODLLMSearchService()
            result = await vod_llm.search(
                query=query,
                subscription_tier=context.subscription_tier,
                limit=5,
            )
            items = result.get("results", [])
            if items:
                return items
        except Exception as e:
            logger.warning(
                "Playlist LLM search failed, falling back to unified",
                extra={"query": query, "error_type": type(e).__name__},
            )

    # Unified keyword search across all requested content types
    try:
        search_service = UnifiedSearchService()
        filters = SearchFilters(
            content_types=content_types,
            subscription_tier=context.subscription_tier,
            is_kids_content=False,
        )
        result = await search_service.search(query=query, filters=filters, limit=5)
        return result.get("results", [])
    except Exception as e:
        logger.error(
            "Playlist unified search failed",
            extra={"query": query, "error_type": type(e).__name__},
            exc_info=True,
        )
        return []


def build_player_path(content_id: str, content_type: str, is_series: bool) -> str:
    """Build the frontend player route for the matched content."""
    if content_type == "live":
        return f"/live/{content_id}"
    if content_type == "radio":
        return f"/radio/{content_id}"
    if content_type == "podcast":
        return f"/podcasts/{content_id}"
    if content_type == "audiobook":
        return f"/audiobooks/{content_id}"
    if is_series:
        return f"/vod/series/{content_id}"
    return f"/vod/{content_id}"
