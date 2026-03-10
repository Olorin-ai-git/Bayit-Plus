"""
Pre-generate characters for movies (Discover Pause & Ask).

Runs the extraction + voice-cloning pipeline in batch.

Usage:
    cd backend
    poetry run python -m app.scripts.generate_characters --top 20
    poetry run python -m app.scripts.generate_characters --content-id 6601a...
    poetry run python -m app.scripts.generate_characters --top 5 --dry-run
"""

import argparse
import asyncio
import logging
import sys
from dataclasses import dataclass, field

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.content import Content

logging.basicConfig(
    level=logging.INFO, format="%(levelname)s %(message)s"
)
logger = logging.getLogger(__name__)


@dataclass
class BatchReport:
    """Tracks batch generation results."""

    processed: int = 0
    created: int = 0
    skipped: int = 0
    failed: int = 0
    errors: list[str] = field(default_factory=list)

    def summary(self) -> str:
        lines = [
            f"Processed: {self.processed}",
            f"Created:   {self.created}",
            f"Skipped:   {self.skipped}",
            f"Failed:    {self.failed}",
        ]
        if self.errors:
            lines.append("Errors:")
            for err in self.errors:
                lines.append(f"  - {err}")
        return "\n".join(lines)


async def _init_db() -> None:
    """Connect to MongoDB and initialize Beanie."""
    uri = getattr(settings, "MONGODB_URI", None) or getattr(
        settings, "MONGODB_URL", None
    )
    client = AsyncIOMotorClient(uri)
    database = client[settings.MONGODB_DB_NAME]
    await init_beanie(
        database=database,
        document_models=[Content],
        skip_indexes=True,
    )
    logger.info("Connected to %s", settings.MONGODB_DB_NAME)


async def _get_top_movies(limit: int) -> list[Content]:
    """Fetch top movies by view count, excluding already-extracted."""
    return await Content.find(
        {
            "content_format": "movie",
            "tmdb_id": {"$exists": True, "$ne": None},
            "$or": [
                {"interactive_characters": {"$exists": False}},
                {"interactive_characters": {"$size": 0}},
            ],
        }
    ).sort("-view_count").limit(limit).to_list()


async def _process_content(
    content: Content, dry_run: bool, report: BatchReport
) -> None:
    """Extract characters and clone voices for one content item."""
    report.processed += 1
    cid = str(content.id)

    if content.interactive_characters:
        logger.info("SKIP %s (%s) - already has characters", content.title, cid)
        report.skipped += 1
        return

    if not content.tmdb_id:
        logger.info("SKIP %s (%s) - no tmdb_id", content.title, cid)
        report.skipped += 1
        return

    if dry_run:
        logger.info("DRY-RUN %s (%s)", content.title, cid)
        report.created += 1
        return

    try:
        from app.services.vod_interaction.character_extractor import (
            CharacterExtractorService,
        )

        extractor = CharacterExtractorService()
        characters = await extractor.extract_characters(content)
        if not characters:
            logger.warning("No characters for %s", content.title)
            report.skipped += 1
            return

        content.interactive_characters = characters
        content.supports_avatar_interaction = True
        await content.save()
        logger.info(
            "Extracted %d characters for %s",
            len(characters), content.title,
        )

        from app.services.vod_interaction.voice_cloner import (
            CharacterVoiceClonerService,
        )

        cloner = CharacterVoiceClonerService()
        results = await cloner.clone_character_voices(content)
        cloned = sum(
            1 for r in results.values() if r.status == "cloned"
        )
        logger.info("Cloned %d voices for %s", cloned, content.title)
        report.created += 1

    except Exception as exc:
        msg = f"{content.title} ({cid}): {exc}"
        logger.error("FAIL %s", msg)
        report.failed += 1
        report.errors.append(msg)


async def run(
    top: int | None = None,
    content_id: str | None = None,
    dry_run: bool = False,
) -> None:
    """Main entry point."""
    await _init_db()
    report = BatchReport()

    if content_id:
        content = await Content.get(content_id)
        if not content:
            logger.error("Content %s not found", content_id)
            sys.exit(1)
        await _process_content(content, dry_run, report)
    elif top:
        movies = await _get_top_movies(top)
        logger.info("Found %d movies to process", len(movies))
        for movie in movies:
            await _process_content(movie, dry_run, report)
    else:
        logger.error("Specify --top N or --content-id <id>")
        sys.exit(1)

    logger.info("\n=== Batch Report ===\n%s", report.summary())


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Pre-generate characters for Discover Pause & Ask"
    )
    parser.add_argument(
        "--top", type=int, help="Process top N movies by view count"
    )
    parser.add_argument(
        "--content-id", help="Process a specific content ID"
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="Preview without changes"
    )
    args = parser.parse_args()
    asyncio.run(run(top=args.top, content_id=args.content_id, dry_run=args.dry_run))


if __name__ == "__main__":
    main()
