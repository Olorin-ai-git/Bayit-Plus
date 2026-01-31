"""
Subtitle Cues Routes.
Handles cue retrieval with Hebrew mode support, nikud/shoresh generation.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Request

from app.core.logging_config import get_logger
from app.core.rate_limiter import RATE_LIMITS, limiter
from app.models.subtitles import SubtitleTrackDoc
from app.services.nikud_service import add_nikud, add_nikud_batch, get_cache_stats
from app.services.shoresh_service import extract_shoresh_batch
from app.services.subtitle_service import extract_words, format_time

router = APIRouter(prefix="/subtitles", tags=["subtitles"])
logger = get_logger(__name__)


@router.get("/{content_id}/cues")
async def get_subtitle_cues(
    content_id: str,
    language: str = "he",
    hebrew_mode: str = Query("regular", description="Hebrew display mode: regular, nikud, or shoresh"),
    with_nikud: bool = False,
    start_time: Optional[float] = None,
    end_time: Optional[float] = None,
) -> dict:
    """
    Get subtitle cues for content with Hebrew mode support.

    Args:
        content_id: Content identifier
        language: Language code (default: "he")
        hebrew_mode: Display mode for Hebrew - "regular", "nikud", or "shoresh"
        with_nikud: (Deprecated) Use hebrew_mode="nikud" instead
        start_time: Optional start time filter (seconds)
        end_time: Optional end time filter (seconds)

    Returns subtitle cues with appropriate text field based on hebrew_mode.
    """
    tracks = await SubtitleTrackDoc.get_for_content(content_id, language)

    if not tracks:
        raise HTTPException(status_code=404, detail="Subtitle track not found")

    track = tracks[0]
    cues = track.cues

    # Filter by time range if specified
    if start_time is not None or end_time is not None:
        filtered_cues = []
        for cue in cues:
            if start_time is not None and cue.end_time < start_time:
                continue
            if end_time is not None and cue.start_time > end_time:
                continue
            filtered_cues.append(cue)
        cues = filtered_cues

    # Backward compatibility: with_nikud overrides hebrew_mode
    if with_nikud:
        hebrew_mode = "nikud"

    # Format cues for response
    result_cues = []
    for cue in cues:
        # Determine text based on hebrew_mode
        if hebrew_mode == "nikud" and cue.text_nikud:
            display_text = cue.text_nikud
        elif hebrew_mode == "shoresh" and cue.text_shoresh:
            display_text = cue.text_shoresh
        else:
            display_text = cue.text

        result_cues.append(
            {
                "index": cue.index,
                "start_time": cue.start_time,
                "end_time": cue.end_time,
                "text": display_text,
                "text_nikud": cue.text_nikud,
                "text_shoresh": cue.text_shoresh,
                "formatted_start": format_time(cue.start_time),
                "formatted_end": format_time(cue.end_time),
                "words": extract_words(display_text),
            }
        )

    return {
        "content_id": content_id,
        "language": track.language,
        "language_name": track.language_name,
        "has_nikud": track.has_nikud_version,
        "has_shoresh": track.has_shoresh_version,
        "hebrew_mode": hebrew_mode,
        "cues": result_cues,
    }


@router.post("/{content_id}/nikud")
@limiter.limit(RATE_LIMITS["subtitle_nikud"])
async def generate_nikud_for_track(
    request: Request,
    content_id: str,
    language: str = "he",
    force: bool = False,
) -> dict:
    """
    Generate nikud (vocalization) for a subtitle track.
    Uses Claude AI to add Hebrew vowel marks.
    """
    tracks = await SubtitleTrackDoc.get_for_content(content_id, language)

    if not tracks:
        raise HTTPException(status_code=404, detail="Subtitle track not found")

    track = tracks[0]

    if track.has_nikud_version and not force:
        return {
            "message": "Nikud already generated",
            "content_id": content_id,
            "generated_at": track.nikud_generated_at,
        }

    texts_to_process = [cue.text for cue in track.cues]
    nikud_texts = await add_nikud_batch(texts_to_process)

    for i, cue in enumerate(track.cues):
        cue.text_nikud = nikud_texts[i]

    track.has_nikud_version = True
    track.nikud_generated_at = datetime.utcnow()
    track.updated_at = datetime.utcnow()
    await track.save()

    logger.info(
        "Nikud generated",
        extra={
            "content_id": content_id,
            "language": language,
            "cues_processed": len(track.cues),
        },
    )

    return {
        "message": "Nikud generated successfully",
        "content_id": content_id,
        "cues_processed": len(track.cues),
        "generated_at": track.nikud_generated_at,
    }


@router.post("/{content_id}/shoresh")
@limiter.limit(RATE_LIMITS["subtitle_shoresh"])
async def generate_shoresh_for_track(
    request: Request,
    content_id: str,
    language: str = "he",
    force: bool = False,
) -> dict:
    """
    Generate shoresh (root words) for a subtitle track.
    Uses Claude AI to extract Hebrew root words.
    Format: "word [root]" for each word.
    """
    tracks = await SubtitleTrackDoc.get_for_content(content_id, language)

    if not tracks:
        raise HTTPException(status_code=404, detail="Subtitle track not found")

    track = tracks[0]

    if track.has_shoresh_version and not force:
        return {
            "message": "Shoresh already generated",
            "content_id": content_id,
            "generated_at": track.shoresh_generated_at,
        }

    texts_to_process = [cue.text for cue in track.cues]
    shoresh_texts = await extract_shoresh_batch(texts_to_process)

    for i, cue in enumerate(track.cues):
        cue.text_shoresh = shoresh_texts[i]

    track.has_shoresh_version = True
    track.shoresh_generated_at = datetime.utcnow()
    track.updated_at = datetime.utcnow()
    await track.save()

    logger.info(
        "Shoresh generated",
        extra={
            "content_id": content_id,
            "language": language,
            "cues_processed": len(track.cues),
        },
    )

    return {
        "message": "Shoresh generated successfully",
        "content_id": content_id,
        "cues_processed": len(track.cues),
        "generated_at": track.shoresh_generated_at,
    }


@router.post("/nikud/text")
@limiter.limit(RATE_LIMITS["subtitle_nikud"])
async def add_nikud_to_text(
    request: Request,
    text: str,
) -> dict:
    """
    Add nikud (vocalization marks) to arbitrary Hebrew text.
    Useful for on-the-fly nikud generation.
    """
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Text is required")

    nikud_text = await add_nikud(text)

    return {
        "original": text,
        "with_nikud": nikud_text,
    }


@router.get("/cache/stats")
async def get_subtitle_cache_stats() -> dict:
    """Get cache statistics for nikud and shoresh services"""
    from app.services.shoresh_service import get_cache_stats as get_shoresh_stats

    nikud_stats = get_cache_stats()
    shoresh_stats = get_shoresh_stats()

    return {
        "nikud": nikud_stats,
        "shoresh": shoresh_stats,
    }
