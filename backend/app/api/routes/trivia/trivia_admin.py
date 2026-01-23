"""
Trivia Admin API Routes.
Administrative endpoints for trivia management.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.rate_limiter import RATE_LIMITS, limiter
from app.core.security import get_current_active_user
from app.models.content import Content
from app.models.trivia import ContentTrivia
from app.models.user import User
from app.services.security_utils import validate_object_id
from app.services.trivia import TriviaGenerationService

from .trivia_utils import format_trivia_response

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/{content_id}/generate")
@limiter.limit(RATE_LIMITS.get("trivia_generate", "5/hour"))
async def generate_trivia(
    request: Request,
    content_id: str,
    force: bool = False,
    enrich: bool = True,
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """
    Force regenerate trivia for content (admin only).
    Use force=true to regenerate even if trivia exists.
    """
    if not current_user.is_admin_user():
        raise HTTPException(status_code=403, detail="Admin access required")

    validated_id = validate_object_id(content_id)

    if not force:
        existing = await ContentTrivia.get_for_content(validated_id)
        if existing:
            return {
                "status": "exists",
                "message": "Trivia already exists. Use force=true to regenerate.",
                "trivia": format_trivia_response(existing, "he"),
            }

    content = await Content.get(validated_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    # TriviaGenerationService uses atomic create_or_update - no need for delete-then-insert
    generator = TriviaGenerationService()
    trivia = await generator.generate_trivia(content, enrich=enrich)

    logger.info(f"Trivia regenerated for content {content_id} by {current_user.email}")

    return {
        "status": "generated",
        "trivia": format_trivia_response(trivia, "he", include_metadata=True),
    }
