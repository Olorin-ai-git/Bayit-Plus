"""
Olorin.ai Video Ingest API

B2B endpoints for orchestrated video ingestion. Accepts a video URL or
existing content ID plus a list of capabilities to run.
"""

import logging
from typing import Dict, List, Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.routes.olorin.dependencies import (
    get_current_partner,
    verify_capability,
)
from app.api.routes.olorin.errors import OlorinErrors, get_error_message
from app.models.content import Content
from app.models.ingest_job import IngestJob
from app.models.integration_partner import IntegrationPartner
from app.models.vod_interaction import ContentCharacter
from app.services.olorin.ingest_orchestrator import (
    create_ingest_job,
    run_pipeline,
)
from app.utils.video_url_utils import extract_video_title, validate_video_url

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class IngestRequest(BaseModel):
    """Request to ingest a video with orchestrated capabilities."""

    video_url: Optional[str] = Field(
        None, description="Video URL (any http/https)",
    )
    content_id: Optional[str] = Field(
        None, description="Existing content document ID",
    )
    title: Optional[str] = Field(
        None, description="Video title hint (used when no TMDB match)",
    )
    capabilities: List[str] = Field(
        default=["characters"],
        description="Capabilities: characters, subtitles, trivia, search, or all",
    )
    direct: bool = Field(
        default=False,
        description="Direct ingest mode: skip TMDB lookup, use transcript-based extraction only",
    )
    description: Optional[str] = Field(
        None, description="Video description (used in direct mode)",
    )
    tags: List[str] = Field(
        default_factory=list,
        description="Content tags (used in direct mode)",
    )


class IngestResponse(BaseModel):
    """Response after initiating video ingestion."""

    job_id: str
    content_id: str
    status: str = Field(description="processing | completed | failed | partial")
    capabilities: Dict[str, str] = Field(
        default_factory=dict,
        description="Per-capability status",
    )


class JobStatusResponse(BaseModel):
    """Detailed job status with per-capability progress."""

    job_id: str
    content_id: str
    video_url: str
    status: str
    capabilities: Dict[str, str]
    created_at: str
    updated_at: str


class CharacterResponse(BaseModel):
    """A single extracted character."""

    name: str
    actor_name: str
    description: str
    movie_context: str
    gender: Optional[str] = None
    frame_url: str = ""
    suggested_questions: List[str] = Field(default_factory=list)


class CharactersListResponse(BaseModel):
    """Response with extracted characters."""

    content_id: str
    characters: List[CharacterResponse]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/ingest",
    response_model=IngestResponse,
    summary="Ingest video with orchestrated capabilities",
)
async def ingest_video(
    request: IngestRequest,
    background_tasks: BackgroundTasks,
    partner: IntegrationPartner = Depends(get_current_partner),
) -> IngestResponse:
    """Submit a video for orchestrated AI processing. Returns immediately."""
    await verify_capability(partner, "video_ingest")

    if not request.video_url and not request.content_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide either video_url or content_id",
        )

    content: Optional[Content] = None
    video_url = request.video_url or ""

    if request.content_id:
        content = await Content.get(PydanticObjectId(request.content_id))
        if not content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=get_error_message(OlorinErrors.CONTENT_NOT_FOUND),
            )
        video_url = video_url or getattr(content, "stream_url", "") or ""

    if request.video_url and not content:
        ok, err = validate_video_url(request.video_url)
        if not ok:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=err,
            )
        title = request.title
        if not title:
            title = await extract_video_title(request.video_url)
        desc = request.description or f"B2B ingest from {partner.partner_id}"
        content = Content(
            title=title or "Untitled",
            description=desc,
            stream_url=request.video_url,
        )
        if request.tags:
            content.topic_tags = request.tags  # type: ignore[attr-defined]
        if request.direct:
            content.partner_id = partner.partner_id  # type: ignore[attr-defined]
        await content.insert()
        video_url = request.video_url

    job = await create_ingest_job(
        partner=partner,
        content=content,
        video_url=video_url,
        capabilities=request.capabilities,
    )

    background_tasks.add_task(run_pipeline, job)

    return IngestResponse(
        job_id=job.job_id,
        content_id=str(content.id),
        status=job.overall_status,
        capabilities=job.capabilities,
    )


@router.get(
    "/jobs/{job_id}/status",
    response_model=JobStatusResponse,
    summary="Check orchestrated ingest job status",
)
async def get_job_status(
    job_id: str,
    partner: IntegrationPartner = Depends(get_current_partner),
) -> JobStatusResponse:
    """Poll for per-capability progress of an ingest job."""
    await verify_capability(partner, "video_ingest")

    job = await IngestJob.find_one(
        IngestJob.job_id == job_id,
        IngestJob.partner_id == partner.partner_id,
    )
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ingest job not found",
        )

    return JobStatusResponse(
        job_id=job.job_id,
        content_id=job.content_id,
        video_url=job.video_url,
        status=job.overall_status,
        capabilities=job.capabilities,
        created_at=job.created_at.isoformat(),
        updated_at=job.updated_at.isoformat(),
    )


@router.get(
    "/{content_id}/status",
    response_model=IngestResponse,
    summary="Check video ingestion status (legacy)",
)
async def get_ingest_status(
    content_id: str,
    partner: IntegrationPartner = Depends(get_current_partner),
) -> IngestResponse:
    """Legacy status endpoint — finds latest job for this content."""
    await verify_capability(partner, "video_ingest")

    job = await IngestJob.find_one(
        IngestJob.content_id == content_id,
        IngestJob.partner_id == partner.partner_id,
        sort=[("created_at", -1)],
    )
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No ingest job found for this content",
        )

    return IngestResponse(
        job_id=job.job_id,
        content_id=content_id,
        status=job.overall_status,
        capabilities=job.capabilities,
    )


@router.get(
    "/{content_id}/characters",
    response_model=CharactersListResponse,
    summary="List extracted characters",
)
async def get_characters(
    content_id: str,
    partner: IntegrationPartner = Depends(get_current_partner),
) -> CharactersListResponse:
    """Get extracted character profiles for a video."""
    await verify_capability(partner, "video_ingest")

    content = await Content.get(PydanticObjectId(content_id))
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=get_error_message(OlorinErrors.CONTENT_NOT_FOUND),
        )

    chars: List[ContentCharacter] = getattr(
        content, "interactive_characters", [],
    ) or []
    if not chars:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=get_error_message(OlorinErrors.CHARACTERS_NOT_READY),
        )

    return CharactersListResponse(
        content_id=content_id,
        characters=[
            CharacterResponse(
                name=c.name,
                actor_name=c.actor_name,
                description=c.description,
                movie_context=c.movie_context,
                gender=c.gender,
                frame_url=c.frame_url,
                suggested_questions=c.suggested_questions,
            )
            for c in chars
        ],
    )
