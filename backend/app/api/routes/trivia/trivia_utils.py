"""
Trivia API Utilities.
Helper functions for trivia response formatting and rollout gating.
"""

import hashlib
from typing import Optional

from fastapi import Depends, HTTPException

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.security import get_optional_user
from app.models.trivia import ContentTrivia
from app.models.user import User

logger = get_logger(__name__)


def is_user_in_trivia_rollout(user_id: str) -> bool:
    """
    Check if user is in trivia rollout using deterministic hash-based bucketing.

    Uses hash of user_id to consistently assign users to rollout bucket.
    This ensures the same user always gets the same result.

    Args:
        user_id: User ID for consistent bucketing

    Returns:
        True if user is in rollout, False otherwise

    Algorithm:
        - If TRIVIA_ROLLOUT_PERCENTAGE >= 100: True (full rollout)
        - If TRIVIA_ROLLOUT_PERCENTAGE <= 0: False (disabled)
        - Otherwise: Hash user_id and mod 100 to assign bucket
    """
    if settings.TRIVIA_ROLLOUT_PERCENTAGE >= 100:
        return True
    if settings.TRIVIA_ROLLOUT_PERCENTAGE <= 0:
        return False

    hash_value = int(hashlib.sha256(user_id.encode()).hexdigest(), 16)
    bucket = hash_value % 100
    return bucket < settings.TRIVIA_ROLLOUT_PERCENTAGE


async def check_trivia_rollout(
    current_user: Optional[User] = Depends(get_optional_user),
) -> None:
    """
    FastAPI dependency to enforce trivia rollout percentage.

    Raises:
        503: If trivia feature is globally disabled
        403: If user is not in the rollout percentage

    Note:
        Unauthenticated users are only allowed if rollout is 100%
    """
    if not settings.TRIVIA_ENABLED:
        raise HTTPException(status_code=503, detail="Trivia feature is disabled")

    if settings.TRIVIA_ROLLOUT_PERCENTAGE >= 100:
        return

    if not current_user:
        raise HTTPException(
            status_code=403,
            detail="Trivia feature is not yet available for your account"
        )

    if not is_user_in_trivia_rollout(str(current_user.id)):
        logger.info(
            "User not in trivia rollout",
            extra={
                "user_id": str(current_user.id),
                "rollout_percentage": settings.TRIVIA_ROLLOUT_PERCENTAGE,
            }
        )
        raise HTTPException(
            status_code=403,
            detail="Trivia feature is not yet available for your account"
        )


def format_trivia_response(
    trivia: ContentTrivia,
    language: str,
    multilingual: bool = False,
    include_metadata: bool = False,
) -> dict:
    """
    Format ContentTrivia document for API response.

    Args:
        trivia: ContentTrivia document
        language: Preferred language for single-language mode
        multilingual: If True, include all language fields. If False, return single language
        include_metadata: Include additional metadata fields

    Returns:
        Formatted API response dict
    """
    facts = []
    for fact in trivia.facts:
        # Select text based on mode
        if multilingual:
            # Multilingual mode: return all language fields
            text = fact.text  # Hebrew (default)
        else:
            # Single language mode: select based on language parameter
            text = fact.text
            if language == "en" and fact.text_en:
                text = fact.text_en
            elif language == "es" and fact.text_es:
                text = fact.text_es

        fact_data = {
            "fact_id": fact.fact_id,
            "text": text,
            "trigger_time": fact.trigger_time,
            "trigger_type": fact.trigger_type,
            "category": fact.category,
            "display_duration": fact.display_duration,
            "priority": fact.priority,
        }

        # Add multilingual fields if requested
        if multilingual:
            fact_data["text_he"] = fact.text
            fact_data["text_en"] = fact.text_en
            fact_data["text_es"] = fact.text_es

        if fact.related_person:
            fact_data["related_person"] = fact.related_person

        facts.append(fact_data)

    response = {
        "content_id": trivia.content_id,
        "content_type": trivia.content_type,
        "facts": facts,
        "fact_count": len(facts),
        "is_enriched": trivia.is_enriched,
    }

    if include_metadata:
        response["sources_used"] = trivia.sources_used
        response["tmdb_id"] = trivia.tmdb_id
        response["created_at"] = trivia.created_at.isoformat()
        response["updated_at"] = trivia.updated_at.isoformat()
        if trivia.enriched_at:
            response["enriched_at"] = trivia.enriched_at.isoformat()

    return response
