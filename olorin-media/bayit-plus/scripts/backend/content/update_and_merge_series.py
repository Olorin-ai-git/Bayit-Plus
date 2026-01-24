#!/usr/bin/env python3
"""
Update and merge duplicate series entries.

This script:
1. Applies a poster to a series
2. Merges duplicate series entries by transferring all episodes and metadata
3. Updates watchlist/favorites references

Usage:
    From backend directory:
        poetry run python ../scripts/backend/content/update_and_merge_series.py [poster_url] [backdrop_url]

    From scripts directory:
        poetry run python -m backend.scripts.content.update_and_merge_series [poster_url] [backdrop_url]
"""

import asyncio
import os
import sys
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional

# Add parent directory to path (same as organize_series.py)
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "backend"))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent.parent.parent / "backend" / ".env")

import logging
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import Content
from app.core.config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class SeriesMerger:
    """Handles series merging and poster updates."""

    def __init__(self, db):
        self.db = db
        self.stats = {
            "episodes_transferred": 0,
            "watchlist_updated": 0,
            "favorites_updated": 0,
            "errors": 0,
        }

    async def apply_poster(
        self,
        series_id: str,
        poster_url: str,
        backdrop_url: Optional[str] = None
    ) -> bool:
        """Apply poster to a series."""
        logger.info(f"📸 Applying poster to series {series_id}")

        try:
            series = await Content.find_one(Content.id == ObjectId(series_id))

            if not series:
                logger.error(f"❌ Series not found: {series_id}")
                return False

            logger.info(f"   Found: {series.title}")
            logger.info(f"   Current poster: {series.poster_url or 'None'}")

            # Update poster fields
            series.poster_url = poster_url
            series.thumbnail = poster_url  # Thumbnail often used as fallback

            if backdrop_url:
                series.backdrop = backdrop_url
                logger.info(f"   Setting backdrop: {backdrop_url}")

            series.updated_at = datetime.now(timezone.utc)
            await series.save()

            logger.info(f"✅ Poster applied successfully")
            logger.info(f"   New poster: {series.poster_url}")

            return True

        except Exception as e:
            logger.error(f"❌ Failed to apply poster: {e}")
            self.stats["errors"] += 1
            return False

    async def get_series_info(self, series_id: str) -> Optional[dict]:
        """Get series information."""
        try:
            series = await Content.find_one(Content.id == ObjectId(series_id))

            if not series:
                return None

            # Count episodes using the database directly
            episode_count = await self.db.content.count_documents({
                "series_id": series_id
            })

            return {
                "id": series_id,
                "title": series.title,
                "is_series": series.is_series,
                "content_type": series.content_type,
                "tmdb_id": series.tmdb_id,
                "poster_url": series.poster_url,
                "backdrop": series.backdrop,
                "total_episodes": series.total_episodes,
                "actual_episodes": episode_count,
                "year": series.year,
                "rating": series.rating,
                "is_published": series.is_published,
            }
        except Exception as e:
            logger.error(f"❌ Error getting series info for {series_id}: {e}")
            return None

    async def merge_series(
        self,
        source_id: str,
        target_id: str,
        delete_source: bool = False
    ) -> bool:
        """
        Merge two duplicate series.

        Args:
            source_id: ID of series to merge FROM (will be removed/unpublished)
            target_id: ID of series to merge TO (will be kept)
            delete_source: If True, delete source. If False, unpublish it.

        Returns:
            True if successful
        """
        logger.info(f"🔄 Merging series {source_id} → {target_id}")

        try:
            # Get both series
            source = await Content.find_one(Content.id == ObjectId(source_id))
            target = await Content.find_one(Content.id == ObjectId(target_id))

            if not source or not target:
                logger.error(f"❌ Source or target series not found")
                return False

            logger.info(f"   Source: {source.title} ({source_id})")
            logger.info(f"   Target: {target.title} ({target_id})")

            # Transfer all episodes from source to target
            episodes_transferred = await self.transfer_episodes(source_id, target_id)
            self.stats["episodes_transferred"] += episodes_transferred

            # Update watchlist references
            watchlist_updated = await self.update_watchlist_references(source_id, target_id)
            self.stats["watchlist_updated"] += watchlist_updated

            # Update favorites references
            favorites_updated = await self.update_favorites_references(source_id, target_id)
            self.stats["favorites_updated"] += favorites_updated

            # Merge metadata (keep target's data but fill in gaps from source)
            await self.merge_metadata(source, target)

            # Handle source series
            if delete_source:
                logger.info(f"   🗑️  Deleting source series")
                await source.delete()
            else:
                logger.info(f"   📦 Unpublishing source series")
                source.is_published = False
                source.updated_at = datetime.now(timezone.utc)
                await source.save()

            # Update target episode count
            actual_episodes = await self.db.content.count_documents({"series_id": target_id})
            target.total_episodes = actual_episodes
            target.updated_at = datetime.now(timezone.utc)
            await target.save()

            logger.info(f"✅ Series merged successfully")
            logger.info(f"   Episodes transferred: {episodes_transferred}")
            logger.info(f"   Watchlist updated: {watchlist_updated}")
            logger.info(f"   Favorites updated: {favorites_updated}")

            return True

        except Exception as e:
            logger.error(f"❌ Failed to merge series: {e}")
            self.stats["errors"] += 1
            import traceback
            traceback.print_exc()
            return False

    async def transfer_episodes(self, source_series_id: str, target_series_id: str) -> int:
        """Transfer all episodes from source series to target series."""
        logger.info(f"   📋 Transferring episodes...")

        # Find all episodes belonging to source series
        result = await self.db.content.update_many(
            {"series_id": source_series_id},
            {
                "$set": {
                    "series_id": target_series_id,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )

        count = result.modified_count
        logger.info(f"      ✅ Transferred {count} episodes")
        return count

    async def update_watchlist_references(self, source_id: str, target_id: str) -> int:
        """Update watchlist references from source to target."""
        logger.info(f"   📌 Updating watchlist references...")

        try:
            result = await self.db.watchlist.update_many(
                {"content_id": source_id},
                {
                    "$set": {
                        "content_id": target_id,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )

            count = result.modified_count
            logger.info(f"      ✅ Updated {count} watchlist entries")
            return count

        except Exception as e:
            logger.warning(f"      ⚠️ Watchlist update error (collection may not exist): {e}")
            return 0

    async def update_favorites_references(self, source_id: str, target_id: str) -> int:
        """Update favorites references from source to target."""
        logger.info(f"   ⭐ Updating favorites references...")

        try:
            result = await self.db.favorites.update_many(
                {"content_id": source_id},
                {
                    "$set": {
                        "content_id": target_id,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )

            count = result.modified_count
            logger.info(f"      ✅ Updated {count} favorites entries")
            return count

        except Exception as e:
            logger.warning(f"      ⚠️ Favorites update error (collection may not exist): {e}")
            return 0

    async def merge_metadata(self, source: Content, target: Content):
        """Merge metadata from source to target (fill in gaps only)."""
        logger.info(f"   📝 Merging metadata...")

        updated = False

        # Fill in missing fields from source
        fields_to_merge = [
            'description', 'description_en', 'description_es',
            'poster_url', 'thumbnail', 'backdrop',
            'tmdb_id', 'imdb_id', 'imdb_rating', 'imdb_votes',
            'trailer_url', 'preview_url',
            'genres', 'cast', 'director',
            'year', 'rating', 'duration',
            'total_seasons', 'total_episodes'
        ]

        for field in fields_to_merge:
            target_value = getattr(target, field, None)
            source_value = getattr(source, field, None)

            # Only fill if target doesn't have value but source does
            if not target_value and source_value:
                setattr(target, field, source_value)
                logger.info(f"      📌 Filled {field} from source")
                updated = True

        if updated:
            target.updated_at = datetime.now(timezone.utc)
            await target.save()
            logger.info(f"      ✅ Metadata merged")
        else:
            logger.info(f"      ℹ️  No metadata needed merging")

    def print_summary(self):
        """Print operation summary."""
        logger.info("\n" + "=" * 80)
        logger.info("OPERATION SUMMARY")
        logger.info("=" * 80)
        logger.info(f"Episodes transferred:  {self.stats['episodes_transferred']}")
        logger.info(f"Watchlist updated:     {self.stats['watchlist_updated']}")
        logger.info(f"Favorites updated:     {self.stats['favorites_updated']}")
        logger.info(f"Errors:                {self.stats['errors']}")
        logger.info("=" * 80)


async def main():
    """Main entry point."""

    # Series IDs from user request
    TARGET_SERIES_ID = "696f824772937026f35b4991"  # Keep this one
    SOURCE_SERIES_ID = "696c7c0a17d54f3a57e73bf0"  # Merge from this one

    # Poster URL - Update this with the actual poster image URL
    # If you have a local image, upload it to GCS or TMDB first, then use that URL
    POSTER_URL = None  # Set to None to skip poster update, or provide URL
    BACKDROP_URL = None  # Optional backdrop URL

    # Allow command-line arguments
    if len(sys.argv) > 1:
        POSTER_URL = sys.argv[1]
        logger.info(f"Using poster URL from command line: {POSTER_URL}")

    if len(sys.argv) > 2:
        BACKDROP_URL = sys.argv[2]
        logger.info(f"Using backdrop URL from command line: {BACKDROP_URL}")

    logger.info("=" * 80)
    logger.info("UPDATE AND MERGE SERIES")
    logger.info("=" * 80)
    logger.info(f"Target series: {TARGET_SERIES_ID}")
    logger.info(f"Source series: {SOURCE_SERIES_ID}")
    logger.info(f"Poster: {POSTER_URL}")
    logger.info("=" * 80)

    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    # Initialize Beanie
    await init_beanie(database=db, document_models=[Content])

    logger.info("📡 Connected to MongoDB")

    try:
        merger = SeriesMerger(db)

        # Step 1: Get information about both series
        logger.info("\n" + "=" * 80)
        logger.info("STEP 1: Analyze Series")
        logger.info("=" * 80)

        target_info = await merger.get_series_info(TARGET_SERIES_ID)
        source_info = await merger.get_series_info(SOURCE_SERIES_ID)

        if not target_info or not source_info:
            logger.error("❌ Could not find one or both series")
            return

        logger.info("\n📊 TARGET SERIES (will be kept):")
        logger.info(f"   ID: {target_info['id']}")
        logger.info(f"   Title: {target_info['title']}")
        logger.info(f"   Type: {target_info['content_type']}")
        logger.info(f"   TMDB ID: {target_info['tmdb_id']}")
        logger.info(f"   Episodes: {target_info['actual_episodes']}")
        logger.info(f"   Has Poster: {'Yes' if target_info['poster_url'] else 'No'}")
        logger.info(f"   Published: {target_info['is_published']}")

        logger.info("\n📊 SOURCE SERIES (will be merged):")
        logger.info(f"   ID: {source_info['id']}")
        logger.info(f"   Title: {source_info['title']}")
        logger.info(f"   Type: {source_info['content_type']}")
        logger.info(f"   TMDB ID: {source_info['tmdb_id']}")
        logger.info(f"   Episodes: {source_info['actual_episodes']}")
        logger.info(f"   Has Poster: {'Yes' if source_info['poster_url'] else 'No'}")
        logger.info(f"   Published: {source_info['is_published']}")

        # Step 2: Apply poster to target series (if provided)
        if POSTER_URL:
            logger.info("\n" + "=" * 80)
            logger.info("STEP 2: Apply Poster")
            logger.info("=" * 80)

            poster_applied = await merger.apply_poster(
                TARGET_SERIES_ID,
                POSTER_URL,
                BACKDROP_URL
            )

            if not poster_applied:
                logger.error("❌ Failed to apply poster")
                return
        else:
            logger.info("\n" + "=" * 80)
            logger.info("STEP 2: Apply Poster - SKIPPED (no poster URL provided)")
            logger.info("=" * 80)
            logger.info("To apply a poster, run:")
            logger.info(f"  poetry run python scripts/backend/content/update_and_merge_series.py <poster_url>")
            logger.info(f"  poetry run python scripts/backend/content/update_and_merge_series.py <poster_url> <backdrop_url>")

        # Step 3: Merge series
        logger.info("\n" + "=" * 80)
        logger.info("STEP 3: Merge Series")
        logger.info("=" * 80)

        merge_success = await merger.merge_series(
            SOURCE_SERIES_ID,
            TARGET_SERIES_ID,
            delete_source=False  # Unpublish instead of delete
        )

        if not merge_success:
            logger.error("❌ Failed to merge series")
            return

        # Step 4: Verify results
        logger.info("\n" + "=" * 80)
        logger.info("STEP 4: Verify Results")
        logger.info("=" * 80)

        final_info = await merger.get_series_info(TARGET_SERIES_ID)

        logger.info("\n✅ FINAL SERIES STATE:")
        logger.info(f"   ID: {final_info['id']}")
        logger.info(f"   Title: {final_info['title']}")
        logger.info(f"   Total Episodes: {final_info['actual_episodes']}")
        logger.info(f"   Poster: {final_info['poster_url']}")
        logger.info(f"   Backdrop: {final_info['backdrop']}")
        logger.info(f"   TMDB ID: {final_info['tmdb_id']}")

        # Print summary
        merger.print_summary()

        logger.info("\n" + "=" * 80)
        logger.info("✅ ALL OPERATIONS COMPLETED SUCCESSFULLY")
        logger.info("=" * 80)
        logger.info(f"\nView the merged series at:")
        logger.info(f"http://localhost:3200/vod/series/{TARGET_SERIES_ID}")

    except Exception as e:
        logger.error(f"❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()

    finally:
        client.close()
        logger.info("\n🔌 Disconnected from MongoDB")


if __name__ == "__main__":
    asyncio.run(main())
