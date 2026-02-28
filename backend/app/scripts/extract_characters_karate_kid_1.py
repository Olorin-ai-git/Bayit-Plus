"""
Character Extraction for The Karate Kid (1984)

Finds the Karate Kid (1984) content document, runs the movie-still extraction
pipeline (TMDB tagged images -> GCS upload -> Claude AI profiles), and saves
the results to Content.interactive_characters.

Uses MovieStillCharacterExtractorService to source character images from the
1984 film rather than the actors' current profile photos. Images are filtered
by TMDB movie ID to ensure they show the cast as they appeared in the film.

Usage:
    cd backend
    poetry run python -m app.scripts.extract_characters_karate_kid_1 [--dry-run] [--force]
"""

import asyncio
import logging
import sys

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.content import Content
from app.services.vod_interaction.movie_still_extractor import (
    movie_still_extractor_service,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

SEARCH_TITLES = [
    "The Karate Kid",
    "Karate Kid",
]
RELEASE_YEAR = 1984


async def _find_content() -> Content | None:
    """
    Locate The Karate Kid (1984) in the database.
    Filters by year to avoid matching the 2010 remake.
    """
    for title in SEARCH_TITLES:
        content = await Content.find_one(
            {
                "title": {"$regex": f"^{title}$", "$options": "i"},
                "year": RELEASE_YEAR,
            }
        )
        if content:
            return content

    # Broader fallback: title match without year filter (log a warning)
    for title in SEARCH_TITLES:
        content = await Content.find_one(
            {"title": {"$regex": f"^{title}$", "$options": "i"}}
        )
        if content:
            if content.year and content.year != RELEASE_YEAR:
                logger.warning(
                    "Title '%s' matched year %s, expected %s — skipping",
                    content.title,
                    content.year,
                    RELEASE_YEAR,
                )
                return None
            return content

    return None


async def run(dry_run: bool = False) -> None:
    uri = getattr(settings, "MONGODB_URI", None) or getattr(
        settings, "MONGODB_URL", None
    )
    client = AsyncIOMotorClient(uri)
    database = client[settings.MONGODB_DB_NAME]

    await init_beanie(database=database, document_models=[Content], skip_indexes=True)
    logger.info("Connected to MongoDB: %s", settings.MONGODB_DB_NAME)
    logger.info("Mode: %s", "DRY RUN" if dry_run else "LIVE")

    content = await _find_content()
    if not content:
        logger.error(
            "Content not found. Tried titles: %s with year=%d. "
            "Ensure 'The Karate Kid' (1984) exists in the database.",
            SEARCH_TITLES,
            RELEASE_YEAR,
        )
        return

    logger.info("Found: '%s' (id=%s, year=%s)", content.title, content.id, content.year)
    logger.info("  tmdb_id: %s", content.tmdb_id)
    logger.info(
        "  interactive_characters: %d existing",
        len(content.interactive_characters or []),
    )
    logger.info(
        "  supports_avatar_interaction: %s", content.supports_avatar_interaction
    )

    if not content.tmdb_id:
        logger.error(
            "Content has no tmdb_id. Run enrich_from_tmdb.py first to populate it."
        )
        return

    if content.interactive_characters:
        logger.warning(
            "Content already has %d characters. Use --force to re-extract.",
            len(content.interactive_characters),
        )
        if "--force" not in sys.argv:
            return

    logger.info(
        "Running movie-still character extraction for '%s' (TMDB ID: %s)...",
        content.title,
        content.tmdb_id,
    )
    characters = await movie_still_extractor_service.extract_characters(content)

    if not characters:
        logger.error(
            "Extraction returned no characters. "
            "Check TMDB cast data and AI service availability."
        )
        return

    logger.info("Extracted %d characters:", len(characters))
    for char in characters:
        logger.info(
            "  - %s (actor: %s, voice: %s, frame: %s, questions: %d)",
            char.name,
            char.actor_name,
            char.voice_id,
            "set" if char.frame_url else "MISSING",
            len(char.suggested_questions),
        )

    if dry_run:
        logger.info("DRY RUN -- skipping database save")
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
