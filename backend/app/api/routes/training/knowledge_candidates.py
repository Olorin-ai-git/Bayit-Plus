"""Review queue endpoints: list candidates + dismiss. Admin-only."""

from datetime import datetime, timezone
from typing import Literal, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.api.routes.training.dependencies import require_training_admin
from app.core.logging_config import get_logger
from app.models.ask_candidate import AskCandidate
from app.models.training_user import TrainingUser

logger = get_logger(__name__)
router = APIRouter(prefix="/knowledge", tags=["training-knowledge"])

Tab = Literal["new", "all", "promoted", "dismissed"]


class CandidateItem(BaseModel):
    id: str
    question: str
    answer: str
    mode: str
    sources_count: int
    canonical_hits_count: int
    asker_user_id: Optional[str]
    created_at: datetime
    dismissed: bool
    promoted: bool
    duplicate_count: int


class CandidateListResponse(BaseModel):
    items: list[CandidateItem]
    total: int


async def _fetch_candidates(
    *, partner_id: str, tab: Tab, limit: int, skip: int,
) -> tuple[list[dict], int]:
    query: dict = {"partner_id": partner_id}
    if tab == "new":
        query["dismissed"] = False
        query["promoted_to"] = None
    elif tab == "promoted":
        query["promoted_to"] = {"$ne": None}
    elif tab == "dismissed":
        query["dismissed"] = True
    coll = AskCandidate.get_motor_collection()
    cursor = coll.find(query).sort("created_at", -1).skip(skip).limit(limit)
    rows = await cursor.to_list(length=limit)
    total = await coll.count_documents(query)
    return rows, total


async def _mark_dismissed(*, partner_id: str, candidate_id: str, reviewer_id: str) -> bool:
    try:
        oid = ObjectId(candidate_id)
    except Exception:
        return False
    coll = AskCandidate.get_motor_collection()
    res = await coll.update_one(
        {"_id": oid, "partner_id": partner_id},
        {"$set": {
            "dismissed": True,
            "reviewed_by": reviewer_id,
            "reviewed_at": datetime.now(timezone.utc),
        }},
    )
    return res.matched_count == 1


def _to_item(row: dict) -> CandidateItem:
    return CandidateItem(
        id=str(row["_id"]),
        question=row["question"],
        answer=row.get("answer", ""),
        mode=row.get("mode", "blended"),
        sources_count=len(row.get("sources") or []),
        canonical_hits_count=len(row.get("canonical_hits") or []),
        asker_user_id=row.get("asker_user_id"),
        created_at=row["created_at"],
        dismissed=bool(row.get("dismissed")),
        promoted=row.get("promoted_to") is not None,
        duplicate_count=0,
    )


@router.get("/candidates", response_model=CandidateListResponse)
async def list_candidates(
    tab: Tab = Query(default="new"),
    limit: int = Query(default=20, ge=1, le=100),
    skip: int = Query(default=0, ge=0),
    user: TrainingUser = Depends(require_training_admin),
):
    rows, total = await _fetch_candidates(
        partner_id=user.partner_id, tab=tab, limit=limit, skip=skip,
    )
    logger.info("Candidate queue read", extra={
        "partner_id": user.partner_id, "tab": tab, "total": total,
    })
    return CandidateListResponse(
        items=[_to_item(r) for r in rows], total=total,
    )


@router.post("/candidates/{candidate_id}/dismiss")
async def dismiss_candidate(
    candidate_id: str,
    user: TrainingUser = Depends(require_training_admin),
):
    ok = await _mark_dismissed(
        partner_id=user.partner_id,
        candidate_id=candidate_id,
        reviewer_id=str(user.id),
    )
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found",
        )
    return {"ok": True}
