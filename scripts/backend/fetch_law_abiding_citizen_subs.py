#!/usr/bin/env python3
"""Fetch external subtitles for Law Abiding Citizen (2009) from OpenSubtitles."""

import asyncio
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from app.core.config import get_settings
from app.core.database import connect_to_mongo
from app.core.logging_config import get_logger
from app.models.content import Content
from app.services.external_subtitle_service import ExternalSubtitleService

logger = get_logger(__name__)

IMDB_ID = "tt1197624"


async def main():
    logger.info("=" * 70)
    logger.info("Fetch External Subtitles: Law Abiding Citizen (2009)")
    logger.info("=" * 70)

    await connect_to_mongo()

    content = await Content.find_one(Content.imdb_id == IMDB_ID)
    if not content:
        logger.error("Content not found for IMDB %s", IMDB_ID)
        sys.exit(1)

    content_id = str(content.id)
    logger.info("Found content: %s (ID: %s)", content.title, content_id)

    service = ExternalSubtitleService()

    for lang in ["en", "es"]:
        logger.info("")
        logger.info("Searching for %s subtitles...", lang.upper())
        try:
            track = await service.fetch_subtitle_for_content(
                content_id, lang, sources=["opensubtitles"],
            )
            if track:
                logger.info("  Saved %s subtitle track (%d cues)", lang, len(track.cues))
            else:
                logger.warning("  No %s subtitles found", lang)
        except Exception as e:
            logger.error("  Failed to fetch %s subtitles: %s", lang, e)

    # Update content record
    content = await Content.get(content_id)
    if content:
        from app.models.subtitles import SubtitleTrackDoc
        tracks = await SubtitleTrackDoc.find(
            SubtitleTrackDoc.content_id == content_id,
        ).to_list()
        if tracks:
            langs = sorted(set(t.language for t in tracks))
            content.has_subtitles = True
            content.available_subtitle_languages = langs
            content.embedded_subtitle_count = len(langs)
            content.subtitle_extraction_status = "completed"
            await content.save()
            logger.info("")
            logger.info("Updated content: has_subtitles=True, languages=%s", langs)

    logger.info("")
    logger.info("=" * 70)
    logger.info("DONE")
    logger.info("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
