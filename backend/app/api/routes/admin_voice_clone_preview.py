"""
Admin Voice Clone Preview API Routes

Endpoint for generating lip-synced preview clips that verify
cloned voice + character face combinations before production use.
"""

from typing import Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.routes.admin.auth import require_admin
from app.core.logging_config import get_logger
from app.models.content import Content
from app.models.user import User
from app.services.vod_interaction.voice_clone_preview import (
    voice_clone_preview_service,
)

logger = get_logger(__name__)

router = APIRouter(
    prefix="/admin/voice-cloning",
    tags=["Admin - Voice Clone Preview"],
)


class GeneratePreviewRequest(BaseModel):
    character_names: Optional[List[str]] = Field(
        None, description="Characters to preview (all cloned if omitted)",
    )


class CharacterPreviewResult(BaseModel):
    character_name: str
    status: str
    preview_url: Optional[str] = None
    sample_line: Optional[str] = None
    error: Optional[str] = None


class GeneratePreviewResponse(BaseModel):
    content_id: str
    results: List[CharacterPreviewResult] = Field(default_factory=list)


@router.post(
    "/content/{content_id}/generate-preview",
    response_model=GeneratePreviewResponse,
)
async def generate_lipsync_preview(
    content_id: str,
    request: GeneratePreviewRequest = GeneratePreviewRequest(),
    current_user: User = Depends(require_admin()),
) -> GeneratePreviewResponse:
    """Generate lip-synced preview clips for cloned characters."""
    content = await Content.get(ObjectId(content_id))
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Content not found",
        )
    if not content.interactive_characters:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Content has no interactive characters",
        )
    cloned = [
        c for c in content.interactive_characters
        if c.voice_clone_status == "cloned"
    ]
    if not cloned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No cloned characters found",
        )
    results = await voice_clone_preview_service.generate_preview(
        content, request.character_names,
    )
    return GeneratePreviewResponse(
        content_id=content_id,
        results=[
            CharacterPreviewResult(
                character_name=r.character_name,
                status=r.status,
                preview_url=r.preview_url,
                sample_line=r.sample_line,
                error=r.error,
            )
            for r in results.values()
        ],
    )
