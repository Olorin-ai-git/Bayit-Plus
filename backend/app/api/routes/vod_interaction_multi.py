"""
VOD Multi-Character Interaction API Routes

REST endpoint for sending messages to specific characters in multi-character
interactive moments. Supports cross-character reactions.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.rate_limiter import RATE_LIMITS, limiter
from app.core.security import get_current_user
from app.models.user import User
from app.models.vod_interaction import VODInteractionSession
from app.services.vod_interaction.multi_character_handler import multi_character_handler

logger = get_logger(__name__)

router = APIRouter(
    prefix="/vod-interactions",
    tags=["VOD Multi-Character Interaction"],
)


class MultiCharacterMessageRequest(BaseModel):
    """Request to send a message to a specific character"""
    message: str = Field(..., min_length=1, max_length=500)
    addressed_character: str = Field(..., description="Name of character to address")


class MultiCharacterExchange(BaseModel):
    """Single exchange in multi-character interaction"""
    speaker: str
    message_text: str
    character_name: Optional[str] = None
    audio_url: Optional[str] = None
    animated_video_url: Optional[str] = None
    reaction_to: Optional[str] = None


class MultiCharacterResponseModel(BaseModel):
    """Response containing all exchanges from a multi-character message"""
    exchanges: List[MultiCharacterExchange]


@router.post(
    "/sessions/{session_id}/multi-message",
    response_model=MultiCharacterResponseModel,
)
@limiter.limit(RATE_LIMITS.get("vod_interaction_multi_message", "10/minute"))
async def send_multi_character_message(
    request: Request,
    session_id: str,
    body: MultiCharacterMessageRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Send a message to a specific character in a multi-character moment.

    Returns the addressed character's animated response plus any
    reactions from other characters present in the scene.
    """
    if not settings.VOD_INTERACTION_MULTI_CHARACTER_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Multi-character interactions are not enabled",
        )

    try:
        session = await VODInteractionSession.get(session_id)
        if not session or str(session.user_id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found",
            )

        exchanges = await multi_character_handler.process_multi_character_message(
            session=session,
            user_message=body.message,
            addressed_character=body.addressed_character,
        )

        logger.info(
            "Multi-character message processed via API",
            extra={
                "user_id": str(current_user.id),
                "session_id": session_id,
                "addressed": body.addressed_character,
                "exchange_count": len(exchanges),
            },
        )

        return MultiCharacterResponseModel(
            exchanges=[
                MultiCharacterExchange(
                    speaker=ex.speaker,
                    message_text=ex.message_text,
                    character_name=ex.character_name,
                    audio_url=ex.audio_url,
                    animated_video_url=ex.animated_video_url,
                    reaction_to=ex.reaction_to,
                )
                for ex in exchanges
            ]
        )

    except HTTPException:
        raise
    except ValueError as exc:
        logger.warning(
            "Invalid multi-character message request",
            extra={"session_id": session_id, "error": str(exc)},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc),
        )
    except Exception as exc:
        logger.error(
            "Failed to process multi-character message",
            extra={"session_id": session_id, "error": str(exc)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process multi-character message",
        )
