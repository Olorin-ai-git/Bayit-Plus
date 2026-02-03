#!/usr/bin/env python3
"""
HLS Embedded Subtitles Migration Script

Migrates existing HLS content to use embedded subtitles (EXT-X-MEDIA).
Generates master manifests with subtitle references for all content that:
- Already has HLS video (playlist.m3u8 on GCS)
- Has subtitle tracks in the database
- Doesn't already have a master.m3u8

Usage:
    # Dry run - see what would be migrated
    poetry run python scripts/migrate_hls_embedded_subtitles.py --dry-run

    # Migrate all movies
    poetry run python scripts/migrate_hls_embedded_subtitles.py --content-type movies

    # Migrate all series
    poetry run python scripts/migrate_hls_embedded_subtitles.py --content-type series

    # Migrate specific content by ID
    poetry run python scripts/migrate_hls_embedded_subtitles.py --content-id "movie_123"

    # Migrate everything
    poetry run python scripts/migrate_hls_embedded_subtitles.py --all

    # Force migration even if master.m3u8 exists
    poetry run python scripts/migrate_hls_embedded_subtitles.py --all --force
"""

import argparse
import asyncio
import logging
import sys
from pathlib import Path
from typing import List, Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from google.cloud import storage as gcs_storage
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.content import Content
from app.models.subtitles import SubtitleTrackDoc
from app.services.ffmpeg.hls_subtitle_generator import (
    generate_vtt_files_for_content,
    generate_master_m3u8_with_subtitles,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class HLSSubtitleMigration:
    """Handles migration of existing HLS content to embedded subtitles."""

    def __init__(self, dry_run: bool = False, force: bool = False):
        self.dry_run = dry_run
        self.force = force
        self.gcs_client: Optional[gcs_storage.Client] = None
        self.stats = {
            "total_checked": 0,
            "has_hls": 0,
            "has_subtitles": 0,
            "already_migrated": 0,
            "needs_migration": 0,
            "migrated": 0,
            "failed": 0,
        }

    async def connect_db(self):
        """Connect to MongoDB - use raw motor without Beanie init to avoid index conflicts."""
        self.db_client = AsyncIOMotorClient(settings.MONGODB_URI)
        self.db = self.db_client[settings.MONGODB_DB_NAME]
        logger.info("Connected to MongoDB")

    def get_gcs_client(self) -> gcs_storage.Client:
        """Get or create GCS client."""
        if self.gcs_client is None:
            self.gcs_client = gcs_storage.Client()
        return self.gcs_client

    async def migrate_content(
        self,
        content_id: Optional[str] = None,
        content_type: Optional[str] = None,
    ) -> None:
        """
        Migrate content to embedded HLS subtitles.

        Args:
            content_id: Specific content ID to migrate (optional)
            content_type: Filter by content type: "movies" or "series" (optional)
        """
        try:
            await self.connect_db()

            # Get content to migrate
            content_items = await self._get_content_to_migrate(content_id, content_type)

            logger.info(f"Found {len(content_items)} content items to check")

            for content in content_items:
                await self._migrate_single_content(content)

            # Print summary
            self._print_summary()

        except Exception as e:
            logger.error(f"Migration failed: {e}", exc_info=True)
            raise

    async def _get_content_to_migrate(
        self,
        content_id: Optional[str] = None,
        content_type: Optional[str] = None,
    ) -> List:
        """Get list of content items to migrate."""
        content_items = []

        from bson import ObjectId

        content_collection = self.db["content"]

        if content_id:
            # Migrate specific content
            try:
                object_id = ObjectId(content_id)
                content = await content_collection.find_one({"_id": object_id})
                if content:
                    content_items.append(content)
                else:
                    logger.error(f"Content not found: {content_id}")
            except Exception as e:
                logger.error(f"Invalid content_id: {e}")
        else:
            # Migrate by type or all
            query = {}
            if content_type == "movies":
                query = {"content_type": "movie"}
            elif content_type == "series":
                query = {"content_type": "series"}
            else:
                # Get all content (movies and series)
                query = {"content_type": {"$in": ["movie", "series"]}}

            cursor = content_collection.find(query)
            content_items = await cursor.to_list(length=None)

        return content_items

    async def _migrate_single_content(self, content) -> None:
        """Migrate a single content item (raw dict from MongoDB)."""
        self.stats["total_checked"] += 1

        content_id = str(content["_id"])
        title = content.get("title", content_id)

        logger.info(f"\n{'='*60}")
        logger.info(f"Checking: {title} ({content_id})")
        logger.info(f"{'='*60}")

        # Check if content has HLS stream
        stream_url = content.get("stream_url") or content.get("hls_url")
        if not stream_url or ".m3u8" not in stream_url:
            logger.info(f"❌ No HLS stream found - skipping")
            return

        self.stats["has_hls"] += 1
        logger.info(f"✅ Has HLS stream: {stream_url}")

        # Parse GCS path from URL
        # Format: https://storage.googleapis.com/BUCKET/movies/Title/hls/playlist.m3u8
        try:
            import re
            match = re.match(
                r"https://storage\.googleapis\.com/([^/]+)/(.+)",
                stream_url
            )
            if not match:
                logger.error(f"❌ Invalid GCS URL format: {stream_url}")
                self.stats["failed"] += 1
                return

            bucket_name = match.group(1)
            blob_path = match.group(2)

            # Extract directory path (remove filename)
            hls_dir = "/".join(blob_path.split("/")[:-1])  # e.g., movies/Title/hls
            playlist_filename = blob_path.split("/")[-1]   # e.g., playlist.m3u8 or master.m3u8

        except Exception as e:
            logger.error(f"❌ Failed to parse GCS URL: {e}")
            self.stats["failed"] += 1
            return

        # Check if already has master.m3u8
        master_blob_path = f"{hls_dir}/master.m3u8"
        if not self.force and "master.m3u8" in stream_url:
            logger.info(f"✅ Already has master.m3u8 - skipping (use --force to regenerate)")
            self.stats["already_migrated"] += 1
            return

        # Check if master.m3u8 exists in GCS
        client = self.get_gcs_client()
        bucket = client.bucket(bucket_name)
        master_blob = bucket.blob(master_blob_path)

        if not self.force and master_blob.exists():
            logger.info(f"✅ master.m3u8 exists in GCS - skipping (use --force to regenerate)")
            self.stats["already_migrated"] += 1
            return

        # Check if content has subtitles in database
        subtitle_collection = self.db["subtitle_tracks"]
        cursor = subtitle_collection.find({"content_id": content_id})
        subtitle_tracks = await cursor.to_list(length=None)

        if not subtitle_tracks:
            logger.info(f"⚠️  No subtitles found in database - skipping")
            return

        self.stats["has_subtitles"] += 1
        languages = list(set(track["language"] for track in subtitle_tracks))
        logger.info(f"✅ Has {len(subtitle_tracks)} subtitle tracks in {len(languages)} languages: {languages}")

        self.stats["needs_migration"] += 1

        if self.dry_run:
            logger.info(f"🔍 DRY RUN - Would migrate this content")
            return

        # Perform migration
        logger.info(f"🚀 Starting migration...")

        try:
            # Create temp directory for VTT files
            import tempfile
            temp_dir = tempfile.mkdtemp(prefix="hls_migration_")

            try:
                # Generate VTT files
                logger.info("  1. Generating VTT files...")
                subtitle_files = await generate_vtt_files_for_content(
                    content_id=content_id,
                    output_dir=temp_dir,
                )

                if not subtitle_files:
                    logger.error("  ❌ Failed to generate VTT files")
                    self.stats["failed"] += 1
                    return

                logger.info(f"  ✅ Generated {len(subtitle_files)} VTT files")

                # Generate master manifest
                logger.info("  2. Generating master manifest...")
                master_manifest_path = Path(temp_dir) / "master.m3u8"
                generate_master_m3u8_with_subtitles(
                    video_playlist_name=playlist_filename,  # Use existing playlist name
                    subtitle_files=subtitle_files,
                    output_path=str(master_manifest_path),
                )
                logger.info(f"  ✅ Generated master manifest")

                # Upload VTT files to GCS
                logger.info("  3. Uploading VTT files to GCS...")
                for sub_file in subtitle_files:
                    vtt_blob_path = f"{hls_dir}/{sub_file['filename']}"
                    vtt_blob = bucket.blob(vtt_blob_path)
                    vtt_blob.upload_from_filename(
                        sub_file['path'],
                        content_type='text/vtt',
                    )
                    logger.info(f"     ✅ Uploaded {sub_file['filename']}")

                # Upload master manifest to GCS
                logger.info("  4. Uploading master manifest to GCS...")
                master_blob.upload_from_filename(
                    str(master_manifest_path),
                    content_type='application/vnd.apple.mpegurl',
                )
                logger.info(f"  ✅ Uploaded master.m3u8")

                # Update content document with new master.m3u8 URL
                master_url = f"https://storage.googleapis.com/{bucket_name}/{master_blob_path}"
                logger.info(f"  5. Updating content document...")

                # Use raw MongoDB update since content is a dict
                content_collection = self.db["content"]
                await content_collection.update_one(
                    {"_id": content["_id"]},
                    {"$set": {"stream_url": master_url}}
                )
                logger.info(f"  ✅ Updated content with master URL: {master_url}")

                self.stats["migrated"] += 1
                logger.info(f"✅ Migration complete!")

            finally:
                # Cleanup temp directory
                import shutil
                try:
                    shutil.rmtree(temp_dir)
                except Exception as e:
                    logger.warning(f"Failed to cleanup temp dir: {e}")

        except Exception as e:
            logger.error(f"❌ Migration failed: {e}", exc_info=True)
            self.stats["failed"] += 1

    def _print_summary(self):
        """Print migration summary."""
        logger.info(f"\n{'='*60}")
        logger.info("MIGRATION SUMMARY")
        logger.info(f"{'='*60}")
        logger.info(f"Total content checked: {self.stats['total_checked']}")
        logger.info(f"  - Has HLS stream: {self.stats['has_hls']}")
        logger.info(f"  - Has subtitles: {self.stats['has_subtitles']}")
        logger.info(f"  - Already migrated: {self.stats['already_migrated']}")
        logger.info(f"  - Needs migration: {self.stats['needs_migration']}")

        if not self.dry_run:
            logger.info(f"  - Successfully migrated: {self.stats['migrated']}")
            logger.info(f"  - Failed: {self.stats['failed']}")
        else:
            logger.info(f"\n🔍 DRY RUN - No changes made")

        logger.info(f"{'='*60}\n")


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Migrate existing HLS content to embedded subtitles",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be migrated without making changes",
    )

    parser.add_argument(
        "--force",
        action="store_true",
        help="Force migration even if master.m3u8 already exists",
    )

    parser.add_argument(
        "--content-id",
        type=str,
        help="Migrate specific content by ID",
    )

    parser.add_argument(
        "--content-type",
        type=str,
        choices=["movies", "series"],
        help="Filter by content type",
    )

    parser.add_argument(
        "--all",
        action="store_true",
        help="Migrate all content (movies and series)",
    )

    args = parser.parse_args()

    # Validate arguments
    if not any([args.content_id, args.content_type, args.all]):
        parser.error("Must specify --content-id, --content-type, or --all")

    # Run migration
    migration = HLSSubtitleMigration(dry_run=args.dry_run, force=args.force)

    try:
        await migration.migrate_content(
            content_id=args.content_id,
            content_type=args.content_type if not args.all else None,
        )
    except KeyboardInterrupt:
        logger.info("\n\nMigration cancelled by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
