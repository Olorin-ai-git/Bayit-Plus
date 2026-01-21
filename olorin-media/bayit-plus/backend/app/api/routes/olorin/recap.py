"""
Olorin.ai Recap Agent API

Endpoints for real-time summaries of live broadcasts.
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.routes.olorin.dependencies import (get_current_partner,
                                                verify_capability)
from app.api.routes.olorin.errors import OlorinErrors, get_error_message
from app.models.integration_partner import IntegrationPartner
from app.services.olorin.metering_service import metering_service
from app.services.olorin.recap_agent_service import recap_agent_service

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================
# Request/Response Models
# ============================================


class CreateSessionRequest(BaseModel):
    """Request to create a recap session."""

    channel_id: Optional[str] = Field(default=None, description="Live channel ID")
    stream_url: Optional[str] = Field(default=None, description="Stream URL")


class SessionResponse(BaseModel):
    """Recap session information."""

    session_id: str
    partner_id: Optional[str] = None
    channel_id: Optional[str] = None
    status: str
    total_duration_seconds: float
    transcript_count: int
    recap_count: int
    started_at: str
    ended_at: Optional[str] = None


class AddTranscriptRequest(BaseModel):
    """Request to add transcript segment."""

    text: str = Field(..., min_length=1, max_length=5000)
    timestamp: float = Field(..., ge=0, description="Seconds from session start")
    speaker: Optional[str] = Field(default=None)
    language: str = Field(default="he")
    confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)


class TranscriptResponse(BaseModel):
    """Response after adding transcript."""

    session_id: str
    transcript_count: int
    total_duration_seconds: float


class RecapRequest(BaseModel):
    """Request to generate a recap."""

    window_minutes: Optional[int] = Field(
        default=None,
        ge=1,
        le=60,
        description="Minutes to summarize (default: 15)",
    )
    target_language: str = Field(default="en")


class RecapResponse(BaseModel):
    """Generated recap summary."""

    session_id: str
    summary: str
    key_points: List[str]
    window_start_seconds: float
    window_end_seconds: float
    tokens_used: int


class SessionListResponse(BaseModel):
    """List of recap sessions."""

    sessions: List[SessionResponse]
    total: int


# ============================================
# Endpoints
# ============================================


@router.post(
    "/sessions",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create recap session",
    description="Create a new recap session for accumulating transcripts "
    "and generating catch-up summaries.",
)
async def create_session(
    request: CreateSessionRequest,
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """Create a new recap session."""
    # Verify capability
    await verify_capability(partner, "recap_agent")

    try:
        session = await recap_agent_service.create_session(
            partner_id=partner.partner_id,
            channel_id=request.channel_id,
            stream_url=request.stream_url,
        )

        return SessionResponse(
            session_id=session.session_id,
            partner_id=session.partner_id,
            channel_id=session.channel_id,
            status=session.status,
            total_duration_seconds=session.total_duration_seconds,
            transcript_count=len(session.transcript_segments),
            recap_count=len(session.recaps),
            started_at=session.started_at.isoformat(),
            ended_at=session.ended_at.isoformat() if session.ended_at else None,
        )

    except Exception as e:
        logger.error(f"Failed to create recap session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_error_message(OlorinErrors.CREATE_SESSION_FAILED),
        )


@router.post(
    "/sessions/{session_id}/transcript",
    response_model=TranscriptResponse,
    summary="Add transcript segment",
    description="Add a transcript segment to the session's rolling buffer.",
)
async def add_transcript(
    session_id: str,
    request: AddTranscriptRequest,
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """Add transcript segment to session."""
    # Verify capability
    await verify_capability(partner, "recap_agent")

    try:
        # Verify session exists and belongs to partner
        session = await recap_agent_service.get_session(session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=get_error_message(OlorinErrors.SESSION_NOT_FOUND),
            )

        if session.partner_id and session.partner_id != partner.partner_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=get_error_message(OlorinErrors.SESSION_DIFFERENT_PARTNER),
            )

        if session.status != "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=get_error_message(
                    OlorinErrors.SESSION_INVALID_STATUS, status=session.status
                ),
            )

        # Add segment
        updated = await recap_agent_service.add_transcript_segment(
            session_id=session_id,
            text=request.text,
            timestamp=request.timestamp,
            speaker=request.speaker,
            language=request.language,
            confidence=request.confidence,
        )

        if not updated:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=get_error_message(OlorinErrors.ADD_TRANSCRIPT_FAILED),
            )

        return TranscriptResponse(
            session_id=updated.session_id,
            transcript_count=len(updated.transcript_segments),
            total_duration_seconds=updated.total_duration_seconds,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to add transcript: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_error_message(OlorinErrors.ADD_TRANSCRIPT_FAILED),
        )


@router.get(
    "/sessions/{session_id}/recap",
    response_model=RecapResponse,
    summary="Generate catch-up summary",
    description="Generate a catch-up summary for a late-joiner. "
    "Summarizes recent transcript segments.",
)
async def generate_recap(
    session_id: str,
    window_minutes: Optional[int] = None,
    target_language: str = "en",
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """Generate recap summary."""
    # Verify capability
    await verify_capability(partner, "recap_agent")

    try:
        # Verify session exists and belongs to partner
        session = await recap_agent_service.get_session(session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=get_error_message(OlorinErrors.SESSION_NOT_FOUND),
            )

        if session.partner_id and session.partner_id != partner.partner_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=get_error_message(OlorinErrors.SESSION_DIFFERENT_PARTNER),
            )

        # Generate recap
        result = await recap_agent_service.generate_recap(
            session_id=session_id,
            window_minutes=window_minutes,
            target_language=target_language,
        )

        if not result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=get_error_message(OlorinErrors.GENERATE_RECAP_FAILED),
            )

        # Record usage
        await metering_service.record_recap_usage(
            partner_id=partner.partner_id,
            tokens_used=result.get("tokens_used", 0),
            transcript_seconds=result.get("window_end_seconds", 0)
            - result.get("window_start_seconds", 0),
        )

        return RecapResponse(
            session_id=session_id,
            summary=result["summary"],
            key_points=result["key_points"],
            window_start_seconds=result["window_start_seconds"],
            window_end_seconds=result["window_end_seconds"],
            tokens_used=result["tokens_used"],
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate recap: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_error_message(OlorinErrors.GENERATE_RECAP_FAILED),
        )


@router.get(
    "/sessions/{session_id}",
    response_model=SessionResponse,
    summary="Get session info",
    description="Get information about a recap session.",
)
async def get_session(
    session_id: str,
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """Get session information."""
    # Verify capability
    await verify_capability(partner, "recap_agent")

    session = await recap_agent_service.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=get_error_message(OlorinErrors.SESSION_NOT_FOUND),
        )

    if session.partner_id and session.partner_id != partner.partner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=get_error_message(OlorinErrors.SESSION_DIFFERENT_PARTNER),
        )

    return SessionResponse(
        session_id=session.session_id,
        partner_id=session.partner_id,
        channel_id=session.channel_id,
        status=session.status,
        total_duration_seconds=session.total_duration_seconds,
        transcript_count=len(session.transcript_segments),
        recap_count=len(session.recaps),
        started_at=session.started_at.isoformat(),
        ended_at=session.ended_at.isoformat() if session.ended_at else None,
    )


@router.delete(
    "/sessions/{session_id}",
    response_model=SessionResponse,
    summary="End session",
    description="End a recap session.",
)
async def end_session(
    session_id: str,
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """End a recap session."""
    # Verify capability
    await verify_capability(partner, "recap_agent")

    # Verify session exists and belongs to partner
    session = await recap_agent_service.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=get_error_message(OlorinErrors.SESSION_NOT_FOUND),
        )

    if session.partner_id and session.partner_id != partner.partner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=get_error_message(OlorinErrors.SESSION_DIFFERENT_PARTNER),
        )

    # End session
    ended = await recap_agent_service.end_session(session_id)

    return SessionResponse(
        session_id=ended.session_id,
        partner_id=ended.partner_id,
        channel_id=ended.channel_id,
        status=ended.status,
        total_duration_seconds=ended.total_duration_seconds,
        transcript_count=len(ended.transcript_segments),
        recap_count=len(ended.recaps),
        started_at=ended.started_at.isoformat(),
        ended_at=ended.ended_at.isoformat() if ended.ended_at else None,
    )


@router.get(
    "/sessions",
    response_model=SessionListResponse,
    summary="List sessions",
    description="List recap sessions for the authenticated partner.",
)
async def list_sessions(
    active_only: bool = True,
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """List recap sessions."""
    # Verify capability
    await verify_capability(partner, "recap_agent")

    if active_only:
        sessions = await recap_agent_service.get_active_sessions(
            partner_id=partner.partner_id
        )
    else:
        from app.models.content_embedding import RecapSession

        sessions = (
            await RecapSession.find(RecapSession.partner_id == partner.partner_id)
            .sort(-RecapSession.started_at)
            .limit(100)
            .to_list()
        )

    items = [
        SessionResponse(
            session_id=s.session_id,
            partner_id=s.partner_id,
            channel_id=s.channel_id,
            status=s.status,
            total_duration_seconds=s.total_duration_seconds,
            transcript_count=len(s.transcript_segments),
            recap_count=len(s.recaps),
            started_at=s.started_at.isoformat(),
            ended_at=s.ended_at.isoformat() if s.ended_at else None,
        )
        for s in sessions
    ]

    return SessionListResponse(
        sessions=items,
        total=len(items),
    )
