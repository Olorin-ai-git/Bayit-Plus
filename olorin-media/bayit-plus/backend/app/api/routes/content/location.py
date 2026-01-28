"""
Location-based Israeli content endpoint for discovering content by US city.

Endpoint: GET /api/v1/content/israelis-in-city
Query params: city, state, [county], [limit_per_type]
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request

from app.api.routes.content.utils import is_series_by_category
from app.core.security import get_optional_user, get_passkey_session
from app.models.user import User
from app.services.location_content_service import LocationContentService

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/israelis-in-city")
async def get_israelis_in_city(
    request: Request,
    city: str = Query(..., description="City name (e.g., 'New York')"),
    state: str = Query(..., description="Two-letter state code (e.g., 'NY')"),
    county: Optional[str] = Query(None, description="County name (optional)"),
    limit_per_type: int = Query(
        10, ge=1, le=50, description="Max items per content type"
    ),
    include_articles: bool = Query(True, description="Include news articles"),
    include_reels: bool = Query(True, description="Include news reels"),
    include_events: bool = Query(True, description="Include community events"),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get Israeli-focused content for a specific US city.

    Returns aggregated content (news articles, reels, community events) related
    to the Israeli community in the specified city.

    Query Parameters:
        city: City name (required)
        state: Two-letter state code (required, e.g., "NY", "CA")
        county: County name (optional, for more precise filtering)
        limit_per_type: Max items per content type (1-50, default 10)
        include_articles: Include news articles (default true)
        include_reels: Include news reels (default true)
        include_events: Include community events (default true)

    Returns:
        {
            "location": {
                "city": string,
                "state": string,
                "county": string or null
            },
            "content": {
                "news_articles": ContentItem[],
                "news_reels": ContentItem[],
                "community_events": EventItem[]
            },
            "total_items": integer,
            "updated_at": datetime,
            "coverage": {
                "has_content": boolean,
                "nearest_major_city": string or null,
                "fallback_region": string or null
            }
        }
    """
    try:
        # Validate input
        city = city.strip()
        state = state.upper().strip()

        if not city or len(city) < 2:
            return {
                "error": "Invalid city name",
                "message": "City must be at least 2 characters",
            }

        if not state or len(state) != 2:
            return {
                "error": "Invalid state code",
                "message": "State must be a two-letter code (e.g., 'NY')",
            }

        # Fetch location-based content
        service = LocationContentService()
        result = await service.get_israelis_in_city(
            city=city,
            state=state,
            county=county,
            limit_per_type=limit_per_type,
            include_articles=include_articles,
            include_reels=include_reels,
            include_events=include_events,
        )

        # Log successful query
        logger.info(
            f"Location query: {city}, {state} - {result['total_items']} items found"
        )

        return result

    except ValueError as e:
        logger.error(f"Validation error in location query: {e}")
        return {
            "error": "Validation error",
            "message": str(e),
        }

    except Exception as e:
        logger.error(f"Error in get_israelis_in_city: {e}", exc_info=True)
        return {
            "error": "Internal server error",
            "message": "Failed to fetch location-based content",
        }
