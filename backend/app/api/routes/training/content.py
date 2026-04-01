"""Training platform content management routes."""

import logging
from typing import List

from beanie import PydanticObjectId
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.routes.training.dependencies import (
    get_current_training_user,
    require_training_admin,
)
from app.models.chapters import VideoChapters
from app.models.content import Content
from app.models.ingest_job import IngestJob
from app.models.integration_partner import IntegrationPartner
from app.models.training_user import TrainingUser
from app.services.olorin.ingest_orchestrator import create_ingest_job, run_pipeline
from app.utils.video_url_utils import validate_video_url

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/content", tags=["training-content"])

_STATUS_DISPLAY_MAP = {
    "pending": "processing",
    "processing": "enriching",
    "completed": "ready",
    "partial": "ready",
    "failed": "failed",
}


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
    content = Content(
        title=body.title,
        description=body.description,
        stream_url=body.video_url,
        topic_tags=body.tags,
        partner_id=admin.partner_id,
    )
    await content.insert()
    job = await create_ingest_job(
        partner=partner, content=content, video_url=body.video_url,
        capabilities=body.capabilities, direct=True,
    )
    background_tasks.add_task(run_pipeline, job)
    return IngestResponse(
        job_id=job.job_id, content_id=str(content.id),
        status=job.overall_status, capabilities=job.capabilities,
    )


@router.get("")
async def list_content(
    user: TrainingUser = Depends(get_current_training_user),
):
    """List organization's training content with pipeline status."""
    items = await Content.find({"partner_id": user.partner_id}).sort("-_id").to_list()
    content_ids = [str(c.id) for c in items]
    jobs = await IngestJob.find(
        {"content_id": {"$in": content_ids}},
    ).sort("-created_at").to_list()
    status_map: dict[str, str] = {}
    for job in jobs:
        if job.content_id not in status_map:
            status_map[job.content_id] = job.overall_status
    return {
        "content": [
            {
                "content_id": str(c.id),
                "title": c.title,
                "description": c.description or "",
                "tags": c.topic_tags,
                "stream_url": c.stream_url,
                "duration": c.duration,
                "has_subtitles": c.has_subtitles,
                "thumbnail": c.thumbnail or c.poster_url,
                "status": _STATUS_DISPLAY_MAP.get(
                    status_map.get(str(c.id), ""), "ready",
                ),
            }
            for c in items
        ],
        "total": len(items),
    }


@router.get("/{content_id}/status")
async def get_content_status(
    content_id: str,
    user: TrainingUser = Depends(get_current_training_user),
):
    """Poll ingest status for a content item."""
    content = await Content.get(PydanticObjectId(content_id))
    if not content or content.partner_id != user.partner_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")
    job = await IngestJob.find_one({"content_id": content_id}, sort=[("created_at", -1)])
    if not job:
        return {"content_id": content_id, "status": "ready", "capabilities": {}}
    return {
        "content_id": content_id,
        "job_id": job.job_id,
        "status": job.overall_status,
        "capabilities": job.capabilities,
    }


@router.delete("/{content_id}")
async def delete_content(
    content_id: str,
    admin: TrainingUser = Depends(require_training_admin),
):
    """Soft-delete training content (preserves progress records)."""
    content = await Content.get(PydanticObjectId(content_id))
    if not content or content.partner_id != admin.partner_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")
    content.partner_id = None  # type: ignore[assignment]
    await content.save()
    return {"deleted": True, "content_id": content_id}


@router.get("/{content_id}/chapters")
async def get_content_chapters(
    content_id: str,
    user: TrainingUser = Depends(get_current_training_user),
):
    """Get chapters for a training content item."""
    content = await Content.get(PydanticObjectId(content_id))
    if not content or content.partner_id != user.partner_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")
    video_chapters = await VideoChapters.get_for_content(content_id)
    if not video_chapters:
        return {"content_id": content_id, "chapters": []}
    return {
        "content_id": content_id,
        "chapters": [
            {"title": ch.title, "start_time": ch.start_time, "end_time": ch.end_time}
            for ch in video_chapters.chapters
        ],
    }
