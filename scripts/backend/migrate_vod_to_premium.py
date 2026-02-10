"""
Migration Script: VOD Content Subscription Tier

Upgrades existing VOD content (movies, series, documentaries, shorts, clips)
from requires_subscription="basic" to requires_subscription="premium".

Podcasts, radio, and widgets are NOT affected.

Usage:
    poetry run python scripts/migrate_vod_to_premium.py [--dry-run]

Options:
    --dry-run    Show what would be changed without making modifications
"""

import asyncio
import sys
from datetime import datetime

from motor.motor_asyncio import AsyncIOMotorClient

sys.path.insert(0, str(__file__).rsplit("/", 2)[0])

from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

VOD_FORMATS = ["movie", "series", "documentary", "short", "clip"]


async def migrate_vod_to_premium(dry_run: bool = False) -> dict:
    """
    Update VOD content from requires_subscription='basic' to 'premium'.

    Only targets content_format values that represent VOD content.
    Podcasts, radio stations, and widgets are unaffected.

    Args:
        dry_run: If True, only report what would be changed

    Returns:
        Dictionary with migration statistics
    """
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]

    query = {
        "requires_subscription": "basic",
        "content_format": {"$in": VOD_FORMATS},
    }

    stats = {
        "dry_run": dry_run,
        "started_at": datetime.utcnow().isoformat(),
        "matched": 0,
        "modified": 0,
    }

    matched_count = await db.content.count_documents(query)
    stats["matched"] = matched_count

    logger.info(
        "VOD premium migration starting",
        extra={"matched": matched_count, "dry_run": dry_run},
    )

    if dry_run:
        logger.info(
            "Dry run complete",
            extra={"would_update": matched_count},
        )
        return stats

    result = await db.content.update_many(
        query,
        {"$set": {"requires_subscription": "premium"}},
    )

    stats["modified"] = result.modified_count
    stats["completed_at"] = datetime.utcnow().isoformat()

    logger.info(
        "VOD premium migration completed",
        extra={
            "matched": result.matched_count,
            "modified": result.modified_count,
        },
    )

    return stats


def main():
    """Entry point for the migration script."""
    dry_run = "--dry-run" in sys.argv
    asyncio.run(migrate_vod_to_premium(dry_run=dry_run))


if __name__ == "__main__":
    main()
