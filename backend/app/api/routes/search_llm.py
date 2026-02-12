"""
LLM Natural Language Search API Routes.

Provides AI-powered natural language search:
- Claude AI query interpretation
- Complex query understanding
- Automatic filter extraction
- Premium user feature
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies.ai_access import get_credit_service, require_ai_access
from app.api.routes.search_models import LLMSearchRequest
from app.core.logging_config import get_logger
from app.models.search_analytics import SearchQuery
from app.models.user import User
from app.services.beta.credit_service import BetaCreditService
from app.services.vod_llm_search_service import VODLLMSearchService

router = APIRouter(prefix="/search", tags=["search", "llm"])
logger = get_logger(__name__)

# Service instance
llm_search = VODLLMSearchService()


@router.post("/llm")
async def llm_natural_language_search(
    request: LLMSearchRequest,
    current_user: User = Depends(require_ai_access),
    credit_service: BetaCreditService = Depends(get_credit_service),
):
    """
    Natural language search using Claude AI.

    Requires Admin, Premium/Family, or Beta-500 access.

    Interprets complex queries and extracts search criteria automatically.

    Returns:
    - Interpreted search criteria
    - Confidence score
    - Ranked results
    """
    try:
        if current_user.is_beta_user and not current_user.is_admin_role():
            success, remaining = await credit_service.deduct_credits(
                user_id=str(current_user.id),
                feature="ai_search",
                usage_amount=1.0,
                metadata={"query": request.query},
            )
            if not success:
                raise HTTPException(status_code=402, detail="Insufficient Beta 500 credits")

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

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "LLM search failed",
            extra={"user_id": str(current_user.id), "error": str(e)},
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="LLM search failed",
        )
