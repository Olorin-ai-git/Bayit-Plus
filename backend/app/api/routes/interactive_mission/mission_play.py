"""Interactive Mission Playback Routes."""

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.security import get_current_user
from app.models.interactive_mission import InteractiveMission, MissionAttemptRecord, MissionStatus
from app.models.user import User
from app.services.talk_back.voice_evaluator import voice_evaluator
from app.api.routes.interactive_mission.mission_play_types import (
    SceneAttemptRequest, SceneAttemptResponse, update_proficiency,
)

logger = get_logger(__name__)
router = APIRouter(prefix="/interactive-missions", tags=["interactive-missions"])


@router.post(
    "/{mission_id}/scenes/{scene_number}/attempt",
    response_model=SceneAttemptResponse,
)
async def submit_scene_attempt(
    mission_id: str, scene_number: int,
    request: SceneAttemptRequest,
    user: User = Depends(get_current_user),
):
    mission = await InteractiveMission.get(mission_id)
    if not mission or mission.user_id != str(user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mission not found")
    if mission.status not in (MissionStatus.READY, MissionStatus.ACTIVE):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mission not in playable state")

    scene = next((s for s in mission.scenes if s.scene_number == scene_number), None)
    if not scene:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Scene {scene_number} not found")
    if not scene.decision:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Scene has no decision point")

    decision = scene.decision
    previous_attempts = [
        a for a in mission.attempts
        if a.scene_number == scene_number and a.decision_id == decision.decision_id
    ]
    attempt_number = len(previous_attempts) + 1

    quality, score, feedback, feedback_he = voice_evaluator.evaluate(
        transcript=request.response_transcript,
        expected_responses=decision.expected_responses,
        detected_language=request.language_detected,
    )
    succeeded = quality.value in ("exact_match", "correct_root")

    mission.attempts.append(MissionAttemptRecord(
        scene_number=scene_number, decision_id=decision.decision_id,
        attempt_number=attempt_number, transcript=request.response_transcript,
        detected_language=request.language_detected,
        quality=quality.value, score=score, succeeded=succeeded,
    ))

    if succeeded:
        next_scene = decision.next_scene_on_success
        mission.scenes_completed = max(mission.scenes_completed, scene_number)
        mission.total_score += score
    else:
        next_scene = decision.next_scene_on_failure

    if mission.status == MissionStatus.READY:
        mission.status = MissionStatus.ACTIVE
    await mission.save()

    hint = decision.hint_text or "" if not succeeded and attempt_number >= 2 else ""
    shekels_earned = 0
    if succeeded:
        shekels_earned = int(score * settings.MISSION_SCENE_SHEKEL_MULTIPLIER)
        from app.services.mission.shekel_service import shekel_service
        await shekel_service.award_shekels(
            user_id=str(user.id), profile_id=request.profile_id,
            amount=shekels_earned, reason=f"mission_scene:{mission_id}:{scene_number}",
        )

    await update_proficiency(
        user_id=str(user.id), profile_id=request.profile_id,
        scene=scene, quality=quality.value, score=score,
    )

    logger.info("Scene attempt evaluated", extra={
        "mission_id": mission_id, "scene": scene_number,
        "quality": quality.value, "score": score, "succeeded": succeeded,
    })

    return SceneAttemptResponse(
        success=succeeded, quality=quality.value, score=score,
        feedback=feedback, feedback_he=feedback_he,
        next_scene=next_scene, hint=hint,
        attempt_number=attempt_number, shekels_earned=shekels_earned,
    )
