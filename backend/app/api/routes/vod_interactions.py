"""
VOD Interaction API Routes

User-facing endpoints for VOD avatar interactions with movie characters.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.models.user import User
from app.models.vod_interaction import VODInteractionSession, DialogueExchange
from app.services.vod_interaction.interaction_service import vod_interaction_service
from app.core.security import get_current_user
from app.core.logging_config import get_logger

logger = get_logger(__name__)


router = APIRouter(prefix="/vod-interactions", tags=["VOD Interactions"])


class StartInteractionRequest(BaseModel):
    """Request to start an interaction session"""
    profile_id: str = Field(..., description="Child profile ID")
    avatar_id: str = Field(..., description="Avatar mesh ID")
    content_id: str = Field(..., description="Content ID")
    timestamp: float = Field(..., description="Timestamp of interactive moment")


class UserMessageRequest(BaseModel):
    """Request to send user message to character"""
    message: str = Field(..., min_length=1, max_length=500)


class CharacterResponseModel(BaseModel):
    """Character's response to user message"""
    character_name: str
    response_text: str
    audio_url: str
    animated_video_url: str


class SessionStatusResponse(BaseModel):
    """Session status information"""
    session_id: str
    character_name: str
    status: str
    exchanges_count: int


@router.post("/sessions/start", response_model=VODInteractionSession)
async def start_interaction_session(
    request: StartInteractionRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Start a new interaction session at an interactive moment

    Args:
        request: Session creation parameters
        current_user: Authenticated user

    Returns:
        Created interaction session
    """
    try:
        session = await vod_interaction_service.start_interaction_session(
            user_id=str(current_user.id),
            profile_id=request.profile_id,
            avatar_id=request.avatar_id,
            content_id=request.content_id,
            moment_timestamp=request.timestamp
        )

        logger.info(
            "Interaction session created via API",
            extra={
                "user_id": str(current_user.id),
                "session_id": str(session.id),
                "character_name": session.character_name
            }
        )

        return session

    except ValueError as e:
        logger.warning(
            "Invalid session creation request",
            extra={"user_id": str(current_user.id), "error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(
            "Failed to create interaction session",
            extra={"user_id": str(current_user.id), "error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start interaction session"
        )


@router.post("/sessions/{session_id}/message", response_model=CharacterResponseModel)
async def send_user_message(
    session_id: str,
    request: UserMessageRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Send user message to character and get animated response

    Args:
        session_id: Session ID
        request: User message
        current_user: Authenticated user

    Returns:
        Character's animated response
    """
    try:
        exchange = await vod_interaction_service.process_user_message(
            session_id=session_id,
            user_message=request.message
        )

        session = await VODInteractionSession.get(session_id)
        if not session or str(session.user_id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        logger.info(
            "User message processed via API",
            extra={
                "user_id": str(current_user.id),
                "session_id": session_id,
                "character_name": session.character_name
            }
        )

        return CharacterResponseModel(
            character_name=session.character_name,
            response_text=exchange.message_text,
            audio_url=exchange.audio_url,
            animated_video_url=exchange.animated_video_url
        )

    except ValueError as e:
        logger.warning(
            "Invalid message request",
            extra={"session_id": session_id, "error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(
            "Failed to process user message",
            extra={"session_id": session_id, "error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process message"
        )


@router.post("/sessions/{session_id}/complete", response_model=SessionStatusResponse)
async def complete_session(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Mark interaction session as completed

    Args:
        session_id: Session ID
        current_user: Authenticated user

    Returns:
        Updated session status
    """
    try:
        session = await VODInteractionSession.get(session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        if str(session.user_id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )

        updated_session = await vod_interaction_service.complete_session(session_id)

        logger.info(
            "Session completed via API",
            extra={
                "user_id": str(current_user.id),
                "session_id": session_id
            }
        )

        return SessionStatusResponse(
            session_id=str(updated_session.id),
            character_name=updated_session.character_name,
            status=updated_session.status,
            exchanges_count=len(updated_session.dialogue_exchanges)
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to complete session",
            extra={"session_id": session_id, "error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete session"
        )
