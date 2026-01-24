"""
Search Analytics API Routes.

Provides analytics endpoints for:
- Click tracking
- Popular queries
- No-result queries
- Aggregated metrics
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import get_optional_user
from app.models.search_analytics import SearchQuery
from app.models.user import User
from app.api.routes.search_models import ClickTrackingRequest

router = APIRouter(prefix="/search/analytics", tags=["search", "analytics"])
logger = logging.getLogger(__name__)


@router.post("/click")
async def track_search_click(
    request: ClickTrackingRequest,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Track when a user clicks on a search result.

    Used for:
    - Click-through rate analysis
    - Result relevance optimization
    - Popular content identification
    """
    try:
        # If search_query_id is provided, update that record
        if request.search_query_id:
            query_log = await SearchQuery.get(request.search_query_id)
            if query_log:
                await query_log.log_click(
                    content_id=request.content_id,
                    position=request.position,
                    time_to_click_ms=request.time_to_click_ms,
                )

        return {"success": True, "message": "Click tracked successfully"}

    except Exception as e:
        logger.error(f"Failed to track click: {e}", exc_info=True)
        # Don't fail the request, just log the error
        return {"success": False, "message": "Failed to track click (non-critical)"}


@router.get("/popular")
async def get_popular_searches(
    limit: int = Query(10, ge=1, le=50), days: int = Query(7, ge=1, le=90)
):
    """
    Get most popular search queries.

    Useful for:
    - Content gap analysis
    - Trending topics
    - SEO optimization

    Note: May require admin authentication in production
    """
    try:
        popular = await SearchQuery.get_popular_queries(limit=limit, days=days)
        return {"queries": popular, "period_days": days}

    except Exception as e:
        logger.error(f"Failed to get popular searches: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get popular searches: {str(e)}",
        )


@router.get("/no-results")
async def get_no_result_queries(
    limit: int = Query(20, ge=1, le=100), days: int = Query(7, ge=1, le=90)
):
    """
    Get queries that returned no results (content gaps).

    Use this to identify:
    - Missing content
    - Potential acquisition targets
    - User expectations vs. actual catalog

    Note: May require admin authentication in production
    """
    try:
        no_results = await SearchQuery.get_no_result_queries(limit=limit, days=days)
        return {"queries": no_results, "period_days": days}

    except Exception as e:
        logger.error(f"Failed to get no-result queries: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get no-result queries: {str(e)}",
        )


@router.get("/metrics")
async def get_search_metrics(days: int = Query(7, ge=1, le=90)):
    """
    Get aggregated search metrics.

    Returns:
    - Total searches
    - Click-through rate
    - Search type distribution
    - Average performance

    Note: May require admin authentication in production
    """
    try:
        ctr = await SearchQuery.get_click_through_rate(days=days)
        search_types = await SearchQuery.get_search_type_distribution(days=days)

        return {
            "click_through_rate": ctr,
            "search_type_distribution": search_types,
            "period_days": days,
        }

    except Exception as e:
        logger.error(f"Failed to get search metrics: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get search metrics: {str(e)}",
        )
