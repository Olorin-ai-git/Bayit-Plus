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
from app.services.heblish_service import convert_to_heblish_batch
from app.services.grammar_flip_service import convert_to_grammar_flip_batch
from app.services.slang_synthesis_service import convert_to_slang_synthesis_batch
from app.services.subtitle_service import extract_words, format_time

router = APIRouter(prefix="/subtitles", tags=["subtitles"])
logger = get_logger(__name__)


@router.get("/{content_id}/cues")
async def get_subtitle_cues(
    content_id: str,
    language: str = "he",
    hebrew_mode: str = Query("regular", description="Hebrew display mode: regular, nikud, or shoresh"),
    english_mode: str = Query("regular", description="English display mode: regular, heblish, grammarFlip, or slangSynthesis"),
    with_nikud: bool = False,
    start_time: Optional[float] = None,
    end_time: Optional[float] = None,
) -> dict:
    """
    Get subtitle cues for content with Hebrew and English mode support.

    Args:
        content_id: Content identifier
        language: Language code (default: "he")
        hebrew_mode: Display mode for Hebrew - "regular", "nikud", or "shoresh"
        english_mode: Display mode for English - "regular" or "heblish"
        with_nikud: (Deprecated) Use hebrew_mode="nikud" instead
        start_time: Optional start time filter (seconds)
        end_time: Optional end time filter (seconds)

    Returns subtitle cues with appropriate text field based on language mode.
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
        # Determine text based on language and mode
        if language == "en":
            if english_mode == "heblish" and cue.text_heblish:
                display_text = cue.text_heblish
            elif english_mode == "grammarFlip" and cue.text_grammar_flip:
                display_text = cue.text_grammar_flip
            elif english_mode == "slangSynthesis" and cue.text_slang_synthesis:
                display_text = cue.text_slang_synthesis
            else:
                display_text = cue.text
        elif language == "he":
            if hebrew_mode == "nikud" and cue.text_nikud:
                display_text = cue.text_nikud
            elif hebrew_mode == "shoresh" and cue.text_shoresh:
                display_text = cue.text_shoresh
            else:
                display_text = cue.text
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
                "text_heblish": cue.text_heblish,
                "text_grammar_flip": cue.text_grammar_flip,
                "text_slang_synthesis": cue.text_slang_synthesis,
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
        "has_heblish": track.has_heblish_version,
        "has_grammar_flip": track.has_grammar_flip_version,
        "has_slang_synthesis": track.has_slang_synthesis_version,
        "hebrew_mode": hebrew_mode,
        "english_mode": english_mode,
        "cues": result_cues,
    }


async def _process_nikud_job(job_id: str, content_id: str, language: str) -> None:
    """Background task to process nikud generation with resume support"""
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

        # Resume support: find cues that still need processing
        cues_to_process = [(i, cue) for i, cue in enumerate(track.cues) if not cue.text_nikud]
        already_processed = len(track.cues) - len(cues_to_process)

        if already_processed > 0:
            logger.info(
                "Resuming nikud generation",
                extra={"content_id": content_id, "already_processed": already_processed, "remaining": len(cues_to_process)},
            )
            await job.update_progress(already_processed)

        # Process remaining cues in batches
        batch_size = 10
        processed_count = already_processed
        for batch_start in range(0, len(cues_to_process), batch_size):
            batch_items = cues_to_process[batch_start : batch_start + batch_size]
            batch_texts = [cue.text for _, cue in batch_items]
            batch_results = await add_nikud_batch(batch_texts)

            # Update cues with nikud
            for (idx, cue), nikud_text in zip(batch_items, batch_results):
                track.cues[idx].text_nikud = nikud_text

            processed_count += len(batch_items)
            await job.update_progress(processed_count)

            # Save progress periodically (every 50 cues) for resume capability
            if processed_count % 50 == 0:
                track.updated_at = datetime.utcnow()
                await track.save()

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
        # Save partial progress before marking as failed
        try:
            tracks = await SubtitleTrackDoc.get_for_content(content_id, language)
            if tracks:
                tracks[0].updated_at = datetime.utcnow()
                await tracks[0].save()
                logger.info("Partial nikud progress saved for resume", extra={"content_id": content_id})
        except Exception:
            pass
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
    """Background task to process shoresh generation with resume support"""
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

        # Resume support: find cues that still need processing
        cues_to_process = [(i, cue) for i, cue in enumerate(track.cues) if not cue.text_shoresh]
        already_processed = len(track.cues) - len(cues_to_process)

        if already_processed > 0:
            logger.info(
                "Resuming shoresh generation",
                extra={"content_id": content_id, "already_processed": already_processed, "remaining": len(cues_to_process)},
            )
            await job.update_progress(already_processed)

        # Process remaining cues in batches
        batch_size = 10
        processed_count = already_processed
        for batch_start in range(0, len(cues_to_process), batch_size):
            batch_items = cues_to_process[batch_start : batch_start + batch_size]
            batch_texts = [cue.text for _, cue in batch_items]
            batch_results = await extract_shoresh_batch(batch_texts)

            # Update cues with shoresh
            for (idx, cue), shoresh_text in zip(batch_items, batch_results):
                track.cues[idx].text_shoresh = shoresh_text

            processed_count += len(batch_items)
            await job.update_progress(processed_count)

            # Save progress periodically (every 50 cues) for resume capability
            if processed_count % 50 == 0:
                track.updated_at = datetime.utcnow()
                await track.save()

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
        # Save partial progress before marking as failed
        try:
            tracks = await SubtitleTrackDoc.get_for_content(content_id, language)
            if tracks:
                tracks[0].updated_at = datetime.utcnow()
                await tracks[0].save()
                logger.info("Partial shoresh progress saved for resume", extra={"content_id": content_id})
        except Exception:
            pass
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


async def _process_heblish_job(job_id: str, content_id: str, language: str) -> None:
    """Background task to process heblish generation with resume support"""
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

        # Resume support: find cues that still need processing
        cues_to_process = [(i, cue) for i, cue in enumerate(track.cues) if not cue.text_heblish]
        already_processed = len(track.cues) - len(cues_to_process)

        if already_processed > 0:
            logger.info(
                "Resuming heblish generation",
                extra={"content_id": content_id, "already_processed": already_processed, "remaining": len(cues_to_process)},
            )
            await job.update_progress(already_processed)

        # Process remaining cues in batches
        batch_size = 10
        processed_count = already_processed
        for batch_start in range(0, len(cues_to_process), batch_size):
            batch_items = cues_to_process[batch_start : batch_start + batch_size]
            batch_texts = [cue.text for _, cue in batch_items]
            batch_results = await convert_to_heblish_batch(batch_texts)

            # Update cues with heblish
            for (idx, cue), heblish_text in zip(batch_items, batch_results):
                track.cues[idx].text_heblish = heblish_text

            processed_count += len(batch_items)
            await job.update_progress(processed_count)

            # Save progress periodically (every 50 cues) for resume capability
            if processed_count % 50 == 0:
                track.updated_at = datetime.utcnow()
                await track.save()

        track.has_heblish_version = True
        track.heblish_generated_at = datetime.utcnow()
        track.updated_at = datetime.utcnow()
        await track.save()

        await job.complete()
        logger.info(
            "Heblish generated",
            extra={"content_id": content_id, "language": language, "cues_processed": len(track.cues)},
        )

    except Exception as e:
        logger.error("Heblish generation failed", extra={"job_id": job_id, "error": str(e)})
        # Save partial progress before marking as failed
        try:
            tracks = await SubtitleTrackDoc.get_for_content(content_id, language)
            if tracks:
                tracks[0].updated_at = datetime.utcnow()
                await tracks[0].save()
                logger.info("Partial heblish progress saved for resume", extra={"content_id": content_id})
        except Exception:
            pass
        await job.fail(str(e))


@router.post("/{content_id}/heblish")
@limiter.limit(RATE_LIMITS["subtitle_heblish"])
async def generate_heblish_for_track(
    request: Request,
    background_tasks: BackgroundTasks,
    content_id: str,
    language: str = "en",
    force: bool = False,
) -> dict:
    """
    Start async heblish (English with Hebrew injections) generation for a subtitle track.
    Returns a job_id to poll for status.

    Heblish converts English text to a synthesis with Hebrew word injections,
    enabling language learning "by osmosis" and creating an authentic Israeli experience.

    Example: "Hello friends!" -> "Shalom chaverim!"
    """
    tracks = await SubtitleTrackDoc.get_for_content(content_id, language)

    if not tracks:
        raise HTTPException(status_code=404, detail="Subtitle track not found")

    track = tracks[0]

    if track.has_heblish_version and not force:
        return {
            "message": "Heblish already generated",
            "status": "completed",
            "content_id": content_id,
            "generated_at": track.heblish_generated_at.isoformat() if track.heblish_generated_at else None,
        }

    # Check for existing active job
    existing_job = await AIGenerationJob.get_active_job(content_id, JobType.HEBLISH)
    if existing_job:
        return existing_job.to_response()

    # Create new job
    job = await AIGenerationJob.create_job(
        content_id=content_id,
        job_type=JobType.HEBLISH,
        language=language,
        total_cues=len(track.cues),
    )

    # Start background processing
    background_tasks.add_task(_process_heblish_job, str(job.id), content_id, language)

    logger.info(
        "Heblish generation started",
        extra={"content_id": content_id, "job_id": str(job.id), "total_cues": len(track.cues)},
    )

    return job.to_response()


async def _process_grammar_flip_job(job_id: str, content_id: str, language: str) -> None:
    """Background task to process grammar-flip generation with resume support"""
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

        # Resume support: find cues that still need processing
        cues_to_process = [(i, cue) for i, cue in enumerate(track.cues) if not cue.text_grammar_flip]
        already_processed = len(track.cues) - len(cues_to_process)

        if already_processed > 0:
            logger.info(
                "Resuming grammar-flip generation",
                extra={"content_id": content_id, "already_processed": already_processed, "remaining": len(cues_to_process)},
            )
            await job.update_progress(already_processed)

        # Process remaining cues in batches
        batch_size = 10
        processed_count = already_processed
        for batch_start in range(0, len(cues_to_process), batch_size):
            batch_items = cues_to_process[batch_start : batch_start + batch_size]
            batch_texts = [cue.text for _, cue in batch_items]
            batch_results = await convert_to_grammar_flip_batch(batch_texts)

            # Update cues with grammar-flip
            for (idx, cue), grammar_flip_text in zip(batch_items, batch_results):
                track.cues[idx].text_grammar_flip = grammar_flip_text

            processed_count += len(batch_items)
            await job.update_progress(processed_count)

            # Save progress periodically (every 50 cues) for resume capability
            if processed_count % 50 == 0:
                track.updated_at = datetime.utcnow()
                await track.save()

        track.has_grammar_flip_version = True
        track.grammar_flip_generated_at = datetime.utcnow()
        track.updated_at = datetime.utcnow()
        await track.save()

        await job.complete()
        logger.info(
            "Grammar-flip generated",
            extra={"content_id": content_id, "language": language, "cues_processed": len(track.cues)},
        )

    except Exception as e:
        logger.error("Grammar-flip generation failed", extra={"job_id": job_id, "error": str(e)})
        # Save partial progress before marking as failed
        try:
            tracks = await SubtitleTrackDoc.get_for_content(content_id, language)
            if tracks:
                tracks[0].updated_at = datetime.utcnow()
                await tracks[0].save()
                logger.info("Partial grammar-flip progress saved for resume", extra={"content_id": content_id})
        except Exception:
            pass
        await job.fail(str(e))


@router.post("/{content_id}/grammar-flip")
@limiter.limit(RATE_LIMITS["subtitle_grammar_flip"])
async def generate_grammar_flip_for_track(
    request: Request,
    background_tasks: BackgroundTasks,
    content_id: str,
    language: str = "en",
    force: bool = False,
) -> dict:
    """
    Start async Grammar-Flip generation for a subtitle track.
    Returns a job_id to poll for status.

    Grammar-Flip uses Hebrew vocabulary with English sentence structure (SVO),
    helping Hebrew speakers understand English word order.

    Example: "The boy ate the apple." -> "The yeled (boy) achal (ate) the tapuach (apple)."
    """
    tracks = await SubtitleTrackDoc.get_for_content(content_id, language)

    if not tracks:
        raise HTTPException(status_code=404, detail="Subtitle track not found")

    track = tracks[0]

    if track.has_grammar_flip_version and not force:
        return {
            "message": "Grammar-flip already generated",
            "status": "completed",
            "content_id": content_id,
            "generated_at": track.grammar_flip_generated_at.isoformat() if track.grammar_flip_generated_at else None,
        }

    # Check for existing active job
    existing_job = await AIGenerationJob.get_active_job(content_id, JobType.GRAMMAR_FLIP)
    if existing_job:
        return existing_job.to_response()

    # Create new job
    job = await AIGenerationJob.create_job(
        content_id=content_id,
        job_type=JobType.GRAMMAR_FLIP,
        language=language,
        total_cues=len(track.cues),
    )

    # Start background processing
    background_tasks.add_task(_process_grammar_flip_job, str(job.id), content_id, language)

    logger.info(
        "Grammar-flip generation started",
        extra={"content_id": content_id, "job_id": str(job.id), "total_cues": len(track.cues)},
    )

    return job.to_response()


async def _process_slang_synthesis_job(job_id: str, content_id: str, language: str) -> None:
    """Background task to process slang-synthesis generation with resume support"""
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

        # Resume support: find cues that still need processing
        cues_to_process = [(i, cue) for i, cue in enumerate(track.cues) if not cue.text_slang_synthesis]
        already_processed = len(track.cues) - len(cues_to_process)

        if already_processed > 0:
            logger.info(
                "Resuming slang-synthesis generation",
                extra={"content_id": content_id, "already_processed": already_processed, "remaining": len(cues_to_process)},
            )
            await job.update_progress(already_processed)

        # Process remaining cues in batches
        batch_size = 10
        processed_count = already_processed
        for batch_start in range(0, len(cues_to_process), batch_size):
            batch_items = cues_to_process[batch_start : batch_start + batch_size]
            batch_texts = [cue.text for _, cue in batch_items]
            batch_results = await convert_to_slang_synthesis_batch(batch_texts)

            # Update cues with slang-synthesis
            for (idx, cue), slang_text in zip(batch_items, batch_results):
                track.cues[idx].text_slang_synthesis = slang_text

            processed_count += len(batch_items)
            await job.update_progress(processed_count)

            # Save progress periodically (every 50 cues) for resume capability
            if processed_count % 50 == 0:
                track.updated_at = datetime.utcnow()
                await track.save()

        track.has_slang_synthesis_version = True
        track.slang_synthesis_generated_at = datetime.utcnow()
        track.updated_at = datetime.utcnow()
        await track.save()

        await job.complete()
        logger.info(
            "Slang-synthesis generated",
            extra={"content_id": content_id, "language": language, "cues_processed": len(track.cues)},
        )

    except Exception as e:
        logger.error("Slang-synthesis generation failed", extra={"job_id": job_id, "error": str(e)})
        # Save partial progress before marking as failed
        try:
            tracks = await SubtitleTrackDoc.get_for_content(content_id, language)
            if tracks:
                tracks[0].updated_at = datetime.utcnow()
                await tracks[0].save()
                logger.info("Partial slang-synthesis progress saved for resume", extra={"content_id": content_id})
        except Exception:
            pass
        await job.fail(str(e))


@router.post("/{content_id}/slang-synthesis")
@limiter.limit(RATE_LIMITS["subtitle_slang_synthesis"])
async def generate_slang_synthesis_for_track(
    request: Request,
    background_tasks: BackgroundTasks,
    content_id: str,
    language: str = "en",
    force: bool = False,
) -> dict:
    """
    Start async Slang Synthesis generation for a subtitle track.
    Returns a job_id to poll for status.

    Slang Synthesis blends modern Israeli and American slang for engaging content.
    Prevents language learning from feeling like "schoolwork."

    Example: "That show was terrible but the ending was great!"
          -> "That show was totally al hapane (terrible) but the ending was esh (fire)!"
    """
    tracks = await SubtitleTrackDoc.get_for_content(content_id, language)

    if not tracks:
        raise HTTPException(status_code=404, detail="Subtitle track not found")

    track = tracks[0]

    if track.has_slang_synthesis_version and not force:
        return {
            "message": "Slang synthesis already generated",
            "status": "completed",
            "content_id": content_id,
            "generated_at": track.slang_synthesis_generated_at.isoformat() if track.slang_synthesis_generated_at else None,
        }

    # Check for existing active job
    existing_job = await AIGenerationJob.get_active_job(content_id, JobType.SLANG_SYNTHESIS)
    if existing_job:
        return existing_job.to_response()

    # Create new job
    job = await AIGenerationJob.create_job(
        content_id=content_id,
        job_type=JobType.SLANG_SYNTHESIS,
        language=language,
        total_cues=len(track.cues),
    )

    # Start background processing
    background_tasks.add_task(_process_slang_synthesis_job, str(job.id), content_id, language)

    logger.info(
        "Slang-synthesis generation started",
        extra={"content_id": content_id, "job_id": str(job.id), "total_cues": len(track.cues)},
    )

    return job.to_response()


@router.get("/job/{job_id}")
async def get_generation_job_status(job_id: str) -> dict:
    """
    Get status of a subtitle AI generation job.
    Poll this endpoint to track progress.
    """
    try:
        job = await AIGenerationJob.get(PydanticObjectId(job_id))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid job ID format")

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return job.to_response()


@router.post("/job/{job_id}/cancel")
async def cancel_generation_job(job_id: str) -> dict:
    """
    Cancel an in-progress subtitle AI generation job.
    Only pending or processing jobs can be cancelled.
    """
    try:
        job = await AIGenerationJob.get(PydanticObjectId(job_id))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid job ID format")

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status not in [JobStatus.PENDING, JobStatus.PROCESSING]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel job with status '{job.status.value}'. Only pending or processing jobs can be cancelled."
        )

    await job.cancel()

    logger.info(
        "Job cancelled",
        extra={"job_id": job_id, "job_type": job.job_type.value, "content_id": job.content_id},
    )

    return {
        "message": "Job cancelled successfully",
        "job": job.to_response(),
    }


@router.get("/{content_id}/job/active")
async def get_active_generation_jobs(content_id: str) -> dict:
    """
    Get any active generation jobs for content.
    Returns status for all AI generation job types if active.
    """
    nikud_job = await AIGenerationJob.get_active_job(content_id, JobType.NIKUD)
    shoresh_job = await AIGenerationJob.get_active_job(content_id, JobType.SHORESH)
    heblish_job = await AIGenerationJob.get_active_job(content_id, JobType.HEBLISH)
    grammar_flip_job = await AIGenerationJob.get_active_job(content_id, JobType.GRAMMAR_FLIP)
    slang_synthesis_job = await AIGenerationJob.get_active_job(content_id, JobType.SLANG_SYNTHESIS)

    return {
        "content_id": content_id,
        "nikud_job": nikud_job.to_response() if nikud_job else None,
        "shoresh_job": shoresh_job.to_response() if shoresh_job else None,
        "heblish_job": heblish_job.to_response() if heblish_job else None,
        "grammar_flip_job": grammar_flip_job.to_response() if grammar_flip_job else None,
        "slang_synthesis_job": slang_synthesis_job.to_response() if slang_synthesis_job else None,
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
    """Get cache statistics for all subtitle AI transformation services"""
    from app.services.shoresh_service import get_cache_stats as get_shoresh_stats
    from app.services.heblish_service import get_cache_stats as get_heblish_stats
    from app.services.grammar_flip_service import get_cache_stats as get_grammar_flip_stats
    from app.services.slang_synthesis_service import get_cache_stats as get_slang_synthesis_stats

    nikud_stats = get_cache_stats()
    shoresh_stats = get_shoresh_stats()
    heblish_stats = get_heblish_stats()
    grammar_flip_stats = get_grammar_flip_stats()
    slang_synthesis_stats = get_slang_synthesis_stats()

    return {
        "nikud": nikud_stats,
        "shoresh": shoresh_stats,
        "heblish": heblish_stats,
        "grammar_flip": grammar_flip_stats,
        "slang_synthesis": slang_synthesis_stats,
    }
