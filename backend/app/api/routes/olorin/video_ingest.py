"""
Olorin.ai Video Ingest API

B2B endpoints for video character extraction via TMDB.
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
from app.models.integration_partner import IntegrationPartner
from app.models.vod_interaction import ContentCharacter
from app.services.olorin.metering_service import metering_service
from app.services.vod_interaction.character_extractor import (
    character_extractor_service,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory extraction job tracker (single-instance MVP)
_extraction_jobs: Dict[str, str] = {}


class IngestRequest(BaseModel):
    """Request to ingest a video for character extraction."""

    content_id: str = Field(..., description="Internal content ID or TMDB ID")


class IngestResponse(BaseModel):
    """Response after initiating video ingestion."""

    content_id: str
    status: str = Field(description="processing | completed | failed")
    characters_count: int = 0


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


async def _run_extraction(content_id: str, partner_id: str) -> None:
    """Background task: extract characters and store on Content."""
    try:
        content = await Content.get(PydanticObjectId(content_id))
        if not content:
            _extraction_jobs[content_id] = "failed"
            return

        characters = await character_extractor_service.extract_characters(
            content
        )
        content.interactive_characters = characters
        await content.save()

        await metering_service.record_usage(
            partner_id=partner_id,
            capability="video_ingest",
            metadata={"content_id": content_id, "characters": len(characters)},
        )
        _extraction_jobs[content_id] = "completed"
    except Exception:
        logger.exception(
            "Background extraction failed",
            extra={"content_id": content_id},
        )
        _extraction_jobs[content_id] = "failed"


@router.post(
    "/ingest",
    response_model=IngestResponse,
    summary="Ingest video for character extraction",
)
async def ingest_video(
    request: IngestRequest,
    background_tasks: BackgroundTasks,
    partner: IntegrationPartner = Depends(get_current_partner),
) -> IngestResponse:
    """Submit a video for character extraction. Returns immediately."""
    await verify_capability(partner, "video_ingest")

    content = await Content.get(PydanticObjectId(request.content_id))
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=get_error_message(OlorinErrors.CONTENT_NOT_FOUND),
        )

    existing = getattr(content, "interactive_characters", None)
    if existing:
        return IngestResponse(
            content_id=request.content_id,
            status="completed",
            characters_count=len(existing),
        )

    if _extraction_jobs.get(request.content_id) == "processing":
        return IngestResponse(
            content_id=request.content_id, status="processing"
        )

    _extraction_jobs[request.content_id] = "processing"
    background_tasks.add_task(
        _run_extraction, request.content_id, partner.partner_id
    )
    return IngestResponse(
        content_id=request.content_id, status="processing"
    )


@router.get(
    "/{content_id}/status",
    response_model=IngestResponse,
    summary="Check video ingestion status",
)
async def get_ingest_status(
    content_id: str,
    partner: IntegrationPartner = Depends(get_current_partner),
) -> IngestResponse:
    """Poll for extraction completion."""
    await verify_capability(partner, "video_ingest")

    content = await Content.get(PydanticObjectId(content_id))
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=get_error_message(OlorinErrors.CONTENT_NOT_FOUND),
        )

    existing = getattr(content, "interactive_characters", None)
    if existing:
        return IngestResponse(
            content_id=content_id,
            status="completed",
            characters_count=len(existing),
        )

    job_status = _extraction_jobs.get(content_id, "not_started")
    return IngestResponse(content_id=content_id, status=job_status)


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
        content, "interactive_characters", []
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
