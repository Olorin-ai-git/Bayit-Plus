"""
Migration Script: Content Visibility Mode

This script sets all existing content to visibility_mode: "public" for backward compatibility.
New content will default to "public" as well, but can be set to "private" or "passkey_protected".

Usage:
    poetry run python scripts/migrate_content_visibility.py [--dry-run]

Options:
    --dry-run    Show what would be changed without making modifications
"""

import asyncio
import sys
from datetime import datetime
from typing import Optional

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

# Add parent directory to path for imports
sys.path.insert(0, str(__file__).rsplit("/", 2)[0])

from app.core.config import settings
from app.models.content import Content


async def migrate_content_visibility(dry_run: bool = False) -> dict:
    """
    Migrate existing content to have visibility_mode field.

    Args:
        dry_run: If True, only report what would be changed without modifying data

    Returns:
        Dictionary with migration statistics
    """
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]

    # Initialize Beanie with Content model
    await init_beanie(database=db, document_models=[Content])

    stats = {
        "total_content": 0,
        "already_set": 0,
        "updated_to_public": 0,
        "errors": 0,
        "dry_run": dry_run,
        "started_at": datetime.utcnow().isoformat(),
    }

    # Count total content
    stats["total_content"] = await Content.count()
    print(f"Total content items: {stats['total_content']}")

    # Find content without visibility_mode or with null value
    content_to_update = await Content.find(
        {
            "$or": [
                {"visibility_mode": {"$exists": False}},
                {"visibility_mode": None},
            ]
        }
    ).to_list()

    stats["already_set"] = stats["total_content"] - len(content_to_update)
    print(f"Content already with visibility_mode: {stats['already_set']}")
    print(f"Content needing update: {len(content_to_update)}")

    if dry_run:
        print("\n[DRY RUN] No changes will be made.")
        print(f"Would update {len(content_to_update)} content items to visibility_mode='public'")
        return stats

    # Update content in batches
    batch_size = 100
    for i in range(0, len(content_to_update), batch_size):
        batch = content_to_update[i : i + batch_size]
        for content in batch:
            try:
                content.visibility_mode = "public"
                await content.save()
                stats["updated_to_public"] += 1
            except Exception as e:
                print(f"Error updating content {content.id}: {e}")
                stats["errors"] += 1

        print(f"Progress: {min(i + batch_size, len(content_to_update))}/{len(content_to_update)}")

    stats["completed_at"] = datetime.utcnow().isoformat()
    print(f"\nMigration completed!")
    print(f"  Updated to public: {stats['updated_to_public']}")
    print(f"  Errors: {stats['errors']}")

    return stats


async def set_vod_to_protected(dry_run: bool = False, category_ids: Optional[list[str]] = None) -> dict:
    """
    Set VOD content (movies/series) to passkey_protected visibility.

    This is an optional step to enable the passkey protection feature
    for specific categories of content.

    Args:
        dry_run: If True, only report what would be changed
        category_ids: Optional list of category IDs to target

    Returns:
        Dictionary with migration statistics
    """
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[Content])

    stats = {
        "total_vod": 0,
        "updated_to_protected": 0,
        "skipped_free": 0,
        "errors": 0,
        "dry_run": dry_run,
    }

    # Build query for VOD content
    query = {
        "visibility_mode": "public",
        "$or": [
            {"is_series": True},
            {"content_type": {"$in": ["movie", "series", "episode"]}},
        ],
    }

    if category_ids:
        query["category_id"] = {"$in": category_ids}

    content_to_update = await Content.find(query).to_list()
    stats["total_vod"] = len(content_to_update)

    print(f"Found {stats['total_vod']} VOD content items")

    if dry_run:
        print("\n[DRY RUN] No changes will be made.")
        # Count free content
        free_count = sum(1 for c in content_to_update if c.requires_subscription == "none")
        stats["skipped_free"] = free_count
        print(f"Would update {stats['total_vod'] - free_count} items to passkey_protected")
        print(f"Would skip {free_count} free content items")
        return stats

    for content in content_to_update:
        try:
            # Skip free content - it should remain public
            if content.requires_subscription == "none":
                stats["skipped_free"] += 1
                continue

            content.visibility_mode = "passkey_protected"
            await content.save()
            stats["updated_to_protected"] += 1
        except Exception as e:
            print(f"Error updating content {content.id}: {e}")
            stats["errors"] += 1

    print(f"\nVOD protection completed!")
    print(f"  Updated to protected: {stats['updated_to_protected']}")
    print(f"  Skipped (free): {stats['skipped_free']}")
    print(f"  Errors: {stats['errors']}")

    return stats


def main():
    """Main entry point for the migration script."""
    dry_run = "--dry-run" in sys.argv
    protect_vod = "--protect-vod" in sys.argv

    if protect_vod:
        print("=" * 60)
        print("Setting VOD content to passkey_protected visibility")
        print("=" * 60)
        asyncio.run(set_vod_to_protected(dry_run=dry_run))
    else:
        print("=" * 60)
        print("Migrating existing content to have visibility_mode field")
        print("=" * 60)
        asyncio.run(migrate_content_visibility(dry_run=dry_run))


if __name__ == "__main__":
    main()
