"""
Migrate Existing Content to HLS Format

This script finds all content with non-HLS stream URLs (raw MKV, AVI, MOV files)
and converts them to HLS format with browser-compatible AAC audio.

Usage:
    poetry run python -m app.scripts.migrate_content_to_hls [--dry-run] [--limit N]

Options:
    --dry-run    Only show what would be converted, don't actually process
    --limit N    Only process N items (useful for testing)
    --content-id ID  Process a specific content ID only
    --local-path PATH  Local path to check for files before using GCS URL
                       (e.g., "/Volumes/USB Drive/Movies")
"""

import argparse
import asyncio
import logging
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import unquote

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.content import Content
from app.services.upload_service.hls import hls_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# File extensions that need HLS conversion
NEEDS_CONVERSION_EXTENSIONS = {".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm", ".m4v"}

# Default local path for USB drive
DEFAULT_LOCAL_PATH = "/Volumes/USB Drive/Movies"


async def init_database():
    """Initialize database connection."""
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[Content],
    )
    logger.info(f"Connected to database: {settings.MONGODB_DB_NAME}")


def needs_hls_conversion(stream_url: str) -> bool:
    """Check if a stream URL points to a file that needs HLS conversion."""
    if not stream_url:
        return False

    # Already HLS
    if ".m3u8" in stream_url.lower():
        return False

    # Check file extension
    url_path = stream_url.split("?")[0]  # Remove query params
    ext = Path(url_path).suffix.lower()
    return ext in NEEDS_CONVERSION_EXTENSIONS


def find_local_file(gcs_url: str, local_base_path: str) -> str | None:
    """
    Try to find a local file that matches the GCS URL.

    GCS URL format: https://storage.googleapis.com/bucket/movies/Folder_Name/filename.mkv
    Local format: /Volumes/USB Drive/Movies/Folder_Name/filename.mkv

    Returns local path if found, None otherwise.
    """
    if not local_base_path or not os.path.exists(local_base_path):
        return None

    try:
        # Extract path from GCS URL
        # Format: https://storage.googleapis.com/BUCKET/movies/FOLDER/FILENAME
        match = re.match(
            r"https://storage\.googleapis\.com/[^/]+/movies/([^/]+)/(.+)",
            gcs_url
        )
        if not match:
            return None

        folder_name = unquote(match.group(1))
        filename = unquote(match.group(2))

        # Try exact match first
        local_path = os.path.join(local_base_path, folder_name, filename)
        if os.path.exists(local_path):
            return local_path

        # Try case-insensitive search in folder
        folder_path = os.path.join(local_base_path, folder_name)
        if os.path.exists(folder_path):
            for f in os.listdir(folder_path):
                if f.lower() == filename.lower():
                    return os.path.join(folder_path, f)

        # Try finding folder with similar name (case insensitive)
        for folder in os.listdir(local_base_path):
            if folder.lower() == folder_name.lower():
                folder_path = os.path.join(local_base_path, folder)
                if os.path.isdir(folder_path):
                    for f in os.listdir(folder_path):
                        if f.lower() == filename.lower():
                            return os.path.join(folder_path, f)

        return None

    except Exception as e:
        logger.debug(f"Error finding local file: {e}")
        return None


async def find_content_needing_conversion(limit: int = None) -> list[Content]:
    """Find all content that needs HLS conversion."""
    # Find content with stream URLs that aren't already HLS
    query = Content.find(
        Content.stream_url != None,  # noqa: E711
        {"stream_url": {"$not": {"$regex": r"\.m3u8", "$options": "i"}}},
    )

    if limit:
        query = query.limit(limit)

    content_list = await query.to_list()

    # Filter to only those with extensions needing conversion
    filtered = [c for c in content_list if needs_hls_conversion(c.stream_url)]
    return filtered


async def convert_content_to_hls(
    content: Content,
    local_base_path: str = None,
    dry_run: bool = False
) -> bool:
    """Convert a single content item to HLS format."""
    logger.info(f"Processing: {content.title} ({content.id})")
    logger.info(f"  GCS URL: {content.stream_url}")

    # Try to find local file first
    local_path = find_local_file(content.stream_url, local_base_path)
    if local_path:
        logger.info(f"  Found local file: {local_path}")
        source_path = local_path
    else:
        logger.info(f"  No local file found, will stream from GCS URL")
        source_path = content.stream_url

    if dry_run:
        logger.info(f"  [DRY RUN] Would convert from: {source_path}")
        return True

    try:
        # Determine content type for GCS path
        content_type = "movies"
        if hasattr(content, "type") and content.type:
            content_type = content.type.value + "s"

        # Convert to HLS
        logger.info(f"  Converting to HLS (this may take a while)...")

        async def on_progress(msg: str, progress: float):
            logger.info(f"    {msg} ({progress:.0f}%)")

        hls_url = await hls_service.convert_and_upload(
            source_path=source_path,
            content_title=content.title,
            content_type=content_type,
            on_progress=on_progress,
        )

        if not hls_url:
            logger.error(f"  HLS conversion failed for {content.title}")
            return False

        # Update content with new HLS URL
        old_url = content.stream_url
        content.stream_url = hls_url

        # Store original URL in metadata for reference
        if not content.metadata:
            content.metadata = {}
        content.metadata["original_stream_url"] = old_url
        content.metadata["hls_migrated_at"] = datetime.utcnow().isoformat()
        content.metadata["hls_source"] = "local" if local_path else "gcs"

        await content.save()

        logger.info(f"  Successfully migrated to HLS: {hls_url}")
        return True

    except Exception as e:
        logger.error(f"  Error converting {content.title}: {e}", exc_info=True)
        return False


async def main():
    """Main migration function."""
    parser = argparse.ArgumentParser(
        description="Migrate existing content to HLS format"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Only show what would be converted",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit number of items to process",
    )
    parser.add_argument(
        "--content-id",
        type=str,
        default=None,
        help="Process a specific content ID only",
    )
    parser.add_argument(
        "--local-path",
        type=str,
        default=DEFAULT_LOCAL_PATH,
        help=f"Local path to check for files (default: {DEFAULT_LOCAL_PATH})",
    )

    args = parser.parse_args()

    logger.info("=" * 60)
    logger.info("HLS Migration Script")
    logger.info("=" * 60)

    if args.dry_run:
        logger.info("DRY RUN MODE - No changes will be made")

    # Check local path
    if args.local_path and os.path.exists(args.local_path):
        logger.info(f"Local media path: {args.local_path} (available)")
    else:
        logger.info(f"Local media path: {args.local_path} (NOT FOUND - will use GCS)")
        args.local_path = None

    # Initialize database
    await init_database()

    # Find content to convert
    if args.content_id:
        from bson import ObjectId

        content = await Content.find_one(Content.id == ObjectId(args.content_id))
        if not content:
            logger.error(f"Content not found: {args.content_id}")
            return
        content_list = [content] if needs_hls_conversion(content.stream_url) else []
        if not content_list:
            logger.info(f"Content {args.content_id} doesn't need HLS conversion")
            return
    else:
        content_list = await find_content_needing_conversion(limit=args.limit)

    logger.info(f"Found {len(content_list)} content items needing HLS conversion")

    if not content_list:
        logger.info("No content needs migration. Done!")
        return

    # Show what will be processed and check local availability
    logger.info("\nContent to process:")
    local_count = 0
    for i, content in enumerate(content_list, 1):
        ext = Path(content.stream_url.split("?")[0]).suffix
        local_file = find_local_file(content.stream_url, args.local_path)
        source = "LOCAL" if local_file else "GCS"
        if local_file:
            local_count += 1
        logger.info(f"  {i}. {content.title} ({ext}) [{source}]")

    logger.info(f"\nSource: {local_count} local, {len(content_list) - local_count} from GCS")

    # Process each content item
    success_count = 0
    fail_count = 0

    logger.info("\n" + "=" * 60)
    logger.info("Starting conversion...")
    logger.info("=" * 60 + "\n")

    for i, content in enumerate(content_list, 1):
        logger.info(f"\n[{i}/{len(content_list)}] Processing...")

        success = await convert_content_to_hls(
            content,
            local_base_path=args.local_path,
            dry_run=args.dry_run
        )

        if success:
            success_count += 1
        else:
            fail_count += 1

    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("Migration Summary")
    logger.info("=" * 60)
    logger.info(f"Total processed: {len(content_list)}")
    logger.info(f"Successful: {success_count}")
    logger.info(f"Failed: {fail_count}")

    if args.dry_run:
        logger.info("\nThis was a DRY RUN. Run without --dry-run to perform migration.")


if __name__ == "__main__":
    asyncio.run(main())
