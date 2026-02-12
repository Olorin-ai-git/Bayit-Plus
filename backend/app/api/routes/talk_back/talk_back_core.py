"""
Talk Back Core Routes.

Endpoints for retrieving talk back points, submitting voice responses,
requesting hints, and viewing engagement stats.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.core.security import get_current_user
from app.models.talk_back_attempt import (
    TalkBackAttemptResponse,
    TalkBackStatsResponse,
)
from app.models.talk_back_point import TalkBackPointResponse
from app.models.user import User
from app.services.talk_back.orchestrator import talk_back_orchestrator

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/talk-back", tags=["talk-back"])


class RespondRequest(BaseModel):
    """Request body for submitting a voice response."""
    content_id: str
    point_id: str
    transcript: str = Field(..., max_length=500)
    detected_language: str = Field(default="he", max_length=10)
    response_time_ms: int = Field(default=0, ge=0)
    audio_duration_ms: int = Field(default=0, ge=0)
    hint_used: bool = Field(default=False)


@router.get("/points/{content_id}")
async def get_talk_back_points(
    content_id: str,
    user: User = Depends(get_current_user),
):
    """Get Talk Back question points for a content item."""
    content_tb = await talk_back_orchestrator.get_talk_back_points(
        content_id=content_id
    )

    if not content_tb:
        return {"content_id": content_id, "points": [], "total": 0}

    points = [
        TalkBackPointResponse(
            point_id=p.point_id,
            timestamp_seconds=p.timestamp_seconds,
            character_name=p.character_name,
            character_name_he=p.character_name_he,
            question_text=p.question_text,
            question_text_he=p.question_text_he,
            question_audio_url=p.question_audio_url,
            difficulty=p.difficulty.value,
            shekel_reward=p.shekel_reward,
        )
        for p in content_tb.talk_back_points
    ]

    return {
        "content_id": content_id,
        "points": [p.model_dump() for p in points],
        "total": len(points),
    }


@router.post("/respond", response_model=TalkBackAttemptResponse)
async def submit_response(
    request: RespondRequest,
    profile_id: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
):
    """Submit a voice response to a Talk Back question."""
    if not profile_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="profile_id is required for Talk Back",
        )

    try:
        result = await talk_back_orchestrator.process_response(
            user_id=str(user.id),
            profile_id=profile_id,
            content_id=request.content_id,
            point_id=request.point_id,
            transcript=request.transcript,
            detected_language=request.detected_language,
            response_time_ms=request.response_time_ms,
            audio_duration_ms=request.audio_duration_ms,
            hint_used=request.hint_used,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )

    return TalkBackAttemptResponse(**result)


@router.get("/stats", response_model=TalkBackStatsResponse)
async def get_talk_back_stats(
    profile_id: str = Query(...),
    user: User = Depends(get_current_user),
):
    """Get Talk Back engagement stats for a child profile."""
    stats = await talk_back_orchestrator.get_user_stats(
        user_id=str(user.id),
        profile_id=profile_id,
    )
    return TalkBackStatsResponse(**stats)
