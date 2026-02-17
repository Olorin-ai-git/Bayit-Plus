"""
Admin endpoints for batch scene analysis and avatar placement computation.

Provides admin-only routes to pre-compute avatar placements for interactive
moments on VOD content, using the scene analyzer service.
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.routes.admin.auth import require_admin
from app.core.logging_config import get_logger
from app.models.content import Content
from app.models.user import User
from app.services.vod_interaction.scene_analyzer import scene_analyzer

logger = get_logger(__name__)

router = APIRouter(
    prefix="/vod-interactions/admin",
    tags=["VOD Interaction Admin"],
)


@router.post("/analyze-placements/{content_id}")
async def analyze_all_placements(
    content_id: str,
    current_user: User = Depends(require_admin()),
):
    """
    Batch-analyze all interactive moments for a content item and
    pre-compute avatar placement positions.
    """
    content = await Content.get(content_id)
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found",
        )

    if not content.interactive_moments:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Content has no interactive moments",
        )

    analyzed_count = 0
    errors = []

    for moment in content.interactive_moments:
        try:
            placement = await scene_analyzer.analyze_frame_for_placement(
                video_url=content.stream_url,
                timestamp=moment.timestamp,
            )
            moment.avatar_placement = placement
            analyzed_count += 1
        except Exception as exc:
            errors.append(
                f"Moment at {moment.timestamp}s: {exc}"
            )
            logger.error(
                "Failed to analyze placement for moment",
                extra={
                    "content_id": content_id,
                    "timestamp": moment.timestamp,
                    "error": str(exc),
                },
            )

    if analyzed_count > 0:
        await content.save()

    logger.info(
        "Batch placement analysis completed",
        extra={
            "content_id": content_id,
            "analyzed": analyzed_count,
            "errors_count": len(errors),
            "admin_id": str(current_user.id),
        },
    )

    return {
        "content_id": content_id,
        "total_moments": len(content.interactive_moments),
        "analyzed": analyzed_count,
        "errors": errors,
    }


@router.post("/analyze-placement/{content_id}/{timestamp}")
async def analyze_single_placement(
    content_id: str,
    timestamp: float,
    current_user: User = Depends(require_admin()),
):
    """Analyze a single interactive moment and update its avatar placement."""
    content = await Content.get(content_id)
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found",
        )

    target_moment = None
    for moment in content.interactive_moments:
        if moment.timestamp == timestamp:
            target_moment = moment
            break

    if not target_moment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No interactive moment found at timestamp {timestamp}",
        )

    placement = await scene_analyzer.analyze_frame_for_placement(
        video_url=content.stream_url,
        timestamp=timestamp,
    )
    target_moment.avatar_placement = placement
    await content.save()

    logger.info(
        "Single placement analysis completed",
        extra={
            "content_id": content_id,
            "timestamp": timestamp,
            "position": placement.position,
            "confidence": placement.confidence,
            "admin_id": str(current_user.id),
        },
    )

    return {
        "content_id": content_id,
        "timestamp": timestamp,
        "placement": placement.model_dump(),
    }
