"""
Backfill File Hashes for Existing Content
Calculates SHA256 hashes for content that has local file paths but no stored hash.
This enables fast duplicate detection in future uploads.
"""

import asyncio
import hashlib
import logging
from pathlib import Path

from app.core.config import settings
from app.models.content import Content
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def calculate_file_hash_sync(file_path: str) -> str:
    """Calculate SHA256 hash of a file"""
    sha256_hash = hashlib.sha256()
    try:
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    except Exception as e:
        logger.error(f"Failed to hash {file_path}: {e}")
        return None


async def backfill_hashes(limit: int = None, dry_run: bool = False):
    """
    Backfill hashes for existing content

    Args:
        limit: Maximum number of items to process (None = all)
        dry_run: If True, only show what would be done
    """
    # Connect to database
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[Content])

    # Find content without hashes
    query = Content.find(Content.file_hash == None)
    if limit:
        content_items = await query.limit(limit).to_list()
    else:
        content_items = await query.to_list()

    total = len(content_items)
    logger.info(f"Found {total} content items without file_hash")

    if total == 0:
        logger.info("✅ All content already has hashes!")
        return

    if dry_run:
        logger.info("DRY RUN - No changes will be made")
        for item in content_items[:10]:  # Show first 10
            logger.info(f"  Would process: {item.title}")
        if total > 10:
            logger.info(f"  ... and {total - 10} more")
        return

    processed = 0
    skipped_no_local_path = 0
    skipped_file_not_found = 0
    skipped_gcs_only = 0
    updated = 0

    for idx, item in enumerate(content_items, 1):
        try:
            # Try to extract local file path from metadata or stream_url
            local_path = None

            # Check if stream_url points to a local file
            if item.stream_url and not item.stream_url.startswith(
                ("http://", "https://", "gs://")
            ):
                local_path = item.stream_url
            # Check metadata for local_source_path
            elif hasattr(item, "metadata") and isinstance(item.metadata, dict):
                local_path = item.metadata.get("local_source_path")

            if not local_path:
                # Content is GCS-only, skip
                skipped_gcs_only += 1
                logger.debug(
                    f"[{idx}/{total}] Skipping {item.title} - GCS-only, no local path"
                )
                continue

            path = Path(local_path)
            if not path.exists():
                skipped_file_not_found += 1
                logger.warning(
                    f"[{idx}/{total}] Skipping {item.title} - file not found: {local_path}"
                )
                continue

            # Calculate hash
            logger.info(
                f"[{idx}/{total}] Calculating hash for: {item.title} ({path.name})"
            )
            file_hash = await asyncio.to_thread(
                calculate_file_hash_sync, str(path.absolute())
            )

            if file_hash:
                # Update content with hash
                item.file_hash = file_hash
                await item.save()
                updated += 1
                logger.info(f"  ✓ Stored hash: {file_hash[:16]}...")
            else:
                logger.error(f"  ✗ Failed to calculate hash")

            processed += 1

            # Yield control periodically
            if processed % 5 == 0:
                await asyncio.sleep(0.1)

        except Exception as e:
            logger.error(f"Error processing {item.title}: {e}")

    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("SUMMARY:")
    logger.info(f"  Total found: {total}")
    logger.info(f"  Processed: {processed}")
    logger.info(f"  Updated with hash: {updated}")
    logger.info(f"  Skipped (GCS-only): {skipped_gcs_only}")
    logger.info(f"  Skipped (file not found): {skipped_file_not_found}")
    logger.info("=" * 60)
    logger.info("✅ Backfill complete!")
    logger.info("\nFuture uploads will skip these files instantly by comparing hashes.")


async def main():
    import sys

    dry_run = "--dry-run" in sys.argv
    limit = None

    # Parse --limit argument
    for arg in sys.argv:
        if arg.startswith("--limit="):
            limit = int(arg.split("=")[1])

    if dry_run:
        print("🔍 DRY RUN MODE - No changes will be made\n")

    await backfill_hashes(limit=limit, dry_run=dry_run)


if __name__ == "__main__":
    print("=" * 60)
    print("Content Hash Backfill Utility")
    print("=" * 60)
    print("This script calculates SHA256 hashes for existing content")
    print("to enable fast duplicate detection in future uploads.")
    print()
    print("Usage:")
    print("  python backfill_content_hashes.py              # Process all")
    print("  python backfill_content_hashes.py --limit=10   # Process 10 items")
    print("  python backfill_content_hashes.py --dry-run    # Preview only")
    print("=" * 60)
    print()

    asyncio.run(main())
