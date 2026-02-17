"""
VOD Interaction API Routes

User-facing endpoints for VOD avatar interactions with movie characters.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.models.user import User
from app.models.content import Content
from app.models.profile import Profile
from app.models.vod_interaction import ContentCharacter, VODInteractionSession, DialogueExchange
from app.services.vod_interaction.interaction_service import vod_interaction_service
from app.core.security import get_current_user
from app.core.logging_config import get_logger
from app.core.rate_limiter import RATE_LIMITS, limiter

logger = get_logger(__name__)


router = APIRouter(prefix="/vod-interactions", tags=["VOD Interactions"])


class StartInteractionRequest(BaseModel):
    """Request to start an interaction session at a curated moment"""
    profile_id: str = Field(..., description="Child profile ID")
    avatar_id: str = Field(..., description="Avatar mesh ID")
    content_id: str = Field(..., description="Content ID")
    timestamp: float = Field(..., description="Timestamp of interactive moment")


class StartFreeInteractionRequest(BaseModel):
    """Request to start a free-form dialogue session with a character"""
    profile_id: str = Field(..., description="Child profile ID")
    avatar_id: str = Field(..., description="Avatar mesh ID")
    content_id: str = Field(..., description="Content ID")
    character_name: str = Field(..., description="Character to talk to")
    current_timestamp: float = Field(..., description="Current playback position")


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


@router.get("/characters/{content_id}", response_model=List[ContentCharacter])
@limiter.limit(RATE_LIMITS.get("vod_interaction_characters", "30/minute"))
async def get_interactive_characters(
    request: Request,
    content_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get characters available for free-form dialogue in a content item.

    Args:
        content_id: Content ID
        current_user: Authenticated user

    Returns:
        List of available characters
    """
    try:
        content = await Content.get(content_id)
        if not content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Content not found"
            )
        return content.interactive_characters or []

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to fetch interactive characters",
            extra={"content_id": content_id, "error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch characters"
        )


@router.post("/sessions/start-free", response_model=VODInteractionSession)
@limiter.limit(RATE_LIMITS.get("vod_interaction_session_start", "10/minute"))
async def start_free_interaction_session(
    request: Request,
    body: StartFreeInteractionRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Start a free-form dialogue session with a character at any timestamp.
    Does not require a curated interactive moment.

    Args:
        body: Session creation parameters
        current_user: Authenticated user

    Returns:
        Created interaction session
    """
    try:
        profile = await Profile.get(body.profile_id)
        if not profile or profile.user_id != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Profile not owned by current user"
            )

        session = await vod_interaction_service.start_free_interaction_session(
            user_id=str(current_user.id),
            profile_id=body.profile_id,
            avatar_id=body.avatar_id,
            content_id=body.content_id,
            character_name=body.character_name,
            current_timestamp=body.current_timestamp
        )

        logger.info(
            "Free interaction session created via API",
            extra={
                "user_id": str(current_user.id),
                "session_id": str(session.id),
                "character_name": session.character_name
            }
        )

        return session

    except HTTPException:
        raise
    except ValueError as e:
        logger.warning(
            "Invalid free session creation request",
            extra={"user_id": str(current_user.id), "error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(
            "Failed to create free interaction session",
            extra={"user_id": str(current_user.id), "error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start interaction session"
        )


@router.post("/sessions/start", response_model=VODInteractionSession)
@limiter.limit(RATE_LIMITS.get("vod_interaction_session_start", "10/minute"))
async def start_interaction_session(
    request: Request,
    body: StartInteractionRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Start a new interaction session at an interactive moment

    Args:
        body: Session creation parameters
        current_user: Authenticated user

    Returns:
        Created interaction session
    """
    try:
        profile = await Profile.get(body.profile_id)
        if not profile or profile.user_id != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Profile not owned by current user"
            )

        session = await vod_interaction_service.start_interaction_session(
            user_id=str(current_user.id),
            profile_id=body.profile_id,
            avatar_id=body.avatar_id,
            content_id=body.content_id,
            moment_timestamp=body.timestamp
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

    except HTTPException:
        raise
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
@limiter.limit(RATE_LIMITS.get("vod_interaction_message", "10/minute"))
async def send_user_message(
    request: Request,
    session_id: str,
    body: UserMessageRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Send user message to character and get animated response

    Args:
        session_id: Session ID
        body: User message
        current_user: Authenticated user

    Returns:
        Character's animated response
    """
    try:
        session = await VODInteractionSession.get(session_id)
        if not session or str(session.user_id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        exchange = await vod_interaction_service.process_user_message(
            session_id=session_id,
            user_message=body.message
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

    except HTTPException:
        raise
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
@limiter.limit(RATE_LIMITS.get("vod_interaction_complete", "20/minute"))
async def complete_session(
    request: Request,
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
