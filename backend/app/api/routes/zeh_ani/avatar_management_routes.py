"""Zeh Ani Avatar Management endpoints (set-active, delete)."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.core.logging_config import get_logger
from app.core.security import get_current_user
from app.models.child_avatar import AvatarStatus, ChildAvatar
from app.models.user import User

logger = get_logger(__name__)
router = APIRouter(prefix="/zeh-ani/avatar", tags=["zeh-ani"])


@router.put("/{avatar_id}/set-active")
async def set_active_avatar(
    avatar_id: str,
    user: User = Depends(get_current_user),
):
    """Set an avatar as the active one for its profile."""
    avatar = await ChildAvatar.get(avatar_id)
    if not avatar or avatar.user_id != str(user.id):
        raise HTTPException(status_code=404, detail="Avatar not found")

    result = await ChildAvatar.set_active(
        user_id=str(user.id),
        profile_id=avatar.profile_id,
        avatar_id=avatar_id,
    )
    if not result:
        raise HTTPException(
            status_code=400, detail="Failed to set active avatar",
        )

    return {
        "avatar_id": avatar_id,
        "is_active": True,
        "profile_id": avatar.profile_id,
    }


@router.delete("/{avatar_id}")
async def delete_avatar(
    avatar_id: str,
    user: User = Depends(get_current_user),
):
    """Soft-delete an avatar. Cannot delete the last avatar for a profile."""
    avatar = await ChildAvatar.get(avatar_id)
    if not avatar or avatar.user_id != str(user.id):
        raise HTTPException(status_code=404, detail="Avatar not found")

    siblings = await ChildAvatar.find(
        {
            "user_id": str(user.id),
            "profile_id": avatar.profile_id,
            "status": {"$ne": AvatarStatus.DELETED.value},
        }
    ).to_list()

    active_siblings = [s for s in siblings if str(s.id) != avatar_id]
    if not active_siblings:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete the last avatar for a profile",
        )

    was_active = avatar.is_active
    avatar.status = AvatarStatus.DELETED
    avatar.is_active = False
    avatar.updated_at = datetime.now(timezone.utc)
    await avatar.save()

    if was_active:
        next_avatar = max(active_siblings, key=lambda a: a.created_at)
        await ChildAvatar.set_active(
            user_id=str(user.id),
            profile_id=avatar.profile_id,
            avatar_id=str(next_avatar.id),
        )

    logger.info(
        "Avatar soft-deleted",
        extra={
            "user_id": str(user.id),
            "avatar_id": avatar_id,
            "profile_id": avatar.profile_id,
        },
    )
    return {"deleted": True, "avatar_id": avatar_id}
