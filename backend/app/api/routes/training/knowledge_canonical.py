"""Canonical memory routes: promote / edit / verify / retract. Admin-only."""

from datetime import datetime, timezone
from typing import Literal, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.routes.training.dependencies import require_training_admin
from app.core.logging_config import get_logger
from app.models.ask_candidate import AskCandidate
from app.models.canonical_memory import (
    CanonicalMemory,
    Citation,
    CanonicalStatus,
)
from app.models.training_user import TrainingUser
from app.services.olorin.search.canonical_sync import (
    delete_canonical_vector,
    upsert_canonical_vector,
)
from app.services.olorin.search.client import client_manager

logger = get_logger(__name__)
router = APIRouter(prefix="/knowledge", tags=["training-knowledge"])


class CitationIn(BaseModel):
    type: Literal["video", "document"]
    content_id: Optional[str] = None
    document_id: Optional[str] = None
    timestamp_seconds: Optional[float] = None
    page_number: Optional[int] = None


class PromoteRequest(BaseModel):
    candidate_id: Optional[str] = None
    question: str = Field(..., min_length=3, max_length=500)
    answer: str = Field(..., min_length=1, max_length=4000)
    citations: list[CitationIn] = Field(..., min_length=1)
    stale_after_months: Optional[int] = Field(default=6, ge=1, le=60)


class CanonicalEditRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=500)
    answer: str = Field(..., min_length=1, max_length=4000)
    citations: list[CitationIn] = Field(..., min_length=1)
    stale_after_months: Optional[int] = Field(default=6, ge=1, le=60)


class CanonicalResponse(BaseModel):
    canonical_id: str
    status: str


async def _create_canonical(
    *,
    partner_id: str,
    created_by: str,
    question: str,
    answer: str,
    citations: list[CitationIn],
    stale_after_months: Optional[int],
    promoted_from: Optional[str],
) -> CanonicalMemory:
    cm = CanonicalMemory(
        partner_id=partner_id,
        scope="partner",
        question=question,
        answer=answer,
        citations=[Citation(**c.model_dump()) for c in citations],
        stale_after_months=stale_after_months,
        created_by=created_by,
        promoted_from_candidate=promoted_from,
    )
    await cm.insert()
    return cm


async def _link_candidate(
    *, partner_id: str, candidate_id: str, canonical_id: str, reviewer_id: str
) -> bool:
    try:
        oid = ObjectId(candidate_id)
    except Exception:
        return False
    coll = AskCandidate.get_motor_collection()
    res = await coll.update_one(
        {"_id": oid, "partner_id": partner_id},
        {
            "$set": {
                "promoted_to": canonical_id,
                "reviewed_by": reviewer_id,
                "reviewed_at": datetime.now(timezone.utc),
            }
        },
    )
    return res.matched_count == 1


async def _sync_to_pinecone(cm: CanonicalMemory) -> None:
    if not client_manager.is_initialized:
        await client_manager.initialize()
    idx = client_manager.pinecone_index
    if idx is None:
        raise RuntimeError("Pinecone index unavailable")
    await upsert_canonical_vector(idx, cm)


async def _delete_from_pinecone(canonical_id: str) -> None:
    if not client_manager.is_initialized:
        await client_manager.initialize()
    idx = client_manager.pinecone_index
    if idx is None:
        raise RuntimeError("Pinecone index unavailable")
    await delete_canonical_vector(idx, canonical_id)


async def _load_own(partner_id: str, canonical_id: str) -> CanonicalMemory:
    try:
        oid = ObjectId(canonical_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Canonical not found")
    cm = await CanonicalMemory.get(oid)
    if cm is None or cm.partner_id != partner_id:
        raise HTTPException(status_code=404, detail="Canonical not found")
    return cm


@router.post("/canonical", response_model=CanonicalResponse)
async def promote_canonical(
    req: PromoteRequest,
    user: TrainingUser = Depends(require_training_admin),
):
    cm = await _create_canonical(
        partner_id=user.partner_id,
        created_by=str(user.id),
        question=req.question,
        answer=req.answer,
        citations=req.citations,
        stale_after_months=req.stale_after_months,
        promoted_from=req.candidate_id,
    )
    if req.candidate_id:
        await _link_candidate(
            partner_id=user.partner_id,
            candidate_id=req.candidate_id,
            canonical_id=str(cm.id),
            reviewer_id=str(user.id),
        )
    await _sync_to_pinecone(cm)
    logger.info(
        "Canonical promoted",
        extra={
            "partner_id": user.partner_id,
            "canonical_id": str(cm.id),
            "from_candidate": req.candidate_id,
        },
    )
    return CanonicalResponse(canonical_id=str(cm.id), status=cm.status)
