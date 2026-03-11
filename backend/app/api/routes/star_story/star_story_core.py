"""
Star in Story Core Routes.

Avatar CRUD, consent management, and video selfie upload.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field

from app.api.dependencies.ai_access import get_credit_service, require_ai_access
from app.core.logging_config import get_logger
from app.core.security import get_current_user
from app.models.child_avatar import AvatarStyle, ChildAvatar
from app.models.user import User
from app.services.beta.credit_service import BetaCreditService
from app.services.star_story.consent_service import consent_service

logger = get_logger(__name__)
router = APIRouter(prefix="/star-story", tags=["star-story"])


class ConsentRequest(BaseModel):
    profile_id: str
    child_first_name: str = Field(..., max_length=50)
    pin: str = Field(..., min_length=4, max_length=20)
    video_selfie_consent: bool = False
    voice_clone_consent: bool = False


class CreateAvatarRequest(BaseModel):
    profile_id: str
    child_first_name: str = Field(..., max_length=50)
    style: str = Field(default="cartoon_2d")
    pin: str = Field(..., min_length=4, max_length=20)


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
                "is_active": a.is_active,
                "creatify_avatar_image_url": a.creatify_avatar_image_url,
                "creatify_avatar_status": a.creatify_avatar_status,
                "outfit_count": len(a.outfit_inventory),
                "created_at": a.created_at.isoformat(),
            }
            for a in avatars
        ]
    }


@router.post("/avatars/create")
async def create_additional_avatar(
    body: CreateAvatarRequest,
    user: User = Depends(require_ai_access),
    credit_service: BetaCreditService = Depends(get_credit_service),
):
    """Create an additional avatar for a profile with existing consent."""
    try:
        if not user.can_access_premium_features():
            success, _remaining = await credit_service.deduct_credits(
                user_id=str(user.id),
                feature="avatar_creation",
                usage_amount=1.0,
                metadata={"profile_id": body.profile_id},
            )
            if not success:
                raise HTTPException(
                    status_code=402,
                    detail="Insufficient credits for avatar creation",
                )

        avatar = await consent_service.create_additional_avatar(
            user_id=str(user.id),
            profile_id=body.profile_id,
            child_first_name=body.child_first_name,
            style=body.style,
            pin=body.pin,
        )
        return {
            "avatar_id": str(avatar.id),
            "status": avatar.status.value,
            "is_active": avatar.is_active,
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )


@router.post("/video-selfie/upload")
async def upload_video_selfie(
    request: Request,
    user: User = Depends(get_current_user),
):
    """Upload a video selfie for enhanced avatar + voice cloning."""
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
