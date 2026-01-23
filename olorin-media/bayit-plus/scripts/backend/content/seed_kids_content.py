#!/usr/bin/env python3
"""
Seed Kids Content Script

Seeds kids content from various sources into the database.
Supports seeding from curated lists, Archive.org, podcasts, and YouTube.

Usage:
    poetry run python scripts/content/seed_kids_content.py --source curated
    poetry run python scripts/content/seed_kids_content.py --source archive
    poetry run python scripts/content/seed_kids_content.py --source podcasts
    poetry run python scripts/content/seed_kids_content.py --source youtube
    poetry run python scripts/content/seed_kids_content.py --source all
    poetry run python scripts/content/seed_kids_content.py --clear
"""

import asyncio
import argparse
import logging
import os
import sys
from pathlib import Path

# Add parent directory to path for imports
project_root = os.getenv("PROJECT_ROOT", str(Path(__file__).parent.parent.parent.parent))
sys.path.insert(0, f"{project_root}/backend")

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.content import Content, , Podcast, PodcastEpisode
from app.models.content_taxonomy import ContentSection

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


async def seed_curated_content(age_max: int = None, categories: list = None):
    """Seed curated kids content from hardcoded data."""
    from app.services.kids_content_seeder import kids_content_seeder

    logger.info("Seeding curated kids content...")
    result = await kids_content_seeder.seed_content(
        age_max=age_max,
        categories=categories,
    )
    logger.info(f"Curated content: {result}")
    return result


async def seed_archive_content(verify: bool = True, age_max: int = None):
    """Import public domain content from Archive.org."""
    from app.services.kids_public_domain_importer import kids_public_domain_importer

    logger.info("Importing Archive.org public domain content...")
    result = await kids_public_domain_importer.import_curated_content(
        verify_availability=verify,
        age_max=age_max,
    )
    logger.info(f"Archive.org content: {result}")
    return result


async def seed_podcasts():
    """Sync kids podcasts from RSS feeds."""
    from app.services.kids_podcast_service import kids_podcast_service

    logger.info("Syncing kids podcasts...")
    result = await kids_podcast_service.sync_all_kids_podcasts()
    logger.info(f"Podcasts: {result}")
    return result


async def seed_youtube(max_videos: int = 20):
    """Sync content from YouTube kids channels."""
    from app.services.youtube_kids_service import youtube_kids_service

    if not settings.YOUTUBE_API_KEY:
        logger.warning("YOUTUBE_API_KEY not configured, skipping YouTube sync")
        return {"skipped": True, "reason": "No API key"}

    logger.info("Syncing YouTube kids channels...")
    result = await youtube_kids_service.sync_all_channels(
        max_videos_per_channel=max_videos,
    )
    logger.info(f"YouTube content: {result}")
    return result


async def clear_kids_content():
    """Clear all kids content from database."""
    from app.services.kids_content_seeder import kids_content_seeder

    logger.info("Clearing all kids content...")
    result = await kids_content_seeder.clear_kids_content()
    logger.info(f"Cleared: {result}")
    return result


async def get_stats():
    """Get current kids content statistics."""
    from app.services.kids_content_seeder import kids_content_seeder

    stats = await kids_content_seeder.get_seeding_stats()
    logger.info("Kids content statistics:")
    logger.info(f"  Total kids content: {stats['total_kids_content']}")
    logger.info(f"  By category: {stats['by_category']}")
    logger.info(f"  By age rating: {stats['by_age_rating']}")
    logger.info(f"  Seed data available: {stats['seed_data_available']}")
    return stats


async def main():
    """Main entry point for the seeding script."""
    parser = argparse.ArgumentParser(description="Seed kids content from various sources")
    parser.add_argument(
        "--source",
        type=str,
        choices=["curated", "archive", "podcasts", "youtube", "all"],
        help="Content source to seed from",
    )
    parser.add_argument("--clear", action="store_true", help="Clear all kids content")
    parser.add_argument("--stats", action="store_true", help="Show current stats")
    parser.add_argument("--age-max", type=int, help="Maximum age rating to seed")
    parser.add_argument("--max-videos", type=int, default=20, help="Max YouTube videos per channel")
    parser.add_argument("--no-verify", action="store_true", help="Skip Archive.org verification")

    args = parser.parse_args()

    if not args.source and not args.clear and not args.stats:
        parser.print_help()
        sys.exit(1)

    # Initialize database
    logger.info("Connecting to database...")
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[Content, Category, Podcast, PodcastEpisode],
    )

    results = {}

    if args.stats:
        results["stats"] = await get_stats()

    if args.clear:
        results["clear"] = await clear_kids_content()

    if args.source:
        if args.source in ["curated", "all"]:
            results["curated"] = await seed_curated_content(age_max=args.age_max)

        if args.source in ["archive", "all"]:
            results["archive"] = await seed_archive_content(
                verify=not args.no_verify,
                age_max=args.age_max,
            )

        if args.source in ["podcasts", "all"]:
            results["podcasts"] = await seed_podcasts()

        if args.source in ["youtube", "all"]:
            results["youtube"] = await seed_youtube(max_videos=args.max_videos)

    # Show final stats
    if args.source:
        await get_stats()

    logger.info("=" * 60)
    logger.info("Kids content seeding completed!")
    logger.info("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
