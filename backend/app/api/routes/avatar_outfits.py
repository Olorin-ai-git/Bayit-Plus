"""
Avatar Outfit Routes.

Wardrobe catalog, inventory, purchase, and equip operations.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.core.logging_config import get_logger
from app.core.security import get_current_user
from app.models.user import User
from app.services.interactive_mission.outfit_service import outfit_service

logger = get_logger(__name__)
router = APIRouter(
    prefix="/avatar-outfits",
    tags=["avatar-outfits"],
)


class PurchaseRequest(BaseModel):
    profile_id: str
    outfit_id: str


class EquipRequest(BaseModel):
    outfit_id: Optional[str] = None


@router.get("/catalog")
async def get_catalog(
    avatar_id: Optional[str] = Query(default=None),
    user: User = Depends(get_current_user),
):
    """Get the full outfit catalog with ownership status."""
    catalog = await outfit_service.get_catalog(avatar_id=avatar_id)
    return {"outfits": [c.model_dump() for c in catalog]}


@router.get("/avatars/{avatar_id}/inventory")
async def get_inventory(
    avatar_id: str,
    user: User = Depends(get_current_user),
):
    """Get outfits owned by an avatar."""
    from app.models.child_avatar import ChildAvatar

    avatar = await ChildAvatar.get(avatar_id)
    if not avatar or avatar.user_id != str(user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Avatar not found",
        )

    catalog = await outfit_service.get_catalog(avatar_id=avatar_id)
    owned = [c for c in catalog if c.owned]

    return {
        "outfits": [o.model_dump() for o in owned],
        "active_outfit_id": avatar.active_outfit_id,
        "total_owned": len(owned),
    }


@router.post("/avatars/{avatar_id}/purchase")
async def purchase_outfit(
    avatar_id: str,
    request: PurchaseRequest,
    user: User = Depends(get_current_user),
):
    """Purchase an outfit with shekels."""
    try:
        await outfit_service.purchase_outfit(
            user_id=str(user.id),
            profile_id=request.profile_id,
            avatar_id=avatar_id,
            outfit_id=request.outfit_id,
        )
        return {"purchased": True, "outfit_id": request.outfit_id}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/avatars/{avatar_id}/equip")
async def equip_outfit(
    avatar_id: str,
    request: EquipRequest,
    user: User = Depends(get_current_user),
):
    """Equip or unequip an outfit on the avatar."""
    try:
        await outfit_service.equip_outfit(
            user_id=str(user.id),
            avatar_id=avatar_id,
            outfit_id=request.outfit_id,
        )
        return {"equipped": True, "outfit_id": request.outfit_id}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
