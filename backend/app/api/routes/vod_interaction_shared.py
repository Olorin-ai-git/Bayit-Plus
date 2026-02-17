"""
VOD Shared Interaction API Routes

REST endpoints for shared interactive sessions within watch parties.
Supports starting, joining, messaging, and ending shared sessions.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.rate_limiter import RATE_LIMITS, limiter
from app.core.security import get_current_user
from app.models.user import User
from app.models.vod_interaction import VODInteractionSession
from app.services.vod_interaction.shared_interaction_service import (
    shared_interaction_service,
)

logger = get_logger(__name__)

router = APIRouter(
    prefix="/parties",
    tags=["VOD Shared Interaction"],
)


class StartSharedInteractionRequest(BaseModel):
    """Request to start a shared interaction in a watch party"""
    content_id: str = Field(..., description="Content ID")
    moment_timestamp: float = Field(..., description="Interactive moment timestamp")
    character_name: str = Field(..., description="Character to interact with")
    profile_id: str = Field(..., description="Host profile ID")
    avatar_id: str = Field(..., description="Host avatar ID")
    display_name: str = Field(..., description="Host display name")


class SharedMessageRequest(BaseModel):
    """Request to send a message in a shared interaction"""
    message: str = Field(..., min_length=1, max_length=500)
    addressed_character: Optional[str] = Field(
        None, description="Character to address (multi-character)",
    )


class SharedExchange(BaseModel):
    """Exchange in a shared interaction response"""
    speaker: str
    message_text: str
    character_name: Optional[str] = None
    audio_url: Optional[str] = None
    animated_video_url: Optional[str] = None
    participant_user_id: Optional[str] = None
    participant_name: Optional[str] = None


@router.post("/{party_id}/interaction/start")
@limiter.limit(RATE_LIMITS.get("vod_interaction_shared_message", "10/minute"))
async def start_shared_interaction(
    party_id: str,
    request: StartSharedInteractionRequest,
    current_user: User = Depends(get_current_user),
):
    """Start a shared interactive session in a watch party (host only)"""
    if not settings.VOD_INTERACTION_SHARED_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Shared interactions are not enabled",
        )
    try:
        session = await shared_interaction_service.start_shared_session(
            party_id=party_id,
            content_id=request.content_id,
            moment_timestamp=request.moment_timestamp,
            character_name=request.character_name,
            host_user_id=str(current_user.id),
            host_profile_id=request.profile_id,
            host_avatar_id=request.avatar_id,
            host_display_name=request.display_name,
        )
        return {"session_id": str(session.id), "status": session.status}

    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        logger.error(
            "Failed to start shared interaction",
            extra={"party_id": party_id, "error": str(exc)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start shared interaction",
        )


@router.post("/{party_id}/interaction/{session_id}/message")
@limiter.limit(RATE_LIMITS.get("vod_interaction_shared_message", "10/minute"))
async def send_shared_message(
    party_id: str,
    session_id: str,
    request: SharedMessageRequest,
    current_user: User = Depends(get_current_user),
):
    """Send a message in a shared interaction (current turn user only)"""
    try:
        exchanges = await shared_interaction_service.process_participant_message(
            session_id=session_id,
            user_id=str(current_user.id),
            message=request.message,
            addressed_character=request.addressed_character,
        )
        return {
            "exchanges": [
                SharedExchange(
                    speaker=ex.speaker,
                    message_text=ex.message_text,
                    character_name=ex.character_name,
                    audio_url=ex.audio_url,
                    animated_video_url=ex.animated_video_url,
                    participant_user_id=ex.participant_user_id,
                    participant_name=ex.participant_name,
                ).dict()
                for ex in exchanges
            ]
        }

    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        logger.error(
            "Failed to process shared message",
            extra={"session_id": session_id, "error": str(exc)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process shared message",
        )


@router.post("/{party_id}/interaction/{session_id}/end")
async def end_shared_interaction(
    party_id: str,
    session_id: str,
    current_user: User = Depends(get_current_user),
):
    """End a shared interactive session"""
    try:
        session = await shared_interaction_service.end_shared_session(
            session_id=session_id, user_id=str(current_user.id),
        )
        return {"session_id": str(session.id), "status": session.status}

    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        logger.error(
            "Failed to end shared interaction",
            extra={"session_id": session_id, "error": str(exc)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to end shared interaction",
        )


@router.get("/{party_id}/interaction/{session_id}")
async def get_shared_interaction_state(
    party_id: str,
    session_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get current state of a shared interaction session"""
    session = await VODInteractionSession.get(session_id)
    if not session or not session.is_shared:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared session not found",
        )
    meta = session.shared_metadata
    return {
        "session_id": str(session.id),
        "status": session.status,
        "character_name": session.character_name,
        "participant_count": len(meta.participants) if meta else 0,
        "current_turn_user_id": meta.current_turn_user_id if meta else None,
        "turns_completed": meta.turns_completed if meta else 0,
        "exchanges_count": len(session.dialogue_exchanges),
    }
