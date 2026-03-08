"""
Star in Story Episode Routes.

Episode generation, progress polling, and listing.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.api.dependencies.ai_access import get_credit_service, require_ai_access
from app.core.security import get_current_user
from app.models.story_episode import EpisodeStatus, StoryEpisode
from app.models.user import User
from app.services.beta.credit_service import BetaCreditService
from app.services.star_story.orchestrator_service import star_story_orchestrator

router = APIRouter(prefix="/star-story", tags=["star-story"])


class GenerateEpisodeRequest(BaseModel):
    profile_id: str
    avatar_id: str
    theme: str = Field(..., max_length=200)
    target_vocabulary: List[str] = Field(default_factory=list, max_length=20)


@router.post("/episodes/generate")
async def generate_episode(
    request: GenerateEpisodeRequest,
    user: User = Depends(require_ai_access),
    credit_service: BetaCreditService = Depends(get_credit_service),
):
    """Start generating a personalized episode."""
    if user.is_beta_user and not user.is_admin_role():
        success, remaining = await credit_service.deduct_credits(
            user_id=str(user.id),
            feature="star_story_episode",
            usage_amount=1.0,
            metadata={"profile_id": request.profile_id, "theme": request.theme},
        )
        if not success:
            raise HTTPException(status_code=402, detail="Insufficient Beta 500 credits")

    try:
        episode = await star_story_orchestrator.generate_episode(
            user_id=str(user.id),
            profile_id=request.profile_id,
            avatar_id=request.avatar_id,
            theme=request.theme,
            target_vocabulary=request.target_vocabulary,
        )
        return {
            "episode_id": str(episode.id),
            "status": episode.status.value,
            "progress_percent": episode.progress_percent,
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )


@router.get("/episodes/{episode_id}/progress")
async def get_progress(
    episode_id: str,
    user: User = Depends(get_current_user),
):
    """Poll episode generation progress."""
    try:
        return await star_story_orchestrator.get_episode_progress(
            episode_id, user_id=str(user.id),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(e)
        )


@router.get("/episodes")
async def list_episodes(
    profile_id: str = Query(...),
    limit: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
):
    """List episodes for a child profile."""
    episodes = await StoryEpisode.find(
        {
            "user_id": str(user.id),
            "profile_id": profile_id,
            "status": EpisodeStatus.READY,
        }
    ).sort(-StoryEpisode.created_at).limit(limit).to_list()

    return {
        "episodes": [
            {
                "episode_id": str(ep.id),
                "title": ep.title,
                "theme": ep.theme,
                "episode_number": ep.episode_number,
                "status": ep.status.value,
                "hls_url": ep.hls_manifest_gcs_path,
                "thumbnail_url": ep.thumbnail_gcs_path,
                "duration_seconds": ep.total_duration_seconds,
                "created_at": ep.created_at.isoformat(),
            }
            for ep in episodes
        ]
    }
