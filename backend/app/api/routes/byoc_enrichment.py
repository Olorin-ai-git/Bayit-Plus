"""
BYOC Enrichment API Routes

Endpoints for enriching Bring Your Own Content items with subtitles
and metadata from external sources (Plex, YouTube, IPTV).
"""

import uuid
from typing import Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status

from app.api.routes.byoc_enrichment_models import (
    BYOCBatchEnrichRequest,
    BYOCBatchResponse,
    BYOCBatchStatusResponse,
    BYOCEnrichRequest,
    BYOCEnrichResponse,
    enrich_single_item,
)
from app.core.logging_config import get_logger
from app.core.rate_limiter import RATE_LIMITS, limiter
from app.core.security import get_optional_user
from app.models.user import User

logger = get_logger(__name__)

router = APIRouter(prefix="/byoc", tags=["byoc-enrichment"])

_batch_jobs: Dict[str, Dict] = {}


@router.post("/enrich", response_model=BYOCEnrichResponse)
@limiter.limit(RATE_LIMITS.get("byoc_enrich", "5/minute"))
async def enrich_byoc_content(
    request: Request,
    enrich_req: BYOCEnrichRequest,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Enrich a single BYOC content item with subtitles and metadata."""
    logger.info(
        "BYOC enrich request source_type=%s external_id=%s user=%s",
        enrich_req.source_type,
        enrich_req.external_id,
        str(current_user.id) if current_user else "anonymous",
    )
    return await enrich_single_item(enrich_req)


async def _process_batch(job_id: str, items: List[BYOCEnrichRequest]) -> None:
    """Background task to process batch enrichment items sequentially."""
    for item in items:
        try:
            result = await enrich_single_item(item)
            _batch_jobs[job_id]["completed"] += 1
            _batch_jobs[job_id]["results"].append(result.model_dump())
        except Exception:
            logger.exception(
                "Batch item failed job_id=%s external_id=%s",
                job_id,
                item.external_id,
            )
            _batch_jobs[job_id]["failed"] += 1
            _batch_jobs[job_id]["results"].append(
                {"external_id": item.external_id, "error": "processing_failed"}
            )
    _batch_jobs[job_id]["status"] = "completed"
    logger.info("Batch job completed job_id=%s", job_id)


@router.post("/enrich/batch", response_model=BYOCBatchResponse)
@limiter.limit(RATE_LIMITS.get("byoc_enrich_batch", "3/hour"))
async def enrich_byoc_batch(
    request: Request,
    batch_req: BYOCBatchEnrichRequest,
    background_tasks: BackgroundTasks,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Submit a batch of BYOC items for background enrichment."""
    job_id = str(uuid.uuid4())
    _batch_jobs[job_id] = {
        "status": "processing",
        "total_items": len(batch_req.items),
        "completed": 0,
        "failed": 0,
        "results": [],
    }
    background_tasks.add_task(_process_batch, job_id, batch_req.items)
    logger.info(
        "Batch enrichment started job_id=%s items=%d", job_id, len(batch_req.items)
    )
    return BYOCBatchResponse(
        job_id=job_id, total_items=len(batch_req.items), status="processing"
    )


@router.get("/enrich/batch/{job_id}/status", response_model=BYOCBatchStatusResponse)
async def get_batch_status(
    job_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Get the status of a batch enrichment job."""
    job = _batch_jobs.get(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch job {job_id} not found",
        )
    return BYOCBatchStatusResponse(
        job_id=job_id,
        status=job["status"],
        total_items=job["total_items"],
        completed=job["completed"],
        failed=job["failed"],
        results=job["results"],
    )
