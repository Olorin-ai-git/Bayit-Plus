"""
Playback Session API Routes

Endpoints for managing playback sessions and concurrent stream enforcement.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.security import get_current_active_user
from app.models.playback_session import PlaybackSessionResponse
from app.models.user import User
from app.services.session_manager import ConcurrentStreamLimitError, session_manager

router = APIRouter()


# ============================================================================
# Request/Response Models
# ============================================================================


class StartSessionRequest(BaseModel):
    """Request model for starting a playback session"""

    device_id: str = Field(..., description="Device fingerprint")
    content_id: str = Field(..., description="Content being played")
    content_type: str = Field(..., description="Type of content (vod, live, podcast, radio)")
    device_name: Optional[str] = Field(None, description="Human-readable device name")
    ip_address: Optional[str] = Field(None, description="IP address")


class EndSessionRequest(BaseModel):
    """Request model for ending a playback session"""

    session_id: str = Field(..., description="PlaybackSession ID")


class HeartbeatRequest(BaseModel):
    """Request model for session heartbeat"""

    session_id: str = Field(..., description="PlaybackSession ID")


class ActiveSessionsResponse(BaseModel):
    """Response model for active sessions"""

    sessions: List[PlaybackSessionResponse]
    count: int
    max_streams: int
    available_streams: int


class SessionSummaryResponse(BaseModel):
    """Response model for session summary"""

    user_id: str
    subscription_tier: str
    max_concurrent_streams: int
    active_sessions_count: int
    available_streams: int
    active_sessions: List[PlaybackSessionResponse]


class ConcurrentLimitErrorDetail(BaseModel):
    """Error detail for concurrent stream limit exceeded"""

    code: str = "CONCURRENT_STREAM_LIMIT_EXCEEDED"
    message: str
    max_streams: int
    active_sessions: int
    active_devices: List[dict]


# ============================================================================
# Endpoints
# ============================================================================


@router.post("/start", response_model=PlaybackSessionResponse)
async def start_session(
    request: StartSessionRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Start a new playback session.

    Validates concurrent stream limit before creating session.
    Returns 403 error if user has reached their subscription tier's limit.

    Args:
        request: Session start details

    Returns:
        Created playback session

    Raises:
        HTTPException 403: If concurrent stream limit exceeded
    """
    try:
        session = await session_manager.start_session(
            user_id=str(current_user.id),
            device_id=request.device_id,
            content_id=request.content_id,
            content_type=request.content_type,
            device_name=request.device_name,
            ip_address=request.ip_address,
        )

        return session.to_response()

    except ConcurrentStreamLimitError as e:
        # Return detailed error for frontend to display
        error_detail = ConcurrentLimitErrorDetail(
            message=str(e),
            max_streams=e.max_streams,
            active_sessions=e.active_sessions,
            active_devices=e.active_devices,
        )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=error_detail.dict(),
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start session: {str(e)}",
        )


@router.post("/end")
async def end_session(
    request: EndSessionRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    End a playback session.

    Args:
        request: Session end details

    Returns:
        Success confirmation
    """
    try:
        result = await session_manager.end_session(request.session_id)

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found",
            )

        return {"success": True, "message": "Session ended successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to end session: {str(e)}",
        )


@router.post("/heartbeat")
async def update_heartbeat(
    request: HeartbeatRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Update session heartbeat to keep it alive.

    Heartbeat should be sent every 30 seconds during playback.
    Sessions without heartbeat for 2+ minutes are considered stale.

    Args:
        request: Heartbeat update

    Returns:
        Success confirmation
    """
    try:
        result = await session_manager.update_heartbeat(request.session_id)

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found or already ended",
            )

        return {"success": True, "message": "Heartbeat updated"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update heartbeat: {str(e)}",
        )


@router.get("/active", response_model=ActiveSessionsResponse)
async def get_active_sessions(current_user: User = Depends(get_current_active_user)):
    """
    Get all active sessions for the current user.

    Returns:
        List of active sessions with stream limit information
    """
    try:
        sessions = await session_manager.get_active_sessions(str(current_user.id))
        max_streams = current_user.get_concurrent_stream_limit()

        return ActiveSessionsResponse(
            sessions=[s.to_response() for s in sessions],
            count=len(sessions),
            max_streams=max_streams,
            available_streams=max(0, max_streams - len(sessions)),
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get active sessions: {str(e)}",
        )


@router.get("/summary", response_model=SessionSummaryResponse)
async def get_session_summary(current_user: User = Depends(get_current_active_user)):
    """
    Get session summary including subscription limits and active sessions.

    Returns:
        Complete session summary for user
    """
    try:
        summary = await session_manager.get_session_summary(str(current_user.id))
        return SessionSummaryResponse(**summary)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get session summary: {str(e)}",
        )
