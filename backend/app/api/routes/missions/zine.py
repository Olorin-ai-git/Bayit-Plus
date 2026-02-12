"""
Weekly AI Zine Routes.

Endpoints for retrieving current/archived zines and marking as viewed.
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.dependencies.ai_access import get_credit_service, require_ai_access
from app.core.logging_config import get_logger
from app.core.security import get_current_user
from app.models.user import User
from app.models.zine import ZineListResponse, ZinePageResponse, ZineResponse
from app.services.beta.credit_service import BetaCreditService
from app.services.zine.zine_generation_service import zine_generation_service

logger = get_logger(__name__)
router = APIRouter(prefix="/zine", tags=["zine"])


def _zine_to_response(zine) -> ZineResponse:
    """Convert a WeeklyZine document to API response."""
    return ZineResponse(
        id=str(zine.id),
        week_key=zine.week_key,
        title=zine.title,
        title_he=zine.title_he,
        description=zine.description,
        description_he=zine.description_he,
        cover_image_url=zine.cover_image_url,
        pages=[
            ZinePageResponse(
                page_number=p.page_number,
                title=p.title,
                title_he=p.title_he,
                content=p.content,
                content_he=p.content_he,
                image_url=p.image_url,
                vocabulary_words=p.vocabulary_words,
            )
            for p in zine.pages
        ],
        total_pages=zine.total_pages,
        status=zine.status.value,
        viewed=zine.viewed,
    )


@router.get("/current", response_model=ZineResponse)
async def get_current_zine(
    profile_id: Optional[str] = Query(None),
    user: User = Depends(require_ai_access),
    credit_service: BetaCreditService = Depends(get_credit_service),
):
    """Get the current week's zine."""
    if user.is_beta_user and not user.is_admin_role():
        success, remaining = await credit_service.deduct_credits(
            user_id=str(user.id),
            feature="zine_generation",
            usage_amount=1.0,
            metadata={"profile_id": profile_id},
        )
        if not success:
            raise HTTPException(status_code=402, detail="Insufficient Beta 500 credits")

    week_key = datetime.now(timezone.utc).strftime("%Y-W%W")

    zine = await zine_generation_service.get_current_zine(
        user_id=str(user.id),
        profile_id=profile_id,
        week_key=week_key,
    )

    if not zine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No zine available for this week",
        )

    return _zine_to_response(zine)


@router.get("/archive", response_model=ZineListResponse)
async def get_zine_archive(
    profile_id: Optional[str] = Query(None),
    limit: int = Query(default=10, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
):
    """Get archived past zines."""
    zines = await zine_generation_service.get_zine_archive(
        user_id=str(user.id),
        profile_id=profile_id,
        limit=limit,
        offset=offset,
    )

    return ZineListResponse(
        zines=[_zine_to_response(z) for z in zines],
        total=len(zines),
    )


@router.patch("/{zine_id}/viewed")
async def mark_zine_viewed(
    zine_id: str,
    user: User = Depends(get_current_user),
):
    """Mark a zine as viewed."""
    zine = await zine_generation_service.mark_viewed(
        user_id=str(user.id),
        zine_id=zine_id,
    )

    if not zine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zine not found",
        )

    return {"viewed": True, "viewed_at": zine.viewed_at.isoformat()}
