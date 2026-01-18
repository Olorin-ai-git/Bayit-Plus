"""
Culture API Routes

Provides endpoints for:
- Listing available cultures
- Getting culture details and cities
- Fetching culture-specific content
- Time information for culture timezones
"""

from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Query, Depends, HTTPException

from app.core.security import get_optional_user
from app.models.user import User
from app.models.culture import (
    CultureResponse,
    CultureCityResponse,
    CultureContentAggregatedResponse,
    CultureContentItemResponse,
    CultureFeaturedResponse,
    CultureTimeResponse,
)
from app.services.culture_content_service import culture_content_service
from app.core.config import settings

router = APIRouter()


@router.get("", response_model=List[CultureResponse])
async def list_cultures(
    active_only: bool = Query(True, description="Only return active cultures"),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    List all available cultures.

    Returns cultures ordered by display_order.
    """
    cultures = await culture_content_service.get_all_cultures(active_only=active_only)
    return cultures


@router.get("/default", response_model=CultureResponse)
async def get_default_culture(
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get the default culture (Israeli for backward compatibility).
    """
    culture = await culture_content_service.get_default_culture()
    if not culture:
        raise HTTPException(
            status_code=404,
            detail="Default culture not found. Run database seed script.",
        )
    return culture


@router.get("/{culture_id}", response_model=CultureResponse)
async def get_culture(
    culture_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get details for a specific culture.
    """
    culture = await culture_content_service.get_culture(culture_id)
    if not culture:
        raise HTTPException(
            status_code=404,
            detail=f"Culture not found: {culture_id}",
        )
    return culture


@router.get("/{culture_id}/cities", response_model=List[CultureCityResponse])
async def get_culture_cities(
    culture_id: str,
    featured_only: bool = Query(True, description="Only return featured cities"),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get cities for a culture.

    Returns cities ordered by display_order.
    """
    # Validate culture exists
    culture = await culture_content_service.get_culture(culture_id)
    if not culture:
        raise HTTPException(
            status_code=404,
            detail=f"Culture not found: {culture_id}",
        )

    cities = await culture_content_service.get_culture_cities(
        culture_id=culture_id,
        featured_only=featured_only,
    )
    return cities


@router.get("/{culture_id}/cities/{city_id}", response_model=CultureCityResponse)
async def get_city(
    culture_id: str,
    city_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get details for a specific city within a culture.
    """
    city = await culture_content_service.get_city(culture_id, city_id)
    if not city:
        raise HTTPException(
            status_code=404,
            detail=f"City not found: {culture_id}/{city_id}",
        )
    return city


@router.get(
    "/{culture_id}/cities/{city_id}/content",
    response_model=CultureContentAggregatedResponse,
)
async def get_city_content(
    culture_id: str,
    city_id: str,
    category: Optional[str] = Query(None, description="Filter by category"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(
        settings.CULTURES_DEFAULT_LIMIT,
        ge=1,
        le=settings.CULTURES_MAX_LIMIT,
        description="Items per page",
    ),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get content for a specific city.

    Returns paginated content items sorted by relevance.
    """
    # Validate culture and city exist
    city = await culture_content_service.get_city(culture_id, city_id)
    if not city:
        raise HTTPException(
            status_code=404,
            detail=f"City not found: {culture_id}/{city_id}",
        )

    # Validate category if provided
    if category:
        categories = await culture_content_service.get_categories(culture_id, city_id)
        valid_categories = [c["id"] for c in categories]
        if category not in valid_categories:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid category: {category}. Valid categories: {valid_categories}",
            )

    return await culture_content_service.get_city_content(
        culture_id=culture_id,
        city_id=city_id,
        category=category,
        page=page,
        limit=limit,
    )


@router.get(
    "/{culture_id}/trending",
    response_model=List[CultureContentItemResponse],
)
async def get_culture_trending(
    culture_id: str,
    limit: int = Query(10, ge=1, le=20, description="Number of items"),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get trending content for a culture across all cities.
    """
    # Validate culture exists
    culture = await culture_content_service.get_culture(culture_id)
    if not culture:
        raise HTTPException(
            status_code=404,
            detail=f"Culture not found: {culture_id}",
        )

    return await culture_content_service.get_culture_trending(
        culture_id=culture_id,
        limit=limit,
    )


@router.get("/{culture_id}/featured", response_model=CultureFeaturedResponse)
async def get_featured_content(
    culture_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get featured content for hero section.
    """
    # Validate culture exists
    culture = await culture_content_service.get_culture(culture_id)
    if not culture:
        raise HTTPException(
            status_code=404,
            detail=f"Culture not found: {culture_id}",
        )

    return await culture_content_service.get_featured_content(culture_id)


@router.get("/{culture_id}/time", response_model=CultureTimeResponse)
async def get_culture_time(
    culture_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get current time information for a culture's timezone.

    Returns formatted time, date, and weekend status.
    """
    time_info = await culture_content_service.get_culture_time(culture_id)
    if not time_info:
        raise HTTPException(
            status_code=404,
            detail=f"Culture not found or timezone error: {culture_id}",
        )
    return time_info


@router.get("/{culture_id}/categories")
async def get_categories(
    culture_id: str,
    city_id: Optional[str] = Query(None, description="Filter by city"),
    current_user: Optional[User] = Depends(get_optional_user),
) -> List[Dict[str, Any]]:
    """
    Get available content categories for a culture/city.
    """
    # Validate culture exists
    culture = await culture_content_service.get_culture(culture_id)
    if not culture:
        raise HTTPException(
            status_code=404,
            detail=f"Culture not found: {culture_id}",
        )

    return await culture_content_service.get_categories(culture_id, city_id)


@router.get("/{culture_id}/sources")
async def get_sources(
    culture_id: str,
    city_id: Optional[str] = Query(None, description="Filter by city"),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get news sources for a culture/city.
    """
    sources = await culture_content_service.get_sources(
        culture_id=culture_id,
        city_id=city_id,
        active_only=True,
    )
    return {
        "sources": [source.model_dump() for source in sources],
        "total": len(sources),
    }
