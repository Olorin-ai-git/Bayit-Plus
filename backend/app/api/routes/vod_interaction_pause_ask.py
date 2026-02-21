"""
Pause & Ask API Route

REST endpoint for the Dynamic Pause & Ask feature. Users with a voice-cloned
avatar can pause a movie, select a character, ask a question, and receive
animated lip-sync videos of both their avatar and the character's response.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.rate_limiter import RATE_LIMITS, limiter
from app.core.security import get_current_user
from app.models.child_avatar import ChildAvatar
from app.models.user import User
from app.models.vod_interaction import VODInteractionSession
from app.services.beta.credit_service import credit_service
from app.services.vod_interaction.pause_ask_models import PauseAskResult
from app.services.vod_interaction.pause_ask_orchestrator import (
    pause_ask_orchestrator,
)

logger = get_logger(__name__)

router = APIRouter(
    prefix="/vod-interactions",
    tags=["VOD Interactions - Pause & Ask"],
)


class PauseAskRequest(BaseModel):
    """Request body for Pause & Ask exchange."""

    message: str = Field(
        ..., min_length=1, max_length=500,
        description="User's question text",
    )
    language_hint: str = Field(
        default="", max_length=10,
        description="Language hint for polishing (e.g. 'he', 'en')",
    )


class PauseAskResponseModel(BaseModel):
    """Response model for Pause & Ask exchange."""

    user_polished_text: str
    user_audio_url: str
    user_animated_video_url: str
    user_video_duration: float
    character_name: str
    character_response_text: str
    character_audio_url: str
    character_animated_video_url: str
    character_video_duration: float


@router.post(
    "/sessions/{session_id}/pause-ask",
    response_model=PauseAskResponseModel,
    status_code=status.HTTP_200_OK,
)
@limiter.limit(RATE_LIMITS.get("vod_interaction_pause_ask", "10/minute"))
async def pause_ask_exchange(
    request: Request,
    session_id: str,
    body: PauseAskRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Process a Pause & Ask exchange: polish text, animate user avatar,
    generate character response, animate character, charge credits.
    """
    if not settings.VOD_INTERACTION_PAUSE_ASK_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Pause & Ask feature is disabled",
        )

    session = await VODInteractionSession.get(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    if session.user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Session does not belong to this user",
        )
    if session.status != "active":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Session is not active: {session.status}",
        )
    if len(session.dialogue_exchanges) >= settings.VOD_INTERACTION_MAX_EXCHANGES:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Maximum dialogue exchanges reached",
        )

    avatar = await ChildAvatar.get(session.avatar_id)
    if not avatar or not avatar.has_voice_clone:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Avatar voice clone not ready for Pause & Ask",
        )

    has_balance = await credit_service.has_sufficient_credits(
        user_id=str(current_user.id),
        amount=settings.CREDIT_RATE_VOD_PAUSE_ASK,
    )
    if not has_balance:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient credits for Pause & Ask",
        )

    try:
        result: PauseAskResult = await pause_ask_orchestrator.process_exchange(
            session=session,
            user_message=body.message,
            language_hint=body.language_hint,
        )
        return PauseAskResponseModel(**result.model_dump())

    except ValueError as ve:
        logger.warning(
            "Pause & Ask validation error",
            extra={"session_id": session_id, "error": str(ve)},
        )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(ve),
        )
    except Exception as exc:
        logger.error(
            "Pause & Ask processing failed",
            extra={"session_id": session_id, "error": str(exc)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Pause & Ask processing failed",
        )
