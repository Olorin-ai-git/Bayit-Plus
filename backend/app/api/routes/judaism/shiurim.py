"""
Torah shiurim endpoints for Judaism section.

Handles:
- GET /shiurim - Get Torah shiurim from RSS feeds
- GET /shiurim/live - Get currently streaming Torah classes
- GET /shiurim/daily - Get daily Torah class recommendation
"""

from typing import Optional

from fastapi import APIRouter, Query

from app.services.torah_content_service import torah_content_service

router = APIRouter()


@router.get("/shiurim")
async def get_shiurim(
    category: Optional[str] = Query(None, description="Category filter (e.g., 'parasha')"),
    rabbi: Optional[str] = Query(None, description="Filter by rabbi name"),
    source: Optional[str] = Query(None, description="Filter by source (e.g., 'YU Torah')"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
) -> dict:
    """
    Get Torah shiurim aggregated from public RSS feeds.

    Sources include YU Torah, Chabad Multimedia, and TorahAnytime.
    """
    return await torah_content_service.get_shiurim(
        category=category,
        rabbi=rabbi,
        source=source,
        page=page,
        limit=limit,
    )


@router.get("/shiurim/live")
async def get_live_torah_classes() -> dict:
    """Get currently streaming Torah classes."""
    return {"live": await torah_content_service.get_live_shiurim()}


@router.get("/shiurim/daily")
async def get_daily_shiur_recommendation() -> dict:
    """Get daily Torah class recommendation."""
    result = await torah_content_service.get_daily_shiur()
    if not result:
        return {"daily_shiur": None, "message": "No shiurim available"}
    return result
