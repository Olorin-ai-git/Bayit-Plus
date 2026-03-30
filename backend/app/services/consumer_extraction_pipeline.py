"""
Consumer Extraction Pipeline

Background task that processes a ConsumerSubmission:
title extraction -> TMDB search -> Content creation -> character extraction.
"""

from datetime import datetime
from typing import Optional, Tuple

from app.core.logging_config import get_logger
from app.models.consumer_submission import ConsumerSubmission
from app.utils.video_url_utils import (
    clean_title_for_search,
    extract_video_title,
)

logger = get_logger(__name__)


async def run_extraction(submission: ConsumerSubmission) -> None:
    """Background task: title extraction -> TMDB -> characters."""
    try:
        submission.status = "extracting"
        submission.updated_at = datetime.utcnow()
        await submission.save()

        title = await extract_video_title(submission.url)
        submission.video_title = title

        tmdb_result = await _search_tmdb(title)
        if not tmdb_result:
            submission.status = "failed"
            submission.error = (
                "Could not find this video in TMDB. "
                "Try a well-known movie or TV show."
            )
            submission.updated_at = datetime.utcnow()
            await submission.save()
            return

        submission.tmdb_id = tmdb_result["id"]
        content_id, char_count = await _create_content_and_extract(
            tmdb_result, submission.url,
        )
        submission.status = "ready"
        submission.content_id = content_id
        submission.character_count = char_count
        submission.updated_at = datetime.utcnow()
        await submission.save()

        logger.info(
            "Consumer extraction complete",
            extra={
                "job_id": submission.job_id,
                "content_id": content_id,
                "characters": char_count,
            },
        )
    except Exception:
        logger.exception(
            "Consumer extraction failed",
            extra={"job_id": submission.job_id},
        )
        submission.status = "failed"
        submission.error = "Extraction failed. Please try again."
        submission.updated_at = datetime.utcnow()
        await submission.save()


async def _search_tmdb(title: Optional[str]) -> Optional[dict]:
    """Search TMDB with progressively cleaned title candidates."""
    if not title:
        return None
    from app.services.tmdb_service import TMDBService
    tmdb = TMDBService()
    candidates = clean_title_for_search(title)
    for candidate in candidates:
        logger.info("TMDB search attempt", extra={"query": candidate})
        result = await tmdb.search_movie(candidate)
        if result:
            return result
        result = await tmdb.search_tv_series(candidate)
        if result:
            return result
    return None


async def _create_content_and_extract(
    tmdb_result: dict, source_url: str,
) -> Tuple[str, int]:
    """Create a Content doc and run character extraction."""
    from app.models.content import Content
    from app.services.vod_interaction.character_extractor import (
        character_extractor_service,
    )

    content = Content(
        title=tmdb_result.get("title") or tmdb_result.get("name", ""),
        tmdb_id=tmdb_result["id"],
        stream_url=source_url,
        content_format="movie",
        section_ids=["__consumer_demo"],
        primary_section_id="__consumer_demo",
    )
    await content.insert()

    characters = await character_extractor_service.extract_characters(content)
    content.interactive_characters = characters
    await content.save()

    return str(content.id), len(characters)
