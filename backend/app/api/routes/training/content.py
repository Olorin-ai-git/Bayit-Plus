"""Training platform content management routes."""

import logging
from typing import List

from beanie import PydanticObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.routes.training.dependencies import (
    get_current_training_user,
    require_training_admin,
)
from app.models.chapters import VideoChapters
from app.models.content import Content, ProcessingState
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
    content = Content(
        title=body.title,
        description=body.description,
        stream_url=body.video_url,
        topic_tags=body.tags,
        partner_id=admin.partner_id,
    )
    # Populate source metadata from oEmbed
    from app.utils.video_url_utils import get_oembed_url
    source_meta: dict[str, str] = {}
    oembed_endpoint = get_oembed_url(body.video_url)
    if oembed_endpoint:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=10.0) as client:
                oembed_resp = await client.get(oembed_endpoint)
                if oembed_resp.status_code == 200:
                    oembed_data = oembed_resp.json()
                    source_meta = {
                        "provider_name": oembed_data.get("provider_name", ""),
                        "original_title": oembed_data.get("title", ""),
                        "author_name": oembed_data.get("author_name", ""),
                    }
        except Exception:
            logger.debug("oEmbed fetch failed for source_metadata", extra={"url": body.video_url})
    if not source_meta.get("provider_name"):
        from urllib.parse import urlparse as _urlparse
        parsed_host = _urlparse(body.video_url).hostname or ""
        source_meta["provider_name"] = "Direct File" if any(
            body.video_url.lower().endswith(ext) for ext in (".mp4", ".webm", ".mov", ".avi", ".mkv")
        ) else parsed_host
    content.source_metadata = source_meta
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


def _parse_duration_seconds(duration_str: str | None) -> int:
    """Parse 'H:MM:SS' or 'M:SS' duration string to total seconds."""
    if not duration_str:
        return 0
    parts = duration_str.split(":")
    try:
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        if len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
    except (ValueError, IndexError):
        pass
    return 0


def _compute_warnings(
    chapter_count: int,
    duration_str: str | None,
) -> list[dict[str, str]]:
    """Compute warning codes based on chapter count and video duration."""
    warnings: list[dict[str, str]] = []
    if chapter_count == 0:
        warnings.append({
            "code": "no_chapters",
            "message": (
                "This video produced no chapter markers. "
                "Chapter-dependent features (chapter navigation, "
                "chapter-locked progression, chapter-boundary quizzes) "
                "will be disabled for trainees."
            ),
        })
    elif chapter_count <= 2:
        duration_s = _parse_duration_seconds(duration_str)
        if duration_s > 600:  # > 10 minutes
            warnings.append({
                "code": "few_chapters",
                "message": (
                    "This video has very few chapter markers. "
                    "Some lesson formats may not work as designed."
                ),
            })
    return warnings


def _content_response(c: Content, status_map: dict[str, str] | None = None, chapter_count: int | None = None) -> dict:
    """Serialize a Content document for the training API."""
    resp = {
        "content_id": str(c.id),
        "title": c.title,
        "description": c.description or "",
        "tags": c.topic_tags,
        "stream_url": c.stream_url,
        "duration": c.duration,
        "has_subtitles": c.has_subtitles,
        "thumbnail": c.thumbnail or c.poster_url,
    }
    if status_map is not None:
        resp["status"] = _STATUS_DISPLAY_MAP.get(
            status_map.get(str(c.id), ""), "ready",
        )
    if chapter_count is not None:
        warnings = _compute_warnings(chapter_count, c.duration)
        if warnings:
            resp["warnings"] = warnings
    if c.source_metadata:
        resp["source_metadata"] = c.source_metadata
    return resp


@router.get("/{content_id}")
async def get_content_item(
    content_id: str,
    user: TrainingUser = Depends(get_current_training_user),
):
    """Get a single content item by ID."""
    content = await Content.get(content_id)
    if not content or content.partner_id != user.partner_id:
        raise HTTPException(status_code=404, detail="Content not found")
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
    try:
        content_oid = PydanticObjectId(content_id)
    except (InvalidId, TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Content not found",
        )
    content = await Content.get(content_oid)
    if not content or content.partner_id != user.partner_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Content not found",
        )
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


@router.post("/{content_id}/retry", status_code=status.HTTP_202_ACCEPTED)
async def retry_content_ingest(
    content_id: str,
    background_tasks: BackgroundTasks,
    admin: TrainingUser = Depends(require_training_admin),
):
    """Re-run the AI pipeline on a failed content item."""
    content = await Content.get(PydanticObjectId(content_id))
    if not content or content.partner_id != admin.partner_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")
    partner = await IntegrationPartner.find_one({"partner_id": admin.partner_id})
    if not partner:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    job = await create_ingest_job(
        partner=partner,
        content=content,
        video_url=content.stream_url,
        capabilities=["characters", "subtitles"],
        direct=True,
    )
    background_tasks.add_task(run_pipeline, job)
    return {"job_id": job.job_id, "content_id": content_id, "status": job.overall_status}


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


@router.get("/{content_id}/characters")
async def get_content_characters(
    content_id: str,
    user: TrainingUser = Depends(get_current_training_user),
):
    """Get extracted characters/speakers for a content item."""
    content = await Content.get(content_id)
    if not content or content.partner_id != user.partner_id:
        raise HTTPException(status_code=404, detail="Content not found")

    characters = content.interactive_characters or []
    return {
        "characters": [
            _serialize_character(i, c) for i, c in enumerate(characters)
        ]
    }


def _serialize_character(idx: int, c) -> dict:
    """Serialize a character from Content.interactive_characters."""
    if isinstance(c, dict):
        return {"id": str(idx), "name": c.get("name", ""), "role": c.get("role", "")}
    return {"id": str(idx), "name": getattr(c, "name", ""), "role": getattr(c, "role", "")}
