"""
Admin Voice Cloning API Routes

Endpoints for triggering and monitoring per-character voice cloning
from movie audio using subtitle-guided dialogue mapping.
"""

from typing import Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.routes.admin.auth import require_admin
from app.core.logging_config import get_logger
from app.models.content import Content
from app.models.user import User
from app.services.vod_interaction.dialogue_mapper import dialogue_mapper_service
from app.services.vod_interaction.voice_cloner import (
    character_voice_cloner_service,
    find_subtitle_track,
)

logger = get_logger(__name__)

router = APIRouter(prefix="/admin/voice-cloning", tags=["Admin - Voice Cloning"])

_CLONE_JOBS: Dict[str, str] = {}


class CloneVoicesRequest(BaseModel):
    character_names: Optional[List[str]] = Field(
        None, description="Characters to clone (all if omitted)",
    )


class CloneVoicesResponse(BaseModel):
    content_id: str
    status: str


class CloneStatusResponse(BaseModel):
    content_id: str
    job_status: str
    characters: List[Dict] = Field(default_factory=list)


class DialoguePreviewEntry(BaseModel):
    index: int
    start_time: float
    end_time: float
    text: str
    character: str


class DialoguePreviewResponse(BaseModel):
    content_id: str
    total_cues: int
    mapped_cues: int
    characters: Dict[str, int]
    sample: List[DialoguePreviewEntry] = Field(default_factory=list)


async def _run_clone_job(
    content_id: str, character_names: Optional[List[str]],
) -> None:
    """Background task for voice cloning."""
    _CLONE_JOBS[content_id] = "processing"
    try:
        content = await Content.get(ObjectId(content_id))
        if not content:
            _CLONE_JOBS[content_id] = "failed"
            return
        results = await character_voice_cloner_service.clone_character_voices(
            content, character_names,
        )
        has_cloned = any(r.status == "cloned" for r in results.values())
        _CLONE_JOBS[content_id] = "done" if has_cloned else "no_clones"
    except Exception:
        _CLONE_JOBS[content_id] = "failed"
        logger.exception("Voice clone job failed", extra={"content_id": content_id})


@router.post(
    "/content/{content_id}/clone-voices",
    response_model=CloneVoicesResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def clone_voices(
    content_id: str,
    request: CloneVoicesRequest = CloneVoicesRequest(),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: User = Depends(require_admin()),
) -> CloneVoicesResponse:
    """Trigger voice cloning for a content item (background task)."""
    content = await Content.get(ObjectId(content_id))
    if not content:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")
    if not content.interactive_characters:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Content has no interactive characters",
        )
    background_tasks.add_task(_run_clone_job, content_id, request.character_names)
    _CLONE_JOBS[content_id] = "queued"
    return CloneVoicesResponse(content_id=content_id, status="queued")


@router.get("/content/{content_id}/status", response_model=CloneStatusResponse)
async def get_clone_status(
    content_id: str,
    current_user: User = Depends(require_admin()),
) -> CloneStatusResponse:
    """Check voice cloning status for a content item."""
    content = await Content.get(ObjectId(content_id))
    if not content:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")
    chars = [
        {
            "name": c.name, "voice_id": c.voice_id,
            "voice_clone_status": c.voice_clone_status,
            "voice_clone_audio_url": c.voice_clone_audio_url,
            "voice_clone_preview_url": c.voice_clone_preview_url,
        }
        for c in content.interactive_characters
    ]
    return CloneStatusResponse(
        content_id=content_id,
        job_status=_CLONE_JOBS.get(content_id, "unknown"),
        characters=chars,
    )


@router.post("/content/{content_id}/preview", response_model=DialoguePreviewResponse)
async def preview_dialogue_mapping(
    content_id: str,
    current_user: User = Depends(require_admin()),
) -> DialoguePreviewResponse:
    """Dry-run: show which subtitle cues map to which characters."""
    content = await Content.get(ObjectId(content_id))
    if not content:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")
    if not content.interactive_characters:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Content has no interactive characters",
        )
    track = await find_subtitle_track(content_id)
    if not track or not track.cues:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No subtitle track found")
    names = [c.name for c in content.interactive_characters]
    title = content.title or content_id
    cue_map = await dialogue_mapper_service.map_dialogue_to_characters(
        track.cues, names, title,
    )
    char_counts = {name: len(cues) for name, cues in cue_map.items()}
    sample: List[DialoguePreviewEntry] = []
    for char_name, cues in cue_map.items():
        for cue in cues[:3]:
            sample.append(DialoguePreviewEntry(
                index=cue.index, start_time=cue.start_time,
                end_time=cue.end_time, text=cue.text, character=char_name,
            ))
    sample.sort(key=lambda e: e.start_time)
    return DialoguePreviewResponse(
        content_id=content_id, total_cues=len(track.cues),
        mapped_cues=sum(char_counts.values()),
        characters=char_counts, sample=sample[:12],
    )
