"""
Play Content Intent Handler
Searches for content by name and navigates directly to the player.
Handles movies, series, podcasts, live TV, and radio.
"""

from typing import Any, Dict, List

from app.core.logging_config import get_logger
from app.services.unified_search_service import SearchFilters, UnifiedSearchService
from app.services.vod_llm_search_service import VODLLMSearchService
from ..context import VoiceContext
from ..error_messages import get_error_message
from ..intent_keywords import (
    detect_content_types,
    PLAYING_RESPONSES,
    CONTENT_NOT_FOUND_RESPONSES,
)
from .live_channel_search import search_live
from .podcast_radio_search import search_podcasts, search_radio, search_audiobooks
from .playlist_content_finder import build_player_path

logger = get_logger(__name__)


def _extract_results(result) -> List[Dict[str, Any]]:
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


async def handle_play_content(
    transcript: str,
    context: VoiceContext,
) -> Dict[str, Any]:
    """
    Search for content by name and return a navigate action to the player.

    Supports VOD (movies/series), live TV channels, podcasts, radio, and audiobooks.
    Falls back to search results page if no match found.
    """
    try:
        content_types = detect_content_types(transcript, context.language)
        results = await _find_content(transcript, context, content_types)
        logger.info(
            "Play content search",
            extra={"query": transcript, "types": content_types, "count": len(results)},
        )

        if results:
            top = results[0]
            content_id = top.get("id", "")
            title = top.get("title", transcript)
            content_type = top.get("content_type", "vod")
            is_series = top.get("is_series", False)
            path = build_player_path(content_id, content_type, is_series)
            spoken = PLAYING_RESPONSES.get(context.language, PLAYING_RESPONSES["en"]).format(title)
            logger.info(
                "Play content match",
                extra={"query": transcript, "id": content_id, "title": title, "path": path},
            )
            return {
                "spoken_response": spoken,
                "action": {
                    "type": "navigate",
                    "payload": {
                        "path": path,
                        "content_id": content_id,
                        "title": title,
                        "content_type": content_type,
                        "is_series": is_series,
                        "thumbnail": top.get("thumbnail", ""),
                    },
                },
            }

        not_found = CONTENT_NOT_FOUND_RESPONSES.get(context.language, CONTENT_NOT_FOUND_RESPONSES["en"])
        return {
            "spoken_response": not_found.format(transcript),
            "action": {"type": "search", "payload": {"query": transcript}},
        }

    except Exception as e:
        logger.error(
            "Play content handler failed",
            extra={"query": transcript, "error": str(e)},
            exc_info=True,
        )
        return {
            "spoken_response": get_error_message("search_failure", context.language),
            "action": {"type": "search", "payload": {"query": transcript}},
        }


async def _find_content(
    query: str, context: VoiceContext, content_types: List[str]
) -> List[Dict[str, Any]]:
    """Search for content across the requested content types."""
    if content_types == ["live"]:
        return await search_live(query)
    if content_types == ["podcast"]:
        return await search_podcasts(query)
    if content_types == ["radio"]:
        return await search_radio(query)
    if content_types == ["audiobook"]:
        return await search_audiobooks(query)

    # VOD queries: try LLM-powered search for enhanced results
    if "vod" in content_types:
        try:
            vod_llm = VODLLMSearchService()
            user_ctx = {
                "subscription_tier": context.subscription_tier,
                "language": context.language,
            }
            result = await vod_llm.search(
                query=query,
                user_context=user_ctx,
                limit=5,
            )
            items = _extract_results(result)
            if items:
                return items
        except Exception as e:
            logger.warning(
                "LLM search failed, falling back to unified search",
                extra={"query": query, "error_type": type(e).__name__},
            )

    # Unified keyword search across all requested content types
    try:
        search_service = UnifiedSearchService()
        filters = SearchFilters(
            content_types=content_types,
            subscription_tier=None,  # Show all content; tier check at playback time
            is_kids_content=None,  # Search ALL content (kids + non-kids)
        )
        result = await search_service.search(query=query, filters=filters, limit=5)
        return _extract_results(result)
    except Exception as e:
        logger.error(
            "Unified search failed",
            extra={"query": query, "error_type": type(e).__name__},
            exc_info=True,
        )
        return []
