"""
News Routes - API endpoints for fetching news from various sources.

Provides endpoints for:
- Ynet Mivzakim (Breaking News)
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Query

from app.services.news_service import fetch_ynet_mivzakim, get_cache_info

router = APIRouter()


@router.get("/mivzakim")
async def get_mivzakim(
    limit: int = Query(
        default=10, ge=1, le=50, description="Maximum number of items to return"
    )
):
    """
    Get Ynet breaking news (mivzakim).

    Results are cached for 2 minutes for performance.
    """
    items = await fetch_ynet_mivzakim(limit)

    return {
        "items": [
            {
                "title": item.title,
                "link": item.link,
                "published": item.published,
                "summary": item.summary,
                "source": item.source,
            }
            for item in items
        ],
        "total": len(items),
        "updated_at": datetime.utcnow().isoformat(),
    }


@router.get("/cache-info")
async def get_news_cache_info():
    """Get cache status for debugging."""
    return get_cache_info()
