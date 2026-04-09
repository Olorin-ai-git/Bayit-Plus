"""
Cultural Context User Routes.

User-authenticated endpoints for cultural reference detection,
phrase breakdowns, and glossary browsing.
Delegates to existing CulturalContextService and PhraseBreakdownService.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.dependencies.ai_access import get_credit_service, require_ai_access
from app.api.dependencies.training_context import deduct_training_credits_if_applicable
from app.core.logging_config import get_logger
from app.core.security import get_current_user
from app.models.cultural_reference import (
    ContextDetectionRequest,
    ContextDetectionResponse,
    ReferenceExplanation,
)
from app.models.phrase_breakdown import (
    PhraseBreakdownRequest,
    PhraseBreakdownResponse,
)
from app.models.user import User
from app.services.beta.credit_service import BetaCreditService
from app.services.olorin.context.service import cultural_context_service
from app.services.phrase_breakdown_service import phrase_breakdown_service

logger = get_logger(__name__)

router = APIRouter(prefix="/cultural", tags=["cultural-context"])


@router.post(
    "/detect",
    response_model=ContextDetectionResponse,
)
async def detect_cultural_references(
    request: ContextDetectionRequest,
    user: User = Depends(require_ai_access),
    credit_service: BetaCreditService = Depends(get_credit_service),
):
    """Detect cultural references in subtitle text."""
    # Training portal credit deduction (no-op for B2C users)
    await deduct_training_credits_if_applicable(user, "cultural")

    if not user.can_access_premium_features():
        success, remaining = await credit_service.deduct_credits(
            user_id=str(user.id),
            feature="cultural_detect",
            usage_amount=1.0,
            metadata={"text_length": len(request.text)},
        )
        if not success:
            raise HTTPException(status_code=402, detail="Insufficient credits")

    return await cultural_context_service.detect_references(request)


@router.get(
    "/explain/{reference_id}",
    response_model=ReferenceExplanation,
)
async def explain_reference(
    reference_id: str,
    language: str = Query(default="en", pattern="^(en|es|he)$"),
    user=Depends(get_current_user),
):
    """Get detailed explanation of a cultural reference."""
    from fastapi import HTTPException

    explanation = await cultural_context_service.explain_reference(
        reference_id, language
    )
    if not explanation:
        raise HTTPException(
            status_code=404, detail="Reference not found"
        )
    return explanation


@router.post(
    "/phrase-breakdown",
    response_model=PhraseBreakdownResponse,
)
async def get_phrase_breakdown(
    request: PhraseBreakdownRequest,
    user: User = Depends(require_ai_access),
    credit_service: BetaCreditService = Depends(get_credit_service),
):
    """Get TikTok-style breakdown of a Hebrew phrase."""
    # Training portal credit deduction (no-op for B2C users)
    await deduct_training_credits_if_applicable(user, "cultural")

    if not user.can_access_premium_features():
        success, remaining = await credit_service.deduct_credits(
            user_id=str(user.id),
            feature="phrase_breakdown",
            usage_amount=1.0,
            metadata={"phrase": request.phrase},
        )
        if not success:
            raise HTTPException(status_code=402, detail="Insufficient credits")

    return await phrase_breakdown_service.get_breakdown(
        phrase=request.phrase,
        source_content_id=request.source_content_id,
    )


@router.get(
    "/glossary",
    response_model=List[PhraseBreakdownResponse],
)
async def browse_glossary(
    query: Optional[str] = Query(default=None, max_length=100),
    tags: Optional[str] = Query(
        default=None, description="Comma-separated tags"
    ),
    limit: int = Query(default=20, ge=1, le=50),
    skip: int = Query(default=0, ge=0),
    user=Depends(get_current_user),
):
    """Browse the Hebrew phrase glossary with search and filtering."""
    tag_list = None
    if tags:
        tag_list = [t.strip() for t in tags.split(",") if t.strip()]

    return await phrase_breakdown_service.search_breakdowns(
        query=query or "",
        tags=tag_list,
        limit=limit,
        skip=skip,
    )


@router.get(
    "/glossary/popular",
    response_model=List[PhraseBreakdownResponse],
)
async def get_popular_phrases(
    limit: int = Query(default=20, ge=1, le=50),
    user=Depends(get_current_user),
):
    """Get most popular phrase breakdowns."""
    return await phrase_breakdown_service.get_popular(limit=limit)


@router.get(
    "/references/category/{category}",
)
async def get_references_by_category(
    category: str,
    limit: int = Query(default=50, ge=1, le=100),
    user=Depends(get_current_user),
):
    """Get cultural references by category for glossary browsing."""
    refs = await cultural_context_service.get_references_by_category(
        category, limit
    )
    return [
        {
            "reference_id": r.reference_id,
            "canonical_name": r.canonical_name,
            "canonical_name_en": r.canonical_name_en,
            "category": r.category,
            "subcategory": r.subcategory,
            "short_explanation": r.short_explanation,
            "short_explanation_en": r.short_explanation_en,
            "image_url": r.image_url,
        }
        for r in refs
    ]
