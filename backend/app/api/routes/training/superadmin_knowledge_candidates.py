"""Super-admin cross-partner candidate queue — for promoting questions into the global pool."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.api.routes.training.dependencies import require_superadmin
from app.core.logging_config import get_logger
from app.models.ask_candidate import AskCandidate
from app.models.training_user import TrainingUser

logger = get_logger(__name__)
router = APIRouter(
    prefix="/superadmin/knowledge",
    tags=["training-superadmin-knowledge"],
)


class CrossPartnerCandidate(BaseModel):
    id: str
    partner_id: str
    question: str
    answer: str
    mode: str
    sources_count: int
    created_at: datetime
    promoted: bool


class CrossPartnerResponse(BaseModel):
    items: list[CrossPartnerCandidate]
    total: int


async def _fetch_all_candidates(
    *, limit: int, skip: int,
) -> tuple[list[dict], int]:
    coll = AskCandidate.get_motor_collection()
    query = {"dismissed": False, "promoted_to": None}
    cursor = coll.find(query).sort("created_at", -1).skip(skip).limit(limit)
    rows = await cursor.to_list(length=limit)
    total = await coll.count_documents(query)
    return rows, total


@router.get("/candidates", response_model=CrossPartnerResponse)
async def list_all_candidates(
    limit: int = Query(default=50, ge=1, le=200),
    skip: int = Query(default=0, ge=0),
    user: TrainingUser = Depends(require_superadmin),
):
    rows, total = await _fetch_all_candidates(limit=limit, skip=skip)
    items = [
        CrossPartnerCandidate(
            id=str(r["_id"]),
            partner_id=r.get("partner_id", ""),
            question=r["question"],
            answer=r.get("answer", ""),
            mode=r.get("mode", "blended"),
            sources_count=len(r.get("sources") or []),
            created_at=r["created_at"],
            promoted=r.get("promoted_to") is not None,
        )
        for r in rows
    ]
    logger.info(
        "Super-admin candidate harvest read",
        extra={"super_admin_id": str(user.id), "total": total},
    )
    return CrossPartnerResponse(items=items, total=total)
