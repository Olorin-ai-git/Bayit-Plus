"""
Guest Demo Endpoint — unauthenticated Pause & Ask for pricing page free tier.

Allows visitors to try one character interaction without signing up.
Rate-limited by IP (5/minute) and capped per fingerprint (GUEST_DEMO_MAX_INTERACTIONS lifetime).
"""

from datetime import datetime
from typing import Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.rate_limiter import RATE_LIMITS, limiter
from app.models.content import Content
from app.models.guest_demo import GuestDemoUsage
from app.models.vod_interaction import ContentCharacter, VODInteractionSession
from app.services.vod_interaction.pause_ask_models import PauseAskServiceError
from app.services.vod_interaction.pause_ask_orchestrator import (
    pause_ask_orchestrator,
)

logger = get_logger(__name__)

router = APIRouter()


class GuestDemoRequest(BaseModel):
    """Request body for the unauthenticated guest demo interaction."""

    fingerprint: str = Field(
        ..., min_length=8, max_length=128,
        description="Client-generated UUID to track lifetime usage",
    )
    message: str = Field(
        ..., min_length=1, max_length=500,
        description="User question for the character",
    )
    character_name: str = Field(
        ..., min_length=1, max_length=200,
        description="Name of the character to address",
    )
    language_hint: str = Field(
        default="en", max_length=10,
        description="Language hint for text polishing",
    )


class GuestDemoResponse(BaseModel):
    """Response from a guest demo character interaction."""

    character_name: str
    character_response_text: str
    character_audio_url: str
    interactions_remaining: int


async def _get_or_create_usage(fingerprint: str, ip_address: str) -> GuestDemoUsage:
    """Fetch existing usage record or create a new one for the fingerprint."""
    usage = await GuestDemoUsage.find_one(GuestDemoUsage.fingerprint == fingerprint)
    if usage is not None:
        return usage
    new_usage = GuestDemoUsage(fingerprint=fingerprint, ip_address=ip_address)
    await new_usage.insert()
    return new_usage


def _check_demo_limit(
    usage: GuestDemoUsage, max_interactions: int,
) -> None:
    """Raise 429 if the guest has exhausted their lifetime demo interactions."""
    if not usage.can_interact(max_interactions):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Demo limit reached ({usage.interaction_count}/{max_interactions}). "
                "Sign up for full access."
            ),
        )


def _find_character(
    characters: list, name: str,
) -> Optional[ContentCharacter]:
    """Find a character by name (case-insensitive)."""
    name_lower = name.lower()
    for char in characters:
        if char.name.lower() == name_lower:
            return char
    return None


@router.post(
    "/demo/pause-ask",
    response_model=GuestDemoResponse,
    status_code=status.HTTP_200_OK,
    tags=["guest-demo"],
    summary="Unauthenticated demo: ask a character a question",
)
@limiter.limit(RATE_LIMITS.get("guest_demo_pause_ask", "5/minute"))
async def guest_demo_pause_ask(
    request: Request,
    body: GuestDemoRequest,
) -> GuestDemoResponse:
    """
    Guest demo endpoint for the pricing page.

    No auth required. Limited to GUEST_DEMO_MAX_INTERACTIONS per fingerprint
    and 5 requests/minute per IP.
    """
    if not settings.DEMO_CONTENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Demo is not configured",
        )

    ip_address = request.client.host if request.client else ""

    usage = await _get_or_create_usage(body.fingerprint, ip_address)
    _check_demo_limit(usage, settings.GUEST_DEMO_MAX_INTERACTIONS)

    content = await Content.get(PydanticObjectId(settings.DEMO_CONTENT_ID))
    if not content:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Demo content unavailable",
        )

    chars = getattr(content, "interactive_characters", []) or []
    character = _find_character(chars, body.character_name)
    if not character:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Character '{body.character_name}' not found in demo content",
        )

    session = VODInteractionSession(
        user_id="guest:demo",
        profile_id="guest:demo",
        content_id=settings.DEMO_CONTENT_ID,
        character_name=character.name,
        character_description=character.description,
        character_voice_id=character.voice_id,
        character_frame_url=character.frame_url,
        scene_context=character.movie_context,
        status="active",
    )
    await session.insert()

    try:
        result = await pause_ask_orchestrator.process_exchange(
            session=session,
            user_message=body.message,
            language_hint=body.language_hint,
            voice_only=True,
        )
    except PauseAskServiceError as exc:
        logger.error(
            "Guest demo Pause & Ask service failure",
            extra={
                "fingerprint": body.fingerprint,
                "failed_service": exc.failed_service,
                "detail": exc.detail,
            },
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"message": exc.detail, "failed_service": exc.failed_service},
        ) from exc
    except Exception as exc:
        logger.error(
            "Guest demo Pause & Ask failed",
            extra={"fingerprint": body.fingerprint, "error": str(exc)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Demo interaction failed",
        ) from exc

    usage.interaction_count += 1
    usage.last_interaction_at = datetime.utcnow()
    await usage.save()

    interactions_remaining = max(
        0, settings.GUEST_DEMO_MAX_INTERACTIONS - usage.interaction_count,
    )

    logger.info(
        "Guest demo interaction completed",
        extra={
            "fingerprint": body.fingerprint,
            "character_name": character.name,
            "interaction_count": usage.interaction_count,
            "interactions_remaining": interactions_remaining,
        },
    )

    return GuestDemoResponse(
        character_name=result.character_name,
        character_response_text=result.character_response_text,
        character_audio_url=result.character_audio_url,
        interactions_remaining=interactions_remaining,
    )
