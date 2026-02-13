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

from .trivia_utils import check_trivia_rollout, format_trivia_response

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
    multilingual: bool = False,
    current_user: Optional[User] = Depends(get_optional_user),
    _rollout: None = Depends(check_trivia_rollout),
) -> dict:
    """
    Get enriched trivia facts for a specific content item.
    Returns cached enriched trivia if available, or generates new AI-chained trivia.

    Args:
        content_id: Content item ID
        language: Preferred language for single-language mode (default: "he")
        multilingual: If True, return all language fields. If False, return single language
        current_user: Optional authenticated user
    """
    validated_id = validate_object_id(content_id)

    existing = await ContentTrivia.get_for_content(validated_id)
    if existing and existing.is_enriched and "ai" in existing.sources_used:
        logger.debug(
            "Returning cached AI-enriched trivia",
            extra={"content_id": content_id, "sources": existing.sources_used}
        )
        return format_trivia_response(
            existing, language, multilingual, include_metadata=True
        )

    if existing and existing.is_enriched and "ai" not in existing.sources_used:
        logger.info(
            "Regenerating trivia: cached version has no AI facts",
            extra={"content_id": content_id, "sources": existing.sources_used}
        )

    content = await Content.get(validated_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    generator = TriviaGenerationService()
    trivia = await generator.generate_trivia(content, enrich=True, language=language)

    return format_trivia_response(trivia, language, multilingual, include_metadata=True)


@router.get("/{content_id}/quiz")
@limiter.limit(RATE_LIMITS.get("quiz_get", "30/minute"))
async def get_vod_quiz(
    request: Request,
    content_id: str,
    profile_id: Optional[str] = None,
    language: str = "he",
    current_user: Optional[User] = Depends(get_optional_user),
    _rollout: None = Depends(check_trivia_rollout),
) -> dict:
    """
    Get AI-generated quiz for VOD content (movies, series).
    Generates quiz questions from trivia facts or content metadata.

    Args:
        content_id: Content item ID
        profile_id: Optional profile ID (unused, for API compatibility)
        language: Preferred language for questions
        current_user: Optional authenticated user
    """
    validated_id = validate_object_id(content_id)

    content = await Content.get(validated_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    # Generate trivia facts first
    generator = TriviaGenerationService()
    trivia = await generator.generate_trivia(content, enrich=True, language=language)

    if not trivia or not trivia.facts:
        logger.warning(
            "No trivia facts available for quiz generation",
            extra={"content_id": content_id}
        )
        raise HTTPException(
            status_code=404,
            detail="Could not generate quiz for this content"
        )

    # Convert trivia facts to quiz questions
    from app.services.trivia.trivia_to_quiz_converter import convert_trivia_to_quiz

    questions = await convert_trivia_to_quiz(trivia.facts, content, language)

    if not questions:
        raise HTTPException(
            status_code=404,
            detail="Could not generate quiz questions from trivia"
        )

    logger.info(
        "VOD quiz generated",
        extra={
            "content_id": content_id,
            "question_count": len(questions),
            "language": language
        }
    )

    return {
        "quiz_id": str(trivia.id),
        "content_id": content_id,
        "questions": questions
    }
