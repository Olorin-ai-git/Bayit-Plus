#!/usr/bin/env python3
"""
Rename Hebrew GCS paths to English.

This script:
1. Finds all content entries with Hebrew characters in stream_url
2. Copies GCS blobs to English-named paths
3. Deletes old Hebrew-named blobs
4. Updates stream_url in MongoDB to new English paths

Path mapping:
- Palmach episodes: seriess/פלמח/ -> israeli-series/Palmach/
- Movies: movies/Hebrew_title/ -> movies/English_Title/
"""

import asyncio
import re
import sys
from pathlib import Path
from urllib.parse import unquote

backend_dir = Path(__file__).resolve().parent.parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from google.cloud import storage
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import get_settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

HEBREW_PATTERN = re.compile(r'[\u0590-\u05FF]')
EPISODE_PATTERN = re.compile(r'S(\d+)E(\d+)', re.IGNORECASE)


def has_hebrew(text: str) -> bool:
    """Check if text contains Hebrew characters."""
    return bool(HEBREW_PATTERN.search(text))


def is_series_episode(entry: dict, old_blob_name: str) -> bool:
    """Detect if an entry is a series episode."""
    if entry.get('season') is not None or entry.get('episode') is not None:
        return True
    if entry.get('series_id') is not None:
        return True
    if old_blob_name.startswith('seriess/') or old_blob_name.startswith('series/'):
        return True
    if EPISODE_PATTERN.search(entry.get('title', '')):
        return True
    return False


def make_new_blob_name(title: str, ext: str, series_ep: bool) -> str:
    """Create a safe English blob name from the current DB title."""
    safe_title = re.sub(r'[^\w\s-]', '', title).replace(' ', '_')

    if series_ep:
        # Israeli series: israeli-series/SeriesName/SeriesName_S01E01.mp4
        series_name = EPISODE_PATTERN.sub('', safe_title).strip('_ ')
        if not series_name:
            series_name = safe_title
        safe_filename = f"{safe_title}{ext}"
        return f"israeli-series/{series_name}/{safe_filename}"

    # Movies: movies/MovieTitle/MovieTitle.ext
    safe_filename = f"{safe_title}{ext}"
    return f"movies/{safe_title}/{safe_filename}"


def parse_gcs_url(url: str) -> tuple:
    """Parse a GCS URL into bucket name and blob name."""
    prefix = "https://storage.googleapis.com/"
    if url.startswith(prefix):
        rest = url[len(prefix):]
        parts = rest.split("/", 1)
        if len(parts) == 2:
            return parts[0], parts[1]
    return None, None


async def rename_gcs_hebrew_paths(dry_run: bool = False):
    """Find and rename Hebrew GCS paths to English."""
    settings = get_settings()

    logger.info("Connecting to MongoDB")
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    collection = db.content

    # Find all entries with Hebrew in stream_url
    hebrew_regex = {'$regex': '[\u0590-\u05FF]'}
    cursor = collection.find({'stream_url': hebrew_regex})
    hebrew_entries = await cursor.to_list(length=1000)

    logger.info(f"Found {len(hebrew_entries)} entries with Hebrew stream_url")

    if not hebrew_entries:
        logger.info("No Hebrew GCS paths found. Nothing to do.")
        client.close()
        return

    # Initialize GCS client
    storage_client = storage.Client()

    renamed = 0
    failed = 0
    skipped = 0

    for entry in hebrew_entries:
        old_url = entry.get('stream_url', '')
        title = entry.get('title', 'Unknown')
        entry_id = entry['_id']

        logger.info(f"Processing: {title} (id: {entry_id})")
        logger.info(f"  Old URL: {old_url}")

        # Parse old URL
        bucket_name, old_blob_name = parse_gcs_url(old_url)
        if not bucket_name or not old_blob_name:
            logger.warning(f"  Could not parse URL: {old_url}")
            failed += 1
            continue

        # URL-decode the blob name (Hebrew chars may be URL-encoded)
        old_blob_name = unquote(old_blob_name)

        # Determine file extension from original blob path
        ext = Path(old_blob_name).suffix
        if not ext:
            ext = '.mp4'

        # Detect series vs movie
        series_ep = is_series_episode(entry, old_blob_name)

        # Create new blob name from English title
        new_blob_name = make_new_blob_name(title, ext, series_ep)
        new_url = f"https://storage.googleapis.com/{bucket_name}/{new_blob_name}"

        entry_type = "israeli-series" if series_ep else "movie"
        logger.info(f"  Type: {entry_type}")
        logger.info(f"  New path: {new_blob_name}")

        if dry_run:
            logger.info("  [DRY RUN] Would copy and rename")
            renamed += 1
            continue

        try:
            bucket = storage_client.bucket(bucket_name)

            # Check if old blob exists
            old_blob = bucket.blob(old_blob_name)
            if not old_blob.exists():
                logger.warning(f"  Old blob not found in GCS: {old_blob_name}")
                skipped += 1
                continue

            # Check if new blob already exists
            new_blob = bucket.blob(new_blob_name)
            if new_blob.exists():
                logger.info("  New blob already exists, deleting old blob only")
                old_blob.delete()
                logger.info(f"  Deleted old blob: {old_blob_name}")
            else:
                # Copy old blob to new location
                bucket.copy_blob(old_blob, bucket, new_blob_name)
                logger.info("  Copied to new path")

                # Verify copy succeeded
                new_blob = bucket.blob(new_blob_name)
                if not new_blob.exists():
                    logger.error("  Copy verification failed!")
                    failed += 1
                    continue

                # Delete old blob
                old_blob.delete()
                logger.info(f"  Deleted old blob: {old_blob_name}")

            # Update MongoDB stream_url
            await collection.update_one(
                {'_id': entry_id},
                {'$set': {'stream_url': new_url}}
            )
            logger.info("  Updated MongoDB stream_url")
            renamed += 1

        except Exception as e:
            logger.error(f"  Failed to rename: {e}")
            failed += 1

    logger.info("=" * 60)
    mode = "DRY RUN" if dry_run else "APPLIED"
    logger.info(f"GCS Hebrew path rename complete ({mode})")
    logger.info(f"  Renamed: {renamed}")
    logger.info(f"  Skipped: {skipped}")
    logger.info(f"  Failed:  {failed}")
    logger.info("=" * 60)

    client.close()


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(
        description="Rename Hebrew GCS paths to English"
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview changes without applying them',
    )
    args = parser.parse_args()

    asyncio.run(rename_gcs_hebrew_paths(dry_run=args.dry_run))
