#!/usr/bin/env python3
"""
Sync All VOD Subtitles Script (Simplified)

Uses raw MongoDB operations to avoid Beanie index conflicts.

Usage:
    poetry run python scripts/sync_all_vod_subtitles_simple.py --dry-run
    poetry run python scripts/sync_all_vod_subtitles_simple.py
    poetry run python scripts/sync_all_vod_subtitles_simple.py --content-id 507f...
"""

import asyncio
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import argparse
from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class SubtitleSync:
    def __init__(self):
        self.client = None
        self.db = None
        self.content_collection = None
        self.subtitles_collection = None

    async def connect(self):
        """Connect to MongoDB"""
        self.client = AsyncIOMotorClient(settings.MONGODB_URI or settings.MONGODB_URL)
        self.db = self.client[settings.MONGODB_DB_NAME]
        self.content_collection = self.db["content"]
        self.subtitles_collection = self.db["subtitle_tracks"]
        logger.info(f"✅ Connected to MongoDB: {settings.MONGODB_DB_NAME}")

    async def get_actual_subtitle_languages(self, content_id: str):
        """Get actual subtitle languages from SubtitleTrackDoc"""
        cursor = self.subtitles_collection.find({"content_id": content_id})
        tracks = await cursor.to_list(length=None)
        return sorted([track["language"] for track in tracks if "language" in track])

    async def sync_single(self, content_id: str, dry_run: bool = False):
        """Sync subtitle languages for single content"""
        try:
            # Get content
            content = await self.content_collection.find_one({"_id": ObjectId(content_id)})
            if not content:
                return {"success": False, "error": "Content not found"}

            # Get actual and current languages
            actual_languages = await self.get_actual_subtitle_languages(content_id)
            current_languages = sorted(content.get("available_subtitle_languages", []))

            # Check if already in sync
            if actual_languages == current_languages:
                return {
                    "success": True,
                    "synced": False,
                    "already_in_sync": True,
                    "content_id": content_id,
                    "title": content.get("title", "Unknown"),
                    "languages": actual_languages
                }

            # Calculate changes
            added = list(set(actual_languages) - set(current_languages))
            removed = list(set(current_languages) - set(actual_languages))

            result = {
                "success": True,
                "synced": True,
                "content_id": content_id,
                "title": content.get("title", "Unknown"),
                "old_languages": current_languages,
                "new_languages": actual_languages,
                "added": added,
                "removed": removed
            }

            # Update if not dry run
            if not dry_run:
                await self.content_collection.update_one(
                    {"_id": ObjectId(content_id)},
                    {"$set": {
                        "available_subtitle_languages": actual_languages,
                        "has_subtitles": len(actual_languages) > 0
                    }}
                )
                logger.info(f"✅ Synced: {content.get('title', 'Unknown')}")
                logger.info(f"   Old: {current_languages}")
                logger.info(f"   New: {actual_languages}")
            else:
                logger.info(f"[DRY RUN] Would sync: {content.get('title', 'Unknown')}")
                logger.info(f"   Old: {current_languages}")
                logger.info(f"   New: {actual_languages}")

            return result

        except Exception as e:
            logger.error(f"❌ Failed to sync {content_id}: {str(e)}")
            return {"success": False, "error": str(e), "content_id": content_id}

    async def sync_all(self, limit: int = None, dry_run: bool = False):
        """Sync all VOD content"""
        start_time = datetime.now()

        # Query all published VOD content
        query = {"is_published": True}
        cursor = self.content_collection.find(query)

        content_items = await cursor.to_list(length=None)

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
            content_id = str(content["_id"])
            title = content.get("title", "Unknown")

            logger.info(f"Processing {i}/{total_count}: {title}")

            result = await self.sync_single(content_id, dry_run)

            if result["success"]:
                if result.get("synced"):
                    results["synced"] += 1
                    results["details"].append(result)
                elif result.get("already_in_sync"):
                    results["already_in_sync"] += 1
            else:
                results["failed"] += 1

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

        # Show synced items
        if results["details"]:
            logger.info(f"\n{len(results['details'])} items were updated:")
            for detail in results["details"][:20]:  # Show first 20
                logger.info(f"  • {detail['title']}")
                if detail['added']:
                    logger.info(f"    Added: {detail['added']}")
                if detail['removed']:
                    logger.info(f"    Removed: {detail['removed']}")

        return results


async def main():
    parser = argparse.ArgumentParser(description="Sync VOD subtitle languages")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes only")
    parser.add_argument("--limit", type=int, help="Limit number of items")
    parser.add_argument("--content-id", type=str, help="Sync specific content by ID")

    args = parser.parse_args()

    syncer = SubtitleSync()
    await syncer.connect()

    try:
        if args.content_id:
            # Sync single content
            logger.info(f"Syncing content: {args.content_id}")
            result = await syncer.sync_single(args.content_id, args.dry_run)

            if result["success"]:
                if result.get("synced"):
                    logger.info(f"✅ Successfully synced")
                elif result.get("already_in_sync"):
                    logger.info(f"✅ Already in sync")
            else:
                logger.error(f"❌ Failed: {result.get('error')}")
                sys.exit(1)
        else:
            # Sync all VOD content
            logger.info("Starting VOD subtitle sync...")
            if args.dry_run:
                logger.warning("DRY RUN MODE - No changes will be made")

            results = await syncer.sync_all(limit=args.limit, dry_run=args.dry_run)

            if results["failed"] > 0:
                logger.warning(f"{results['failed']} items failed")
                sys.exit(1)
    finally:
        if syncer.client:
            syncer.client.close()


if __name__ == "__main__":
    asyncio.run(main())
