"""
Voice Web Search Service
Performs web searches for voice commands and returns structured results
suitable for iFrame widget display on the frontend.

Uses DuckDuckGo Instant Answer API following patterns from
app/services/nlp/tools/web_search.py.
"""

from typing import Any, Dict, List

import httpx

from app.core.logging_config import get_logger

logger = get_logger(__name__)

DUCKDUCKGO_API_URL = "https://api.duckduckgo.com/"
DEFAULT_TIMEOUT_SECONDS = 10.0
DEFAULT_MAX_RESULTS = 5


async def voice_web_search(
    query: str,
    language: str = "en",
    max_results: int = DEFAULT_MAX_RESULTS,
) -> Dict[str, Any]:
    """
    Perform a web search for voice-initiated queries.

    Returns structured results with URLs suitable for iFrame widgets.

    Args:
        query: Search query from voice transcript
        language: Language code for result preference
        max_results: Maximum number of results to return

    Returns:
        Dict with search results containing title, url, and snippet
    """
    try:
        logger.info(
            "Voice web search",
            extra={"query": query, "language": language},
        )

        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT_SECONDS) as client:
            response = await client.get(
                DUCKDUCKGO_API_URL,
                params={
                    "q": query,
                    "format": "json",
                    "no_html": 1,
                    "skip_disambig": 1,
                },
            )
            response.raise_for_status()
            data = response.json()

        results = _extract_results(data, max_results)

        logger.info(
            "Voice web search completed",
            extra={"query": query, "result_count": len(results)},
        )

        return {
            "query": query,
            "results": results,
            "total_found": len(results),
        }

    except httpx.TimeoutException:
        logger.warning(
            "Voice web search timeout",
            extra={"query": query},
        )
        return {"query": query, "results": [], "total_found": 0, "error": "timeout"}

    except Exception as e:
        logger.error(
            "Voice web search failed",
            extra={"query": query, "error": str(e)},
            exc_info=True,
        )
        return {"query": query, "results": [], "total_found": 0, "error": str(e)}


def _extract_results(data: Dict[str, Any], max_results: int) -> List[Dict[str, str]]:
    """
    Extract structured results from DuckDuckGo API response.

    Args:
        data: Raw API response
        max_results: Maximum results to return

    Returns:
        List of result dicts with title, url, snippet
    """
    results: List[Dict[str, str]] = []

    # Abstract (main answer)
    if data.get("Abstract") and data.get("AbstractURL"):
        results.append({
            "title": data.get("Heading", ""),
            "url": data["AbstractURL"],
            "snippet": data["Abstract"],
        })

    # Related topics
    for topic in data.get("RelatedTopics", []):
        if len(results) >= max_results:
            break
        if isinstance(topic, dict) and topic.get("Text") and topic.get("FirstURL"):
            results.append({
                "title": topic["Text"][:120],
                "url": topic["FirstURL"],
                "snippet": topic["Text"],
            })

    return results[:max_results]
