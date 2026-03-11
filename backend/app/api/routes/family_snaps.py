"""
Family Snaps Routes.

Generate, browse, and share composite photos of avatars with show characters.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.api.dependencies.ai_access import get_credit_service, require_ai_access
from app.core.logging_config import get_logger
from app.core.security import get_current_user
from app.models.family_snap import FamilySnap, SnapTemplate
from app.models.user import User
from app.services.beta.credit_service import BetaCreditService
from app.services.interactive_mission.family_snaps_service import (
    family_snaps_service,
)

logger = get_logger(__name__)
router = APIRouter(
    prefix="/family-snaps",
    tags=["family-snaps"],
)


class GenerateSnapRequest(BaseModel):
    profile_id: str
    avatar_id: str
    template: str = Field(default="side_by_side")
    show_content_id: Optional[str] = None
    character_names: List[str] = Field(default_factory=list)


class ShareSnapRequest(BaseModel):
    pin: str = Field(..., min_length=4, max_length=20)


@router.post("/generate")
async def generate_snap(
    request: GenerateSnapRequest,
    user: User = Depends(require_ai_access),
    credit_service: BetaCreditService = Depends(get_credit_service),
):
    """Generate a composite photo of avatar with show characters."""
    if not user.can_access_premium_features():
        success, remaining = await credit_service.deduct_credits(
            user_id=str(user.id),
            feature="family_snap",
            usage_amount=1.0,
            metadata={"avatar_id": request.avatar_id},
        )
        if not success:
            raise HTTPException(
                status_code=402,
                detail="Insufficient credits",
            )

    try:
        template = SnapTemplate(request.template)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid template: {request.template}",
        )

    try:
        snap = await family_snaps_service.generate_snap(
            user_id=str(user.id),
            profile_id=request.profile_id,
            avatar_id=request.avatar_id,
            template=template,
            show_content_id=request.show_content_id,
            character_names=request.character_names,
        )
        return {
            "snap_id": str(snap.id),
            "status": snap.status.value,
            "template": snap.template.value,
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/avatars/{avatar_id}/snaps")
async def get_snap_gallery(
    avatar_id: str,
    limit: int = Query(default=50, ge=1, le=200),
    user: User = Depends(get_current_user),
):
    """Get snap gallery for an avatar."""
    snaps = await family_snaps_service.get_gallery(
        user_id=str(user.id),
        avatar_id=avatar_id,
        limit=limit,
    )

    return {
        "snaps": [
            {
                "snap_id": str(s.id),
                "template": s.template.value,
                "character_names": s.character_names,
                "composite_url": s.composite_gcs_path,
                "thumbnail_url": s.thumbnail_gcs_path,
                "status": s.status.value,
                "share_url": s.share_url,
                "created_at": s.created_at.isoformat(),
            }
            for s in snaps
        ],
        "total": len(snaps),
    }


@router.post("/snaps/{snap_id}/share")
async def share_snap(
    snap_id: str,
    request: ShareSnapRequest,
    user: User = Depends(get_current_user),
):
    """Generate a shareable link (requires parental PIN)."""
    from app.services.family_controls_service import (
        family_controls_service,
    )

    try:
        pin_valid = await family_controls_service.verify_pin(
            user_id=str(user.id), pin=request.pin,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(e),
        )

    if not pin_valid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid family PIN",
        )

    try:
        share_url = await family_snaps_service.generate_share_url(
            snap_id=snap_id,
            user_id=str(user.id),
            pin_verified=True,
        )
        return {"share_url": share_url}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
