"""
Play Content Intent Handler
Searches for content by name and navigates directly to the player.
Handles movies, series, podcasts, live TV, and radio.
"""

from typing import Any, Dict, List

from app.core.logging_config import get_logger
from app.services.unified_search_service import SearchFilters, UnifiedSearchService
from app.services.vod_llm_search_service import VODLLMSearchService
from app.services.llm_search_service import LLMSearchService
from ..context import VoiceContext
from ..error_messages import get_error_message
from ..intent_keywords import (
    detect_content_types,
    PLAYING_RESPONSES,
    CONTENT_NOT_FOUND_RESPONSES,
)
from .playlist_content_finder import build_player_path

logger = get_logger(__name__)


async def handle_play_content(
    transcript: str,
    context: VoiceContext,
) -> Dict[str, Any]:
    """
    Search for content by name and return a navigate action to the player.

    Supports VOD (movies/series), live TV channels, podcasts, and radio.
    Falls back to search results page if no match found.
    """
    try:
        content_types = detect_content_types(transcript, context.language)
        results = await _find_content(transcript, context, content_types)

        if results:
            top = results[0]
            content_id = top.get("id", "")
            title = top.get("title", transcript)
            content_type = top.get("content_type", "vod")
            is_series = top.get("is_series", False)

            path = build_player_path(content_id, content_type, is_series)
            spoken = PLAYING_RESPONSES.get(context.language, PLAYING_RESPONSES["en"]).format(title)

            logger.info(
                "Play content match found",
                extra={
                    "query": transcript,
                    "content_id": content_id,
                    "title": title,
                    "content_type": content_type,
                    "path": path,
                },
            )

            return {
                "spoken_response": spoken,
                "action": {"type": "navigate", "payload": {"path": path}},
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
        return await _search_live(query)

    # VOD queries: try LLM-powered search first for better ranking
    if "vod" in content_types:
        try:
            vod_llm = VODLLMSearchService()
            result = await vod_llm.search(
                query=query,
                subscription_tier=context.subscription_tier,
                is_beta_user=context.is_beta_user,
                limit=5,
            )
            items = result.get("results", [])
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
            subscription_tier=context.subscription_tier,
            is_kids_content=False,
        )
        result = await search_service.search(query=query, filters=filters, limit=5)
        return result.get("results", [])
    except Exception as e:
        logger.error(
            "Unified search failed",
            extra={"query": query, "error_type": type(e).__name__},
            exc_info=True,
        )
        return []


async def _search_live(query: str) -> List[Dict[str, Any]]:
    """Search live TV channels using EPG-aware LLM search."""
    try:
        llm_service = LLMSearchService()
        result = await llm_service.search(query=query, limit=5)
        return result.get("results", [])
    except Exception as e:
        logger.warning(
            "Live LLM search failed, trying unified",
            extra={"query": query, "error_type": type(e).__name__},
        )
        try:
            search_service = UnifiedSearchService()
            filters = SearchFilters(content_types=["live"])
            result = await search_service.search(query=query, filters=filters, limit=5)
            return result.get("results", [])
        except Exception as e2:
            logger.error(
                "Live unified search also failed",
                extra={"query": query, "error_type": type(e2).__name__},
                exc_info=True,
            )
            return []
