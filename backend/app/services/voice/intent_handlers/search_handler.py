"""
Search Intent Handler
Handles search with intelligent routing between services
"""

import re
from typing import Any, Dict, List

from app.core.logging_config import get_logger
from app.services.unified_search_service import SearchFilters, UnifiedSearchService
from app.services.vod_llm_search_service import VODLLMSearchService
from app.services.llm_search_service import LLMSearchService
from ..context import VoiceContext
from ..error_messages import get_error_message

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
        results = await vod_llm_service.search(
            query=query,
            subscription_tier=context.subscription_tier,
            is_beta_user=context.is_beta_user,
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
        search_service = UnifiedSearchService()
        filters = SearchFilters(
            content_types=["vod"],
            subscription_tier=context.subscription_tier,
            is_kids_content=False
        )
        results = await search_service.search(query=query, filters=filters, limit=10)
        return results.get("results", [])
    except Exception as e:
        logger.error(
            "Simple VOD search failed",
            extra={"query": query, "error_type": type(e).__name__},
            exc_info=True
        )
        return []


def _format_voice_search_results(results: List[Dict], language: str) -> str:
    """Format search results for voice output (3 languages)."""
    total = len(results)

    if language == "he":
        if total == 0:
            return "מצטער, לא מצאתי תוצאות"
        elif total == 1:
            title = results[0].get("title", "")
            year = results[0].get("year", "")
            return f"מצאתי: {title}" + (f" משנת {year}" if year else "")
        else:
            titles = ", ".join([r.get("title", "") for r in results[:3]])
            return f"מצאתי {total} תוצאות. הנה 3 הראשונות: {titles}"

    elif language == "en":
        if total == 0:
            return "Sorry, I found no results"
        elif total == 1:
            title = results[0].get("title", "")
            year = results[0].get("year", "")
            return f"Found: {title}" + (f" from {year}" if year else "")
        else:
            titles = ", ".join([r.get("title", "") for r in results[:3]])
            return f"Found {total} results. Here are the top 3: {titles}"

    else:  # Spanish
        if total == 0:
            return "Lo siento, no encontré resultados"
        elif total == 1:
            title = results[0].get("title", "")
            year = results[0].get("year", "")
            return f"Encontré: {title}" + (f" del año {year}" if year else "")
        else:
            titles = ", ".join([r.get("title", "") for r in results[:3]])
            return f"Encontré {total} resultados. Aquí están los 3 mejores: {titles}"
