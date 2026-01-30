"""
Beta AI Search API Endpoints

Natural language semantic search for Beta 500 users.
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.security import get_current_user
from app.models.user import User
from app.services.beta.ai_search_service import BetaAISearchService

router = APIRouter(prefix="/beta/search", tags=["beta-search"])
logger = logging.getLogger(__name__)


class AISearchRequest(BaseModel):
    """AI search request model."""

    query: str = Field(..., min_length=1, max_length=500, description="Natural language search query")
    content_types: Optional[List[str]] = Field(
        None,
        description="Filter by content types (movies, series, podcasts, audiobooks, live_channels)"
    )
    language: Optional[str] = Field(None, description="Filter by language (he, en, es, etc.)")
    limit: int = Field(20, ge=1, le=100, description="Maximum results to return")


class AISearchResponse(BaseModel):
    """AI search response model."""

    query: str
    query_analysis: dict
    total_results: int
    results: List[dict]
    credits_charged: int
    credits_remaining: int


@router.post("/", response_model=AISearchResponse)
async def ai_search(
    request: AISearchRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Perform AI-powered semantic search across all content.

    **Beta 500 Exclusive Feature**

    Uses natural language understanding to search movies, series, podcasts,
    audiobooks, and live channels. Understands intent, genres, mood, and context.

    **Cost**: 2 credits per search ($0.02 in API costs)

    **Examples**:
    - "action movies from the 2020s with heists"
    - "funny podcasts about technology in Hebrew"
    - "romantic series with strong female leads"
    - "documentary about space exploration"

    **Returns**:
    - Ranked results with relevance scores
    - Query analysis (detected intent, genres, mood)
    - Credits charged and remaining balance
    """
    try:
        # Create AI search service
        search_service = BetaAISearchService(user_id=str(current_user.id))

        # Perform search
        results = await search_service.search(
            query=request.query,
            content_types=request.content_types,
            limit=request.limit,
            language=request.language,
        )

        return AISearchResponse(**results)

    except ValueError as e:
        # Insufficient credits or not enrolled
        raise HTTPException(status_code=402, detail=str(e))
    except Exception as e:
        logger.error(f"AI search error: {e}")
        raise HTTPException(status_code=500, detail="AI search failed")


@router.get("/cost-estimate")
async def get_search_cost_estimate(
    current_user: User = Depends(get_current_user),
):
    """
    Get cost estimate for AI search.

    Returns the credit cost per search and example queries.
    """
    return {
        "credits_per_search": BetaAISearchService.CREDITS_PER_SEARCH,
        "usd_per_search": round(BetaAISearchService.CREDITS_PER_SEARCH / 100, 4),
        "description": "Natural language semantic search across all content",
        "examples": [
            "action movies from the 2020s with heists",
            "funny podcasts about technology in Hebrew",
            "romantic series with strong female leads",
            "documentary about space exploration",
            "Israeli comedy series similar to Fauda",
        ],
        "supported_content_types": [
            "movies",
            "series",
            "podcasts",
            "audiobooks",
            "live_channels",
        ],
    }
