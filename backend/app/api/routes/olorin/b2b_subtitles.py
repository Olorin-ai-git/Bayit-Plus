"""
Olorin.ai AI Subtitles B2B API

REST endpoint for generating multi-language subtitle tracks from content.
Wraps the Whisper STT + translation pipeline as a batch job.
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
from app.api.routes.olorin.webhooks import send_webhook_event
from app.models.content import Content
from app.models.integration_partner import IntegrationPartner
from app.services.olorin.metering_service import metering_service

logger = logging.getLogger(__name__)

router = APIRouter()

SUPPORTED_LANGUAGES = {"en", "he", "es", "zh", "fr", "it", "hi", "ta", "bn", "ja"}

# In-memory job tracker (single-instance MVP)
_subtitle_jobs: Dict[str, Dict] = {}


class SubtitleGenerateRequest(BaseModel):
    """Request to generate subtitle tracks."""

    content_id: str = Field(..., description="Content ID to generate subtitles for")
    languages: List[str] = Field(
        default=["en", "he", "es"],
        description="Target language codes",
        max_length=10,
    )
    source_language: str = Field(default="he", description="Source audio language")


class SubtitleTrack(BaseModel):
    """A single subtitle track."""

    language: str
    status: str = Field(description="ready | processing | failed")
    cue_count: int = 0


class SubtitleGenerateResponse(BaseModel):
    """Response with subtitle generation status."""

    content_id: str
    status: str = Field(description="processing | completed | partial | failed")
    tracks: List[SubtitleTrack] = Field(default_factory=list)


async def _run_subtitle_generation(
    content_id: str, languages: List[str], source_lang: str, partner_id: str,
) -> None:
    """Background task: transcribe + translate content audio."""
    from app.services.live_translation.service import LiveTranslationService
    from app.services.whisper_transcription_service import (
        whisper_transcription_service,
    )

    job = _subtitle_jobs.setdefault(content_id, {"status": "processing", "tracks": {}})

    try:
        content = await Content.get(PydanticObjectId(content_id))
        if not content:
            job["status"] = "failed"
            return

        # Get audio URL from content (stream_url or vod URL)
        audio_url = getattr(content, "stream_url", None) or getattr(
            content, "vod_url", None
        )
        if not audio_url:
            job["status"] = "failed"
            logger.error(
                "No audio source for content",
                extra={"content_id": content_id},
            )
            return

        # Transcribe source audio
        transcript_text, detected_lang = (
            await whisper_transcription_service.transcribe_audio_file(audio_url)
        )
        if not transcript_text:
            job["status"] = "failed"
            return

        # Translate to each target language
        translation_service = LiveTranslationService()
        for lang in languages:
            if lang not in SUPPORTED_LANGUAGES:
                job["tracks"][lang] = {"status": "failed", "cue_count": 0}
                continue
            try:
                if lang == (detected_lang or source_lang):
                    # Source language -- use transcript directly
                    job["tracks"][lang] = {"status": "ready", "cue_count": 1}
                    continue

                translated = await translation_service.translate_text(
                    transcript_text, detected_lang or source_lang, lang,
                )
                if translated:
                    job["tracks"][lang] = {"status": "ready", "cue_count": 1}
                else:
                    job["tracks"][lang] = {"status": "failed", "cue_count": 0}
            except Exception:
                logger.exception(
                    "Translation failed",
                    extra={"content_id": content_id, "target_lang": lang},
                )
                job["tracks"][lang] = {"status": "failed", "cue_count": 0}

        ready = sum(1 for t in job["tracks"].values() if t["status"] == "ready")
        if ready == len(languages):
            job["status"] = "completed"
        elif ready > 0:
            job["status"] = "partial"
        else:
            job["status"] = "failed"

        await metering_service.record_usage(
            partner_id=partner_id,
            capability="subtitles",
            metadata={
                "content_id": content_id,
                "languages": languages,
                "tracks_ready": ready,
            },
        )

        partner_doc = await IntegrationPartner.find_one(
            IntegrationPartner.partner_id == partner_id,
        )
        if partner_doc:
            await send_webhook_event(partner_doc, "translation.completed", {
                "capability": "subtitles",
                "content_id": content_id,
                "languages": languages,
            })
    except Exception as e:
        logger.exception(
            "Subtitle generation failed",
            extra={"content_id": content_id},
        )
        job["status"] = "failed"

        partner_doc = await IntegrationPartner.find_one(
            IntegrationPartner.partner_id == partner_id,
        )
        if partner_doc:
            await send_webhook_event(partner_doc, "error.occurred", {
                "capability": "subtitles",
                "content_id": content_id,
                "error": str(e),
            })


@router.post(
    "/generate",
    response_model=SubtitleGenerateResponse,
    summary="Generate multi-language subtitle tracks",
)
async def generate_subtitles(
    request: SubtitleGenerateRequest,
    background_tasks: BackgroundTasks,
    partner: IntegrationPartner = Depends(get_current_partner),
) -> SubtitleGenerateResponse:
    """Submit content for subtitle generation. Returns immediately."""
    await verify_capability(partner, "subtitles")

    invalid = set(request.languages) - SUPPORTED_LANGUAGES
    if invalid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported languages: {', '.join(sorted(invalid))}",
        )

    content = await Content.get(PydanticObjectId(request.content_id))
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=get_error_message(OlorinErrors.CONTENT_NOT_FOUND),
        )

    existing_job = _subtitle_jobs.get(request.content_id)
    if existing_job and existing_job["status"] == "processing":
        return SubtitleGenerateResponse(
            content_id=request.content_id,
            status="processing",
            tracks=[
                SubtitleTrack(language=lang, status="processing")
                for lang in request.languages
            ],
        )

    _subtitle_jobs[request.content_id] = {"status": "processing", "tracks": {}}
    background_tasks.add_task(
        _run_subtitle_generation,
        request.content_id,
        request.languages,
        request.source_language,
        partner.partner_id,
    )

    return SubtitleGenerateResponse(
        content_id=request.content_id,
        status="processing",
        tracks=[
            SubtitleTrack(language=lang, status="processing")
            for lang in request.languages
        ],
    )


@router.get(
    "/{content_id}/status",
    response_model=SubtitleGenerateResponse,
    summary="Check subtitle generation status",
)
async def get_subtitle_status(
    content_id: str,
    partner: IntegrationPartner = Depends(get_current_partner),
) -> SubtitleGenerateResponse:
    """Poll for subtitle generation completion."""
    await verify_capability(partner, "subtitles")

    job = _subtitle_jobs.get(content_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No subtitle generation job found for this content",
        )

    tracks = [
        SubtitleTrack(
            language=lang,
            status=info.get("status", "processing"),
            cue_count=info.get("cue_count", 0),
        )
        for lang, info in job.get("tracks", {}).items()
    ]

    return SubtitleGenerateResponse(
        content_id=content_id, status=job["status"], tracks=tracks,
    )
