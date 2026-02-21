"""Zeh Ani Creatify Avatar REST API endpoints."""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from app.core.logging_config import get_logger
from app.core.security import get_current_user
from app.models.avatar_mesh_types import (
    CreatifyAvatarRequest,
    CreatifyAvatarResponse,
)
from app.models.child_avatar import ChildAvatar
from app.models.user import User
from app.services.zeh_ani.biometric_consent_service import (
    biometric_consent_service,
)
from app.models.biometric_consent import BiometricConsentType

logger = get_logger(__name__)
router = APIRouter(prefix="/zeh-ani/avatar", tags=["zeh-ani"])


def _avatar_response(avatar: ChildAvatar) -> dict:
    """Convert ChildAvatar to Creatify avatar API response dict."""
    return CreatifyAvatarResponse(
        avatar_id=str(avatar.id),
        user_id=avatar.user_id,
        creatify_persona_id=avatar.creatify_persona_id,
        status=avatar.creatify_avatar_status,
        avatar_image_url=avatar.creatify_avatar_image_url,
        error_message=avatar.error_message,
        has_voice_clone=avatar.has_voice_clone,
        created_at=avatar.created_at.isoformat(),
        updated_at=avatar.updated_at.isoformat(),
    ).model_dump()


async def _run_persona_creation(
    avatar_id: str,
    user_id: str,
) -> None:
    """Background task for Creatify persona creation."""
    from app.services.zeh_ani.creatify_avatar_service import (
        creatify_avatar_service,
    )

    avatar = await ChildAvatar.get(avatar_id)
    if not avatar:
        return
    await creatify_avatar_service.create_persona_from_avatar(
        avatar=avatar,
        user_id=user_id,
    )


@router.post("/create-persona")
async def create_persona(
    request: CreatifyAvatarRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
):
    """Create a Creatify persona from the child's avatar image."""
    avatar = await ChildAvatar.find_one(
        {"user_id": str(user.id), "profile_id": request.profile_id}
    )
    if not avatar:
        raise HTTPException(status_code=404, detail="Avatar not found")
    if not avatar.primary_avatar_gcs_path:
        raise HTTPException(
            status_code=400,
            detail="Avatar image required before persona creation",
        )

    await biometric_consent_service.verify_pin(
        str(user.id), request.pin,
    )

    has_consent = await biometric_consent_service.has_biometric_consent(
        user_id=str(user.id),
        profile_id=request.profile_id,
        consent_type=BiometricConsentType.MESH_GENERATION,
    )
    if not has_consent:
        raise HTTPException(
            status_code=403,
            detail="Biometric consent required for persona creation",
        )

    if avatar.creatify_avatar_status == "creating":
        return _avatar_response(avatar)
    if avatar.creatify_avatar_status == "ready":
        return _avatar_response(avatar)

    background_tasks.add_task(
        _run_persona_creation, str(avatar.id), str(user.id),
    )

    return _avatar_response(avatar)


@router.get("/{avatar_id}")
async def get_avatar_status(
    avatar_id: str,
    user: User = Depends(get_current_user),
):
    """Get Creatify avatar persona status."""
    logger.warning(
        "Avatar status request",
        extra={
            "avatar_id": avatar_id,
            "user_id": str(user.id),
            "user_email": user.email,
        },
    )
    try:
        avatar = await ChildAvatar.find_one(
            {"_id": avatar_id, "user_id": str(user.id)}
        )
    except Exception as exc:
        logger.warning(
            "Avatar find_one by _id failed, trying user_id only",
            extra={"error": str(exc), "avatar_id": avatar_id},
        )
        avatar = None
    if not avatar:
        try:
            avatar = await ChildAvatar.find_one(
                {"user_id": str(user.id)}
            )
        except Exception as exc:
            logger.error(
                "Avatar find_one by user_id failed",
                extra={
                    "error": str(exc),
                    "user_id": str(user.id),
                    "user_email": user.email,
                },
            )
            raise HTTPException(
                status_code=500,
                detail=f"Avatar lookup failed: {exc}",
            )
    if not avatar:
        logger.warning(
            "Avatar not found for user",
            extra={"user_id": str(user.id), "user_email": user.email},
        )
        raise HTTPException(status_code=404, detail="Avatar not found")
    logger.warning(
        "Avatar found",
        extra={
            "avatar_id": str(avatar.id),
            "status": avatar.creatify_avatar_status,
            "has_image": avatar.creatify_avatar_image_url is not None,
        },
    )
    return _avatar_response(avatar)
