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

    Supports both new schema (source_language + translations) and legacy schema
    (text_he, text_en, text_es) for backward compatibility.

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
            text = fact.text  # Source text (English or Hebrew)
        else:
            # Single language mode: use get_text_for_language() for proper fallback
            text = fact.get_text_for_language(language)

        fact_data = {
            "fact_id": fact.fact_id,
            "text": text,
            "trigger_time": fact.trigger_time,
            "trigger_type": fact.trigger_type,
            "category": fact.category,
            "display_duration": fact.display_duration,
            "priority": fact.priority,
        }

        # NEW SCHEMA: Add source_language and translations
        if fact.source_language:
            fact_data["source_language"] = fact.source_language
        if fact.translations:
            fact_data["translations"] = fact.translations

        # LEGACY SCHEMA: Backward compatibility fields
        # These are populated from translations dict or legacy fields
        if multilingual or language == "he":
            fact_data["text_he"] = fact.get_text_for_language("he")
        if multilingual or language == "en":
            fact_data["text_en"] = fact.get_text_for_language("en")
        if multilingual or language == "es":
            fact_data["text_es"] = fact.get_text_for_language("es")

        if fact.related_person:
            fact_data["related_person"] = fact.related_person

        # Chain fields (always included, null/false for standalone facts)
        fact_data["chain_id"] = fact.chain_id
        fact_data["chain_order"] = fact.chain_order
        fact_data["has_follow_up"] = fact.has_follow_up

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
