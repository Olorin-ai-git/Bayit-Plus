"""
Bulk Trivia Generation for Collection Movies

Generates AI-enriched trivia facts (with Hebrew/Spanish translations) for all
movies belonging to collections. Uses the existing TriviaGenerationService
pipeline: TMDB context -> chained AI facts -> translation.

Usage:
    cd backend
    poetry run python -m app.scripts.generate_collection_trivia [OPTIONS]

Options:
    --dry-run           Show what would be generated without running AI
    --force             Regenerate even if trivia already exists
    --collection NAME   Only generate for a specific collection (partial match)
    --limit N           Max number of movies to process
    --skip-existing     Skip movies that already have enriched trivia (default)
    --delay SECONDS     Delay between API calls (default: 2.0)

Examples:
    # Preview all collection movies
    poetry run python -m app.scripts.generate_collection_trivia --dry-run

    # Generate for BTTF only
    poetry run python -m app.scripts.generate_collection_trivia --collection "Back to the Future"

    # Generate for all collections, force regenerate
    poetry run python -m app.scripts.generate_collection_trivia --force

    # Generate for Karate Kid trilogy
    poetry run python -m app.scripts.generate_collection_trivia --collection "Karate Kid"
"""

import asyncio
import logging
import sys
import time
from dataclasses import dataclass, field
from typing import Optional

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.content import Content
from app.models.trivia import ContentTrivia

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


@dataclass
class GenerationStats:
    """Track generation run statistics."""

    generated: int = 0
    skipped_existing: int = 0
    skipped_no_tmdb: int = 0
    errors: int = 0
    total_facts: int = 0
    collections_found: int = 0
    movies_found: int = 0
    error_details: list = field(default_factory=list)


class CollectionTriviaGenerator:
    """Generates AI trivia for all movies in collections."""

    def __init__(
        self,
        dry_run: bool = False,
        force: bool = False,
        collection_filter: Optional[str] = None,
        limit: Optional[int] = None,
        delay: float = 2.0,
        below_facts: Optional[int] = None,
    ):
        self.dry_run = dry_run
        self.force = force
        self.collection_filter = collection_filter
        self.limit = limit
        self.delay = delay
        self.below_facts = below_facts
        self.stats = GenerationStats()

    async def initialize(self):
        """Initialize database connection and Beanie."""
        logger.info("Connecting to MongoDB...")
        client = AsyncIOMotorClient(settings.MONGODB_URI)
        database = client[settings.MONGODB_DB_NAME]

        await init_beanie(
            database=database,
            document_models=[Content, ContentTrivia],
            skip_indexes=True,
        )
        logger.info("Connected to database: %s", settings.MONGODB_DB_NAME)

    async def find_collection_movies(self) -> dict[str, list[Content]]:
        """Find all movies belonging to collections, grouped by collection name."""
        query = {
            "collection_parent_id": {"$exists": True, "$ne": None},
            "is_collection_parent": {"$ne": True},
            "is_published": True,
        }

        movies = await Content.find(query).sort("tmdb_collection_name", "collection_order").to_list()

        # Group by collection name
        collections: dict[str, list[Content]] = {}
        for movie in movies:
            name = movie.tmdb_collection_name or "Unknown Collection"
            if self.collection_filter:
                if self.collection_filter.lower() not in name.lower():
                    continue
            collections.setdefault(name, []).append(movie)

        # Sort movies within each collection by order
        for name in collections:
            collections[name].sort(key=lambda m: m.collection_order or 0)

        self.stats.collections_found = len(collections)
        self.stats.movies_found = sum(len(m) for m in collections.values())

        return collections

    async def check_existing_trivia(self, content_id: str) -> Optional[ContentTrivia]:
        """Check if enriched trivia already exists for content."""
        return await ContentTrivia.find_one(
            ContentTrivia.content_id == content_id,
            ContentTrivia.is_enriched == True,
        )

    async def generate_for_movie(self, movie: Content) -> bool:
        """Generate trivia for a single movie. Returns True if generated."""
        content_id = str(movie.id)

        if not movie.tmdb_id:
            logger.warning(
                "  [SKIP] No TMDB ID: %s", movie.title
            )
            self.stats.skipped_no_tmdb += 1
            return False

        if not self.force:
            existing = await self.check_existing_trivia(content_id)
            if existing and existing.facts:
                fact_count = len(existing.facts)
                if self.below_facts and fact_count < self.below_facts:
                    logger.info(
                        "  [REGEN] %s (%d facts < %d threshold)",
                        movie.title,
                        fact_count,
                        self.below_facts,
                    )
                else:
                    logger.info(
                        "  [EXISTS] %s (%d facts)", movie.title, fact_count
                    )
                    self.stats.skipped_existing += 1
                    return False

        if self.dry_run:
            logger.info(
                "  [DRY RUN] Would generate trivia for: %s (TMDB: %s)",
                movie.title,
                movie.tmdb_id,
            )
            return False

        # Import here to avoid loading Anthropic client in dry-run mode
        from app.services.trivia import TriviaGenerationService

        try:
            generator = TriviaGenerationService()
            start = time.monotonic()
            trivia = await generator.generate_trivia(movie, enrich=True)
            elapsed = time.monotonic() - start

            fact_count = len(trivia.facts) if trivia else 0
            self.stats.generated += 1
            self.stats.total_facts += fact_count

            logger.info(
                "  [OK] %s -> %d facts (%.1fs)",
                movie.title,
                fact_count,
                elapsed,
            )
            return True

        except Exception as exc:
            self.stats.errors += 1
            self.stats.error_details.append(f"{movie.title}: {exc}")
            logger.error(
                "  [ERROR] %s: %s", movie.title, exc
            )
            return False

    async def run(self):
        """Run the bulk generation process."""
        await self.initialize()

        mode = "DRY RUN" if self.dry_run else "LIVE"
        logger.info("=" * 70)
        logger.info("COLLECTION TRIVIA GENERATION [%s]", mode)
        if self.collection_filter:
            logger.info("Filter: %s", self.collection_filter)
        if self.force:
            logger.info("Force: regenerating existing trivia")
        if self.below_facts:
            logger.info("Below-facts threshold: %d", self.below_facts)
        if self.limit:
            logger.info("Limit: %d movies", self.limit)
        logger.info("=" * 70)

        collections = await self.find_collection_movies()

        if not collections:
            logger.info("No collection movies found matching criteria.")
            return

        logger.info(
            "Found %d collections with %d movies total",
            self.stats.collections_found,
            self.stats.movies_found,
        )
        logger.info("")

        processed = 0
        for collection_name, movies in sorted(collections.items()):
            logger.info(
                "[%s] (%d movies)",
                collection_name,
                len(movies),
            )

            for movie in movies:
                if self.limit and processed >= self.limit:
                    logger.info("Reached limit of %d movies", self.limit)
                    break

                generated = await self.generate_for_movie(movie)
                processed += 1

                # Rate limit between AI generation calls
                if generated and self.delay > 0:
                    await asyncio.sleep(self.delay)

            if self.limit and processed >= self.limit:
                break

            logger.info("")

        self._print_summary()

    def _print_summary(self):
        """Print generation summary."""
        logger.info("=" * 70)
        logger.info("GENERATION SUMMARY")
        logger.info("=" * 70)
        logger.info("Collections found:     %d", self.stats.collections_found)
        logger.info("Movies found:          %d", self.stats.movies_found)
        logger.info("Generated:             %d", self.stats.generated)
        logger.info("Total facts created:   %d", self.stats.total_facts)
        logger.info("Skipped (existing):    %d", self.stats.skipped_existing)
        logger.info("Skipped (no TMDB ID):  %d", self.stats.skipped_no_tmdb)
        logger.info("Errors:                %d", self.stats.errors)

        if self.stats.error_details:
            logger.info("")
            logger.info("Error details:")
            for detail in self.stats.error_details:
                logger.info("  - %s", detail)

        logger.info("=" * 70)


def parse_args() -> dict:
    """Parse CLI arguments."""
    args = {
        "dry_run": "--dry-run" in sys.argv,
        "force": "--force" in sys.argv,
        "collection_filter": None,
        "limit": None,
        "delay": 2.0,
        "below_facts": None,
    }

    for i, arg in enumerate(sys.argv):
        if arg == "--collection" and i + 1 < len(sys.argv):
            args["collection_filter"] = sys.argv[i + 1]
        elif arg == "--limit" and i + 1 < len(sys.argv):
            args["limit"] = int(sys.argv[i + 1])
        elif arg == "--delay" and i + 1 < len(sys.argv):
            args["delay"] = float(sys.argv[i + 1])
        elif arg == "--below-facts" and i + 1 < len(sys.argv):
            args["below_facts"] = int(sys.argv[i + 1])

    return args


async def main():
    """Entry point."""
    args = parse_args()

    generator = CollectionTriviaGenerator(
        dry_run=args["dry_run"],
        force=args["force"],
        collection_filter=args["collection_filter"],
        limit=args["limit"],
        delay=args["delay"],
        below_facts=args["below_facts"],
    )
    await generator.run()


if __name__ == "__main__":
    asyncio.run(main())
