"""Request/response models and helpers for mission play routes."""

from __future__ import annotations

from typing import TYPE_CHECKING

from pydantic import BaseModel, Field

from app.core.logging_config import get_logger

if TYPE_CHECKING:
    from app.models.interactive_mission_types import MissionScene

logger = get_logger(__name__)


class SceneAttemptRequest(BaseModel):
    profile_id: str
    response_transcript: str = Field(..., max_length=500)
    language_detected: str = Field(default="he")
    audio_duration_seconds: float = Field(default=0.0, ge=0.0)


class SceneAttemptResponse(BaseModel):
    success: bool
    quality: str
    score: float
    feedback: str
    feedback_he: str
    next_scene: int
    hint: str = ""
    attempt_number: int
    shekels_earned: int = 0


async def update_proficiency(
    user_id: str, profile_id: str, scene: "MissionScene", quality: str, score: float,
) -> None:
    try:
        from app.services.proficiency.assessment_service import assessment_service
        await assessment_service.record_assessment(
            user_id=user_id, profile_id=profile_id,
            source="interactive_mission", score=score,
            words_tested=len(scene.hebrew_vocabulary),
            words_correct=len(scene.hebrew_vocabulary) if quality == "exact_match" else 0,
        )
    except Exception as exc:
        logger.warning("Failed to update proficiency", extra={"error": str(exc)})
