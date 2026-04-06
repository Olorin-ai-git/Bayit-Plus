"""
VOD Interaction Reels API Routes

Endpoint for generating shareable video reels from interaction sessions.
Separated from vod_interactions.py to respect the 200-line file limit.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.core.logging_config import get_logger
from app.core.security import get_current_user
from app.api.dependencies.olorin_tier import require_share_clips, is_demo_portal_request
from app.models.user import User
from app.services.vod_interaction.reel_compositor import (
    reel_compositor_service,
)

logger = get_logger(__name__)

router = APIRouter(
    prefix="/vod-interactions/reels",
    tags=["VOD Interaction Reels"],
)


class GenerateReelRequest(BaseModel):
    """Request to generate a reel from interaction sessions."""

    content_id: str = Field(..., description="Content ID")
    profile_id: str = Field(..., description="Child profile ID")
    session_ids: List[str] = Field(
        ...,
        min_length=1,
        description="Completed session IDs to include",
    )


class ReelResponse(BaseModel):
    """Generated reel details."""

    reel_id: str
    video_gcs_path: str
    thumbnail_url: str
    share_token: str
    duration: float
    credits_charged: int


@router.post("/generate", response_model=ReelResponse)
async def generate_reel(
    http_request: Request,
    request: GenerateReelRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Generate a shareable video reel from completed interaction sessions.

    Validates session ownership, composites videos via FFmpeg,
    uploads to GCS, and returns the reel metadata.
    """
    if not is_demo_portal_request(http_request):
        require_share_clips(current_user)
    try:
        reel = await reel_compositor_service.generate_reel(
            user_id=str(current_user.id),
            profile_id=request.profile_id,
            content_id=request.content_id,
            session_ids=request.session_ids,
        )

        logger.info(
            "Reel generated via API",
            extra={
                "user_id": str(current_user.id),
                "reel_id": str(reel.id),
                "session_count": len(request.session_ids),
            },
        )

        return ReelResponse(
            reel_id=str(reel.id),
            video_gcs_path=reel.video_gcs_path,
            thumbnail_url=reel.thumbnail_url,
            share_token=reel.share_token or "",
            duration=reel.duration,
            credits_charged=reel.credits_charged,
        )

    except ValueError as exc:
        logger.warning(
            "Invalid reel generation request",
            extra={
                "user_id": str(current_user.id),
                "error": str(exc),
            },
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except Exception as exc:
        logger.error(
            "Reel generation failed",
            extra={
                "user_id": str(current_user.id),
                "error": str(exc),
            },
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate reel",
        )
