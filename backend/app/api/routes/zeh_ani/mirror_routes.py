"""Zeh Ani Magic Mirror REST API endpoints."""

from fastapi import APIRouter, Depends, HTTPException

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.security import get_current_user
from app.models.child_avatar import ChildAvatar
from app.models.user import User
from app.services.zeh_ani.magic_mirror_service import (
    InsufficientCreditsError,
    magic_mirror_service,
)

logger = get_logger(__name__)
router = APIRouter(prefix="/zeh-ani/magic-mirror", tags=["zeh-ani"])


async def _greeting_dict(greeting) -> dict:
    """Convert a MagicMirrorGreeting to API response dict."""
    lipsync_video_url = None
    if greeting.lipsync_video_gcs_path:
        from app.services.olorin.storage_service import storage_service

        lipsync_video_url = await storage_service.generate_signed_url(
            greeting.lipsync_video_gcs_path,
            expiry_seconds=settings.CREATIFY_SIGNED_URL_EXPIRY_SECONDS,
        )

    greeting_audio_url = None
    if greeting.greeting_audio_gcs_path:
        from app.services.olorin.storage_service import storage_service

        greeting_audio_url = await storage_service.generate_signed_url(
            greeting.greeting_audio_gcs_path,
            expiry_seconds=settings.CREATIFY_SIGNED_URL_EXPIRY_SECONDS,
        )

    return {
        "id": str(greeting.id),
        "user_id": greeting.user_id,
        "profile_id": greeting.profile_id,
        "greeting_text_he": greeting.greeting_text_he,
        "greeting_text_en": greeting.greeting_text_en,
        "greeting_audio_url": greeting_audio_url,
        "lipsync_video_url": lipsync_video_url,
        "vocabulary_of_the_day": greeting.vocabulary_of_the_day,
        "generated_at": greeting.generated_at.isoformat(),
        "expires_at": (
            greeting.expires_at.isoformat()
            if greeting.expires_at else None
        ),
    }


async def _resolve_avatar(user: User, profile_id: str) -> ChildAvatar:
    """Find the avatar for a user+profile, raising 404 if not found."""
    avatar = await ChildAvatar.find_one(
        {"user_id": str(user.id), "profile_id": profile_id}
    )
    if not avatar:
        raise HTTPException(
            status_code=404, detail="Avatar not found for profile",
        )
    return avatar


@router.get("/{profile_id}")
async def get_daily_greeting(
    profile_id: str,
    user: User = Depends(get_current_user),
):
    """Get the daily Magic Mirror greeting for a child profile."""
    avatar = await _resolve_avatar(user, profile_id)

    try:
        greeting = await magic_mirror_service.get_or_generate_greeting(
            user_id=str(user.id),
            profile_id=profile_id,
            avatar_id=str(avatar.id),
            user=user,
        )
    except InsufficientCreditsError:
        raise HTTPException(
            status_code=402,
            detail="Insufficient credits for Magic Mirror greeting",
        )

    return await _greeting_dict(greeting)


@router.post("/{profile_id}/refresh")
async def refresh_greeting(
    profile_id: str,
    user: User = Depends(get_current_user),
):
    """Force-refresh the Magic Mirror greeting for a child profile."""
    avatar = await _resolve_avatar(user, profile_id)

    try:
        greeting = await magic_mirror_service.generate_daily_greeting(
            user_id=str(user.id),
            profile_id=profile_id,
            avatar_id=str(avatar.id),
            user=user,
        )
    except InsufficientCreditsError:
        raise HTTPException(
            status_code=402,
            detail="Insufficient credits for Magic Mirror greeting",
        )

    logger.info(
        "Magic Mirror greeting refreshed",
        extra={
            "user_id": str(user.id),
            "profile_id": profile_id,
        },
    )

    return await _greeting_dict(greeting)
