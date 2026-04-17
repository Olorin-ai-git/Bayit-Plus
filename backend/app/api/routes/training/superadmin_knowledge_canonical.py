"""Super-admin canonical CRUD — scope hard-locked to global. Writes global pool."""

from datetime import datetime, timezone
from typing import Literal, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.routes.training.dependencies import require_superadmin
from app.core.logging_config import get_logger
from app.models.canonical_memory import CanonicalMemory, Citation
from app.models.training_user import TrainingUser
from app.services.olorin.search.canonical_sync import (
    delete_canonical_vector,
    upsert_canonical_vector,
)
from app.services.olorin.search.client import client_manager

logger = get_logger(__name__)
router = APIRouter(prefix="/superadmin/knowledge", tags=["training-superadmin-knowledge"])


class CitationIn(BaseModel):
    type: Literal["video", "document"]
    content_id: Optional[str] = None
    document_id: Optional[str] = None
    timestamp_seconds: Optional[float] = None
    page_number: Optional[int] = None


class GlobalPromoteRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=500)
    answer: str = Field(..., min_length=1, max_length=4000)
    citations: list[CitationIn] = Field(..., min_length=1)
    stale_after_months: Optional[int] = Field(default=12, ge=1, le=120)


class GlobalEditRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=500)
    answer: str = Field(..., min_length=1, max_length=4000)
    citations: list[CitationIn] = Field(..., min_length=1)
    stale_after_months: Optional[int] = Field(default=12, ge=1, le=120)


class CanonicalResponse(BaseModel):
    canonical_id: str
    status: str


async def _create_global_canonical(
    *,
    partner_id: None,
    scope: str,
    created_by: str,
    question: str,
    answer: str,
    citations: list[CitationIn],
    stale_after_months: Optional[int],
) -> CanonicalMemory:
    cm = CanonicalMemory(
        partner_id=partner_id,
        scope=scope,
        question=question,
        answer=answer,
        citations=[Citation(**c.model_dump()) for c in citations],
        stale_after_months=stale_after_months,
        created_by=created_by,
    )
    await cm.insert()
    return cm


async def _load_global(canonical_id: str) -> CanonicalMemory | None:
    try:
        oid = ObjectId(canonical_id)
    except Exception:
        return None
    cm = await CanonicalMemory.get(oid)
    if cm is None or cm.scope != "global" or cm.partner_id is not None:
        return None
    return cm


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


@router.post("/canonical", response_model=CanonicalResponse)
async def create_global_canonical(
    req: GlobalPromoteRequest,
    user: TrainingUser = Depends(require_superadmin),
):
    cm = await _create_global_canonical(
        partner_id=None,
        scope="global",
        created_by=str(user.id),
        question=req.question,
        answer=req.answer,
        citations=req.citations,
        stale_after_months=req.stale_after_months,
    )
    await _sync_to_pinecone(cm)
    logger.info("Global canonical created", extra={
        "super_admin_id": str(user.id), "canonical_id": str(cm.id),
    })
    return CanonicalResponse(canonical_id=str(cm.id), status=cm.status)


@router.put("/canonical/{canonical_id}", response_model=CanonicalResponse)
async def edit_global_canonical(
    canonical_id: str,
    req: GlobalEditRequest,
    user: TrainingUser = Depends(require_superadmin),
):
    cm = await _load_global(canonical_id)
    if cm is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Global canonical not found")
    cm.question = req.question
    cm.answer = req.answer
    cm.citations = [Citation(**c.model_dump()) for c in req.citations]
    cm.stale_after_months = req.stale_after_months
    cm.status = "active"
    cm.updated_at = datetime.now(timezone.utc)
    cm.last_verified_at = cm.updated_at
    await cm.save()
    await _sync_to_pinecone(cm)
    logger.info("Global canonical edited", extra={
        "super_admin_id": str(user.id), "canonical_id": canonical_id,
    })
    return CanonicalResponse(canonical_id=canonical_id, status=cm.status)


@router.post("/canonical/{canonical_id}/verify", response_model=CanonicalResponse)
async def verify_global_canonical(
    canonical_id: str,
    user: TrainingUser = Depends(require_superadmin),
):
    cm = await _load_global(canonical_id)
    if cm is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Global canonical not found")
    cm.status = "active"
    cm.last_verified_at = datetime.now(timezone.utc)
    cm.updated_at = cm.last_verified_at
    await cm.save()
    await _sync_to_pinecone(cm)
    logger.info("Global canonical re-verified", extra={
        "super_admin_id": str(user.id), "canonical_id": canonical_id,
    })
    return CanonicalResponse(canonical_id=canonical_id, status=cm.status)


@router.delete("/canonical/{canonical_id}", response_model=CanonicalResponse)
async def retract_global_canonical(
    canonical_id: str,
    user: TrainingUser = Depends(require_superadmin),
):
    cm = await _load_global(canonical_id)
    if cm is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Global canonical not found")
    cm.status = "retracted"
    cm.updated_at = datetime.now(timezone.utc)
    await cm.save()
    await _delete_from_pinecone(canonical_id)
    logger.info("Global canonical retracted", extra={
        "super_admin_id": str(user.id), "canonical_id": canonical_id,
    })
    return CanonicalResponse(canonical_id=canonical_id, status="retracted")
