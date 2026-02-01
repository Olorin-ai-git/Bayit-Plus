"""
Live Highlights REST API Endpoints.

Provides endpoints for:
- Get highlights for a channel
- Get active detection channels
- Admin highlight management
"""

from datetime import datetime, timedelta
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field

from app.api.routes.catchup_models import validate_id
from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.rate_limiter import limiter
from app.core.security import get_current_user
from app.models.highlight import LiveHighlight
from app.models.user import User
from app.services.highlights import get_highlights_service

router = APIRouter()
logger = get_logger(__name__)


class HighlightResponse(BaseModel):
    """Single highlight response."""

    highlight_id: str
    channel_id: str
    start_time: float
    end_time: float
    transcript_text: str
    highlight_type: str
    confidence: float
    metadata: dict
    created_at: str


class HighlightsListResponse(BaseModel):
    """List of highlights response."""

    highlights: List[HighlightResponse]
    total: int
    channel_id: str


class DetectionStatusResponse(BaseModel):
    """Detection status for a channel."""

    channel_id: str
    is_detecting: bool
    highlights_count: int
    config: dict


class ActiveChannelsResponse(BaseModel):
    """Active detection channels response."""

    channels: List[str]
    total: int


@router.get(
    "/live/{channel_id}/highlights",
    response_model=HighlightsListResponse,
)
@limiter.limit("60/minute")
async def get_channel_highlights(
    request: Request,
    channel_id: str,
    limit: int = Query(20, ge=1, le=100),
    highlight_type: Optional[Literal["emotional", "entity", "keyword", "dramatic"]] = Query(None),
    current_user: User = Depends(get_current_user),
):
    """Get recent highlights for a live channel."""
    validate_id(channel_id, "channel_id")
    logger.info(
        "Getting highlights",
        extra={
            "channel_id": channel_id,
            "user_id": str(current_user.id),
            "limit": limit,
            "highlight_type": highlight_type,
        },
    )

    try:
        service = get_highlights_service()
        highlights = await service.get_highlights(
            channel_id=channel_id,
            limit=limit,
            highlight_type=highlight_type,
        )

        return HighlightsListResponse(
            highlights=[
                HighlightResponse(**h) for h in highlights
            ],
            total=len(highlights),
            channel_id=channel_id,
        )

    except Exception as e:
        logger.error(
            "Failed to get highlights",
            extra={"channel_id": channel_id, "error": str(e)},
        )
        raise HTTPException(status_code=500, detail="Failed to get highlights")


@router.get(
    "/live/{channel_id}/highlights/status",
    response_model=DetectionStatusResponse,
)
@limiter.limit("60/minute")
async def get_detection_status(
    request: Request,
    channel_id: str,
    current_user: User = Depends(get_current_user),
):
    """Check if highlight detection is active for a channel."""
    validate_id(channel_id, "channel_id")
    try:
        service = get_highlights_service()
        active_channels = service.get_active_channels()
        is_detecting = channel_id in active_channels

        hour_ago = datetime.utcnow() - timedelta(hours=1)
        count = await LiveHighlight.count_recent(channel_id, hour_ago)

        config = settings.olorin.highlights
        return DetectionStatusResponse(
            channel_id=channel_id,
            is_detecting=is_detecting,
            highlights_count=count,
            config={
                "enabled": config.enabled,
                "min_confidence": config.min_confidence,
                "max_per_hour": config.max_per_hour,
            },
        )

    except Exception as e:
        logger.error(
            "Failed to get detection status",
            extra={"channel_id": channel_id, "error": str(e)},
        )
        raise HTTPException(status_code=500, detail="Failed to get status")


@router.post("/live/{channel_id}/highlights/start")
@limiter.limit("10/minute")
async def start_detection(
    request: Request,
    channel_id: str,
    current_user: User = Depends(get_current_user),
):
    """Start highlight detection for a channel (requires active stream)."""
    validate_id(channel_id, "channel_id")
    if not current_user.is_admin_user():
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        service = get_highlights_service()
        await service.start_detection(channel_id)

        logger.info(
            "Detection started",
            extra={"channel_id": channel_id, "user_id": str(current_user.id)},
        )

        return {"status": "started", "channel_id": channel_id}

    except Exception as e:
        logger.error(
            "Failed to start detection",
            extra={"channel_id": channel_id, "error": str(e)},
        )
        raise HTTPException(status_code=500, detail="Failed to start detection")


@router.post("/live/{channel_id}/highlights/stop")
@limiter.limit("10/minute")
async def stop_detection(
    request: Request,
    channel_id: str,
    current_user: User = Depends(get_current_user),
):
    """Stop highlight detection for a channel."""
    validate_id(channel_id, "channel_id")
    if not current_user.is_admin_user():
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        service = get_highlights_service()
        await service.stop_detection(channel_id)

        logger.info(
            "Detection stopped",
            extra={"channel_id": channel_id, "user_id": str(current_user.id)},
        )

        return {"status": "stopped", "channel_id": channel_id}

    except Exception as e:
        logger.error(
            "Failed to stop detection",
            extra={"channel_id": channel_id, "error": str(e)},
        )
        raise HTTPException(status_code=500, detail="Failed to stop detection")


@router.get(
    "/admin/highlights/active",
    response_model=ActiveChannelsResponse,
)
@limiter.limit("30/minute")
async def get_active_channels(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Get all channels with active highlight detection (admin only)."""
    if not current_user.is_admin_user():
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        service = get_highlights_service()
        channels = service.get_active_channels()

        return ActiveChannelsResponse(
            channels=channels,
            total=len(channels),
        )

    except Exception as e:
        logger.error("Failed to get active channels", extra={"error": str(e)})
        raise HTTPException(status_code=500, detail="Failed to get channels")
