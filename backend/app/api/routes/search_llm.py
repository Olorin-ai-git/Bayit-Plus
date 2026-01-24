"""
LLM Natural Language Search API Routes.

Provides AI-powered natural language search:
- Claude AI query interpretation
- Complex query understanding
- Automatic filter extraction
- Premium user feature
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_premium_user
from app.models.search_analytics import SearchQuery
from app.models.user import User
from app.services.vod_llm_search_service import VODLLMSearchService
from app.api.routes.search_models import LLMSearchRequest

router = APIRouter(prefix="/search", tags=["search", "llm"])
logger = logging.getLogger(__name__)

# Service instance
llm_search = VODLLMSearchService()


@router.post("/llm")
async def llm_natural_language_search(
    request: LLMSearchRequest, current_user: User = Depends(get_current_premium_user)
):
    """
    Natural language search using Claude AI (Premium Feature).

    Interprets complex queries and extracts search criteria automatically.

    Examples:
    - "Show me Hebrew movies from the 1980s with English subtitles"
    - "Find comedies starring Sacha Baron Cohen"
    - "What documentaries about the Holocaust are available?"
    - "Kids shows in Hebrew for ages 5-7"

    Returns:
    - Interpreted search criteria
    - Confidence score
    - Ranked results
    """
    try:
        # Build user context
        user_context = (
            {
                "preferred_language": (
                    current_user.preferred_language
                    if hasattr(current_user, "preferred_language")
                    else None
                ),
                "subscription_tier": current_user.subscription_tier,
            }
            if request.include_user_context
            else {}
        )

        # Execute LLM search
        results = await llm_search.search(
            query=request.query, user_context=user_context, limit=request.limit
        )

        # Log analytics
        if results.get("success"):
            interpretation = results.get("interpretation", {})
            await SearchQuery.log_search(
                query=request.query,
                search_type="llm",
                result_count=results.get("total_results", 0),
                execution_time_ms=results.get("execution_time_ms", 0),
                filters=interpretation.get("extracted_criteria", {}),
                user_id=str(current_user.id),
                llm_interpretation=interpretation.get("text"),
                llm_confidence=interpretation.get("confidence"),
            )

        return results

    except Exception as e:
        logger.error(f"LLM search failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LLM search failed: {str(e)}",
        )
