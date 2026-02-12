"""Interactive Mission Core Routes."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.api.dependencies.ai_access import get_credit_service, require_ai_access
from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.security import get_current_user
from app.models.interactive_mission import InteractiveMission, MissionStatus
from app.models.user import User
from app.services.beta.credit_service import BetaCreditService
from app.services.interactive_mission.orchestrator import mission_orchestrator

logger = get_logger(__name__)
router = APIRouter(prefix="/interactive-missions", tags=["interactive-missions"])


class GenerateMissionRequest(BaseModel):
    profile_id: str
    avatar_id: str
    show_content_id: str


@router.post("/generate")
async def generate_mission(
    request: GenerateMissionRequest,
    user: User = Depends(require_ai_access),
    credit_service: BetaCreditService = Depends(get_credit_service),
):
    if user.is_beta_user and not user.is_admin_role():
        success, remaining = await credit_service.deduct_credits(
            user_id=str(user.id), feature="interactive_mission", usage_amount=1.0,
            metadata={"profile_id": request.profile_id, "show_content_id": request.show_content_id},
        )
        if not success:
            raise HTTPException(status_code=402, detail="Insufficient Beta 500 credits")
    try:
        mission = await mission_orchestrator.generate_mission(
            user_id=str(user.id), profile_id=request.profile_id,
            avatar_id=request.avatar_id, show_content_id=request.show_content_id,
        )
        return {
            "mission_id": str(mission.id), "status": mission.status.value,
            "progress_percent": mission.progress_percent,
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/available")
async def list_available_missions(
    profile_id: str = Query(...),
    limit: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
):
    missions = await InteractiveMission.find(
        InteractiveMission.user_id == str(user.id),
        InteractiveMission.profile_id == profile_id,
        InteractiveMission.status.is_in([MissionStatus.READY, MissionStatus.ACTIVE]),
    ).sort(-InteractiveMission.created_at).limit(limit).to_list()
    return [
        {
            "mission_id": str(m.id), "title": m.title, "title_he": m.title_he,
            "difficulty": m.difficulty, "status": m.status.value,
            "total_scenes": m.total_scenes, "decision_count": m.decision_count,
            "thumbnail_url": m.thumbnail_gcs_path, "created_at": m.created_at.isoformat(),
        }
        for m in missions
    ]


@router.get("/{mission_id}")
async def get_mission(mission_id: str, user: User = Depends(get_current_user)):
    mission = await InteractiveMission.get(mission_id)
    if not mission or mission.user_id != str(user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mission not found")
    return {
        "mission_id": str(mission.id), "title": mission.title, "title_he": mission.title_he,
        "description": mission.description, "difficulty": mission.difficulty,
        "status": mission.status.value, "progress_percent": mission.progress_percent,
        "total_scenes": mission.total_scenes, "decision_count": mission.decision_count,
        "scenes_completed": mission.scenes_completed, "total_score": mission.total_score,
        "shekels_earned": mission.shekels_earned,
        "composition_variant": mission.composition_variant,
        "interactive_manifest": mission.interactive_manifest,
        "hls_base_path": mission.hls_base_path,
        "thumbnail_url": mission.thumbnail_gcs_path,
        "created_at": mission.created_at.isoformat(),
    }


@router.get("/{mission_id}/progress")
async def get_progress(mission_id: str, user: User = Depends(get_current_user)):
    try:
        return await mission_orchestrator.get_mission_progress(
            mission_id=mission_id, user_id=str(user.id),
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{mission_id}/complete")
async def complete_mission(mission_id: str, user: User = Depends(get_current_user)):
    mission = await InteractiveMission.get(mission_id)
    if not mission or mission.user_id != str(user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mission not found")
    if mission.status == MissionStatus.COMPLETED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mission already completed")
    if mission.status != MissionStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mission not in active state")

    from app.services.mission.shekel_service import shekel_service

    base_reward = settings.MISSION_COMPLETION_BASE_REWARD
    bonus = int(mission.total_score * settings.MISSION_COMPLETION_SCORE_MULTIPLIER)
    total_reward = base_reward + bonus
    await shekel_service.award_shekels(
        user_id=str(user.id), profile_id=mission.profile_id,
        amount=total_reward, reason=f"interactive_mission_complete:{mission_id}",
    )
    mission.shekels_earned = total_reward
    mission.status = MissionStatus.COMPLETED
    await mission.save()
    return {
        "mission_id": str(mission.id), "status": "completed",
        "shekels_earned": total_reward, "total_score": mission.total_score,
    }
