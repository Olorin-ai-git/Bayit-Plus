#!/usr/bin/env python3
"""Fix category/is_series field mismatches in content collection.

This script fixes data inconsistencies where:
- category_name contains "Series" but is_series is False
- category_name contains "Movie" but is_series is True

The frontend displays content type based on is_series field, while the category
column shows category_name, causing UI inconsistencies when these don't match.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.core.logging_config import get_logger
from datetime import datetime

logger = get_logger(__name__)


async def fix_category_mismatches():
    """Fix is_series field to match category_name."""
    logger.info("=" * 80)
    logger.info("Fixing Content Category/is_series Mismatches")
    logger.info("=" * 80)

    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    try:
        # Statistics
        stats = {
            "series_fixed": 0,
            "movie_fixed": 0,
            "skipped": 0,
            "errors": 0,
        }

        # CASE 1: category_name contains "Series" but is_series is False
        logger.info("\n--- Checking: category_name='Series' but is_series=False ---")
        series_mismatch_query = {
            "category_name": {"$regex": "series", "$options": "i"},
            "is_series": False,
        }

        series_items = await db.content.find(series_mismatch_query).to_list(length=None)
        logger.info(f"Found {len(series_items)} items with series category but is_series=False")

        for item in series_items:
            item_id = item["_id"]
            title = item.get("title", "Unknown")

            try:
                # Check if this is actually a series episode
                has_season = item.get("season") is not None
                has_episode = item.get("episode") is not None
                has_series_id = item.get("series_id") is not None

                if has_season or has_episode or has_series_id:
                    # This is clearly a series episode
                    result = await db.content.update_one(
                        {"_id": item_id},
                        {
                            "$set": {
                                "is_series": True,
                                "updated_at": datetime.utcnow(),
                            }
                        },
                    )
                    stats["series_fixed"] += 1
                    logger.info(
                        f"✅ Fixed: {title}",
                        extra={
                            "id": str(item_id),
                            "season": item.get("season"),
                            "episode": item.get("episode"),
                            "series_id": item.get("series_id"),
                        },
                    )
                else:
                    # Check episode count or other indicators
                    episode_count = await db.content.count_documents(
                        {"series_id": str(item_id)}
                    )

                    if episode_count > 0:
                        # This is a parent series with linked episodes
                        result = await db.content.update_one(
                            {"_id": item_id},
                            {
                                "$set": {
                                    "is_series": True,
                                    "updated_at": datetime.utcnow(),
                                }
                            },
                        )
                        stats["series_fixed"] += 1
                        logger.info(
                            f"✅ Fixed parent series: {title}",
                            extra={
                                "id": str(item_id),
                                "episode_count": episode_count,
                            },
                        )
                    else:
                        # No episodes yet, but category says "Series"
                        # This is likely a parent series placeholder or standalone series item
                        # Trust the category assignment
                        result = await db.content.update_one(
                            {"_id": item_id},
                            {
                                "$set": {
                                    "is_series": True,
                                    "updated_at": datetime.utcnow(),
                                }
                            },
                        )
                        stats["series_fixed"] += 1
                        logger.info(
                            f"✅ Fixed: {title} (parent series, no episodes yet)",
                            extra={"id": str(item_id), "reason": "category_name=Series"},
                        )

            except Exception as e:
                stats["errors"] += 1
                logger.error(
                    f"❌ Error fixing {title}",
                    extra={"error": str(e), "id": str(item_id)},
                )

        # CASE 2: category_name contains "Movie" but is_series is True
        logger.info("\n--- Checking: category_name='Movie' but is_series=True ---")
        movie_mismatch_query = {
            "category_name": {"$regex": "movie", "$options": "i"},
            "is_series": True,
        }

        movie_items = await db.content.find(movie_mismatch_query).to_list(length=None)
        logger.info(f"Found {len(movie_items)} items with movie category but is_series=True")

        for item in movie_items:
            item_id = item["_id"]
            title = item.get("title", "Unknown")

            try:
                # Check if this really should be a movie
                has_season = item.get("season") is not None
                has_episode = item.get("episode") is not None
                has_series_id = item.get("series_id") is not None

                if not has_season and not has_episode and not has_series_id:
                    # This is clearly a movie - no series indicators at all
                    result = await db.content.update_one(
                        {"_id": item_id},
                        {
                            "$set": {
                                "is_series": False,
                                "updated_at": datetime.utcnow(),
                            }
                        },
                    )
                    stats["movie_fixed"] += 1
                    logger.info(f"✅ Fixed: {title}", extra={"id": str(item_id)})
                else:
                    # Has series indicators (season/episode) but is in Movie category
                    # This is a miscategorization - should be in Series category
                    # Fix both is_series and category_name
                    result = await db.content.update_one(
                        {"_id": item_id},
                        {
                            "$set": {
                                "is_series": True,
                                "category_name": "Series",
                                "updated_at": datetime.utcnow(),
                            }
                        },
                    )
                    stats["series_fixed"] += 1
                    logger.info(
                        f"✅ Fixed: {title} (episode in wrong category)",
                        extra={
                            "id": str(item_id),
                            "season": item.get("season"),
                            "episode": item.get("episode"),
                            "old_category": "Movie",
                            "new_category": "Series",
                        },
                    )

            except Exception as e:
                stats["errors"] += 1
                logger.error(
                    f"❌ Error fixing {title}",
                    extra={"error": str(e), "id": str(item_id)},
                )

        # Print summary
        logger.info("\n" + "=" * 80)
        logger.info("Summary")
        logger.info("=" * 80)
        logger.info(
            "Fix completed",
            extra={
                "series_fixed": stats["series_fixed"],
                "movie_fixed": stats["movie_fixed"],
                "skipped": stats["skipped"],
                "errors": stats["errors"],
                "total_fixed": stats["series_fixed"] + stats["movie_fixed"],
            },
        )

        # Verification query
        logger.info("\n--- Verification ---")
        remaining_mismatches = await db.content.count_documents(
            {
                "$or": [
                    {
                        "category_name": {"$regex": "series", "$options": "i"},
                        "is_series": False,
                    },
                    {
                        "category_name": {"$regex": "movie", "$options": "i"},
                        "is_series": True,
                    },
                ]
            }
        )
        logger.info(f"Remaining mismatches: {remaining_mismatches}")

        if remaining_mismatches == 0:
            logger.info("✅ All mismatches resolved!")
        else:
            logger.warning(f"⚠️  {remaining_mismatches} items require manual review")

        logger.info("=" * 80)

    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(fix_category_mismatches())
