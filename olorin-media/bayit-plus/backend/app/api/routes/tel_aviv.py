"""
Tel Aviv Content API routes.

Provides Tel Aviv-focused content from Israeli news sources:
- Beaches and promenade (Tayelet)
- Nightlife and entertainment (Rothschild, Florentin)
- Culture and art (Bauhaus, White City, museums)
- Music scene (concerts, festivals)
- Food and dining (Carmel Market, Sarona)
- Tech and startups
- Events and festivals (Pride Parade, etc.)
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.routes.admin import require_admin
from app.core.security import get_optional_user
from app.models.tel_aviv_content import (TelAvivContentAggregatedResponse,
                                         TelAvivContentCategory,
                                         TelAvivFeaturedResponse)
from app.models.user import User
from app.services.tel_aviv_content_service import (TEL_AVIV_CATEGORY_LABELS,
                                                   tel_aviv_content_service)

router = APIRouter()


@router.get("/content", response_model=TelAvivContentAggregatedResponse)
async def get_tel_aviv_content(
    category: Optional[str] = Query(
        None,
        description="Filter by category: beaches, nightlife, culture, music, food, tech, events",
    ),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=50, description="Items per page"),
    latitude: Optional[float] = Query(
        None, description="User latitude for proximity sorting"
    ),
    longitude: Optional[float] = Query(
        None, description="User longitude for proximity sorting"
    ),
    radius_km: Optional[float] = Query(
        None, ge=1, le=100, description="Filter within radius (km)"
    ),
    enable_geolocation: bool = Query(
        True, description="Enable geolocation enhancement"
    ),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get Tel Aviv-focused content from Israeli news.

    Content is filtered and scored based on Tel Aviv-related keywords
    and optional geolocation proximity.

    Returns content about:
    - Beaches and promenade
    - Nightlife and entertainment
    - Culture and art
    - Music scene
    - Food and dining
    - Tech and startups
    - Events and festivals

    NEW FEATURES:
    - latitude/longitude: Override default Tel Aviv center with user's location
    - radius_km: Only show content within specified radius
    - enable_geolocation: Toggle geolocation on/off (default: on)

    BACKWARD COMPATIBLE: All new parameters optional.
    """
    valid_categories = [
        TelAvivContentCategory.BEACHES,
        TelAvivContentCategory.NIGHTLIFE,
        TelAvivContentCategory.CULTURE,
        TelAvivContentCategory.MUSIC,
        TelAvivContentCategory.FOOD,
        TelAvivContentCategory.TECH,
        TelAvivContentCategory.EVENTS,
        TelAvivContentCategory.GENERAL,
    ]

    if category and category not in valid_categories:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Must be one of: {', '.join(valid_categories)}",
        )

    reference_coords = (latitude, longitude) if latitude and longitude else None

    return await tel_aviv_content_service.fetch_all_content(
        category=category,
        page=page,
        limit=limit,
        reference_coords=reference_coords,
        radius_km=radius_km,
        enable_geolocation=enable_geolocation,
    )


@router.get("/featured", response_model=TelAvivFeaturedResponse)
async def get_featured_content(
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get featured Tel Aviv content for hero section.

    Returns:
    - Top 6 most relevant Tel Aviv stories
    - Live beach webcam information
    - Upcoming events (if available)
    """
    return await tel_aviv_content_service.get_featured_content()


@router.get("/categories")
async def get_categories(
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get available Tel Aviv content categories.

    Returns category list with icons and localized names.
    """
    return await tel_aviv_content_service.get_categories()


@router.get("/beaches", response_model=TelAvivContentAggregatedResponse)
async def get_beaches_content(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get Tel Aviv beaches specific content.

    Returns news and updates about Tel Aviv beaches,
    including Gordon Beach, Hilton Beach, Frishman Beach, etc.
    """
    return await tel_aviv_content_service.get_beaches_content(page=page, limit=limit)


@router.get("/nightlife", response_model=TelAvivContentAggregatedResponse)
async def get_nightlife_content(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get Tel Aviv nightlife content.

    Returns news about bars, clubs, and entertainment
    in Rothschild, Florentin, Dizengoff, etc.
    """
    return await tel_aviv_content_service.get_nightlife_content(page=page, limit=limit)


@router.get("/culture", response_model=TelAvivContentAggregatedResponse)
async def get_culture_content(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get Tel Aviv culture and art content.

    Returns news about museums, galleries, Bauhaus architecture,
    White City, theaters, and art scene.
    """
    return await tel_aviv_content_service.get_culture_content(page=page, limit=limit)


@router.get("/music", response_model=TelAvivContentAggregatedResponse)
async def get_music_content(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get Tel Aviv music scene content.

    Returns news about concerts, festivals, live music venues,
    Barby Club, Reading 3, Zappa, etc.
    """
    return await tel_aviv_content_service.get_music_content(page=page, limit=limit)


@router.get("/sources")
async def get_sources(
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get list of Tel Aviv content sources.

    Returns information about the news sources used for Tel Aviv content.
    """
    sources = await tel_aviv_content_service.get_sources()
    return {
        "sources": [source.model_dump() for source in sources],
        "total": len(sources),
    }


@router.post("/admin/refresh")
async def refresh_cache(
    current_admin: User = Depends(require_admin),
):
    """
    Clear Tel Aviv content cache (admin only).

    Forces a refresh of content on the next request.
    """
    tel_aviv_content_service.clear_cache()
    return {
        "message": "Tel Aviv content cache cleared",
        "status": "success",
    }
