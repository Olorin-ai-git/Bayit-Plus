"""
Beta AI Recommendations API Endpoints

Personalized content recommendations for Beta 500 users.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.security import get_current_user
from app.models.user import User
from app.services.beta.ai_recommendations_service import BetaAIRecommendationsService

router = APIRouter(prefix="/beta/recommendations", tags=["beta-recommendations"])
logger = logging.getLogger(__name__)


@router.get("/")
async def get_ai_recommendations(
    content_type: str = Query("all", regex="^(movies|series|podcasts|audiobooks|all)$"),
    limit: int = Query(10, ge=1, le=20),
    context: Optional[str] = Query(None, max_length=200),
    current_user: User = Depends(get_current_user),
):
    """
    Get personalized AI-powered content recommendations.

    **Beta 500 Exclusive Feature**

    Uses AI to analyze your viewing history and preferences to recommend
    content you'll love. Each recommendation includes an explanation of
    why it matches your taste.

    **Cost**: 3 credits per request ($0.03 in API costs)

    **Parameters**:
    - `content_type`: Filter recommendations (movies, series, podcasts, audiobooks, all)
    - `limit`: Number of recommendations (1-20)
    - `context`: Optional context (e.g., "for weekend", "with family", "to relax")

    **Returns**:
    - Personalized recommendations ranked by match score
    - Explanation for each recommendation
    - Your taste profile summary
    """
    try:
        service = BetaAIRecommendationsService(user_id=str(current_user.id))

        results = await service.get_recommendations(
            content_type=content_type,
            limit=limit,
            context=context,
        )

        return results

    except ValueError as e:
        raise HTTPException(status_code=402, detail=str(e))
    except Exception as e:
        logger.error(f"AI recommendations error: {e}")
        raise HTTPException(status_code=500, detail="Recommendations failed")


@router.get("/cost-estimate")
async def get_recommendations_cost_estimate(
    current_user: User = Depends(get_current_user),
):
    """Get cost estimate for AI recommendations."""
    return {
        "credits_per_request": BetaAIRecommendationsService.CREDITS_PER_REQUEST,
        "usd_per_request": round(BetaAIRecommendationsService.CREDITS_PER_REQUEST / 100, 4),
        "description": "Personalized AI recommendations based on your taste",
        "example_contexts": [
            "for weekend binge-watching",
            "with family",
            "to relax after work",
            "educational content",
            "something funny",
        ],
    }
