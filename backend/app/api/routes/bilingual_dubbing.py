"""
Bilingual Dubbing Routes.

Endpoints for proficiency status, session management,
ratio overrides, and vocabulary tracking.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.core.security import get_current_user
from app.models.bilingual_dubbing_session import BilingualSessionResponse
from app.models.child_proficiency import ProficiencyResponse
from app.models.user import User
from app.services.olorin.dubbing.bilingual_service import (
    bilingual_dubbing_service,
)

logger = logging.getLogger(__name__)
router = APIRouter(
    prefix="/bilingual-dubbing", tags=["bilingual-dubbing"]
)


class StartSessionRequest(BaseModel):
    """Request to start a bilingual dubbing session."""
    content_id: str
    profile_id: str


class TranslateRequest(BaseModel):
    """Request to translate a segment within a session."""
    session_id: str
    hebrew_text: str = Field(..., max_length=1000)
    timestamp_seconds: float = Field(..., ge=0)


@router.get("/proficiency", response_model=ProficiencyResponse)
async def get_proficiency(
    profile_id: str = Query(...),
    user: User = Depends(get_current_user),
):
    """Get Hebrew proficiency status for a child profile."""
    return await bilingual_dubbing_service.get_proficiency_status(
        user_id=str(user.id),
        profile_id=profile_id,
    )


@router.post("/session/start", response_model=BilingualSessionResponse)
async def start_session(
    request: StartSessionRequest,
    user: User = Depends(get_current_user),
):
    """Start a new bilingual dubbing session."""
    session = await bilingual_dubbing_service.start_session(
        user_id=str(user.id),
        profile_id=request.profile_id,
        content_id=request.content_id,
    )

    return BilingualSessionResponse(
        session_id=session.session_id,
        content_id=session.content_id,
        target_hebrew_ratio=session.target_hebrew_ratio,
        actual_hebrew_ratio=session.actual_hebrew_ratio,
        vocabulary_introduced_count=len(session.vocabulary_introduced),
        vocabulary_recognized=session.vocabulary_recognized,
        session_duration_seconds=session.session_duration_seconds,
    )


@router.post("/session/translate")
async def translate_segment(
    request: TranslateRequest,
    user: User = Depends(get_current_user),
):
    """Translate a segment with code-switching."""
    try:
        result = await bilingual_dubbing_service.translate_segment(
            session_id=request.session_id,
            hebrew_text=request.hebrew_text,
            timestamp_seconds=request.timestamp_seconds,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(e)
        )

    return result


@router.post(
    "/session/{session_id}/end",
    response_model=BilingualSessionResponse,
)
async def end_session(
    session_id: str,
    user: User = Depends(get_current_user),
):
    """End a bilingual dubbing session."""
    session = await bilingual_dubbing_service.end_session(
        session_id=session_id
    )

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    return BilingualSessionResponse(
        session_id=session.session_id,
        content_id=session.content_id,
        target_hebrew_ratio=session.target_hebrew_ratio,
        actual_hebrew_ratio=session.actual_hebrew_ratio,
        vocabulary_introduced_count=len(session.vocabulary_introduced),
        vocabulary_recognized=session.vocabulary_recognized,
        session_duration_seconds=session.session_duration_seconds,
    )
