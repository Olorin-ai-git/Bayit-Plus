#!/usr/bin/env python3
"""
Fix Palmach series metadata in MongoDB.

This script:
1. Updates parent series category to "Israeli Series"
2. Updates all episodes category from "Israeli Movies" to "Israeli Series"
3. Sets total_seasons and total_episodes on parent
4. Adds Israeli Series section_ids where missing
5. Handles the duplicate episode=0 entry
"""

import asyncio
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import get_settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

PALMACH_PARENT_ID = "697fcf3ab7976ccba004554b"
PALMACH_DUPLICATE_ID = "697fcf3ab7976ccba004554c"
ISRAELI_SERIES_SECTION_ID = "698512c18239d8e593b50b0c"
TARGET_CATEGORY = "Israeli Series"


async def fix_palmach_series(dry_run: bool = False):
    """Fix Palmach series category and metadata."""
    settings = get_settings()

    logger.info("Connecting to MongoDB")
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    collection = db.content

    # 1. Verify parent exists
    parent = await collection.find_one(
        {"_id": ObjectId(PALMACH_PARENT_ID)}
    )
    if not parent:
        logger.error("Palmach parent not found: %s", PALMACH_PARENT_ID)
        client.close()
        return

    logger.info("Found parent: %s (category: %s)", parent.get("title"), parent.get("category_name"))

    # 2. Find all episodes linked to this parent (series_id may be ObjectId or string)
    episodes = await collection.find(
        {"$or": [
            {"series_id": PALMACH_PARENT_ID},
            {"series_id": ObjectId(PALMACH_PARENT_ID)},
        ]}
    ).to_list(length=None)

    logger.info("Found %d episodes linked to parent", len(episodes))

    # 3. Check for duplicate entry (episode=0)
    duplicate = await collection.find_one(
        {"_id": ObjectId(PALMACH_DUPLICATE_ID)}
    )
    if duplicate:
        logger.info(
            "Found duplicate entry: %s (title: %s, episode: %s)",
            PALMACH_DUPLICATE_ID,
            duplicate.get("title"),
            duplicate.get("episode"),
        )

    # Calculate season/episode stats
    seasons = set()
    episode_count = 0
    for ep in episodes:
        season = ep.get("season")
        episode_num = ep.get("episode")
        if season is not None:
            seasons.add(season)
        if episode_num is not None and episode_num > 0:
            episode_count += 1

    total_seasons = len(seasons) if seasons else 1
    total_episodes = episode_count if episode_count > 0 else len(episodes)

    logger.info("Stats: %d seasons, %d episodes", total_seasons, total_episodes)

    # Build section_ids list with Israeli Series section
    existing_section_ids = parent.get("section_ids", [])
    if ISRAELI_SERIES_SECTION_ID not in existing_section_ids:
        updated_section_ids = existing_section_ids + [ISRAELI_SERIES_SECTION_ID]
    else:
        updated_section_ids = existing_section_ids

    updated = 0

    # 4. Update parent series
    parent_update = {
        "category_name": TARGET_CATEGORY,
        "total_seasons": total_seasons,
        "total_episodes": total_episodes,
        "section_ids": updated_section_ids,
        "primary_section_id": ISRAELI_SERIES_SECTION_ID,
    }
    logger.info("Updating parent: %s", parent_update)

    if not dry_run:
        await collection.update_one(
            {"_id": ObjectId(PALMACH_PARENT_ID)},
            {"$set": parent_update},
        )
        updated += 1

    # 5. Update all episodes category
    for ep in episodes:
        ep_id = ep["_id"]
        ep_title = ep.get("title", "Unknown")
        old_category = ep.get("category_name", "Unknown")

        ep_section_ids = ep.get("section_ids", [])
        if ISRAELI_SERIES_SECTION_ID not in ep_section_ids:
            ep_section_ids = ep_section_ids + [ISRAELI_SERIES_SECTION_ID]

        ep_update = {
            "category_name": TARGET_CATEGORY,
            "section_ids": ep_section_ids,
            "primary_section_id": ISRAELI_SERIES_SECTION_ID,
        }

        if old_category != TARGET_CATEGORY:
            logger.info(
                "  Episode %s: %s -> %s",
                ep_title, old_category, TARGET_CATEGORY,
            )

        if not dry_run:
            await collection.update_one(
                {"_id": ep_id},
                {"$set": ep_update},
            )
            updated += 1

    # 6. Handle duplicate entry (episode=0)
    if duplicate:
        dup_category = duplicate.get("category_name", "Unknown")
        dup_section_ids = duplicate.get("section_ids", [])
        if ISRAELI_SERIES_SECTION_ID not in dup_section_ids:
            dup_section_ids = dup_section_ids + [ISRAELI_SERIES_SECTION_ID]

        dup_update = {
            "category_name": TARGET_CATEGORY,
            "section_ids": dup_section_ids,
            "primary_section_id": ISRAELI_SERIES_SECTION_ID,
        }
        logger.info(
            "  Duplicate entry %s: %s -> %s",
            PALMACH_DUPLICATE_ID, dup_category, TARGET_CATEGORY,
        )

        if not dry_run:
            await collection.update_one(
                {"_id": ObjectId(PALMACH_DUPLICATE_ID)},
                {"$set": dup_update},
            )
            updated += 1

    mode = "DRY RUN" if dry_run else "APPLIED"
    logger.info("=" * 60)
    logger.info("Fix Palmach series complete (%s)", mode)
    logger.info("  Parent updated: 1")
    logger.info("  Episodes updated: %d", len(episodes))
    logger.info("  Duplicate handled: %s", "Yes" if duplicate else "No")
    logger.info("  Total documents updated: %d", updated)
    logger.info("  Category: %s", TARGET_CATEGORY)
    logger.info("  Section ID: %s", ISRAELI_SERIES_SECTION_ID)
    logger.info("  Total seasons: %d", total_seasons)
    logger.info("  Total episodes: %d", total_episodes)
    logger.info("=" * 60)

    client.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Fix Palmach series metadata"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without applying them",
    )
    args = parser.parse_args()

    asyncio.run(fix_palmach_series(dry_run=args.dry_run))
