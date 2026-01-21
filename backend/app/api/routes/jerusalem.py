"""
Jerusalem Content API routes.

Provides Jerusalem-focused content from Israeli news sources:
- Western Wall (Kotel) events and ceremonies
- IDF ceremonies at the Kotel
- Israel-Diaspora connection news
- Holy sites coverage
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.routes.admin import require_admin
from app.core.security import get_optional_user
from app.models.jerusalem_content import (JerusalemContentAggregatedResponse,
                                          JerusalemContentCategory,
                                          JerusalemFeaturedResponse)
from app.models.user import User
from app.services.jerusalem_content_service import (JERUSALEM_CATEGORY_LABELS,
                                                    jerusalem_content_service)

router = APIRouter()


@router.get("/content", response_model=JerusalemContentAggregatedResponse)
async def get_jerusalem_content(
    category: Optional[str] = Query(
        None,
        description="Filter by category: kotel, idf-ceremony, diaspora-connection, holy-sites, jerusalem-events",
    ),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=50, description="Items per page"),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get Jerusalem-focused content from Israeli news.

    Content is filtered and scored based on Jerusalem-related keywords.
    Returns content about:
    - The Western Wall (Kotel)
    - IDF ceremonies
    - Diaspora connection news
    - Holy sites
    - Jerusalem events
    """
    # Validate category if provided
    valid_categories = [
        JerusalemContentCategory.KOTEL,
        JerusalemContentCategory.IDF_CEREMONY,
        JerusalemContentCategory.DIASPORA,
        JerusalemContentCategory.HOLY_SITES,
        JerusalemContentCategory.JERUSALEM_EVENTS,
        JerusalemContentCategory.GENERAL,
    ]

    if category and category not in valid_categories:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Must be one of: {', '.join(valid_categories)}",
        )

    return await jerusalem_content_service.fetch_all_content(
        category=category, page=page, limit=limit
    )


@router.get("/featured", response_model=JerusalemFeaturedResponse)
async def get_featured_content(
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get featured Jerusalem content for hero section.

    Returns:
    - Top 6 most relevant Jerusalem stories
    - Live Kotel webcam information
    - Upcoming ceremonies (if available)
    """
    return await jerusalem_content_service.get_featured_content()


@router.get("/categories")
async def get_categories(
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get available Jerusalem content categories.

    Returns category list with icons and localized names.
    """
    return await jerusalem_content_service.get_categories()


@router.get("/kotel", response_model=JerusalemContentAggregatedResponse)
async def get_kotel_content(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get Western Wall (Kotel) specific content.

    Returns news and updates about the Western Wall,
    including events, ceremonies, and visits.
    """
    return await jerusalem_content_service.get_kotel_content(page=page, limit=limit)


@router.get("/kotel/events")
async def get_kotel_events(
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get upcoming events at the Western Wall.

    Returns scheduled ceremonies, special prayers, and events.
    """
    # For now, return the Kotel content as events
    content = await jerusalem_content_service.get_kotel_content(page=1, limit=10)
    return {
        "events": [
            {
                "id": item.id,
                "title": item.title,
                "title_he": item.title_he,
                "url": item.url,
                "published_at": item.published_at,
                "category": "kotel-event",
            }
            for item in content.items
        ],
        "kotel_live": {
            "name": "Western Wall Live",
            "name_he": "שידור חי מהכותל",
            "url": "https://www.kotel.org/en/kotel-live",
            "icon": "🕎",
        },
    }


@router.get("/idf-ceremonies", response_model=JerusalemContentAggregatedResponse)
async def get_idf_ceremonies(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get IDF ceremony news.

    Returns news about IDF ceremonies at the Western Wall,
    swearing-in ceremonies, and military events.
    """
    return await jerusalem_content_service.get_idf_ceremonies(page=page, limit=limit)


@router.get("/diaspora", response_model=JerusalemContentAggregatedResponse)
async def get_diaspora_connection(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get diaspora connection news.

    Returns news connecting Israel and Jews abroad,
    including aliyah, Birthright, and world Jewry updates.
    """
    return await jerusalem_content_service.get_diaspora_connection(
        page=page, limit=limit
    )


@router.get("/sources")
async def get_sources(
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get list of Jerusalem content sources.

    Returns information about the news sources used for Jerusalem content.
    """
    sources = await jerusalem_content_service.get_sources()
    return {
        "sources": [source.model_dump() for source in sources],
        "total": len(sources),
    }


@router.post("/admin/refresh")
async def refresh_cache(
    current_admin: User = Depends(require_admin),
):
    """
    Clear Jerusalem content cache (admin only).

    Forces a refresh of content on the next request.
    """
    jerusalem_content_service.clear_cache()
    return {
        "message": "Jerusalem content cache cleared",
        "status": "success",
    }
