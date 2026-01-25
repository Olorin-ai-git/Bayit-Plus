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
from app.core.security import get_optional_user, verify_content_access
from app.models.search_analytics import SearchQuery
from app.models.user import User
from app.models.content_embedding import SceneSearchQuery
from app.models.content import Content
from app.services.olorin.search.searcher import scene_search
from app.services.feature_flags import is_feature_enabled
from app.api.routes.search_models import SceneSearchRequest, SceneSearchResponse

router = APIRouter(prefix="/search", tags=["search", "scenes"])
logger = logging.getLogger(__name__)


def get_rate_limit_for_user(user: Optional[User]) -> str:
    """Determine rate limit based on user tier."""
    if user is None:
        return "10/minute"  # Anonymous users - most restrictive
    if hasattr(user, "subscription") and user.subscription:
        plan = getattr(user.subscription, "plan", None)
        if plan in ["premium", "family"]:
            return "100/minute"  # Premium users
    return "30/minute"  # Authenticated free users


@router.post("/scene", response_model=SceneSearchResponse)
async def search_scenes(
    request: SceneSearchRequest,
    http_request: Request,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Search for specific scenes within content or series.

    Returns results with timestamps for deep-linking to specific moments.
    Useful for finding specific quotes, moments, or topics in videos.

    Rate limits (tiered):
    - Anonymous: 10 requests per minute
    - Authenticated: 30 requests per minute
    - Premium: 100 requests per minute

    Examples:
    - Search "Marty burns almanac" in Back to the Future → Exact scene timestamp
    - Search across all episodes of a series for a specific quote
    - Find where a specific topic is discussed in a documentary

    Returns:
    - Matched text with context
    - Timestamp for deep-linking
    - Episode info for series content (S2E5 format)
    """
    # Apply tiered rate limiting
    rate_limit = get_rate_limit_for_user(current_user)
    await limiter.check_limit(http_request, rate_limit)

    try:
        # Feature flag check - scene search must be enabled
        if not await is_feature_enabled("scene_search"):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={
                    "error": "feature_disabled",
                    "message": "Scene search is currently unavailable. This feature may be in maintenance or disabled for your region.",
                    "feature": "scene_search",
                },
            )

        # IDOR Protection: Verify user has access to requested content
        if request.content_id:
            content = await Content.get(request.content_id)
            if not content:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Content not found",
                )
            # Verify user has permission to access this content
            await verify_content_access(
                content=content,
                user=current_user,
                action="search",
            )

        # IDOR Protection: Verify access to series if searching series-wide
        if request.series_id:
            series_content = await Content.get(request.series_id)
            if not series_content:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Series not found",
                )
            await verify_content_access(
                content=series_content,
                user=current_user,
                action="search",
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
        # Handle validation errors - Log details but return generic message
        logger.warning(f"Scene search validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid search parameters. Please check your query and try again.",
        )
    except Exception as e:
        # Log full error internally but don't expose to client
        logger.error(f"Scene search failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Search service temporarily unavailable. Please try again later.",
        )
