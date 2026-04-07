"""DEV-ONLY comprehension turn-loop entry point (Phase 1 Plan 01-02).

POST /api/v1/comprehension/dev/turn — drives a single comprehension turn
against ComprehensionSessionOrchestrator.run_turn(). Used by developers to
exercise the loop end-to-end while the Phase-2 student-facing route is
being built.

D-17 integrity: NO restart/reset parameter. Sessions are resume-only. If
no active session exists for (user_id, profile_id, content_id), one is
created; if an active one exists, it is resumed.

D-14: the dev response DOES include the raw numeric score (teacher-surface
shape). Phase 2 will add a student-facing route that strips it.
"""
from typing import List, Optional

from fastapi import APIRouter, status
from pydantic import BaseModel, Field

from app.core.logging_config import get_logger
from app.models.comprehension_session import ComprehensionSession
from app.schemas.comprehension import AdaptLevel
from app.services.olorin.comprehension.orchestrator import (
    comprehension_session_orchestrator,
)

logger = get_logger(__name__)

router = APIRouter()


class ComprehensionDevTurnRequest(BaseModel):
    """Request body for POST /api/v1/comprehension/dev/turn."""

    user_id: str
    profile_id: str
    content_id: str
    character_name: str
    personality_traits: List[str] = Field(default_factory=list)
    scene_context: str
    rubric: str
    question_text: str = Field(
        ...,
        description=(
            "The question the student is answering. For turn 1 this is the "
            "seed question; for later turns it is the prior follow-up."
        ),
    )
    student_answer: str
    playback_seconds: float
    moment_timestamp: float
    answer_modality: str = Field(default="text", description="'text' or 'voice' (D-16)")
    rubric_config_id: Optional[str] = None
    character_voice_id: Optional[str] = None
    character_frame_url: Optional[str] = None


class RubricScoreDTO(BaseModel):
    """Dev-surface score DTO (includes numeric per teacher-view)."""

    score: int
    rationale: str
    band: str


class FollowUpQuestionDTO(BaseModel):
    question_text: str
    in_character_phrasing: str
    adapt_level: AdaptLevel


class ComprehensionDevTurnResponse(BaseModel):
    score: RubricScoreDTO
    follow_up: FollowUpQuestionDTO
    adapt_level: AdaptLevel
    memory_retry_pending: bool
    session_id: str
    character_audio_url: str = ""
    character_animated_video_url: str = ""
    character_video_duration: float = 0.0


async def _find_or_create_session(
    req: ComprehensionDevTurnRequest,
) -> ComprehensionSession:
    """Resume an active session or create a new one (D-17, no restart)."""
    existing = await ComprehensionSession.find(
        {
            "user_id": req.user_id,
            "profile_id": req.profile_id,
            "content_id": req.content_id,
            "status": "active",
        },
    ).first_or_none()
    if existing is not None:
        return existing
    session = ComprehensionSession(
        user_id=req.user_id,
        profile_id=req.profile_id,
        content_id=req.content_id,
        character_name=req.character_name,
        scene_context=req.scene_context,
        character_voice_id=req.character_voice_id,
        character_frame_url=req.character_frame_url,
        rubric_config_id=req.rubric_config_id,
    )
    await session.insert()
    return session


@router.post(
    "/turn",
    response_model=ComprehensionDevTurnResponse,
    status_code=status.HTTP_200_OK,
    tags=["comprehension-dev"],
    summary="DEV-ONLY single-turn entry point for Comprehension Mode loop",
)
async def run_turn(
    req: ComprehensionDevTurnRequest,
) -> ComprehensionDevTurnResponse:
    """Drive one comprehension turn and return score + next follow-up.

    DEV-ONLY: no auth in Phase 1. Phase 2 consumer route will layer
    Firebase auth and strip the numeric score for student responses (D-14).
    """
    session = await _find_or_create_session(req)
    result = await comprehension_session_orchestrator.run_turn(
        session=session,
        scene_context=req.scene_context,
        playback_seconds=req.playback_seconds,
        question_text=req.question_text,
        student_answer=req.student_answer,
        answer_modality=req.answer_modality,
        rubric=req.rubric,
        character_name=req.character_name,
        personality_traits=req.personality_traits,
        moment_timestamp=req.moment_timestamp,
    )
    score = result["score"]
    follow_up = result["follow_up"]
    return ComprehensionDevTurnResponse(
        score=RubricScoreDTO(
            score=score.score,
            rationale=score.rationale,
            band=score.band.value,
        ),
        follow_up=FollowUpQuestionDTO(
            question_text=follow_up.question_text,
            in_character_phrasing=follow_up.in_character_phrasing,
            adapt_level=follow_up.adapt_level,
        ),
        adapt_level=result["adapt_level"],
        memory_retry_pending=result["memory_retry_pending"],
        session_id=str(session.id),
        character_audio_url=result.get("character_audio_url", ""),
        character_animated_video_url=result.get("character_animated_video_url", ""),
        character_video_duration=result.get("character_video_duration", 0.0),
    )
