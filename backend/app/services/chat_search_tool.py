"""
Chat Search Tool for Voice Assistant (Olorin)

Defines Claude tools for searching the content catalog and user guide from the chat endpoint.
Enables the voice assistant to answer questions about available content using
the UnifiedSearchService for full-text MongoDB search, and to provide help
using the comprehensive documentation system with 219+ articles across 9 categories.
"""

import json
import logging
from pathlib import Path
from typing import Any

from app.services.docs_search_service import docs_search_service
from app.services.unified_search_service import SearchFilters, UnifiedSearchService

logger = logging.getLogger(__name__)

# Path to user guide documentation
USER_GUIDE_DOCS_PATH = (
    Path(__file__).parent.parent.parent.parent / "shared" / "data" / "support" / "docs"
)

# All available documentation categories
DOCUMENTATION_CATEGORIES = [
    "getting-started",
    "features",
    "account",
    "troubleshooting",
    "judaism",
    "parents",
    "admin",
    "developer",
    "platform-guides",
]

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
                    "description": "Search query - can be title, genre, actor, director, or descriptive terms",
                },
                "content_type": {
                    "type": "string",
                    "enum": ["vod", "live", "radio", "podcast"],
                    "description": "Filter by content type (default: vod for movies/series)",
                },
                "genres": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Filter by genres (e.g., ['action', 'comedy', 'drama', 'documentary'])",
                },
                "year_min": {
                    "type": "integer",
                    "description": "Minimum year filter (e.g., 1990)",
                },
                "year_max": {
                    "type": "integer",
                    "description": "Maximum year filter (e.g., 2020)",
                },
                "is_kids_content": {
                    "type": "boolean",
                    "description": "Filter for children's content only",
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of results to return (default: 5, max: 10)",
                },
            },
            "required": ["query"],
        },
    },
    {
        "name": "lookup_user_guide",
        "description": (
            "Search the comprehensive Bayit+ documentation system with 219+ articles and 80+ FAQ entries. "
            "Use this tool when users ask how to do something, need help with features, or have questions about:\n"
            "- Getting started: account setup, platform overview, choosing subscriptions\n"
            "- Features: voice control, recordings, downloads, search, profiles, subtitles, EPG guide, watch parties\n"
            "- Account management: subscription, profile settings, security, notifications, device management\n"
            "- Troubleshooting: streaming issues, login problems, audio, subtitles, voice control, downloads, errors\n"
            "- Judaism content: Torah, Jewish calendar, Shabbat mode, community directory, zmanim\n"
            "- Parents/Kids: parental controls, kids profiles, screen time limits, age ratings, safe browsing\n"
            "- Platform guides: Web, iOS, Android, Apple TV, Android TV, CarPlay setup and usage\n"
            "- Admin: dashboard, content management, user management, analytics, campaigns\n"
            "- Developer: API overview, authentication, content API, streaming API, webhooks, rate limits\n"
            "Returns relevant help articles, FAQ entries, and detailed instructions."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "topic": {
                    "type": "string",
                    "description": "The topic or question to search for in the documentation",
                },
                "category": {
                    "type": "string",
                    "enum": [
                        "getting-started",
                        "features",
                        "account",
                        "troubleshooting",
                        "judaism",
                        "parents",
                        "admin",
                        "developer",
                        "platform-guides",
                    ],
                    "description": "Optionally filter by category to narrow down results",
                },
                "audience": {
                    "type": "string",
                    "enum": ["user", "parent", "admin", "developer"],
                    "description": "Optionally filter by target audience",
                },
                "language": {
                    "type": "string",
                    "enum": ["en", "he", "es"],
                    "description": "Language for the help content (default: matches user's language)",
                },
            },
            "required": ["topic"],
        },
    },
]


async def execute_search_content(
    query: str,
    content_type: str | None = None,
    genres: list[str] | None = None,
    year_min: int | None = None,
    year_max: int | None = None,
    is_kids_content: bool | None = None,
    limit: int = 5,
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
        is_kids_content=is_kids_content,
    )

    logger.info(f"[ChatTool] Searching: query='{query}', filters={filters}")

    # Execute search
    search_service = UnifiedSearchService()
    results = await search_service.search(
        query=query, filters=filters, page=1, limit=limit
    )

    logger.info(
        f"[ChatTool] Found {results.total} results in {results.execution_time_ms}ms"
    )

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
            "is_kids_content": item.get("is_kids_content", False),
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
            "kids_only": is_kids_content,
        },
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
    audience: str | None = None,
    language: str = "en",
) -> dict[str, Any]:
    """
    Search the comprehensive documentation system for relevant help content.

    Uses DocsSearchService to search across 219+ articles and 80+ FAQ entries
    with intelligent relevance scoring.

    Args:
        topic: The topic or question to search for
        category: Optional category filter (9 categories available)
        audience: Optional audience filter (user, parent, admin, developer)
        language: Language code (en, he, es)

    Returns:
        Dict with matching articles, FAQ entries, and content excerpts
    """
    logger.info(
        f"[ChatTool] Documentation lookup: topic='{topic}', "
        f"category={category}, audience={audience}, lang={language}"
    )

    # Use DocsSearchService for comprehensive search
    search_results = await docs_search_service.search(
        query=topic,
        language=language,
        category=category,
        audience=audience,
        limit=10,
    )

    articles = search_results.get("articles", [])
    faq_results = search_results.get("faq", [])

    # Load content for top 3 articles
    article_results = []
    for article in articles[:3]:
        slug = article.get("slug", "")
        content_data = await docs_search_service.get_article_content(
            slug=slug,
            language=language,
        )

        content = ""
        if content_data:
            content = content_data.get("content", "")
            # Truncate to first 1000 chars to save tokens while providing useful context
            if len(content) > 1000:
                content = content[:1000].rsplit("\n", 1)[0] + "\n..."

        article_results.append(
            {
                "title": article.get("title_key", slug),
                "slug": slug,
                "category": article.get("category", ""),
                "subcategory": article.get("subcategory"),
                "content": content,
                "relevance_score": article.get("score", 0),
                "platforms": article.get("platforms", ["all"]),
            }
        )

    # Format FAQ results
    faq_formatted = []
    for faq in faq_results[:3]:
        faq_formatted.append(
            {
                "question": faq.get("question", ""),
                "answer": faq.get("answer", ""),
                "category": faq.get("category", ""),
                "relevance_score": faq.get("score", 0),
            }
        )

    total_found = len(articles) + len(faq_results)

    logger.info(
        f"[ChatTool] Found {len(article_results)} articles and "
        f"{len(faq_formatted)} FAQ entries for '{topic}'"
    )

    return {
        "articles": article_results,
        "faq": faq_formatted,
        "topic": topic,
        "language": language,
        "category_filter": category,
        "audience_filter": audience,
        "total_found": total_found,
        "available_categories": DOCUMENTATION_CATEGORIES,
    }


async def execute_chat_tool(
    tool_name: str, tool_input: dict[str, Any]
) -> dict[str, Any]:
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
            limit=tool_input.get("limit", 5),
        )
    elif tool_name == "lookup_user_guide":
        return await execute_lookup_user_guide(
            topic=tool_input.get("topic", ""),
            category=tool_input.get("category"),
            audience=tool_input.get("audience"),
            language=tool_input.get("language", "en"),
        )
    else:
        raise ValueError(f"Unknown tool: {tool_name}")
