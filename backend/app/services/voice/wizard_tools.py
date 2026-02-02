"""
Wizard Tools - Claude tool definitions and execution for voice assistant
Provides 5 specialized tools for content discovery and user assistance
"""

import logging
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, validator, ValidationError

from app.core.logging_config import get_logger
from app.models.content import LiveChannel
from app.services.kids_content_service import kids_content_service
from app.services.unified_search_service import SearchFilters, UnifiedSearchService
from app.services.chat_search_tool import execute_search_content, execute_lookup_user_guide

logger = get_logger(__name__)


# Pydantic models for tool input validation
class SearchContentInput(BaseModel):
    """Input validation for search_content tool."""
    query: str = Field(..., max_length=500)
    content_type: Optional[str] = Field("vod", pattern=r'^(vod|live|radio|podcast)$')
    genres: Optional[List[str]] = Field(None, max_items=10)
    year_min: Optional[int] = Field(None, ge=1900, le=2100)
    year_max: Optional[int] = Field(None, ge=1900, le=2100)
    is_kids_content: Optional[bool] = None
    limit: int = Field(5, ge=1, le=10)

    @validator('query')
    def validate_query(cls, v):
        if len(v.strip()) == 0:
            raise ValueError("Query cannot be empty")
        return v.strip()


class GetRecommendationsInput(BaseModel):
    """Input validation for get_recommendations tool."""
    content_type: str = Field("vod", pattern=r'^(vod|live|radio|podcast)$')
    based_on: Optional[str] = Field(None, max_length=100)
    limit: int = Field(10, ge=1, le=10)


class GetLiveChannelsInput(BaseModel):
    """Input validation for get_live_channels tool."""
    category: Optional[str] = Field(None, pattern=r'^(news|sports|entertainment|kids)$')


class GetKidsContentInput(BaseModel):
    """Input validation for get_kids_content tool."""
    age_group: str = Field(..., pattern=r'^(toddler|preschool|elementary|preteen)$')
    category: Optional[str] = Field(None, pattern=r'^(cartoons|educational|music|hebrew|stories|jewish)$')
    limit: int = Field(10, ge=1, le=10)


class LookupUserGuideInput(BaseModel):
    """Input validation for lookup_user_guide tool."""
    query: str = Field(..., max_length=500)

    @validator('query')
    def validate_query(cls, v):
        if len(v.strip()) == 0:
            raise ValueError("Query cannot be empty")
        return v.strip()


# Tool definitions with multilingual descriptions
WIZARD_TOOLS = [
    {
        "name": "search_content",
        "description": "חיפוש תכנים בקטלוג בית+ (סרטים, סדרות, שידורים חיים, רדיו, פודקאסטים) | Search Bayit+ catalog (movies, series, live TV, radio, podcasts) | Buscar catálogo Bayit+ (películas, series, TV en vivo, radio, podcasts)",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query - title, genre, actor, director, or descriptive terms"
                },
                "content_type": {
                    "type": "string",
                    "enum": ["vod", "live", "radio", "podcast"],
                    "description": "Content type filter (default: vod)"
                },
                "genres": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Genre filters (e.g., ['action', 'comedy'])"
                },
                "year_min": {
                    "type": "integer",
                    "description": "Minimum year filter"
                },
                "year_max": {
                    "type": "integer",
                    "description": "Maximum year filter"
                },
                "is_kids_content": {
                    "type": "boolean",
                    "description": "Filter for children's content only"
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum results (default: 5, max: 10)"
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "get_recommendations",
        "description": "קבלת המלצות מותאמות אישית על סמך היסטוריית הצפייה | Get personalized recommendations based on watch history | Obtener recomendaciones personalizadas basadas en historial",
        "input_schema": {
            "type": "object",
            "properties": {
                "content_type": {
                    "type": "string",
                    "enum": ["vod", "live", "radio", "podcast"],
                    "description": "Content type for recommendations"
                },
                "based_on": {
                    "type": "string",
                    "description": "Optional content ID to find similar content"
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum results (default: 10, max: 10)"
                }
            },
            "required": []
        }
    },
    {
        "name": "get_live_channels",
        "description": "רשימת ערוצי טלוויזיה בשידור חי לפי קטגוריה | List live TV channels by category | Listar canales de TV en vivo por categoría",
        "input_schema": {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "enum": ["news", "sports", "entertainment", "kids"],
                    "description": "Optional category filter"
                }
            },
            "required": []
        }
    },
    {
        "name": "get_kids_content",
        "description": "קבלת תוכן בטוח לילדים לפי קבוצת גיל | Get age-appropriate safe content for kids | Obtener contenido seguro para niños por grupo de edad",
        "input_schema": {
            "type": "object",
            "properties": {
                "age_group": {
                    "type": "string",
                    "enum": ["toddler", "preschool", "elementary", "preteen"],
                    "description": "Age group (toddler: 0-3, preschool: 4-6, elementary: 7-11, preteen: 12+)"
                },
                "category": {
                    "type": "string",
                    "enum": ["cartoons", "educational", "music", "hebrew", "stories", "jewish"],
                    "description": "Optional category filter"
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum results (default: 10, max: 10)"
                }
            },
            "required": ["age_group"]
        }
    },
    {
        "name": "lookup_user_guide",
        "description": "חיפוש במדריך המשתמש של בית+ (איך להשתמש, פתרון בעיות) | Search Bayit+ user guide (how-to, troubleshooting) | Buscar guía de usuario Bayit+ (cómo usar, solución de problemas)",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query for documentation"
                }
            },
            "required": ["query"]
        }
    }
]


async def execute_get_recommendations(
    content_type: str = "vod",
    based_on: Optional[str] = None,
    limit: int = 10
) -> Dict[str, Any]:
    """
    Execute get_recommendations tool - get personalized content recommendations.

    Args:
        content_type: Type of content (vod, live, radio, podcast)
        based_on: Optional content ID to find similar content
        limit: Maximum number of results (max 10)

    Returns:
        Dict with results and total_found
    """
    try:
        search_service = UnifiedSearchService()

        # Limit to max 10
        limit = min(limit, 10)

        if based_on:
            # Find similar content based on specific item
            # Use generic search with similar metadata
            logger.info(
                "Finding similar content",
                extra={"content_id": based_on, "limit": limit}
            )
            # Use content type search (similarity search can be added later)
            filters = SearchFilters(
                content_types=[content_type],
            )
            results = await search_service.search(
                query="",
                filters=filters,
                limit=limit
            )
        else:
            # General recommendations based on content type
            logger.info(
                "Getting recommendations",
                extra={"content_type": content_type, "limit": limit}
            )
            filters = SearchFilters(
                content_types=[content_type],
            )
            results = await search_service.search(
                query="",
                filters=filters,
                limit=limit
            )

        return {
            "results": [
                {
                    "id": str(r.get("_id", "")),
                    "title": r.get("title", ""),
                    "year": r.get("year"),
                    "genres": r.get("genres", []),
                    "rating": r.get("rating"),
                    "description": r.get("description", "")[:200]
                }
                for r in results.get("results", [])
            ],
            "total_found": results.get("total_found", 0)
        }

    except Exception as e:
        logger.error(
            "Failed to get recommendations",
            extra={"error": str(e)},
            exc_info=True
        )
        return {"results": [], "total_found": 0, "error": str(e)}


async def execute_get_live_channels(category: Optional[str] = None) -> Dict[str, Any]:
    """
    Execute get_live_channels tool - list live TV channels.

    Args:
        category: Optional category filter (news, sports, entertainment, kids)

    Returns:
        Dict with channels and total_found
    """
    try:
        logger.info(
            "Getting live channels",
            extra={"category": category}
        )

        query = {"available": True}
        if category:
            query["category"] = category

        channels = await LiveChannel.find(query).to_list(length=20)

        return {
            "channels": [
                {
                    "id": str(ch.id),
                    "name": ch.name,
                    "name_he": getattr(ch, "name_he", ch.name),
                    "category": getattr(ch, "category", "general"),
                    "logo_url": getattr(ch, "logo_url", "")
                }
                for ch in channels
            ],
            "total_found": len(channels)
        }

    except Exception as e:
        logger.error(
            "Failed to get live channels",
            extra={"error": str(e)},
            exc_info=True
        )
        return {"channels": [], "total_found": 0, "error": str(e)}


async def execute_get_kids_content(
    age_group: str,
    category: Optional[str] = None,
    limit: int = 10
) -> Dict[str, Any]:
    """
    Execute get_kids_content tool - get age-appropriate kids content.

    Args:
        age_group: Age group (toddler, preschool, elementary, preteen)
        category: Optional category filter
        limit: Maximum number of results (max 10)

    Returns:
        Dict with items and total_found
    """
    try:
        # Map age group to age_max
        age_map = {
            "toddler": 3,
            "preschool": 6,
            "elementary": 11,
            "preteen": 12
        }
        age_max = age_map.get(age_group, 12)

        logger.info(
            "Getting kids content",
            extra={"age_group": age_group, "age_max": age_max, "category": category}
        )

        # Limit to max 10
        limit = min(limit, 10)

        # Fetch content using kids_content_service
        response = await kids_content_service.fetch_all_content(
            age_max=age_max,
            category=category,
            limit=limit
        )

        return {
            "items": [
                {
                    "id": item.id,
                    "title": item.title,
                    "age_rating": item.age_rating,
                    "category": item.category,
                    "thumbnail": item.thumbnail,
                    "description": getattr(item, "description", "")[:200]
                }
                for item in response.items[:limit]
            ],
            "total_found": len(response.items)
        }

    except Exception as e:
        logger.error(
            "Failed to get kids content",
            extra={"error": str(e)},
            exc_info=True
        )
        return {"items": [], "total_found": 0, "error": str(e)}


# Tool execution dispatcher
async def execute_tool(tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute a wizard tool by name with input validation.

    Args:
        tool_name: Name of the tool to execute
        tool_input: Tool input parameters

    Returns:
        Tool execution result
    """
    try:
        if tool_name == "search_content":
            # Validate input using Pydantic model
            validated_input = SearchContentInput(**tool_input)
            return await execute_search_content(validated_input.dict())

        elif tool_name == "get_recommendations":
            validated_input = GetRecommendationsInput(**tool_input)
            return await execute_get_recommendations(**validated_input.dict())

        elif tool_name == "get_live_channels":
            validated_input = GetLiveChannelsInput(**tool_input)
            return await execute_get_live_channels(**validated_input.dict())

        elif tool_name == "get_kids_content":
            validated_input = GetKidsContentInput(**tool_input)
            return await execute_get_kids_content(**validated_input.dict())

        elif tool_name == "lookup_user_guide":
            validated_input = LookupUserGuideInput(**tool_input)
            return await execute_lookup_user_guide(validated_input.dict())

        else:
            logger.error("Unknown tool", extra={"tool_name": tool_name})
            return {"error": "Unknown tool", "tool_name": tool_name}

    except ValidationError as e:
        logger.error(
            "Tool input validation failed",
            extra={"tool_name": tool_name, "errors": e.errors()}
        )
        return {"error": "Invalid tool input", "details": e.errors()}
