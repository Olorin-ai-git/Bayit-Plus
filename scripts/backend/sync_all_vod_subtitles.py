#!/usr/bin/env python3
"""
Sync All VOD Subtitles Script

Syncs Content.available_subtitle_languages with actual SubtitleTrackDoc entries
for all VOD content (movies and series).

Usage:
    # Dry run (show what would change without updating)
    poetry run python scripts/sync_all_vod_subtitles.py --dry-run

    # Sync all VOD content
    poetry run python scripts/sync_all_vod_subtitles.py

    # Sync specific content by ID
    poetry run python scripts/sync_all_vod_subtitles.py --content-id 507f1f77bcf86cd799439011

    # Sync first 10 items (for testing)
    poetry run python scripts/sync_all_vod_subtitles.py --limit 10
"""

import asyncio
import logging
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import argparse
from datetime import datetime
from typing import Dict, List

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.content import Content
from app.models.subtitles import SubtitleTrackDoc

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


async def init_db():
    """Initialize database connection"""
    from pymongo.errors import OperationFailure

    client = AsyncIOMotorClient(settings.MONGODB_URL)
    database = client[settings.MONGODB_DB_NAME]

    try:
        await init_beanie(
            database=database,
            document_models=[Content, SubtitleTrackDoc]
        )
    except OperationFailure as e:
        # Ignore index conflicts - indexes already exist from main app
        if "IndexOptionsConflict" in str(e) or e.code == 85:
            logger.warning(f"Index conflict (expected for existing DB): {e.details.get('errmsg', str(e))[:100]}...")
            logger.info("Continuing with existing indexes")

            # Manually set up document classes without index creation
            Content._document_settings.motor_db = database
            Content._document_settings.motor_collection = database.content
            SubtitleTrackDoc._document_settings.motor_db = database
            SubtitleTrackDoc._document_settings.motor_collection = database.subtitle_tracks
        else:
            raise

    logger.info(f"Connected to MongoDB: {settings.MONGODB_DB_NAME}")


async def sync_single_content(content_id: str, dry_run: bool = False) -> Dict:
    """
    Sync subtitle languages for a single content item.

    Args:
        content_id: Content ID to sync
        dry_run: If True, only report changes without updating

    Returns:
        dict with sync results
    """
    try:
        content = await Content.get(content_id)
        if not content:
            return {
                "success": False,
                "error": "Content not found",
                "content_id": content_id
            }

        # Get actual subtitle tracks
        tracks = await SubtitleTrackDoc.get_for_content(content_id)
        actual_languages = sorted([track.language for track in tracks])
        current_languages = sorted(content.available_subtitle_languages or [])

        # Check if already in sync
        if actual_languages == current_languages:
            return {
                "success": True,
                "synced": False,
                "already_in_sync": True,
                "content_id": content_id,
                "title": content.title,
                "languages": actual_languages
            }

        # Calculate changes
        added = list(set(actual_languages) - set(current_languages))
        removed = list(set(current_languages) - set(actual_languages))

        result = {
            "success": True,
            "synced": True,
            "content_id": content_id,
            "title": content.title,
            "old_languages": current_languages,
            "new_languages": actual_languages,
            "added": added,
            "removed": removed
        }

        # Update if not dry run
        if not dry_run:
            content.available_subtitle_languages = actual_languages
            content.has_subtitles = len(actual_languages) > 0
            await content.save()
            logger.info(
                f"✅ Synced {content.title}",
                extra={
                    "content_id": content_id,
                    "old": current_languages,
                    "new": actual_languages
                }
            )
        else:
            logger.info(
                f"[DRY RUN] Would sync {content.title}",
                extra={
                    "content_id": content_id,
                    "old": current_languages,
                    "new": actual_languages
                }
            )

        return result

    except Exception as e:
        logger.error(f"Failed to sync {content_id}: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "content_id": content_id
        }


async def sync_all_vod_content(
    limit: int = None,
    dry_run: bool = False
) -> Dict:
    """
    Sync all VOD content subtitle languages.

    Args:
        limit: Optional limit on number of items to sync
        dry_run: If True, only report changes without updating

    Returns:
        dict with sync statistics
    """
    start_time = datetime.now()

    # Query all VOD content (movies and series)
    query = {
        "is_published": True,
        # VOD content includes movies and series episodes
        "$or": [
            {"category_id": {"$exists": True}},  # Has category = VOD
            {"is_series": True},  # Series episodes
            {"series_id": {"$exists": True}}  # Part of a series
        ]
    }

    logger.info("Querying all VOD content...")
    content_items = await Content.find(query).to_list()

    if limit:
        content_items = content_items[:limit]

    total_count = len(content_items)
    logger.info(f"Found {total_count} VOD content items")

    results = {
        "total": total_count,
        "synced": 0,
        "already_in_sync": 0,
        "failed": 0,
        "details": []
    }

    # Process each content item
    for i, content in enumerate(content_items, 1):
        logger.info(f"Processing {i}/{total_count}: {content.title}")

        result = await sync_single_content(str(content.id), dry_run)

        if result["success"]:
            if result.get("synced"):
                results["synced"] += 1
                results["details"].append(result)
            elif result.get("already_in_sync"):
                results["already_in_sync"] += 1
        else:
            results["failed"] += 1
            logger.error(f"Failed: {content.title} - {result.get('error')}")

    elapsed = (datetime.now() - start_time).total_seconds()

    # Summary
    logger.info("=" * 80)
    logger.info("SYNC COMPLETE")
    logger.info("=" * 80)
    logger.info(f"Mode: {'DRY RUN' if dry_run else 'LIVE UPDATE'}")
    logger.info(f"Total VOD items: {results['total']}")
    logger.info(f"Synced: {results['synced']}")
    logger.info(f"Already in sync: {results['already_in_sync']}")
    logger.info(f"Failed: {results['failed']}")
    logger.info(f"Time elapsed: {elapsed:.2f}s")
    logger.info("=" * 80)

    # Show details of synced items
    if results["details"]:
        logger.info(f"\n{len(results['details'])} items were updated:")
        for detail in results["details"]:
            logger.info(f"  • {detail['title']}")
            logger.info(f"    Added: {detail['added']}")
            logger.info(f"    Removed: {detail['removed']}")
            logger.info(f"    New languages: {detail['new_languages']}")

    return results


async def main():
    parser = argparse.ArgumentParser(
        description="Sync VOD subtitle languages with actual tracks"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would change without updating database"
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Limit number of items to sync (for testing)"
    )
    parser.add_argument(
        "--content-id",
        type=str,
        help="Sync specific content by ID"
    )

    args = parser.parse_args()

    # Initialize database
    await init_db()

    if args.content_id:
        # Sync single content
        logger.info(f"Syncing single content: {args.content_id}")
        result = await sync_single_content(args.content_id, args.dry_run)

        if result["success"]:
            if result.get("synced"):
                logger.info(f"✅ Successfully synced {result.get('title', args.content_id)}")
                logger.info(f"   Old languages: {result['old_languages']}")
                logger.info(f"   New languages: {result['new_languages']}")
            elif result.get("already_in_sync"):
                logger.info(f"✅ Already in sync: {result.get('title', args.content_id)}")
                logger.info(f"   Languages: {result['languages']}")
        else:
            logger.error(f"❌ Failed: {result.get('error')}")
            sys.exit(1)
    else:
        # Sync all VOD content
        logger.info("Starting VOD subtitle sync...")
        if args.dry_run:
            logger.warning("DRY RUN MODE - No changes will be made")

        results = await sync_all_vod_content(
            limit=args.limit,
            dry_run=args.dry_run
        )

        if results["failed"] > 0:
            logger.warning(f"{results['failed']} items failed to sync")
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
