"""
Character Extraction for Back to the Future Part III

Finds the BttF3 content document, runs the full character extraction pipeline
(TMDB cast fetch -> GCS image upload -> Claude AI profiles), and saves the
results to Content.interactive_characters.

Usage:
    cd backend
    poetry run python -m app.scripts.extract_characters_bttf3 [--dry-run]
"""

import asyncio
import logging
import sys

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.content import Content
from app.services.vod_interaction.character_extractor import (
    character_extractor_service,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

SEARCH_TITLES = [
    "Back to the Future Part III",
    "Back to the Future Part 3",
    "Back to the Future 3",
]


async def run(dry_run: bool = False) -> None:
    uri = getattr(settings, "MONGODB_URI", None) or getattr(settings, "MONGODB_URL", None)
    client = AsyncIOMotorClient(uri)
    database = client[settings.MONGODB_DB_NAME]

    await init_beanie(database=database, document_models=[Content], skip_indexes=True)
    logger.info("Connected to MongoDB: %s", settings.MONGODB_DB_NAME)
    logger.info("Mode: %s", "DRY RUN" if dry_run else "LIVE")

    content = None
    for title in SEARCH_TITLES:
        content = await Content.find_one(
            {"title": {"$regex": f"^{title}$", "$options": "i"}}
        )
        if content:
            logger.info("Found content: '%s' (id=%s)", content.title, content.id)
            break

    if not content:
        logger.error(
            "Content not found in database. Tried titles: %s", SEARCH_TITLES
        )
        return

    logger.info("  tmdb_id: %s", content.tmdb_id)
    logger.info(
        "  interactive_characters: %d existing",
        len(content.interactive_characters or []),
    )
    logger.info(
        "  interactive_moments: %d existing",
        len(content.interactive_moments or []),
    )
    logger.info(
        "  supports_avatar_interaction: %s", content.supports_avatar_interaction
    )

    if not content.tmdb_id:
        logger.error(
            "Content has no tmdb_id — cannot run extraction. "
            "Run enrich_from_tmdb.py first to populate the TMDB ID."
        )
        return

    if content.interactive_characters:
        logger.warning(
            "Content already has %d characters. Use --force to re-extract.",
            len(content.interactive_characters),
        )
        if "--force" not in sys.argv:
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
            "  - %s (actor: %s, voice_id: %s, frame_url: %s)",
            char.name,
            char.actor_name,
            char.voice_id,
            "set" if char.frame_url else "MISSING",
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
    asyncio.run(run(dry_run=dry_run))


if __name__ == "__main__":
    main()
