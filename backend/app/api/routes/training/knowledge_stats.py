"""Knowledge library stats endpoint (split from knowledge.py for 200-line limit)."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.routes.training.dependencies import get_current_training_user
from app.api.routes.training.knowledge import KNOWLEDGE_TIERS, _get_tier
from app.core.logging_config import get_logger
from app.models.content import Content as ContentModel
from app.models.training_user import TrainingUser

logger = get_logger(__name__)
router = APIRouter(prefix="/knowledge", tags=["training-knowledge"])


class StatsResponse(BaseModel):
    video_count: int
    total_duration_seconds: float
    last_indexed_at: datetime | None


@router.get("/stats", response_model=StatsResponse)
async def knowledge_stats(
    user: TrainingUser = Depends(get_current_training_user),
):
    """Aggregate indexed-library stats for the idle knowledge surface."""
    tier = await _get_tier(user.partner_id)
    if tier not in KNOWLEDGE_TIERS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cross-video knowledge requires Organization tier or above",
        )

    try:
        collection = ContentModel.get_motor_collection()
        cursor = collection.find(
            {"partner_id": user.partner_id},
            {"video_metadata.duration": 1, "updated_at": 1},
        )
        contents = await cursor.to_list(length=10000)
    except Exception as exc:
        logger.error(
            "Knowledge stats DB error",
            extra={"error": str(exc), "partner_id": user.partner_id},
        )
        raise HTTPException(status_code=502, detail="Database unavailable")

    total_seconds = 0.0
    last_indexed: datetime | None = None
    for doc in contents:
        meta = doc.get("video_metadata") or {}
        dur = meta.get("duration")
        if isinstance(dur, (int, float)):
            total_seconds += float(dur)
        updated = doc.get("updated_at")
        if updated and (last_indexed is None or updated > last_indexed):
            last_indexed = updated

    logger.info("Knowledge stats fetched", extra={
        "partner_id": user.partner_id,
        "video_count": len(contents),
        "total_duration_seconds": round(total_seconds, 1),
    })
    return StatsResponse(
        video_count=len(contents),
        total_duration_seconds=round(total_seconds, 1),
        last_indexed_at=last_indexed,
    )
