"""
Subtitle Cues Routes.
Handles cue retrieval with Hebrew mode support, nikud/shoresh generation.
"""

import asyncio
from datetime import datetime
from typing import Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, Request

from app.core.logging_config import get_logger
from app.core.rate_limiter import RATE_LIMITS, limiter
from app.models.ai_generation_job import AIGenerationJob, JobStatus, JobType
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


async def _process_nikud_job(job_id: str, content_id: str, language: str) -> None:
    """Background task to process nikud generation"""
    job = await AIGenerationJob.get(PydanticObjectId(job_id))
    if not job:
        logger.error("Job not found", extra={"job_id": job_id})
        return

    try:
        await job.start_processing()

        tracks = await SubtitleTrackDoc.get_for_content(content_id, language)
        if not tracks:
            await job.fail("Subtitle track not found")
            return

        track = tracks[0]
        texts_to_process = [cue.text for cue in track.cues]

        # Process in batches and update progress
        batch_size = 10
        nikud_texts = []
        for i in range(0, len(texts_to_process), batch_size):
            batch = texts_to_process[i : i + batch_size]
            batch_results = await add_nikud_batch(batch)
            nikud_texts.extend(batch_results)
            await job.update_progress(len(nikud_texts))

        for i, cue in enumerate(track.cues):
            cue.text_nikud = nikud_texts[i]

        track.has_nikud_version = True
        track.nikud_generated_at = datetime.utcnow()
        track.updated_at = datetime.utcnow()
        await track.save()

        await job.complete()
        logger.info(
            "Nikud generated",
            extra={"content_id": content_id, "language": language, "cues_processed": len(track.cues)},
        )

    except Exception as e:
        logger.error("Nikud generation failed", extra={"job_id": job_id, "error": str(e)})
        await job.fail(str(e))


@router.post("/{content_id}/nikud")
@limiter.limit(RATE_LIMITS["subtitle_nikud"])
async def generate_nikud_for_track(
    request: Request,
    background_tasks: BackgroundTasks,
    content_id: str,
    language: str = "he",
    force: bool = False,
) -> dict:
    """
    Start async nikud (vocalization) generation for a subtitle track.
    Returns a job_id to poll for status.
    """
    tracks = await SubtitleTrackDoc.get_for_content(content_id, language)

    if not tracks:
        raise HTTPException(status_code=404, detail="Subtitle track not found")

    track = tracks[0]

    if track.has_nikud_version and not force:
        return {
            "message": "Nikud already generated",
            "status": "completed",
            "content_id": content_id,
            "generated_at": track.nikud_generated_at.isoformat() if track.nikud_generated_at else None,
        }

    # Check for existing active job
    existing_job = await AIGenerationJob.get_active_job(content_id, JobType.NIKUD)
    if existing_job:
        return existing_job.to_response()

    # Create new job
    job = await AIGenerationJob.create_job(
        content_id=content_id,
        job_type=JobType.NIKUD,
        language=language,
        total_cues=len(track.cues),
    )

    # Start background processing
    background_tasks.add_task(_process_nikud_job, str(job.id), content_id, language)

    logger.info(
        "Nikud generation started",
        extra={"content_id": content_id, "job_id": str(job.id), "total_cues": len(track.cues)},
    )

    return job.to_response()


async def _process_shoresh_job(job_id: str, content_id: str, language: str) -> None:
    """Background task to process shoresh generation"""
    job = await AIGenerationJob.get(PydanticObjectId(job_id))
    if not job:
        logger.error("Job not found", extra={"job_id": job_id})
        return

    try:
        await job.start_processing()

        tracks = await SubtitleTrackDoc.get_for_content(content_id, language)
        if not tracks:
            await job.fail("Subtitle track not found")
            return

        track = tracks[0]
        texts_to_process = [cue.text for cue in track.cues]

        # Process in batches and update progress
        batch_size = 10
        shoresh_texts = []
        for i in range(0, len(texts_to_process), batch_size):
            batch = texts_to_process[i : i + batch_size]
            batch_results = await extract_shoresh_batch(batch)
            shoresh_texts.extend(batch_results)
            await job.update_progress(len(shoresh_texts))

        for i, cue in enumerate(track.cues):
            cue.text_shoresh = shoresh_texts[i]

        track.has_shoresh_version = True
        track.shoresh_generated_at = datetime.utcnow()
        track.updated_at = datetime.utcnow()
        await track.save()

        await job.complete()
        logger.info(
            "Shoresh generated",
            extra={"content_id": content_id, "language": language, "cues_processed": len(track.cues)},
        )

    except Exception as e:
        logger.error("Shoresh generation failed", extra={"job_id": job_id, "error": str(e)})
        await job.fail(str(e))


@router.post("/{content_id}/shoresh")
@limiter.limit(RATE_LIMITS["subtitle_shoresh"])
async def generate_shoresh_for_track(
    request: Request,
    background_tasks: BackgroundTasks,
    content_id: str,
    language: str = "he",
    force: bool = False,
) -> dict:
    """
    Start async shoresh (root words) generation for a subtitle track.
    Returns a job_id to poll for status.
    """
    tracks = await SubtitleTrackDoc.get_for_content(content_id, language)

    if not tracks:
        raise HTTPException(status_code=404, detail="Subtitle track not found")

    track = tracks[0]

    if track.has_shoresh_version and not force:
        return {
            "message": "Shoresh already generated",
            "status": "completed",
            "content_id": content_id,
            "generated_at": track.shoresh_generated_at.isoformat() if track.shoresh_generated_at else None,
        }

    # Check for existing active job
    existing_job = await AIGenerationJob.get_active_job(content_id, JobType.SHORESH)
    if existing_job:
        return existing_job.to_response()

    # Create new job
    job = await AIGenerationJob.create_job(
        content_id=content_id,
        job_type=JobType.SHORESH,
        language=language,
        total_cues=len(track.cues),
    )

    # Start background processing
    background_tasks.add_task(_process_shoresh_job, str(job.id), content_id, language)

    logger.info(
        "Shoresh generation started",
        extra={"content_id": content_id, "job_id": str(job.id), "total_cues": len(track.cues)},
    )

    return job.to_response()


@router.get("/job/{job_id}")
async def get_generation_job_status(job_id: str) -> dict:
    """
    Get status of a nikud/shoresh generation job.
    Poll this endpoint to track progress.
    """
    try:
        job = await AIGenerationJob.get(PydanticObjectId(job_id))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid job ID format")

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return job.to_response()


@router.get("/{content_id}/job/active")
async def get_active_generation_jobs(content_id: str) -> dict:
    """
    Get any active generation jobs for content.
    Returns both nikud and shoresh job status if active.
    """
    nikud_job = await AIGenerationJob.get_active_job(content_id, JobType.NIKUD)
    shoresh_job = await AIGenerationJob.get_active_job(content_id, JobType.SHORESH)

    return {
        "content_id": content_id,
        "nikud_job": nikud_job.to_response() if nikud_job else None,
        "shoresh_job": shoresh_job.to_response() if shoresh_job else None,
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
