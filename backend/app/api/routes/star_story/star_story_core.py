"""
Star in Story Core Routes.

Avatar CRUD, episode generation, progress polling, and consent management.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field

from app.api.dependencies.ai_access import get_credit_service, require_ai_access
from app.core.logging_config import get_logger
from app.core.security import get_current_user
from app.models.child_avatar import AvatarStyle, ChildAvatar
from app.models.story_episode import EpisodeStatus, StoryEpisode
from app.models.user import User
from app.services.beta.credit_service import BetaCreditService
from app.services.star_story.consent_service import consent_service
from app.services.star_story.orchestrator_service import star_story_orchestrator

logger = get_logger(__name__)
router = APIRouter(prefix="/star-story", tags=["star-story"])


class ConsentRequest(BaseModel):
    profile_id: str
    child_first_name: str = Field(..., max_length=50)
    pin: str = Field(..., min_length=4, max_length=20)
    video_selfie_consent: bool = False
    voice_clone_consent: bool = False


class AvatarUploadRequest(BaseModel):
    avatar_id: str
    style: AvatarStyle = AvatarStyle.CARTOON_2D


class GenerateEpisodeRequest(BaseModel):
    profile_id: str
    avatar_id: str
    theme: str = Field(..., max_length=200)
    target_vocabulary: List[str] = Field(default_factory=list, max_length=20)


@router.post("/consent")
async def grant_consent(
    body: ConsentRequest,
    request: Request,
    user: User = Depends(get_current_user),
):
    """Grant COPPA parental consent for a child profile."""
    try:
        ip_address = request.client.host if request.client else ""
        avatar = await consent_service.verify_and_record_consent(
            user_id=str(user.id),
            profile_id=body.profile_id,
            child_first_name=body.child_first_name,
            pin=body.pin,
            ip_address=ip_address,
            video_selfie_consent=body.video_selfie_consent,
            voice_clone_consent=body.voice_clone_consent,
        )
        return {
            "avatar_id": str(avatar.id),
            "status": avatar.status.value,
            "consent_granted": avatar.has_consent,
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )


@router.get("/avatars")
async def get_avatars(
    profile_id: str = Query(...),
    user: User = Depends(get_current_user),
):
    """Get all avatars for a child profile."""
    avatars = await ChildAvatar.find(
        {"user_id": str(user.id), "profile_id": profile_id}
).to_list()

    return {
        "avatars": [
            {
                "avatar_id": str(a.id),
                "child_first_name": a.child_first_name,
                "style": a.style.value,
                "status": a.status.value,
                "primary_avatar_url": a.primary_avatar_gcs_path,
                "poses_count": len(a.avatar_poses),
                "created_at": a.created_at.isoformat(),
            }
            for a in avatars
        ]
    }


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

            "status": EpisodeStatus.READY

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


@router.post("/video-selfie/upload")
async def upload_video_selfie(
    request: Request,
    user: User = Depends(get_current_user),
):
    """Upload a video selfie for enhanced avatar + voice cloning."""
    from fastapi import UploadFile, File, Form
    from app.services.star_story.video_selfie_handler import video_selfie_handler

    form = await request.form()
    video_file = form.get("video")
    avatar_id = form.get("avatar_id")

    if not video_file or not avatar_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="video and avatar_id are required",
        )

    video_bytes = await video_file.read()
    content_type = getattr(video_file, "content_type", "video/webm")

    try:
        avatar = await video_selfie_handler.process_video_selfie(
            avatar_id=str(avatar_id),
            user_id=str(user.id),
            video_bytes=video_bytes,
            content_type=content_type,
        )
        return {
            "avatar_id": str(avatar.id),
            "video_selfie_uploaded": True,
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e),
        )


@router.delete("/consent/{profile_id}")
async def revoke_consent(
    profile_id: str,
    user: User = Depends(get_current_user),
):
    """Revoke COPPA consent and cascade delete all data."""
    revoked = await consent_service.revoke_consent(
        user_id=str(user.id), profile_id=profile_id
    )
    if not revoked:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No avatar found for this profile",
        )
    return {"revoked": True}
