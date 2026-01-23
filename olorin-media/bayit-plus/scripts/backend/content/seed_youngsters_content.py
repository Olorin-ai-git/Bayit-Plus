#!/usr/bin/env python3
"""
Seed Youngsters Content Script

Seeds youngsters content (ages 12-17) from various sources into the database.
Supports seeding from curated lists with PG-13 filtering.

Usage:
    poetry run python scripts/content/seed_youngsters_content.py --source curated
    poetry run python scripts/content/seed_youngsters_content.py --source all
    poetry run python scripts/content/seed_youngsters_content.py --clear
    poetry run python scripts/content/seed_youngsters_content.py --stats
"""

import argparse
import asyncio
import logging
import sys

# Add parent directory to path for imports
sys.path.insert(0, "/Users/olorin/Documents/olorin/backend")

from app.core.config import settings
from app.core.database import document_models
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


async def seed_curated_content(age_max: int = None, categories: list = None):
    """Seed curated youngsters content from hardcoded data."""
    from app.services.youngsters_content_seeder import youngsters_content_seeder

    logger.info("Seeding curated youngsters content...")
    result = await youngsters_content_seeder.seed_content(
        clear_existing=False,
        categories=categories,
    )
    logger.info(f"Curated content: {result}")
    return result


async def clear_youngsters_content():
    """Clear all youngsters content from database."""
    from app.services.youngsters_content_seeder import youngsters_content_seeder

    logger.info("Clearing all youngsters content...")
    result = await youngsters_content_seeder.seed_content(clear_existing=True)
    logger.info(f"Cleared: {result}")
    return result


async def show_stats():
    """Show statistics about youngsters content in database."""
    from app.models.content import Content

    logger.info("Gathering youngsters content statistics...")

    total = await Content.find({"is_youngsters_content": True}).count()
    published = await Content.find(
        {"is_youngsters_content": True, "is_published": True}
    ).count()

    # Count by age rating
    age_12 = await Content.find(
        {"is_youngsters_content": True, "youngsters_age_rating": 12}
    ).count()
    age_14 = await Content.find(
        {"is_youngsters_content": True, "youngsters_age_rating": 14}
    ).count()
    age_17 = await Content.find(
        {"is_youngsters_content": True, "youngsters_age_rating": 17}
    ).count()

    # Moderation status
    pending = await Content.find(
        {
            "is_youngsters_content": True,
            "youngsters_moderation_status": {"$in": ["pending", None]},
        }
    ).count()
    approved = await Content.find(
        {
            "is_youngsters_content": True,
            "youngsters_moderation_status": "approved",
        }
    ).count()
    rejected = await Content.find(
        {
            "is_youngsters_content": True,
            "youngsters_moderation_status": "rejected",
        }
    ).count()

    stats = {
        "total": total,
        "published": published,
        "unpublished": total - published,
        "by_age_rating": {
            "age_12": age_12,
            "age_14": age_14,
            "age_17": age_17,
        },
        "moderation": {
            "pending": pending,
            "approved": approved,
            "rejected": rejected,
        },
    }

    logger.info("Youngsters Content Statistics:")
    logger.info(f"  Total: {stats['total']}")
    logger.info(f"  Published: {stats['published']}")
    logger.info(f"  Unpublished: {stats['unpublished']}")
    logger.info(f"  Age 12+: {stats['by_age_rating']['age_12']}")
    logger.info(f"  Age 14+: {stats['by_age_rating']['age_14']}")
    logger.info(f"  Age 17+: {stats['by_age_rating']['age_17']}")
    logger.info(f"  Pending Moderation: {stats['moderation']['pending']}")
    logger.info(f"  Approved: {stats['moderation']['approved']}")
    logger.info(f"  Rejected: {stats['moderation']['rejected']}")

    return stats


async def main():
    parser = argparse.ArgumentParser(
        description="Seed youngsters content from various sources"
    )
    parser.add_argument(
        "--source",
        choices=["curated", "all"],
        default="curated",
        help="Content source to seed from",
    )
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Clear all youngsters content before seeding",
    )
    parser.add_argument(
        "--stats",
        action="store_true",
        help="Show statistics about youngsters content",
    )
    parser.add_argument(
        "--age-max",
        type=int,
        choices=[12, 14, 17],
        help="Maximum age rating to seed (12, 14, or 17)",
    )
    parser.add_argument(
        "--categories",
        nargs="+",
        help="Specific categories to seed (trending, news, culture, educational, etc.)",
    )

    args = parser.parse_args()

    # Initialize database connection
    logger.info("Connecting to MongoDB...")
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client[settings.DB_NAME], document_models=document_models
    )
    logger.info("Database initialized")

    results = {}

    try:
        if args.clear:
            results["clear"] = await clear_youngsters_content()

        if args.stats:
            results["stats"] = await show_stats()
        elif args.source == "curated":
            results["curated"] = await seed_curated_content(
                age_max=args.age_max,
                categories=args.categories,
            )
        elif args.source == "all":
            results["curated"] = await seed_curated_content(
                age_max=args.age_max,
                categories=args.categories,
            )
            # Future: Add more sources here (YouTube, podcasts, etc.)

        logger.info("=" * 80)
        logger.info("YOUNGSTERS CONTENT SEEDING COMPLETE")
        logger.info("=" * 80)
        logger.info(f"Results: {results}")

    except Exception as e:
        logger.error(f"Error during seeding: {e}", exc_info=True)
        sys.exit(1)
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
