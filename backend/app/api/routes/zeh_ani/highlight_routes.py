"""Zeh Ani Highlight Reel REST API endpoints."""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.security import get_current_user
from app.models.user import User
from app.services.zeh_ani.highlight_reel_service import (
    highlight_reel_service,
)

logger = get_logger(__name__)
router = APIRouter(prefix="/zeh-ani/highlights", tags=["zeh-ani"])


def _reel_dict(reel) -> dict:
    """Convert a HighlightReel to API response dict."""
    return {
        "id": str(reel.id),
        "user_id": reel.user_id,
        "profile_id": reel.profile_id,
        "avatar_id": reel.avatar_id,
        "moment_count": reel.moment_count,
        "has_video": reel.video_gcs_path is not None,
        "has_thumbnail": reel.thumbnail_gcs_path is not None,
        "share_token": reel.share_token,
        "status": reel.status.value,
        "credits_charged": reel.credits_charged,
        "error_message": reel.error_message,
        "created_at": reel.created_at.isoformat(),
        "updated_at": reel.updated_at.isoformat(),
    }


@router.post("/generate")
async def generate_highlight_reel(
    avatar_id: str,
    profile_id: str,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
):
    """Start highlight reel generation as a background task."""
    from app.models.child_avatar import ChildAvatar

    avatar = await ChildAvatar.find_one(
        {"user_id": str(user.id), "profile_id": profile_id}
)
    if not avatar:
        raise HTTPException(
            status_code=404, detail="Avatar not found for profile",
        )

    background_tasks.add_task(
        highlight_reel_service.generate_highlight_reel,
        user_id=str(user.id),
        profile_id=profile_id,
        avatar_id=str(avatar.id),
    )

    logger.info(
        "Highlight reel generation started",
        extra={"user_id": str(user.id), "profile_id": profile_id},
    )

    return {"status": "generating", "profile_id": profile_id}


@router.get("/{profile_id}")
async def list_highlight_reels(
    profile_id: str,
    user: User = Depends(get_current_user),
):
    """List highlight reels for a child profile."""
    reels = await highlight_reel_service.list_reels(
        user_id=str(user.id),
        profile_id=profile_id,
    )
    return [_reel_dict(r) for r in reels]


@router.get("/reel/{reel_id}")
async def get_highlight_reel(
    reel_id: str,
    user: User = Depends(get_current_user),
):
    """Get a specific highlight reel by ID."""
    reel = await highlight_reel_service.get_reel_by_id(reel_id)
    if not reel or reel.user_id != str(user.id):
        raise HTTPException(status_code=404, detail="Reel not found")
    return _reel_dict(reel)


@router.get("/share/{share_token}")
async def get_reel_by_share_token(share_token: str):
    """Public endpoint to view a shared highlight reel via signed URLs."""
    reel = await highlight_reel_service.get_reel_by_token(share_token)
    if not reel or not reel.is_ready:
        raise HTTPException(status_code=404, detail="Reel not found")

    from app.services.olorin.storage_service import storage_service

    expiry = settings.HIGHLIGHT_SHARE_URL_EXPIRY_SECONDS

    video_url = (
        await storage_service.generate_signed_url(
            reel.video_gcs_path, expiry_seconds=expiry,
        )
        if reel.video_gcs_path
        else None
    )

    thumbnail_url = (
        await storage_service.generate_signed_url(
            reel.thumbnail_gcs_path, expiry_seconds=expiry,
        )
        if reel.thumbnail_gcs_path
        else None
    )

    return {
        "video_url": video_url,
        "thumbnail_url": thumbnail_url,
        "moment_count": reel.moment_count,
        "created_at": reel.created_at.isoformat(),
    }


@router.post("/reel/{reel_id}/send")
async def send_reel_to_contacts(
    reel_id: str,
    current_user: User = Depends(get_current_user),
):
    """Re-send a ready highlight reel to the user's approved WhatsApp contacts."""
    from app.models.whatsapp_contact import WhatsAppContact
    from app.services.zeh_ani.whatsapp_bot_service import whatsapp_bot_service

    reel = await highlight_reel_service.get_reel_by_id(reel_id)
    if not reel or reel.user_id != str(current_user.id):
        raise HTTPException(status_code=404, detail="Reel not found")
    if not reel.is_ready:
        raise HTTPException(status_code=400, detail="Reel is not ready")

    contacts = await WhatsAppContact.find(
        WhatsAppContact.profile_id == reel.profile_id,
        WhatsAppContact.is_approved == True,  # noqa: E712
    ).to_list()

    sent_ids = await whatsapp_bot_service.send_highlight_to_contacts(
        reel=reel, contacts=contacts,
    )
    return {"sent_count": len(sent_ids)}
