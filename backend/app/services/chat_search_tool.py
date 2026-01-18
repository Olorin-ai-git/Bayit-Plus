"""
Chat Search Tool for Voice Assistant (Olorin)

Defines Claude tools for searching the content catalog and user guide from the chat endpoint.
Enables the voice assistant to answer questions about available content using
the UnifiedSearchService for full-text MongoDB search, and to provide help
using the user guide documentation.
"""

import json
import logging
from pathlib import Path
from typing import Any

from app.services.unified_search_service import UnifiedSearchService, SearchFilters

logger = logging.getLogger(__name__)

# Path to user guide documentation
USER_GUIDE_DOCS_PATH = Path(__file__).parent.parent.parent.parent / 'shared' / 'data' / 'support' / 'docs'

# Claude tool definitions for chat endpoint
CHAT_TOOLS = [
    {
        "name": "search_content",
        "description": (
            "Search the Bayit+ content catalog for movies, series, documentaries, and other video content. "
            "Use this tool when users ask about available content, want recommendations, or search for specific titles. "
            "Returns matching content with titles, descriptions, genres, years, and ratings."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query - can be title, genre, actor, director, or descriptive terms"
                },
                "content_type": {
                    "type": "string",
                    "enum": ["vod", "live", "radio", "podcast"],
                    "description": "Filter by content type (default: vod for movies/series)"
                },
                "genres": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Filter by genres (e.g., ['action', 'comedy', 'drama', 'documentary'])"
                },
                "year_min": {
                    "type": "integer",
                    "description": "Minimum year filter (e.g., 1990)"
                },
                "year_max": {
                    "type": "integer",
                    "description": "Maximum year filter (e.g., 2020)"
                },
                "is_kids_content": {
                    "type": "boolean",
                    "description": "Filter for children's content only"
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of results to return (default: 5, max: 10)"
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "lookup_user_guide",
        "description": (
            "Search the Bayit+ user guide and help documentation. "
            "Use this tool when users ask how to do something, need help with features, have questions about "
            "subscriptions, voice control, streaming issues, account settings, or troubleshooting. "
            "Returns relevant help articles and instructions."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "topic": {
                    "type": "string",
                    "description": "The topic or question to search for in the user guide"
                },
                "category": {
                    "type": "string",
                    "enum": ["getting-started", "features", "account", "troubleshooting"],
                    "description": "Optionally filter by category: getting-started, features, account, troubleshooting"
                },
                "language": {
                    "type": "string",
                    "enum": ["en", "he", "es"],
                    "description": "Language for the help content (default: matches user's language)"
                }
            },
            "required": ["topic"]
        }
    }
]


async def execute_search_content(
    query: str,
    content_type: str | None = None,
    genres: list[str] | None = None,
    year_min: int | None = None,
    year_max: int | None = None,
    is_kids_content: bool | None = None,
    limit: int = 5
) -> dict[str, Any]:
    """
    Execute content search using UnifiedSearchService.

    Args:
        query: Search query string
        content_type: Filter by content type (vod, live, radio, podcast)
        genres: List of genres to filter by
        year_min: Minimum year filter
        year_max: Maximum year filter
        is_kids_content: Filter for kids content
        limit: Maximum results to return (capped at 10)

    Returns:
        Dict with search results formatted for Claude consumption
    """
    # Cap limit to prevent excessive results
    limit = min(limit, 10)

    # Build search filters
    content_types = [content_type] if content_type else ["vod"]
    filters = SearchFilters(
        content_types=content_types,
        genres=genres,
        year_min=year_min,
        year_max=year_max,
        is_kids_content=is_kids_content
    )

    logger.info(f"[ChatTool] Searching: query='{query}', filters={filters}")

    # Execute search
    search_service = UnifiedSearchService()
    results = await search_service.search(
        query=query,
        filters=filters,
        page=1,
        limit=limit
    )

    logger.info(f"[ChatTool] Found {results.total} results in {results.execution_time_ms}ms")

    # Format results for Claude - include only essential fields
    formatted_results = []
    for item in results.results:
        formatted_item = {
            "id": item.get("id"),
            "title": item.get("title"),
            "title_en": item.get("title_en"),
            "type": "series" if item.get("is_series") else "movie",
            "year": item.get("year"),
            "genres": item.get("genres", []),
            "rating": item.get("rating"),
            "description": _truncate_description(item.get("description")),
            "director": item.get("director"),
            "cast": item.get("cast"),
            "thumbnail": item.get("thumbnail"),
            "is_kids_content": item.get("is_kids_content", False)
        }
        formatted_results.append(formatted_item)

    return {
        "results": formatted_results,
        "total_found": results.total,
        "query": query,
        "filters_applied": {
            "content_type": content_type,
            "genres": genres,
            "year_range": f"{year_min or 'any'}-{year_max or 'any'}",
            "kids_only": is_kids_content
        }
    }


def _truncate_description(description: str | None, max_length: int = 150) -> str | None:
    """Truncate description to save tokens while preserving meaning."""
    if not description:
        return None
    if len(description) <= max_length:
        return description
    return description[:max_length].rsplit(" ", 1)[0] + "..."


async def execute_lookup_user_guide(
    topic: str,
    category: str | None = None,
    language: str = "en"
) -> dict[str, Any]:
    """
    Search the user guide documentation for relevant help content.

    Args:
        topic: The topic or question to search for
        category: Optional category filter (getting-started, features, account, troubleshooting)
        language: Language code (en, he, es)

    Returns:
        Dict with matching help articles and excerpts
    """
    logger.info(f"[ChatTool] User guide lookup: topic='{topic}', category={category}, lang={language}")

    # Load manifest
    manifest_path = USER_GUIDE_DOCS_PATH / 'manifest.json'
    if not manifest_path.exists():
        logger.warning(f"[ChatTool] Manifest not found at {manifest_path}")
        return {"articles": [], "topic": topic, "error": "User guide not available"}

    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest = json.load(f)

    # Filter articles by language and optional category
    articles = manifest.get('articles', [])
    filtered_articles = [
        a for a in articles
        if a.get('language') == language
        and (category is None or a.get('category') == category)
    ]

    # Score articles by keyword match
    topic_lower = topic.lower()
    topic_words = set(topic_lower.split())

    scored_articles = []
    for article in filtered_articles:
        keywords = set(article.get('keywords', []))
        title_words = set(article.get('title', '').lower().split())
        all_words = keywords | title_words

        # Calculate overlap score
        overlap = len(topic_words & all_words)
        # Bonus for partial matches
        partial_bonus = sum(
            0.5 for tw in topic_words
            for aw in all_words
            if tw in aw or aw in tw
        )
        score = overlap + partial_bonus

        if score > 0:
            scored_articles.append((score, article))

    # Sort by score and take top 3
    scored_articles.sort(key=lambda x: x[0], reverse=True)
    top_articles = scored_articles[:3]

    # Load content for top articles
    results = []
    for score, article in top_articles:
        doc_path = USER_GUIDE_DOCS_PATH / language / article['path']
        content = ""

        if doc_path.exists():
            with open(doc_path, 'r', encoding='utf-8') as f:
                content = f.read()
            # Truncate to first 800 chars to save tokens
            if len(content) > 800:
                content = content[:800].rsplit('\n', 1)[0] + "\n..."

        results.append({
            "title": article.get('title', ''),
            "category": article.get('category', ''),
            "content": content,
            "relevance_score": score
        })

    logger.info(f"[ChatTool] Found {len(results)} relevant user guide articles")

    return {
        "articles": results,
        "topic": topic,
        "language": language,
        "total_found": len(results)
    }


async def execute_chat_tool(tool_name: str, tool_input: dict[str, Any]) -> dict[str, Any]:
    """
    Execute a chat tool and return results.

    Args:
        tool_name: Name of the tool to execute
        tool_input: Tool input parameters

    Returns:
        Tool execution results

    Raises:
        ValueError: If tool_name is not recognized
    """
    if tool_name == "search_content":
        return await execute_search_content(
            query=tool_input.get("query", ""),
            content_type=tool_input.get("content_type"),
            genres=tool_input.get("genres"),
            year_min=tool_input.get("year_min"),
            year_max=tool_input.get("year_max"),
            is_kids_content=tool_input.get("is_kids_content"),
            limit=tool_input.get("limit", 5)
        )
    elif tool_name == "lookup_user_guide":
        return await execute_lookup_user_guide(
            topic=tool_input.get("topic", ""),
            category=tool_input.get("category"),
            language=tool_input.get("language", "en")
        )
    else:
        raise ValueError(f"Unknown tool: {tool_name}")
