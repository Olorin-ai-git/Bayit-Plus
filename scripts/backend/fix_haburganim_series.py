#!/usr/bin/env python3
"""
Fix HaBurganim series - deduplicate entries, fix metadata, consolidate parents.

This script:
1. Identifies two duplicate parent records and their episodes
2. For duplicated episodes: keeps the one with correct israeli-series/ path, deletes the other
3. For orphaned episodes (only in the old path group): updates stream_url to correct path
4. Relinks all episodes to the canonical parent
5. Deletes the second (duplicate) parent
6. Fixes is_series on episodes (should be False)
7. Updates parent with correct total_seasons, total_episodes
8. Sets correct category and section_ids
"""

import asyncio
import re
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from bson import ObjectId
from google.cloud import storage
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import get_settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

CANONICAL_PARENT_ID = "697759978b025145b7430047"
DUPLICATE_PARENT_ID = "698761add64e8cd523d39ae0"
ISRAELI_SERIES_SECTION_ID = "698512c18239d8e593b50b0c"
TARGET_CATEGORY = "Israeli Series"


async def fix_haburganim(dry_run: bool = False):
    """Fix HaBurganim series duplicates and metadata."""
    settings = get_settings()

    logger.info("Connecting to MongoDB")
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    collection = db.content

    # Get all burganim entries
    all_entries = await collection.find(
        {"stream_url": {"$regex": "burganim", "$options": "i"}}
    ).to_list(length=200)

    logger.info("Found %d total burganim entries", len(all_entries))

    # Separate by parent
    canonical_eps = []
    duplicate_eps = []
    other_eps = []

    for entry in all_entries:
        sid = str(entry.get("series_id", ""))
        if sid == CANONICAL_PARENT_ID:
            canonical_eps.append(entry)
        elif sid == DUPLICATE_PARENT_ID:
            duplicate_eps.append(entry)
        else:
            other_eps.append(entry)

    logger.info("Canonical parent episodes: %d", len(canonical_eps))
    logger.info("Duplicate parent episodes: %d", len(duplicate_eps))
    logger.info("Other/unlinked episodes: %d", len(other_eps))

    # Group canonical entries by season+episode key
    canonical_by_key = {}
    for ep in canonical_eps:
        s = ep.get("season")
        e = ep.get("episode")
        key = (s, e)
        canonical_by_key[key] = ep

    # Process duplicate parent entries
    # Track which keys we've already migrated to avoid within-batch duplicates
    migrated_keys = set()
    deleted = 0
    migrated = 0
    updated = 0

    for ep in duplicate_eps:
        s = ep.get("season")
        e = ep.get("episode")
        key = (s, e)
        ep_id = ep["_id"]
        title = ep.get("title", "Unknown")

        if key in canonical_by_key or key in migrated_keys:
            # Duplicate exists in canonical or already migrated - delete this one
            source = "canonical" if key in canonical_by_key else "batch"
            logger.info(
                "  DELETE duplicate: %s (S%sE%s) - %s exists",
                title, s, e, source,
            )
            if not dry_run:
                await collection.delete_one({"_id": ep_id})
            deleted += 1
        else:
            # No canonical counterpart - migrate this entry
            # Build correct stream_url
            new_blob = f"israeli-series/HaBurganim/HaBurganim_S{s:02d}E{e:02d}.mp4"
            old_url = ep.get("stream_url", "")
            bucket_match = re.search(
                r"https://storage\.googleapis\.com/([^/]+)/",
                old_url,
            )
            if bucket_match:
                bucket_name = bucket_match.group(1)
                new_url = f"https://storage.googleapis.com/{bucket_name}/{new_blob}"
            else:
                new_url = old_url

            logger.info(
                "  MIGRATE: %s (S%sE%s) -> canonical parent",
                title, s, e,
            )

            # Check if the GCS blob needs to be moved
            if not dry_run and bucket_match:
                try:
                    storage_client = storage.Client()
                    bucket = storage_client.bucket(bucket_name)
                    new_blob_obj = bucket.blob(new_blob)
                    if not new_blob_obj.exists():
                        from urllib.parse import unquote
                        prefix = f"https://storage.googleapis.com/{bucket_name}/"
                        old_blob_name = unquote(old_url[len(prefix):]) if old_url.startswith(prefix) else None
                        if old_blob_name:
                            old_blob_obj = bucket.blob(old_blob_name)
                            if old_blob_obj.exists():
                                bucket.copy_blob(old_blob_obj, bucket, new_blob)
                                old_blob_obj.delete()
                                logger.info("    GCS: copied %s -> %s", old_blob_name, new_blob)
                except Exception as ex:
                    logger.warning("    GCS move failed: %s", ex)

            ep_update = {
                "series_id": CANONICAL_PARENT_ID,
                "stream_url": new_url,
                "is_series": False,
                "category_name": TARGET_CATEGORY,
                "section_ids": [ISRAELI_SERIES_SECTION_ID],
                "primary_section_id": ISRAELI_SERIES_SECTION_ID,
                "title": f"HaBurganim S{s:02d}E{e:02d}",
            }
            if not dry_run:
                await collection.update_one(
                    {"_id": ep_id},
                    {"$set": ep_update},
                )
            migrated_keys.add(key)
            migrated += 1

    # Fix canonical episodes metadata
    for ep in canonical_eps:
        ep_id = ep["_id"]
        ep_section_ids = ep.get("section_ids", [])
        if ISRAELI_SERIES_SECTION_ID not in ep_section_ids:
            ep_section_ids = ep_section_ids + [ISRAELI_SERIES_SECTION_ID]

        ep_update = {
            "is_series": False,
            "category_name": TARGET_CATEGORY,
            "section_ids": ep_section_ids,
            "primary_section_id": ISRAELI_SERIES_SECTION_ID,
        }
        if not dry_run:
            await collection.update_one(
                {"_id": ep_id},
                {"$set": ep_update},
            )
        updated += 1

    # Delete duplicate parent
    dup_parent = await collection.find_one(
        {"_id": ObjectId(DUPLICATE_PARENT_ID)}
    )
    if dup_parent:
        logger.info("Deleting duplicate parent: %s", dup_parent.get("title"))
        if not dry_run:
            await collection.delete_one({"_id": ObjectId(DUPLICATE_PARENT_ID)})

    # Compute final episode counts from canonical + migrated entries
    # (DB query won't reflect dry-run changes, so compute from our data)
    final_keys = set()
    seasons = set()
    for ep in canonical_eps:
        s = ep.get("season")
        e = ep.get("episode")
        if s is not None:
            seasons.add(s)
        final_keys.add((s, e))
    for key in migrated_keys:
        s, e = key
        if s is not None:
            seasons.add(s)
        final_keys.add(key)

    total_seasons = len(seasons) if seasons else 3
    total_episodes = len(final_keys)

    # Update canonical parent
    parent_update = {
        "category_name": TARGET_CATEGORY,
        "total_seasons": total_seasons,
        "total_episodes": total_episodes,
        "section_ids": [ISRAELI_SERIES_SECTION_ID],
        "primary_section_id": ISRAELI_SERIES_SECTION_ID,
    }
    logger.info("Updating canonical parent: %s", parent_update)
    if not dry_run:
        await collection.update_one(
            {"_id": ObjectId(CANONICAL_PARENT_ID)},
            {"$set": parent_update},
        )

    mode = "DRY RUN" if dry_run else "APPLIED"
    logger.info("=" * 60)
    logger.info("Fix HaBurganim complete (%s)", mode)
    logger.info("  Duplicates deleted: %d", deleted)
    logger.info("  Episodes migrated to canonical: %d", migrated)
    logger.info("  Canonical episodes updated: %d", updated)
    logger.info("  Duplicate parent deleted: %s", "Yes" if dup_parent else "No")
    logger.info("  Total seasons: %d", total_seasons)
    logger.info("  Total episodes: %d", total_episodes)
    logger.info("=" * 60)

    client.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Fix HaBurganim series duplicates and metadata"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without applying them",
    )
    args = parser.parse_args()

    asyncio.run(fix_haburganim(dry_run=args.dry_run))
