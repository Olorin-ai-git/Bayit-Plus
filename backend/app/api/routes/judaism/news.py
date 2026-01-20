"""
News endpoints for Judaism section.

Handles:
- GET /news - Get aggregated Jewish news
- GET /news/sources - Get list of available news sources
"""

from typing import Optional

from app.services.jewish_news_service import jewish_news_service
from fastapi import APIRouter, Query

router = APIRouter()


@router.get("/news")
async def get_jewish_news(
    category: Optional[str] = Query(
        None, description="Filter by category: news, culture, opinion, torah, community"
    ),
    source: Optional[str] = Query(None, description="Filter by source name"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
) -> dict:
    """
    Get aggregated Jewish news from major US publications.

    Sources include JTA, Times of Israel, Forward, Tablet, Aish, Chabad,
    Jewish Week, and Yeshiva World.
    """
    return await jewish_news_service.fetch_all_news(
        category=category,
        source_name=source,
        page=page,
        limit=limit,
    )


@router.get("/news/sources")
async def get_news_sources() -> dict:
    """Get list of available Jewish news sources."""
    sources = await jewish_news_service.get_sources()
    return {"sources": sources}
