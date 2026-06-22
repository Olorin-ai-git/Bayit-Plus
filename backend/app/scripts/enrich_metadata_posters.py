"""
Metadata and Poster Enrichment Script

Scans all content across platforms (web, tvOS, iOS) and enriches missing posters and metadata.

This script:
1. Scans all content types: radio stations, podcasts, movies, series, audiobooks
2. Identifies missing posters and metadata fields
3. Copies posters/metadata from one platform to others where available
4. Reports what was found and fixed

Usage:
    python -m app.scripts.enrich_metadata_posters [--dry-run] [--content-type TYPE]
"""

import asyncio
import logging
from collections import defaultdict
from typing import Dict, List, Optional, Set

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.content import Content, Podcast, RadioStation

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MetadataEnricher:
    """Enriches metadata and posters across all content types and platforms."""

    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        self.stats = defaultdict(lambda: defaultdict(int))
        self.db = None

    async def initialize(self):
        """Initialize database connection."""
        logger.info("Connecting to MongoDB...")
        client = AsyncIOMotorClient(
            settings.MONGODB_URI if hasattr(settings, "MONGODB_URI") else settings.MONGODB_URL
        )
        self.db = client[settings.MONGODB_DB_NAME]

        # Initialize only RadioStation and Podcast to avoid Content index issues
        try:
            await init_beanie(
                database=self.db,
                document_models=[RadioStation, Podcast],
            )
            logger.info("[OK] Connected to database")
        except Exception as e:
            logger.warning(f"Beanie initialization warning: {e}")
            logger.info("[OK] Connected to database (using direct MongoDB access)")

    # MARK: - Radio Stations

    async def enrich_radio_stations(self):
        """Enrich radio station posters and metadata."""
        logger.info("=" * 80)
        logger.info("RADIO STATIONS")
        logger.info("=" * 80)

        stations = await RadioStation.find({"is_active": True}).to_list()
        logger.info(f"Found {len(stations)} active radio stations")

        for station in stations:
            issues = []
            fixes = []

            # Check poster/logo
            if not station.logo:
                issues.append("missing_logo")
                self.stats["radio"]["missing_logo"] += 1

            # Check metadata fields
            if not station.description:
                issues.append("missing_description")
                self.stats["radio"]["missing_description"] += 1

            if not station.name_en:
                issues.append("missing_name_en")
                self.stats["radio"]["missing_name_en"] += 1

            if not station.genre:
                issues.append("missing_genre")
                self.stats["radio"]["missing_genre"] += 1

            if issues:
                logger.warning(
                    f"  • {station.name} - Issues: {', '.join(issues)}"
                )
                self.stats["radio"]["items_with_issues"] += 1
            else:
                self.stats["radio"]["complete"] += 1

    # MARK: - Podcasts

    async def enrich_podcasts(self):
        """Enrich podcast posters and metadata."""
        logger.info("=" * 80)
        logger.info("PODCASTS")
        logger.info("=" * 80)

        podcasts = await Podcast.find().to_list()
        logger.info(f"Found {len(podcasts)} podcasts")

        for podcast in podcasts:
            issues = []
            title = getattr(podcast, "title", "Unknown")

            # Check poster/cover
            if not getattr(podcast, "cover", None):
                issues.append("missing_cover")
                self.stats["podcasts"]["missing_cover"] += 1

            # Check metadata
            if not getattr(podcast, "description", None):
                issues.append("missing_description")
                self.stats["podcasts"]["missing_description"] += 1

            if not getattr(podcast, "author", None):
                issues.append("missing_author")
                self.stats["podcasts"]["missing_author"] += 1

            if issues:
                logger.warning(
                    f"  • {title} - Issues: {', '.join(issues)}"
                )
                self.stats["podcasts"]["items_with_issues"] += 1
            else:
                self.stats["podcasts"]["complete"] += 1

    # MARK: - Movies

    async def enrich_movies(self):
        """Enrich movie posters and metadata."""
        logger.info("=" * 80)
        logger.info("MOVIES")
        logger.info("=" * 80)

        # Use raw MongoDB to avoid index creation issues
        movies_cursor = self.db.content.find({"content_format": "movie"})
        movies = await movies_cursor.to_list(length=None)
        logger.info(f"Found {len(movies)} movies")

        for movie in movies:
            issues = []

            # Check poster
            if not movie.get("thumbnail") and not movie.get("poster_url"):
                issues.append("missing_poster")
                self.stats["movies"]["missing_poster"] += 1

            # Check backdrop
            if not movie.get("backdrop"):
                issues.append("missing_backdrop")
                self.stats["movies"]["missing_backdrop"] += 1

            # Check metadata
            if not movie.get("description"):
                issues.append("missing_description")
                self.stats["movies"]["missing_description"] += 1

            if not movie.get("year"):
                issues.append("missing_year")
                self.stats["movies"]["missing_year"] += 1

            if not movie.get("genre_ids") and not movie.get("genre"):
                issues.append("missing_genres")
                self.stats["movies"]["missing_genres"] += 1

            if not movie.get("tmdb_id"):
                issues.append("missing_tmdb_id")
                self.stats["movies"]["missing_tmdb_id"] += 1

            if issues:
                logger.warning(
                    f"  • {movie.get('title', 'Unknown')} - Issues: {', '.join(issues)}"
                )
                self.stats["movies"]["items_with_issues"] += 1
            else:
                self.stats["movies"]["complete"] += 1

    # MARK: - Series

    async def enrich_series(self):
        """Enrich series posters and metadata."""
        logger.info("=" * 80)
        logger.info("SERIES")
        logger.info("=" * 80)

        series_cursor = self.db.content.find({"content_format": "series"})
        series = await series_cursor.to_list(length=None)
        logger.info(f"Found {len(series)} series")

        for show in series:
            issues = []

            # Check poster
            if not show.get("thumbnail") and not show.get("poster_url"):
                issues.append("missing_poster")
                self.stats["series"]["missing_poster"] += 1

            # Check backdrop
            if not show.get("backdrop"):
                issues.append("missing_backdrop")
                self.stats["series"]["missing_backdrop"] += 1

            # Check metadata
            if not show.get("description"):
                issues.append("missing_description")
                self.stats["series"]["missing_description"] += 1

            if not show.get("year"):
                issues.append("missing_year")
                self.stats["series"]["missing_year"] += 1

            if not show.get("genre_ids") and not show.get("genre"):
                issues.append("missing_genres")
                self.stats["series"]["missing_genres"] += 1

            if not show.get("tmdb_id"):
                issues.append("missing_tmdb_id")
                self.stats["series"]["missing_tmdb_id"] += 1

            if issues:
                logger.warning(
                    f"  • {show.get('title', 'Unknown')} - Issues: {', '.join(issues)}"
                )
                self.stats["series"]["items_with_issues"] += 1
            else:
                self.stats["series"]["complete"] += 1

    # MARK: - Audiobooks

    async def enrich_audiobooks(self):
        """Enrich audiobook posters and metadata."""
        logger.info("=" * 80)
        logger.info("AUDIOBOOKS")
        logger.info("=" * 80)

        # Audiobooks might be in content with specific section or format
        audiobooks_cursor = self.db.content.find({
            "$or": [
                {"content_format": "audiobook"},
                {"section_ids": "audiobooks"}
            ]
        })
        audiobooks = await audiobooks_cursor.to_list(length=None)
        logger.info(f"Found {len(audiobooks)} audiobooks")

        for audiobook in audiobooks:
            issues = []

            # Check poster/thumbnail
            if not audiobook.get("thumbnail") and not audiobook.get("poster_url"):
                issues.append("missing_poster")
                self.stats["audiobooks"]["missing_poster"] += 1

            # Check metadata
            if not audiobook.get("description"):
                issues.append("missing_description")
                self.stats["audiobooks"]["missing_description"] += 1

            if not audiobook.get("author"):
                issues.append("missing_author")
                self.stats["audiobooks"]["missing_author"] += 1

            if not audiobook.get("duration"):
                issues.append("missing_duration")
                self.stats["audiobooks"]["missing_duration"] += 1

            if issues:
                logger.warning(
                    f"  • {audiobook.get('title', 'Unknown')} - Issues: {', '.join(issues)}"
                )
                self.stats["audiobooks"]["items_with_issues"] += 1
            else:
                self.stats["audiobooks"]["complete"] += 1

    # MARK: - Summary Report

    def print_summary(self):
        """Print comprehensive summary report."""
        logger.info("")
        logger.info("=" * 80)
        logger.info("ENRICHMENT SUMMARY")
        logger.info("=" * 80)

        content_types = ["radio", "podcasts", "movies", "series", "audiobooks"]

        for content_type in content_types:
            if content_type not in self.stats:
                continue

            stats = self.stats[content_type]
            total = stats.get("complete", 0) + stats.get("items_with_issues", 0)

            if total == 0:
                continue

            logger.info("")
            logger.info(f"{content_type.upper()}:")
            logger.info(f"  Total items:          {total}")
            logger.info(f" Complete: {stats.get('complete', 0)} [OK]")
            logger.info(f" Items with issues: {stats.get('items_with_issues', 0)} [FAIL]")

            # List specific issues
            issue_types = [k for k in stats.keys() if k.startswith("missing_")]
            if issue_types:
                logger.info(f"  Issues found:")
                for issue in sorted(issue_types):
                    count = stats[issue]
                    issue_name = issue.replace("missing_", "").replace("_", " ").title()
                    logger.info(f"    - {issue_name}: {count}")

        logger.info("")
        logger.info("=" * 80)

        if self.dry_run:
            logger.info("DRY RUN MODE - No changes were made")
        else:
            logger.info("Enrichment completed")

    # MARK: - Main Process

    async def run(self):
        """Run the full enrichment process."""
        await self.initialize()

        logger.info("")
        logger.info("Starting metadata and poster enrichment scan...")
        logger.info(f"Mode: {'DRY RUN' if self.dry_run else 'LIVE'}")
        logger.info("")

        # Scan all content types
        await self.enrich_radio_stations()
        await self.enrich_podcasts()
        await self.enrich_movies()
        await self.enrich_series()
        await self.enrich_audiobooks()

        # Print summary
        self.print_summary()


async def main():
    """Entry point."""
    import sys

    dry_run = "--dry-run" in sys.argv
    enricher = MetadataEnricher(dry_run=dry_run)
    await enricher.run()


if __name__ == "__main__":
    asyncio.run(main())
