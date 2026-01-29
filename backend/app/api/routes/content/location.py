"""Location-based Israeli content endpoint for discovering content by US city."""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.core.rate_limiter import limiter
from app.models.location_schemas import IsraelisInCityResponse, LocationCoverageInfo, LocationData
from app.services.location_content_service import LocationContentService

router = APIRouter()
logger = logging.getLogger(__name__)


def get_location_content_service() -> LocationContentService:
    """Dependency injection for LocationContentService."""
    return LocationContentService()


@router.get("/israelis-in-city", response_model=IsraelisInCityResponse)
@limiter.limit("60/minute")
async def get_israelis_in_city(
    request: Request,
    city: str = Query(..., description="City name (e.g., 'New York')"),
    state: str = Query(..., description="Two-letter state code (e.g., 'NY')"),
    county: str = Query(None, description="County name (optional)"),
    limit_per_type: int = Query(10, ge=1, le=50, description="Max items per type"),
    include_articles: bool = Query(True, description="Include news articles"),
    include_events: bool = Query(True, description="Include community events"),
    service: LocationContentService = Depends(get_location_content_service),
) -> IsraelisInCityResponse:
    """Get Israeli-focused content for a specific US city."""
    city = city.strip()
    state = state.upper().strip()
    if not city or len(city) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="City must be at least 2 characters",
        )
    if not state or len(state) != 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="State must be a two-letter code",
        )
    try:
        result = await service.get_israelis_in_city(
            city=city,
            state=state,
            county=county,
            limit_per_type=limit_per_type,
            include_articles=include_articles,
            include_events=include_events,
        )
        logger.info(
            "Location content query successful",
            extra={"city": city, "state": state, "total_items": result["total_items"]},
        )
        return IsraelisInCityResponse(
            location=LocationData(
                city=result["location"]["city"],
                state=result["location"]["state"],
                county=result["location"].get("county"),
                latitude=result["location"]["latitude"],
                longitude=result["location"]["longitude"],
                timestamp=result["location"]["timestamp"],
                source=result["location"]["source"],
            ),
            content=result["content"],
            total_items=result["total_items"],
            updated_at=result["updated_at"],
            coverage=LocationCoverageInfo(
                has_content=result["coverage"]["has_content"],
                nearest_major_city=result["coverage"].get("nearest_major_city"),
                fallback_region=result["coverage"].get("fallback_region"),
            ),
        )
    except Exception as e:
        logger.error("Location content query failed", extra={"error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch location content",
        )


@router.get("/israeli-businesses-in-city", response_model=IsraelisInCityResponse)
@limiter.limit("60/minute")
async def get_israeli_businesses_in_city(
    request: Request,
    city: str = Query(..., description="City name (e.g., 'New York')"),
    state: str = Query(..., description="Two-letter state code (e.g., 'NY')"),
    county: str = Query(None, description="County name (optional)"),
    limit_per_type: int = Query(15, ge=1, le=50, description="Max business listings"),
    service: LocationContentService = Depends(get_location_content_service),
) -> IsraelisInCityResponse:
    """Get Israeli business listings for a specific US city."""
    city = city.strip()
    state = state.upper().strip()
    if not city or len(city) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="City must be at least 2 characters",
        )
    if not state or len(state) != 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="State must be a two-letter code",
        )
    try:
        result = await service.get_israeli_businesses_in_city(
            city=city,
            state=state,
            county=county,
            limit_per_type=limit_per_type,
        )
        logger.info(
            "Business listing query successful",
            extra={"city": city, "state": state, "total_items": result["total_items"]},
        )
        return IsraelisInCityResponse(
            location=LocationData(
                city=result["location"]["city"],
                state=result["location"]["state"],
                county=result["location"].get("county"),
                latitude=result["location"]["latitude"],
                longitude=result["location"]["longitude"],
                timestamp=result["location"]["timestamp"],
                source=result["location"]["source"],
            ),
            content=result["content"],
            total_items=result["total_items"],
            updated_at=result["updated_at"],
            coverage=LocationCoverageInfo(
                has_content=result["coverage"]["has_content"],
                nearest_major_city=result["coverage"].get("nearest_major_city"),
                fallback_region=result["coverage"].get("fallback_region"),
            ),
        )
    except Exception as e:
        logger.error("Business listing query failed", extra={"error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch business listings",
        )
