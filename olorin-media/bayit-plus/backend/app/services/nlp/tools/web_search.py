"""
Web Search Tool - Search the web using DuckDuckGo.
"""

import logging
from typing import List

import httpx

logger = logging.getLogger(__name__)


async def web_search(query: str, num_results: int = 5) -> str:
    """
    Search the web using DuckDuckGo Instant Answer API.

    Args:
        query: Search query
        num_results: Maximum number of results to return

    Returns:
        Formatted search results as string
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://api.duckduckgo.com/",
                params={
                    "q": query,
                    "format": "json",
                    "no_html": 1,
                    "skip_disambig": 1
                }
            )
            response.raise_for_status()
            data = response.json()

            # Extract results
            results = []

            # Abstract (main answer)
            if data.get("Abstract"):
                results.append(f"Answer: {data['Abstract']}")
                if data.get("AbstractURL"):
                    results.append(f"Source: {data['AbstractURL']}")

            # Related topics
            if data.get("RelatedTopics"):
                results.append("\nRelated:")
                for topic in data["RelatedTopics"][:num_results]:
                    if isinstance(topic, dict) and topic.get("Text"):
                        results.append(f"- {topic['Text']}")
                        if topic.get("FirstURL"):
                            results.append(f"  {topic['FirstURL']}")

            if not results:
                return f"No results found for '{query}'"

            return "\n".join(results)

    except Exception as e:
        logger.error(f"Web search failed: {e}")
        return f"Web search failed: {str(e)}"
