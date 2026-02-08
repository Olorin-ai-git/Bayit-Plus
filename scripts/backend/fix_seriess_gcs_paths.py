#!/usr/bin/env python3
"""
Fix seriess/ GCS paths - rename typo prefix and move burganim to israeli-series.

This script:
1. Moves seriess/burganim/ -> israeli-series/HaBurganim/
2. Moves movies/burganim_*/ -> israeli-series/HaBurganim/
3. Moves seriess/[other]/ -> series/[other]/  (fix typo)
4. Cleans up empty seriess/ prefix in GCS
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


def parse_gcs_url(url: str) -> tuple:
    """Parse a GCS URL into bucket name and blob name."""
    prefix = "https://storage.googleapis.com/"
    if url.startswith(prefix):
        rest = url[len(prefix):]
        parts = rest.split("/", 1)
        if len(parts) == 2:
            return parts[0], parts[1]
    return None, None


def compute_new_blob_name(old_blob_name: str, title: str) -> str:
    """Compute the new blob name based on the old path."""
    filename = Path(old_blob_name).name

    # burganim entries -> israeli-series/HaBurganim/
    if 'burganim' in old_blob_name.lower():
        # Extract episode code from filename (e.g., burganim_s01e03.mp4)
        ep_match = re.search(r's(\d+)e(\d+)', filename, re.IGNORECASE)
        if ep_match:
            season = ep_match.group(1)
            episode = ep_match.group(2)
            new_filename = f"HaBurganim_S{season}E{episode}.mp4"
        else:
            new_filename = filename
        return f"israeli-series/HaBurganim/{new_filename}"

    # Other seriess/ entries -> series/ (fix typo, keep structure)
    if old_blob_name.startswith('seriess/'):
        return old_blob_name.replace('seriess/', 'series/', 1)

    return None


async def fix_seriess_paths(dry_run: bool = False):
    """Fix seriess/ paths and move burganim to israeli-series."""
    settings = get_settings()

    logger.info("Connecting to MongoDB")
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    collection = db.content

    # Find all entries with seriess/ or movies/burganim in stream_url
    cursor = collection.find({
        '$or': [
            {'stream_url': {'$regex': 'seriess/'}},
            {'stream_url': {'$regex': 'movies/burganim'}},
        ]
    })
    entries = await cursor.to_list(length=500)

    logger.info(f"Found {len(entries)} entries to fix")

    if not entries:
        logger.info("Nothing to fix.")
        client.close()
        return

    storage_client = storage.Client()

    renamed = 0
    failed = 0
    skipped = 0

    for entry in entries:
        old_url = entry.get('stream_url', '')
        title = entry.get('title', 'Unknown')
        entry_id = entry['_id']

        bucket_name, old_blob_name = parse_gcs_url(old_url)
        if not bucket_name or not old_blob_name:
            logger.warning(f"  Could not parse URL: {old_url}")
            failed += 1
            continue

        old_blob_name = unquote(old_blob_name)
        new_blob_name = compute_new_blob_name(old_blob_name, title)

        if not new_blob_name:
            logger.warning(f"  No mapping for: {old_blob_name}")
            skipped += 1
            continue

        new_url = f"https://storage.googleapis.com/{bucket_name}/{new_blob_name}"

        logger.info(f"  {title}")
        logger.info(f"    {old_blob_name}")
        logger.info(f"    -> {new_blob_name}")

        if dry_run:
            renamed += 1
            continue

        try:
            bucket = storage_client.bucket(bucket_name)
            old_blob = bucket.blob(old_blob_name)

            if not old_blob.exists():
                logger.warning(f"    Old blob not found, updating DB only")
                await collection.update_one(
                    {'_id': entry_id},
                    {'$set': {'stream_url': new_url}}
                )
                renamed += 1
                continue

            new_blob = bucket.blob(new_blob_name)
            if new_blob.exists():
                logger.info("    New blob exists, deleting old only")
                old_blob.delete()
            else:
                bucket.copy_blob(old_blob, bucket, new_blob_name)
                # Verify
                new_blob = bucket.blob(new_blob_name)
                if not new_blob.exists():
                    logger.error("    Copy verification failed!")
                    failed += 1
                    continue
                old_blob.delete()

            await collection.update_one(
                {'_id': entry_id},
                {'$set': {'stream_url': new_url}}
            )
            renamed += 1

        except Exception as e:
            logger.error(f"    Failed: {e}")
            failed += 1

    # Clean up empty seriess/ prefix in GCS
    if not dry_run:
        logger.info("Checking for remaining seriess/ blobs in GCS...")
        bucket = storage_client.bucket(settings.GCS_BUCKET_NAME)
        remaining = list(bucket.list_blobs(prefix="seriess/", max_results=10))
        if remaining:
            logger.info(f"  Found {len(remaining)} remaining blobs under seriess/")
            for blob in remaining:
                logger.info(f"    Deleting orphan: {blob.name}")
                blob.delete()
        else:
            logger.info("  seriess/ prefix is clean")

    logger.info("=" * 60)
    mode = "DRY RUN" if dry_run else "APPLIED"
    logger.info(f"Fix seriess paths complete ({mode})")
    logger.info(f"  Renamed: {renamed}")
    logger.info(f"  Skipped: {skipped}")
    logger.info(f"  Failed:  {failed}")
    logger.info("=" * 60)

    client.close()


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(
        description="Fix seriess/ GCS paths"
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview changes without applying them',
    )
    args = parser.parse_args()

    asyncio.run(fix_seriess_paths(dry_run=args.dry_run))
