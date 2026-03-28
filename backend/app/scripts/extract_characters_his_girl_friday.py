"""
Character Extraction for His Girl Friday (1940)

Public domain film used as the Olorin Interactive Video AI website demo.
Creates Content document if needed, runs character extraction pipeline,
then triggers voice cloning.

Usage:
    cd backend
    poetry run python -m app.scripts.extract_characters_his_girl_friday [--dry-run] [--force]
"""

import asyncio
import logging
import sys

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.content import Content
from app.services.vod_interaction.character_extractor import (
    character_extractor_service,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

TMDB_ID = 3085
TITLE = "His Girl Friday"
YEAR = 1940
STREAM_URL = "https://storage.googleapis.com/bayit-plus-media-new/movies/his-girl-friday-1940.mp4"

SEARCH_TITLES = [
    "His Girl Friday",
    "His Girl Friday (1940)",
]


async def ensure_content() -> Content:
    """Find or create the Content document for His Girl Friday."""
    for title in SEARCH_TITLES:
        content = await Content.find_one(
            {"title": {"$regex": f"^{title}$", "$options": "i"}}
        )
        if content:
            logger.info("Found existing content: '%s' (id=%s)", content.title, content.id)
            return content

    logger.info("Content not found — creating new entry")
    content = Content(
        title=TITLE,
        stream_url=STREAM_URL,
        content_format="movie",
        tmdb_id=TMDB_ID,
        year=YEAR,
        supports_avatar_interaction=False,
        interactive_characters=[],
        interactive_moments=[],
    )
    await content.insert()
    logger.info("Created content: '%s' (id=%s)", content.title, content.id)
    return content


async def run(dry_run: bool = False, force: bool = False) -> None:
    uri = getattr(settings, "MONGODB_URI", None) or getattr(settings, "MONGODB_URL", None)
    client = AsyncIOMotorClient(uri)
    database = client[settings.MONGODB_DB_NAME]

    await init_beanie(database=database, document_models=[Content], skip_indexes=True)
    logger.info("Connected to MongoDB: %s", settings.MONGODB_DB_NAME)
    logger.info("Mode: %s", "DRY RUN" if dry_run else "LIVE")

    content = await ensure_content()

    logger.info("  tmdb_id: %s", content.tmdb_id)
    logger.info(
        "  interactive_characters: %d existing",
        len(content.interactive_characters or []),
    )
    logger.info(
        "  supports_avatar_interaction: %s", content.supports_avatar_interaction
    )

    if not content.tmdb_id:
        content.tmdb_id = TMDB_ID
        await content.save()
        logger.info("Set tmdb_id to %d", TMDB_ID)

    if content.interactive_characters and not force:
        logger.warning(
            "Content already has %d characters. Use --force to re-extract.",
            len(content.interactive_characters),
        )
        return

    logger.info("Running character extraction pipeline...")
    characters = await character_extractor_service.extract_characters(content)

    if not characters:
        logger.error(
            "Extraction returned no characters. "
            "Check TMDB cast data and AI service availability."
        )
        return

    logger.info("Extracted %d characters:", len(characters))
    for char in characters:
        logger.info(
            "  - %s (actor: %s, voice_id: %s)",
            char.name,
            char.actor_name,
            char.voice_id or "default",
        )

    if dry_run:
        logger.info("DRY RUN — skipping save")
        return

    content.interactive_characters = characters
    content.supports_avatar_interaction = True
    await content.save()

    logger.info(
        "Saved %d characters to content id=%s title='%s'",
        len(characters),
        content.id,
        content.title,
    )


def main() -> None:
    dry_run = "--dry-run" in sys.argv
    force = "--force" in sys.argv
    asyncio.run(run(dry_run=dry_run, force=force))


if __name__ == "__main__":
    main()
