"""
Proactive Voice Recommendations Endpoint.
Returns AI-generated content suggestions based on watch history and trends.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, field_validator

from app.core.logging_config import get_logger
from app.core.rate_limiter import limiter, RATE_LIMITS
from app.core.security import get_current_user
from app.api.routes.features.validation import (
    validate_ai_feature,
    get_credit_service,
)
from app.models.user import User
from app.services.beta.credit_service import BetaCreditService
from app.services.voice.proactive_service import get_proactive_suggestions

logger = get_logger(__name__)
router = APIRouter()

ALLOWED_PLATFORMS = ["ios", "android", "web", "tvos"]


class ProactiveContext(BaseModel):
    """Optional context for tuning recommendations."""
    current_screen: Optional[str] = None
    idle_seconds: Optional[int] = None


class ProactiveRequest(BaseModel):
    """Request for proactive voice suggestions."""
    platform: str = Field(
        ..., description="Client platform"
    )
    profile_id: Optional[str] = Field(
        None, description="Active profile ID"
    )
    max_suggestions: int = Field(
        default=3, ge=1, le=5,
        description="Max number of suggestions",
    )
    context: Optional[ProactiveContext] = None

    @field_validator("platform")
    @classmethod
    def validate_platform(cls, v: str) -> str:
        if v not in ALLOWED_PLATFORMS:
            raise ValueError(
                f"Platform must be one of: {', '.join(ALLOWED_PLATFORMS)}"
            )
        return v


class ProactiveRecommendation(BaseModel):
    """A single proactive recommendation."""
    content_id: str
    content_type: str
    title: Optional[str] = None
    thumbnail_url: Optional[str] = None
    reason: Optional[str] = None
    reason_type: str
    confidence: float = Field(ge=0.0, le=1.0)
    context: Optional[dict] = None


class ProactiveResponse(BaseModel):
    """Response with ranked suggestions."""
    suggestions: List[ProactiveRecommendation]
    next_poll_seconds: int
    credits_remaining: Optional[int] = None


@router.post(
    "/proactive/suggest",
    response_model=ProactiveResponse,
    summary="Get proactive content recommendations",
    description="Returns personalized recommendations based on "
    "watch history and trending content.",
)
@limiter.limit(RATE_LIMITS.get("voice_proactive", "30/minute"))
async def proactive_suggest(
    http_request: Request,
    request: ProactiveRequest,
    current_user: User = Depends(get_current_user),
    credit_service: BetaCreditService = Depends(get_credit_service),
) -> ProactiveResponse:
    """Validate access, generate suggestions, deduct credit if beta."""

    logger.info(
        "Proactive voice request",
        extra={
            "user_id": str(current_user.id),
            "platform": request.platform,
            "max_suggestions": request.max_suggestions,
        },
    )

    validation = await validate_ai_feature(
        current_user, "proactive_voice", credit_service
    )
    if not validation.enabled:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "feature_unavailable",
                "message": validation.reason or "Feature not available",
            },
        )

    context_dict = None
    if request.context:
        context_dict = request.context.model_dump(exclude_none=True)

    result = await get_proactive_suggestions(
        user_id=str(current_user.id),
        profile_id=request.profile_id,
        max_suggestions=request.max_suggestions,
        platform=request.platform,
        context=context_dict,
    )

    credits_remaining = None
    if validation.metadata:
        credits_remaining = validation.metadata.get("remaining_credits")

    response = ProactiveResponse(
        suggestions=[
            ProactiveRecommendation(**s) for s in result["suggestions"]
        ],
        next_poll_seconds=result["next_poll_seconds"],
        credits_remaining=credits_remaining,
    )

    logger.info(
        "Proactive voice response",
        extra={
            "user_id": str(current_user.id),
            "suggestion_count": len(response.suggestions),
            "next_poll": response.next_poll_seconds,
        },
    )

    return response
