"""
Bilingual Dubbing Routes.

Endpoints for proficiency status, session management,
ratio overrides, and vocabulary tracking.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.api.dependencies.ai_access import get_credit_service, require_ai_access
from app.core.logging_config import get_logger
from app.core.security import get_current_user
from app.models.bilingual_dubbing_session import BilingualSessionResponse
from app.models.child_proficiency import ProficiencyResponse
from app.models.user import User
from app.services.beta.credit_service import BetaCreditService
from app.services.olorin.dubbing.bilingual_service import (
    bilingual_dubbing_service,
)

logger = get_logger(__name__)
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
    user: User = Depends(require_ai_access),
    credit_service: BetaCreditService = Depends(get_credit_service),
):
    """Start a new bilingual dubbing session."""
    if not user.can_access_premium_features():
        success, remaining = await credit_service.deduct_credits(
            user_id=str(user.id),
            feature="bilingual_session",
            usage_amount=1.0,
            metadata={"content_id": request.content_id, "profile_id": request.profile_id},
        )
        if not success:
            raise HTTPException(status_code=402, detail="Insufficient credits")

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
    user: User = Depends(require_ai_access),
    credit_service: BetaCreditService = Depends(get_credit_service),
):
    """Translate a segment with code-switching."""
    if not user.can_access_premium_features():
        success, remaining = await credit_service.deduct_credits(
            user_id=str(user.id),
            feature="bilingual_translate",
            usage_amount=1.0,
            metadata={"session_id": request.session_id},
        )
        if not success:
            raise HTTPException(status_code=402, detail="Insufficient credits")

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
