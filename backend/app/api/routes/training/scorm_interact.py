"""Public SCORM interaction endpoint — token-authenticated."""

import base64
import json
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.core.ai_clients import get_anthropic_client
from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.content import Content
from app.models.scorm_export import ScormExport
from app.services.olorin.scorm_export.media_generator import (
    _call_elevenlabs_tts,
)
from app.services.olorin.scorm_export.token_service import (
    TokenValidationError,
    increment_token_usage,
    validate_export_token,
)

logger = get_logger(__name__)

router = APIRouter(prefix="/scorm", tags=["scorm-interact"])


class ScormInteractRequest(BaseModel):
    """Live interaction request from SCORM player."""

    token: str
    content_id: str
    character_name: str
    question: str
    context: List[Dict] = Field(default_factory=list)


class ScormInteractResponse(BaseModel):
    """Live interaction response."""

    response_text: str
    audio_base64: Optional[str] = None
    video_url: Optional[str] = None


class ScormHealthResponse(BaseModel):
    """Health check for SCORM player connectivity test."""

    status: str
    token_remaining: int


@router.get("/health", response_model=ScormHealthResponse)
async def scorm_health(
    token: str = Query(..., description="Export token"),
):
    """Health check — validates token and returns remaining quota."""
    try:
        export = await ScormExport.find_one(
            ScormExport.export_token == token
        )
        if not export:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )
        remaining = max(0, export.token_cap - export.token_used)
        return ScormHealthResponse(
            status="ok",
            token_remaining=remaining,
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Health check failed",
        )


@router.post("/interact", response_model=ScormInteractResponse)
async def scorm_interact(req: ScormInteractRequest):
    """
    Live character interaction from a SCORM player.

    Token-authenticated. Generates AI response + TTS audio.
    """
    try:
        export = await validate_export_token(req.token, req.content_id)
    except TokenValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )

    content = await Content.get(export.content_id)
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found",
        )

    character = None
    for c in content.interactive_characters or []:
        if c.name == req.character_name:
            character = c
            break
    if not character:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Character not found",
        )

    context_str = ""
    if req.context:
        context_str = "\n".join(
            f"Viewer: {ex.get('q', '')}\n"
            f"{character.name}: {ex.get('a', '')}"
            for ex in req.context[-5:]
        )

    prompt = (
        f"You are {character.name}. {character.description or ''}\n"
        f"Context: {character.movie_context or ''}\n"
        f"Content: {content.title or ''}\n\n"
    )
    if context_str:
        prompt += f"Previous conversation:\n{context_str}\n\n"
    prompt += (
        f"The viewer asks: {req.question}\n\n"
        f"Respond in character, first person, 2-4 sentences."
    )

    try:
        client = get_anthropic_client()
        response = await client.messages.create(
            model=settings.MOVIE_INTERACTION_AI_MODEL,
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
        response_text = response.content[0].text.strip()
    except Exception:
        logger.exception(
            "SCORM live AI generation failed",
            extra={"character": req.character_name},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI generation failed",
        )

    audio_b64 = None
    audio_bytes = await _call_elevenlabs_tts(
        response_text, character.voice_id
    )
    if audio_bytes:
        audio_b64 = base64.b64encode(audio_bytes).decode("ascii")

    await increment_token_usage(export)

    return ScormInteractResponse(
        response_text=response_text,
        audio_base64=audio_b64,
    )
