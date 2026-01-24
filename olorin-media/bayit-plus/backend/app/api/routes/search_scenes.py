"""
Scene Search API Routes.

Provides semantic search within video content:
- Search for specific scenes by description
- Timestamp-based deep-linking
- Series-wide scene search
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.config import settings
from app.core.rate_limiter import limiter
from app.core.security import get_optional_user
from app.models.search_analytics import SearchQuery
from app.models.user import User
from app.models.content_embedding import SceneSearchQuery
from app.services.olorin.search.searcher import scene_search
from app.api.routes.search_models import SceneSearchRequest, SceneSearchResponse

router = APIRouter(prefix="/search", tags=["search", "scenes"])
logger = logging.getLogger(__name__)


@router.post("/scene", response_model=SceneSearchResponse)
@limiter.limit("30/minute")
async def search_scenes(
    request: SceneSearchRequest,
    http_request: Request,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Search for specific scenes within content or series.

    Returns results with timestamps for deep-linking to specific moments.
    Useful for finding specific quotes, moments, or topics in videos.

    Rate limit: 30 requests per minute per IP address.

    Examples:
    - Search "Marty burns almanac" in Back to the Future → Exact scene timestamp
    - Search across all episodes of a series for a specific quote
    - Find where a specific topic is discussed in a documentary

    Returns:
    - Matched text with context
    - Timestamp for deep-linking
    - Episode info for series content (S2E5 format)
    """
    try:
        # Feature flag check - semantic search must be enabled
        olorin_settings = getattr(settings, "olorin", None)
        if olorin_settings and hasattr(olorin_settings, "semantic_search_enabled"):
            if not olorin_settings.semantic_search_enabled:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Scene search is currently disabled. Contact support if this persists.",
                )

        # Build scene search query
        query = SceneSearchQuery(
            query=request.query,
            content_id=request.content_id,
            series_id=request.series_id,
            language=request.language,
            limit=request.limit,
            min_score=request.min_score,
        )

        # Execute scene search
        results = await scene_search(query=query)

        # Log analytics
        await SearchQuery.log_search(
            query=request.query,
            search_type="scene",
            result_count=len(results),
            filters={
                "content_id": request.content_id,
                "series_id": request.series_id,
                "language": request.language,
            },
            user_id=str(current_user.id) if current_user else None,
        )

        return SceneSearchResponse(
            query=request.query,
            results=results,
            total_results=len(results),
        )

    except HTTPException:
        raise
    except ValueError as e:
        # Handle validation errors
        logger.warning(f"Scene search validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Scene search failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Scene search failed. Please try again later.",
        )
