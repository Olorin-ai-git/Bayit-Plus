"""
Search Intent Handler
Handles search with intelligent routing between services
"""

import re
from typing import Any, Dict, List

from app.core.logging_config import get_logger
from app.services.search import SearchFilters, create_search_pipeline
from app.services.vod_llm_search_service import VODLLMSearchService
from app.services.llm_search_service import LLMSearchService
from ..context import VoiceContext
from ..error_messages import get_error_message
from ..voice_formatters import format_voice_search_results as _format_voice_search_results

logger = get_logger(__name__)


async def handle_search(
    transcript: str,
    context: VoiceContext
) -> Dict[str, Any]:
    """
    Handle search with intelligent routing between services.

    Routes:
    - Live/EPG keywords → LLMSearchService
    - Complex natural language → VODLLMSearchService
    - Simple keyword → UnifiedSearchService

    Args:
        transcript: Search query
        context: Voice request context

    Returns:
        Dict with spoken_response and action
    """
    try:
        # Classify search type
        search_type = _classify_search_type(transcript, context.language)

        logger.info(
            "Search request",
            extra={
                "user_id": context.user_id,
                "query": transcript,
                "search_type": search_type,
                "language": context.language
            }
        )

        # Route to appropriate search service
        if search_type == "live":
            results = await _execute_live_search(transcript, context)
        elif search_type == "complex_vod":
            results = await _execute_complex_vod_search(transcript, context)
        else:
            results = await _execute_simple_vod_search(transcript, context)

        # Format for voice
        spoken_response = _format_voice_search_results(results, context.language)

        return {
            "spoken_response": spoken_response,
            "action": {
                "type": "search",
                "payload": {"query": transcript, "results": results[:10]}
            }
        }

    except Exception as e:
        logger.error(
            "Search handler failed",
            extra={"user_id": context.user_id, "error": str(e)},
            exc_info=True
        )
        return {
            "spoken_response": get_error_message("search_failure", context.language),
            "action": {"type": "search", "payload": {"query": transcript}}
        }


# Helper functions

def _classify_search_type(query: str, language: str) -> str:
    """
    Classify search query type for routing.

    Returns:
        'live', 'complex_vod', or 'simple_vod'
    """
    query_lower = query.lower()

    # Live/EPG keywords (3 languages)
    live_keywords = {
        "he": ["עכשיו", "הלילה", "ערוץ", "שידור חי", "טלוויזיה"],
        "en": ["now", "tonight", "channel", "live tv", "on tv"],
        "es": ["ahora", "esta noche", "canal", "tv en vivo"]
    }

    if any(kw in query_lower for kw in live_keywords.get(language, [])):
        return "live"

    # Complex query indicators (multi-criteria, thematic)
    if len(query.split()) > 5:
        return "complex_vod"

    # Check for multiple criteria
    has_year = bool(re.search(r'\d{4}', query))
    has_genre = any(genre in query_lower for genre in [
        "action", "comedy", "drama", "documentary", "אקשן", "קומדיה", "דרמה"
    ])

    if has_year and has_genre:
        return "complex_vod"

    # Default to simple search
    return "simple_vod"


async def _execute_live_search(query: str, context: VoiceContext) -> List[Dict]:
    """Execute live TV/EPG search using LLMSearchService."""
    try:
        llm_service = LLMSearchService()
        results = await llm_service.search(query=query, limit=10)
        return results.get("results", [])
    except Exception as e:
        logger.error(
            "Live search failed",
            extra={"query": query, "error_type": type(e).__name__},
            exc_info=True
        )
        return []


async def _execute_complex_vod_search(query: str, context: VoiceContext) -> List[Dict]:
    """Execute complex VOD search using VODLLMSearchService."""
    try:
        vod_llm_service = VODLLMSearchService()
        user_context = {
            "subscription_tier": context.subscription_tier,
        }
        results = await vod_llm_service.search(
            query=query,
            user_context=user_context,
            limit=10
        )
        return results.get("results", [])
    except Exception as e:
        logger.error(
            "Complex VOD search failed",
            extra={"query": query, "error_type": type(e).__name__},
            exc_info=True
        )
        return []


async def _execute_simple_vod_search(query: str, context: VoiceContext) -> List[Dict]:
    """Execute simple VOD search using UnifiedSearchService."""
    try:
        pipeline = create_search_pipeline()
        filters = SearchFilters(
            content_types=["vod"],
            subscription_tier=context.subscription_tier,
            is_kids_content=False,
        )
        search_results = await pipeline.search(query=query, filters=filters, limit=10)
        return search_results.results
    except Exception as e:
        logger.error(
            "Simple VOD search failed",
            extra={"query": query, "error_type": type(e).__name__},
            exc_info=True
        )
        return []


# Formatter imported from voice_formatters module
