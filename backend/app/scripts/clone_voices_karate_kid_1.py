"""
Character Voice Cloning for The Karate Kid (1984)

Runs the full voice cloning pipeline for all interactive characters:
  1. Load English subtitle track (1467 cues)
  2. Claude AI maps cues to characters by dialogue
  3. FFmpeg extracts audio segments from the HLS stream
  4. ElevenLabs IVC clones each voice
  5. voice_id + voice_clone_status saved to Content.interactive_characters

Usage:
    cd backend
    poetry run python -m app.scripts.clone_voices_karate_kid_1 [--dry-run] [--chars "Daniel LaRusso,Mr. Miyagi"]
"""

import asyncio
import logging
import sys

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.content import Content
from app.models.subtitles import SubtitleTrackDoc
from app.services.vod_interaction.voice_cloner import (
    character_voice_cloner_service,
    find_subtitle_track,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

TITLE = "The Karate Kid"
YEAR = 1984


def _parse_char_filter() -> list[str] | None:
    """Parse optional --chars "Name1,Name2" argument."""
    for i, arg in enumerate(sys.argv):
        if arg == "--chars" and i + 1 < len(sys.argv):
            return [n.strip() for n in sys.argv[i + 1].split(",") if n.strip()]
    return None


async def run(dry_run: bool = False) -> None:
    uri = getattr(settings, "MONGODB_URI", None) or getattr(settings, "MONGODB_URL", None)
    client = AsyncIOMotorClient(uri)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(
        database=db,
        document_models=[Content, SubtitleTrackDoc],
        skip_indexes=True,
    )
    logger.info("Connected to MongoDB: %s", settings.MONGODB_DB_NAME)
    logger.info("Mode: %s", "DRY RUN" if dry_run else "LIVE")

    content = await Content.find_one({"title": TITLE, "year": YEAR})
    if not content:
        logger.error("Content '%s' (%d) not found in database.", TITLE, YEAR)
        return

    logger.info("Found: '%s' (id=%s)", content.title, content.id)
    logger.info("  stream_url: %s", content.stream_url)
    logger.info(
        "  characters: %s",
        [c.name for c in content.interactive_characters],
    )

    if not content.stream_url:
        logger.error("Content has no stream_url — cannot extract audio.")
        return

    if not content.interactive_characters:
        logger.error("No interactive characters. Run extraction script first.")
        return

    track = await find_subtitle_track(str(content.id))
    if not track or not track.cues:
        logger.error(
            "No subtitle track found for content id=%s. "
            "Subtitles are required for dialogue mapping.",
            content.id,
        )
        return

    logger.info(
        "Subtitle track: lang=%s, cues=%d", track.language, len(track.cues)
    )

    char_filter = _parse_char_filter()
    if char_filter:
        logger.info("Cloning only: %s", char_filter)
    else:
        logger.info(
            "Cloning all %d characters", len(content.interactive_characters)
        )

    already_cloned = [
        c.name for c in content.interactive_characters
        if c.voice_clone_status == "cloned"
    ]
    if already_cloned:
        logger.info("Already cloned (will re-clone with --force): %s", already_cloned)

    if dry_run:
        logger.info(
            "DRY RUN -- pipeline would process %d characters from %d subtitle cues",
            len(char_filter or content.interactive_characters),
            len(track.cues),
        )
        return

    results = await character_voice_cloner_service.clone_character_voices(
        content, character_names=char_filter
    )

    logger.info("Voice cloning results:")
    for name, result in results.items():
        if result.status == "cloned":
            logger.info(
                "  CLONED  %s  voice_id=%s  duration=%.1fs  cues=%d",
                name, result.voice_id, result.audio_duration_sec, result.cue_count,
            )
        elif result.status == "skipped":
            logger.warning(
                "  SKIPPED %s  reason=%s  duration=%.1fs",
                name, result.reason, result.audio_duration_sec,
            )
        else:
            logger.error(
                "  FAILED  %s  reason=%s",
                name, result.reason,
            )

    cloned = sum(1 for r in results.values() if r.status == "cloned")
    skipped = sum(1 for r in results.values() if r.status == "skipped")
    failed = sum(1 for r in results.values() if r.status == "failed")
    logger.info(
        "Summary: %d cloned, %d skipped, %d failed (of %d attempted)",
        cloned, skipped, failed, len(results),
    )


def main() -> None:
    dry_run = "--dry-run" in sys.argv
    asyncio.run(run(dry_run=dry_run))


if __name__ == "__main__":
    main()
