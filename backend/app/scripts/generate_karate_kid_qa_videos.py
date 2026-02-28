"""
Generate Q&A Lipsync Videos for The Karate Kid (1984)

Uses the kid avatar (Etai) to ask 10 questions answered by Daniel LaRusso
and Mr. Miyagi using their cloned voices and real movie photos.
Videos are generated via fal.ai Aurora lipsync and stored in GCS.

Usage:
    cd backend
    poetry run python -m app.scripts.generate_karate_kid_qa_videos \\
        [--chars "Daniel LaRusso,Mr. Miyagi"] [--count 10] [--dry-run]
"""

import asyncio
import logging
import sys

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.content import Content
from app.models.subtitles import SubtitleTrackDoc
from app.services.vod_interaction.qa_lipsync_generator import (
    qa_lipsync_generator_service,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

TITLE = "The Karate Kid"
YEAR = 1984
KID_AVATAR_IMAGE_URL = (
    "https://cdn.creatify.ai/creator/4045d05f-2dc5-4661-8121-733ecd3e8aec/st.png"
)
DEFAULT_CHARS = ["Daniel LaRusso", "Mr. Miyagi"]


def _parse_args() -> tuple[list[str] | None, int, bool, str | None]:
    """Parse --chars, --count, --kid-voice, and --dry-run from argv."""
    chars: list[str] | None = None
    kid_voice: str | None = None
    count = 10
    dry_run = "--dry-run" in sys.argv
    for i, arg in enumerate(sys.argv):
        if arg == "--chars" and i + 1 < len(sys.argv):
            chars = [n.strip() for n in sys.argv[i + 1].split(",") if n.strip()]
        if arg == "--count" and i + 1 < len(sys.argv):
            try:
                count = int(sys.argv[i + 1])
            except ValueError:
                pass
        if arg == "--kid-voice" and i + 1 < len(sys.argv):
            kid_voice = sys.argv[i + 1].strip() or None
    return chars, count, dry_run, kid_voice


async def run() -> None:
    char_filter, count, dry_run, kid_voice_arg = _parse_args()

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
        logger.error("Content '%s' (%d) not found.", TITLE, YEAR)
        return

    logger.info("Found: '%s' (id=%s)", content.title, content.id)

    kid_voice_id = kid_voice_arg or settings.MOVIE_INTERACTION_DEFAULT_VOICE_MALE
    if not kid_voice_id:
        logger.error(
            "Kid voice ID not set. Use --kid-voice <id> or configure "
            "MOVIE_INTERACTION_DEFAULT_VOICE_MALE in GCloud secrets."
        )
        return

    target_chars = char_filter or DEFAULT_CHARS
    available = [
        c for c in content.interactive_characters
        if c.name in target_chars and c.voice_id and c.frame_url
    ]
    if not available:
        logger.error(
            "No characters with voice+image available. Checked: %s", target_chars,
        )
        return

    logger.info(
        "Generating %d Q&A pairs for: %s",
        count,
        [c.name for c in available],
    )
    logger.info("Kid avatar image: %s", KID_AVATAR_IMAGE_URL)
    logger.info("Kid voice ID: %s", kid_voice_id)

    if dry_run:
        logger.info("DRY RUN -- no videos will be generated.")
        return

    results = await qa_lipsync_generator_service.run_all(
        content=content,
        kid_image_url=KID_AVATAR_IMAGE_URL,
        kid_voice_id=kid_voice_id,
        character_names=target_chars,
        count=count,
        concurrency=2,
    )

    succeeded = [r for r in results if r.success]
    failed = [r for r in results if not r.success]

    logger.info(
        "Summary: %d succeeded, %d failed (of %d total)",
        len(succeeded), len(failed), len(results),
    )
    for r in succeeded:
        logger.info(
            "  OK  | %-60s | char=%s",
            r.pair.question[:60], r.pair.character_name,
        )
        logger.info("        kid_video:  %s", r.kid_video_url)
        logger.info("        char_video: %s", r.character_video_url)
    for r in failed:
        logger.warning(
            "  FAIL| %-60s | char=%s | err=%s",
            r.pair.question[:60], r.pair.character_name, r.error,
        )


def main() -> None:
    asyncio.run(run())


if __name__ == "__main__":
    main()
