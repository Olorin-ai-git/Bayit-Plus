"""User's own ask history — reads from AskCandidate, filtered by asker_user_id."""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.api.routes.training.dependencies import get_current_training_user
from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.ask_candidate import AskCandidate
from app.models.training_user import TrainingUser

logger = get_logger(__name__)
router = APIRouter(prefix="/knowledge", tags=["training-knowledge"])


class HistoryItem(BaseModel):
    id: str
    question: str
    mode: str
    credits_charged: int
    created_at: datetime
    promoted_canonical_id: Optional[str] = None


class HistoryResponse(BaseModel):
    items: list[HistoryItem]


async def _fetch_user_history(
    *, asker_user_id: str, limit: int, window_days: int,
) -> list[dict]:
    since = datetime.now(timezone.utc) - timedelta(days=window_days)
    coll = AskCandidate.get_motor_collection()
    cursor = (coll.find({
        "asker_user_id": asker_user_id,
        "created_at": {"$gte": since},
    }).sort("created_at", -1).limit(limit))
    return await cursor.to_list(length=limit)


@router.get("/history", response_model=HistoryResponse)
async def get_history(
    limit: int = Query(default=None, ge=1, le=100),
    user: TrainingUser = Depends(get_current_training_user),
):
    effective_limit = min(
        limit or settings.KNOWLEDGE_HISTORY_USER_LIMIT,
        settings.KNOWLEDGE_HISTORY_USER_LIMIT,
    )
    rows = await _fetch_user_history(
        asker_user_id=str(user.id),
        limit=effective_limit,
        window_days=settings.KNOWLEDGE_HISTORY_USER_WINDOW_DAYS,
    )
    logger.info("Knowledge history fetched", extra={
        "partner_id": user.partner_id, "count": len(rows),
    })
    return HistoryResponse(items=[
        HistoryItem(
            id=str(r["_id"]),
            question=r["question"],
            mode=r.get("mode", "blended"),
            credits_charged=int(r.get("credits_charged", 0)),
            created_at=r["created_at"],
            promoted_canonical_id=r.get("promoted_to"),
        ) for r in rows
    ])
