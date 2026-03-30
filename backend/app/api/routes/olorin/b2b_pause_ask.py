"""
Olorin.ai Pause & Ask B2B API

B2B endpoint for asking characters questions about video content.
Creates ephemeral sessions internally -- B2B callers never see session IDs.
"""

import logging
from datetime import datetime
from typing import Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.routes.olorin.dependencies import (
    get_current_partner,
    verify_capability,
)
from app.api.routes.olorin.errors import OlorinErrors, get_error_message
from app.api.routes.olorin.webhooks import send_webhook_event
from app.models.content import Content
from app.models.integration_partner import IntegrationPartner
from app.models.vod_interaction import ContentCharacter, VODInteractionSession
from app.services.olorin.metering_service import metering_service
from app.services.vod_interaction.pause_ask_models import PauseAskServiceError
from app.services.vod_interaction.pause_ask_orchestrator import (
    pause_ask_orchestrator,
)

logger = logging.getLogger(__name__)

router = APIRouter()


class PauseAskRequest(BaseModel):
    """B2B request to ask a character a question."""

    character: str = Field(..., min_length=1, max_length=200)
    question: str = Field(..., min_length=1, max_length=500)
    mode: str = Field(
        default="voice",
        description="voice (audio only) or lipsync (audio + video)",
    )
    language_hint: str = Field(default="en", max_length=10)


class PauseAskResponse(BaseModel):
    """B2B response from character."""

    character_name: str
    response_text: str
    audio_url: str
    lipsync_url: Optional[str] = None
    latency_ms: Optional[float] = None


def _find_character(
    characters: list, name: str,
) -> Optional[ContentCharacter]:
    """Find a character by name (case-insensitive)."""
    name_lower = name.lower()
    for c in characters:
        if c.name.lower() == name_lower:
            return c
    return None


@router.post(
    "/{content_id}/pause-ask",
    response_model=PauseAskResponse,
    summary="Ask a character a question",
)
async def pause_ask(
    content_id: str,
    request: PauseAskRequest,
    background_tasks: BackgroundTasks,
    partner: IntegrationPartner = Depends(get_current_partner),
) -> PauseAskResponse:
    """Ask a character a question about video content."""
    await verify_capability(partner, "pause_ask")

    content = await Content.get(PydanticObjectId(content_id))
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=get_error_message(OlorinErrors.CONTENT_NOT_FOUND),
        )

    chars = getattr(content, "interactive_characters", []) or []
    if not chars:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=get_error_message(OlorinErrors.NO_CHARACTERS_AVAILABLE),
        )

    character = _find_character(chars, request.character)
    if not character:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=get_error_message(
                OlorinErrors.CONTENT_NOT_FOUND,
                character=request.character,
            ),
        )

    voice_only = request.mode == "voice"
    start_time = datetime.utcnow()

    # Create ephemeral session for the orchestrator
    session = VODInteractionSession(
        user_id=f"partner:{partner.partner_id}",
        profile_id=f"partner:{partner.partner_id}",
        content_id=content_id,
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
            user_message=request.question,
            language_hint=request.language_hint,
            voice_only=voice_only,
        )
    except PauseAskServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "message": exc.detail,
                "failed_service": exc.failed_service,
            },
        ) from exc
    except Exception as exc:
        logger.exception(
            "Pause & Ask B2B failed",
            extra={"content_id": content_id, "partner": partner.partner_id},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_error_message(OlorinErrors.PAUSE_ASK_FAILED),
        ) from exc

    elapsed_ms = (datetime.utcnow() - start_time).total_seconds() * 1000

    await metering_service.record_usage(
        partner_id=partner.partner_id,
        capability="pause_ask",
        metadata={"content_id": content_id, "voice_only": voice_only},
    )

    await send_webhook_event(partner, "session.ended", {
        "capability": "pause_ask",
        "content_id": content_id,
        "character": character.name,
    }, background_tasks)

    return PauseAskResponse(
        character_name=result.character_name,
        response_text=result.character_response_text,
        audio_url=result.character_audio_url,
        lipsync_url=(
            result.character_animated_video_url if not voice_only else None
        ),
        latency_ms=round(elapsed_ms, 1),
    )
