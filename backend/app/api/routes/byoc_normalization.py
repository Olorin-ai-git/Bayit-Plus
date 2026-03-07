"""
BYOC Normalization API Routes

Endpoints for AI-powered manifest normalization: fuzzy matching,
dedup detection, TMDB enrichment, and AI classification.
"""

import uuid
from typing import Dict, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status

from app.api.routes.byoc_normalization_models import (
    BYOCManifest,
    BYOCProviderResponse,
    NormalizationApplyRequest,
    NormalizationApplyResponse,
    NormalizationJobStatus,
    NormalizationPlan,
)
from app.core.logging_config import get_logger
from app.core.rate_limiter import RATE_LIMITS, limiter
from app.core.security import get_optional_user
from app.models.byoc_channel_index import ChannelIndexEntry
from app.models.byoc_provider import BYOCProvider
from app.models.user import User
from app.services.byoc.normalization_pipeline import BYOCNormalizationPipeline

logger = get_logger(__name__)

router = APIRouter(prefix="/byoc", tags=["byoc-normalization"])

_normalization_jobs: Dict[str, Dict] = {}


async def _run_normalization(job_id: str, manifest: BYOCManifest) -> None:
    """Background task to run the normalization pipeline."""

    async def update_progress(stage: str, progress: float) -> None:
        _normalization_jobs[job_id]["stage"] = stage
        _normalization_jobs[job_id]["progress"] = progress

    try:
        pipeline = BYOCNormalizationPipeline(job_id)
        plan = await pipeline.run(manifest, progress_cb=update_progress)
        _normalization_jobs[job_id]["status"] = "completed"
        _normalization_jobs[job_id]["plan"] = plan
        logger.info("Normalization completed job_id=%s", job_id)
    except Exception:
        logger.exception("Normalization failed job_id=%s", job_id)
        _normalization_jobs[job_id]["status"] = "failed"
        _normalization_jobs[job_id]["stage"] = "error"


@router.post("/normalize", response_model=NormalizationJobStatus)
@limiter.limit(RATE_LIMITS.get("byoc_normalize", "5/hour"))
async def normalize_manifest(
    request: Request,
    manifest: BYOCManifest,
    background_tasks: BackgroundTasks,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Submit a BYOC manifest for AI-powered normalization."""
    job_id = str(uuid.uuid4())
    _normalization_jobs[job_id] = {
        "status": "processing",
        "progress": 0.0,
        "stage": "queued",
        "plan": None,
    }
    background_tasks.add_task(_run_normalization, job_id, manifest)
    logger.info(
        "Normalization started job_id=%s entries=%d user=%s",
        job_id,
        len(manifest.entries),
        str(current_user.id) if current_user else "anonymous",
    )
    return NormalizationJobStatus(
        job_id=job_id, status="processing", progress=0.0, stage="queued",
    )


@router.get("/normalize/{job_id}/status", response_model=NormalizationJobStatus)
async def get_normalization_status(
    job_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Get the status or result of a normalization job."""
    job = _normalization_jobs.get(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Normalization job {job_id} not found",
        )
    return NormalizationJobStatus(
        job_id=job_id,
        status=job["status"],
        progress=job["progress"],
        stage=job["stage"],
        plan=job["plan"],
    )


@router.post("/normalize/apply", response_model=NormalizationApplyResponse)
async def apply_normalization(
    apply_req: NormalizationApplyRequest,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Apply user selections from the onboarding wizard."""
    job = _normalization_jobs.get(apply_req.job_id)
    if not job or not job.get("plan"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Normalization job not found or not completed",
        )
    dismissed = len(apply_req.dismissed_indices)
    cat_updates = len(apply_req.category_overrides)
    plan: NormalizationPlan = job["plan"]
    kept = plan.stats.total - dismissed

    logger.info(
        "Normalization applied job_id=%s kept=%d dismissed=%d categories=%d",
        apply_req.job_id, kept, dismissed, cat_updates,
    )
    return NormalizationApplyResponse(
        applied=True,
        channels_kept=kept,
        channels_hidden=dismissed,
        categories_updated=cat_updates,
    )


@router.get("/channel-index/search")
async def search_channel_index(
    q: str,
    limit: int = 10,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Search the global channel index by name."""
    from app.services.byoc.channel_index_service import ChannelIndexService

    svc = ChannelIndexService()
    results = await svc.search(q, limit=min(limit, 50))
    return [
        {
            "canonical_name": r.canonical_name,
            "logo_url": r.logo_url,
            "epg_id": r.epg_id,
            "category": r.category,
            "language": r.language,
            "country": r.country,
        }
        for r in results
    ]


@router.get("/providers", response_model=list[BYOCProviderResponse])
async def list_providers(
    current_user: Optional[User] = Depends(get_optional_user),
):
    """List known IPTV providers for the provider picker."""
    providers = await BYOCProvider.find(
        BYOCProvider.is_active == True,  # noqa: E712
    ).sort("sort_order").to_list()
    return [
        BYOCProviderResponse(
            name=p.name,
            slug=p.slug,
            logo_url=p.logo_url,
            connection_types=p.connection_types,
            server_url=p.server_url,
            m3u_url_template=p.m3u_url_template,
            setup_instructions_key=p.setup_instructions_key,
        )
        for p in providers
    ]
