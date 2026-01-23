"""
Trivia Core API Routes.
Public endpoints for retrieving trivia facts.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.config import settings
from app.core.rate_limiter import RATE_LIMITS, limiter
from app.core.security import get_optional_user
from app.models.content import Content
from app.models.trivia import ContentTrivia
from app.models.user import User
from app.services.security_utils import validate_object_id
from app.services.trivia import TriviaGenerationService

from .trivia_utils import format_trivia_response

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health")
async def trivia_health_check():
    """Health check endpoint for trivia service."""
    return {
        "status": "healthy",
        "feature_enabled": settings.TRIVIA_ENABLED,
        "rollout_percentage": settings.TRIVIA_ROLLOUT_PERCENTAGE,
    }


@router.get("/{content_id}")
@limiter.limit(RATE_LIMITS.get("trivia_get", "60/minute"))
async def get_trivia(
    request: Request,
    content_id: str,
    language: str = "he",
    current_user: Optional[User] = Depends(get_optional_user),
) -> dict:
    """
    Get trivia facts for a specific content item.
    Returns cached trivia if available, or generates new trivia from TMDB.
    """
    if not settings.TRIVIA_ENABLED:
        raise HTTPException(status_code=503, detail="Trivia feature is disabled")

    validated_id = validate_object_id(content_id)

    existing = await ContentTrivia.get_for_content(validated_id)
    if existing:
        return format_trivia_response(existing, language)

    content = await Content.get(validated_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    generator = TriviaGenerationService()
    trivia = await generator.generate_trivia(content, enrich=False)

    return format_trivia_response(trivia, language)


@router.get("/{content_id}/enriched")
@limiter.limit(RATE_LIMITS.get("trivia_enriched", "3/hour"))
async def get_enriched_trivia(
    request: Request,
    content_id: str,
    language: str = "he",
    current_user: Optional[User] = Depends(get_optional_user),
) -> dict:
    """
    Get full enriched trivia bundle for offline playback.
    Includes AI-generated facts in addition to TMDB data.
    """
    if not settings.TRIVIA_ENABLED:
        raise HTTPException(status_code=503, detail="Trivia feature is disabled")

    validated_id = validate_object_id(content_id)

    existing = await ContentTrivia.get_for_content(validated_id)
    if existing and existing.is_enriched:
        return format_trivia_response(existing, language, include_metadata=True)

    content = await Content.get(validated_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    generator = TriviaGenerationService()
    trivia = await generator.generate_trivia(content, enrich=True)

    return format_trivia_response(trivia, language, include_metadata=True)
