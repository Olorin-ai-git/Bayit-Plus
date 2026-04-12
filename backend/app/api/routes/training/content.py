"""Training platform content management routes."""

import logging
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.routes.training.content_utils import (
    _content_response,
    load_content_for_partner,
    resolve_source_metadata,
)
from app.api.routes.training.dependencies import (
    get_current_training_user,
    require_training_admin,
)
from app.models.chapters import VideoChapters
from app.models.content import Content, ProcessingState
from app.models.ingest_job import IngestJob
from app.models.integration_partner import IntegrationPartner
from app.models.training_user import TrainingUser
from app.services.olorin.ingest_orchestrator import (
    create_ingest_job,
    run_pipeline,
)
from app.api.routes.training.tier_gates import resolve_partner_tier
from app.utils.video_url_utils import validate_video_url

logger = logging.getLogger(__name__)

VIDEO_LIMITS: dict[str, int] = {"free": 3, "team": 10}
router = APIRouter(prefix="/content", tags=["training-content"])

class IngestRequest(BaseModel):
    video_url: str = Field(..., description="Video URL (YouTube, Vimeo, .mp4)")
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(default="", max_length=2000)
    tags: List[str] = Field(default_factory=list)
    capabilities: List[str] = Field(
        default=["characters", "subtitles"],
        description="Processing capabilities to run",
    )


class IngestResponse(BaseModel):
    job_id: str
    content_id: str
    status: str
    capabilities: dict
    estimated_seconds: int = Field(
        default=120,
        description="Estimated processing time in seconds",
    )


@router.post("/ingest", status_code=status.HTTP_202_ACCEPTED)
async def ingest_content(
    body: IngestRequest,
    background_tasks: BackgroundTasks,
    admin: TrainingUser = Depends(require_training_admin),
):
    """Submit a training video for AI processing."""
    ok, err = validate_video_url(body.video_url)
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err)
    partner = await IntegrationPartner.find_one({"partner_id": admin.partner_id})
    if not partner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found",
        )
    tier = await resolve_partner_tier(admin.partner_id)
    limit = VIDEO_LIMITS.get(tier)
    if limit is not None:
        current_count = await Content.find(
            {"partner_id": admin.partner_id}
        ).count()
        if current_count >= limit:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Video limit reached ({limit}). Upgrade your plan for more.",
            )
    content = Content(
        title=body.title,
        description=body.description,
        stream_url=body.video_url,
        topic_tags=body.tags,
        partner_id=admin.partner_id,
    )
    content.source_metadata = await resolve_source_metadata(body.video_url)
    await content.insert()
    job = await create_ingest_job(
        partner=partner, content=content, video_url=body.video_url,
        capabilities=body.capabilities, direct=True,
    )
    background_tasks.add_task(run_pipeline, job)
    cap_count = len(body.capabilities)
    estimated = 60 + (cap_count * 45)  # base + per-capability overhead

    return IngestResponse(
        job_id=job.job_id,
        content_id=str(content.id),
        status=job.overall_status,
        capabilities=job.capabilities,
        estimated_seconds=estimated,
    )


@router.get("")
async def list_content(
    user: TrainingUser = Depends(get_current_training_user),
):
    """List organization's training content with pipeline status.

    Viewers (trainees) only see content whose pipeline has completed
    (processing_state=READY). Admins and teachers — both staff roles — see
    all content regardless of pipeline state so they can monitor ingest
    progress and retry failures. Any other / future role is treated as a
    trainee and gets the READY-only view (fail-closed).
    """
    query: dict = {"partner_id": user.partner_id}
    if user.role not in ("admin", "teacher"):
        query["processing_state"] = ProcessingState.READY
    items = await Content.find(query).sort("-_id").to_list()
    content_ids = [str(c.id) for c in items]
    jobs = await IngestJob.find(
        {"content_id": {"$in": content_ids}},
    ).sort("-created_at").to_list()
    status_map: dict[str, str] = {}
    for job in jobs:
        if job.content_id not in status_map:
            status_map[job.content_id] = job.overall_status
    # Build chapter count map for warnings
    chapter_count_map: dict[str, int] = {}
    for cid in content_ids:
        vc = await VideoChapters.get_for_content(cid)
        chapter_count_map[cid] = len(vc.chapters) if vc else 0
    return {
        "content": [
            _content_response(c, status_map, chapter_count_map.get(str(c.id)))
            for c in items
        ],
        "total": len(items),
    }


@router.get("/{content_id}")
async def get_content_item(
    content_id: str,
    user: TrainingUser = Depends(get_current_training_user),
):
    """Get a single content item by ID."""
    content = await load_content_for_partner(content_id, user.partner_id, user_role=user.role)
    return _content_response(content)


@router.get("/{content_id}/status")
async def get_content_status(
    content_id: str,
    user: TrainingUser = Depends(get_current_training_user),
):
    """Poll ingest status for a content item.

    Returns the content's processing_state plus a per-stage breakdown from
    the latest IngestJob so the admin UI can render stage + subtask progress
    and surface granular retry affordances.
    """
    content = await load_content_for_partner(content_id, user.partner_id, user_role=user.role)
    job = await IngestJob.find_one(
        {"content_id": content_id}, sort=[("created_at", -1)],
    )
    if not job:
        # No IngestJob row exists. This happens for legacy content created
        # before the pipeline shipped, or for rows where job insertion raced.
        # Derive status from Content.processing_state so a FAILED row does
        # not get misreported as "ready" — the Task 10 retry UI relies on
        # this field to decide whether to show the retry CTA.
        return {
            "content_id": content_id,
            "job_id": None,
            "processing_state": content.processing_state.value,
            "status": (
                "ready"
                if content.processing_state == ProcessingState.READY
                else content.processing_state.value
            ),
            "capabilities": {},
            "stages": [],
            "estimated_seconds": 0,
        }
    return {
        "content_id": content_id,
        "job_id": job.job_id,
        "processing_state": content.processing_state.value,
        "status": job.overall_status,
        "capabilities": job.capabilities,
        "stages": [s.model_dump(mode="json") for s in job.stages],
        "estimated_seconds": 60 + (len(job.capabilities) * 45),
    }



@router.delete("/{content_id}")
async def delete_content(
    content_id: str,
    admin: TrainingUser = Depends(require_training_admin),
):
    """Soft-delete training content (preserves progress records)."""
    content = await load_content_for_partner(content_id, admin.partner_id)
    content.partner_id = None  # type: ignore[assignment]
    await content.save()
    return {"deleted": True, "content_id": content_id}


