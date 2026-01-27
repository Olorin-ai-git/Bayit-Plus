#!/usr/bin/env python3
"""
Populate Video Metadata Script

This script analyzes video files and populates the video_metadata field
in the Content collection, including duration in seconds which is needed
for the video player slider on transcoded streams.

Usage:
    python populate_video_metadata.py                    # Process all content missing metadata
    python populate_video_metadata.py --dry-run          # Preview without updating
    python populate_video_metadata.py --limit 10         # Process only 10 items
    python populate_video_metadata.py --content-id XXX   # Process specific content
    python populate_video_metadata.py --force            # Re-analyze even if metadata exists
"""

import argparse
import asyncio
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from bson import ObjectId

from app.core.database import close_mongo_connection, connect_to_mongo, get_database
from app.services.ffmpeg.video_analysis import analyze_video, VideoAnalysisError

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


async def get_content_needing_metadata(
    db, limit: int = 0, force: bool = False, content_id: str = None
):
    """
    Get content items that need video metadata populated.

    Args:
        db: MongoDB database instance
        limit: Maximum number of items to return (0 = no limit)
        force: If True, return all content even if metadata exists
        content_id: If provided, only return this specific content

    Returns:
        List of content documents
    """
    if content_id:
        try:
            content = await db.content.find_one({"_id": ObjectId(content_id)})
            return [content] if content else []
        except Exception:
            return []

    # Build query for content needing metadata
    query = {
        "stream_url": {"$exists": True, "$ne": None, "$ne": ""},
        "is_published": True,
    }

    if not force:
        query["$or"] = [
            {"video_metadata": {"$exists": False}},
            {"video_metadata": None},
            {"video_metadata.duration": {"$exists": False}},
            {"video_metadata.duration": None},
            {"video_metadata.duration": 0},
        ]

    cursor = db.content.find(query)
    if limit > 0:
        cursor = cursor.limit(limit)

    return await cursor.to_list(length=limit if limit > 0 else None)


async def analyze_and_update_content(
    db, content: dict, dry_run: bool = False, timeout: int = 60
) -> bool:
    """
    Analyze video and update content with metadata.

    Args:
        db: MongoDB database instance
        content: Content document to update
        dry_run: If True, don't actually update the database
        timeout: FFprobe timeout in seconds

    Returns:
        True if successful, False otherwise
    """
    content_id = content["_id"]
    title = content.get("title", "Unknown")
    stream_url = content.get("stream_url", "")

    if not stream_url:
        logger.warning(f"Skipping {title} ({content_id}): No stream URL")
        return False

    # Skip HLS streams (they don't have fixed duration)
    if stream_url.endswith(".m3u8"):
        logger.info(f"Skipping {title} ({content_id}): HLS stream (no fixed duration)")
        return False

    logger.info(f"Analyzing: {title} ({content_id})")
    logger.debug(f"  Stream URL: {stream_url}")

    try:
        metadata = await analyze_video(stream_url, timeout=timeout)

        if not metadata.get("duration") or metadata["duration"] == 0:
            logger.warning(f"  Could not determine duration for {title}")
            return False

        logger.info(
            f"  Duration: {metadata['duration']:.1f}s "
            f"({metadata['duration'] / 60:.1f} min)"
        )
        logger.info(
            f"  Resolution: {metadata.get('width', 0)}x{metadata.get('height', 0)}"
        )
        logger.info(f"  Codec: {metadata.get('codec', 'unknown')}")

        if dry_run:
            logger.info(f"  [DRY RUN] Would update video_metadata")
            return True

        # Update the content document
        result = await db.content.update_one(
            {"_id": content_id},
            {"$set": {"video_metadata": metadata}},
        )

        if result.modified_count > 0:
            logger.info(f"  Updated video_metadata for {title}")
            return True
        else:
            logger.warning(f"  No changes made to {title}")
            return False

    except VideoAnalysisError as e:
        logger.error(f"  Analysis failed for {title}: {e}")
        return False
    except Exception as e:
        logger.error(f"  Unexpected error for {title}: {e}")
        return False


async def main(args):
    """Main entry point."""
    await connect_to_mongo()

    try:
        db = get_database()

        logger.info("=" * 60)
        logger.info("Video Metadata Population Script")
        logger.info("=" * 60)

        if args.dry_run:
            logger.info("DRY RUN MODE - No changes will be made")

        # Get content needing metadata
        content_list = await get_content_needing_metadata(
            db,
            limit=args.limit,
            force=args.force,
            content_id=args.content_id,
        )

        total = len(content_list)
        logger.info(f"Found {total} content item(s) to process")

        if total == 0:
            logger.info("No content needs metadata population")
            return 0

        # Process each content item
        success_count = 0
        error_count = 0

        for idx, content in enumerate(content_list, 1):
            logger.info(f"\n[{idx}/{total}] Processing...")

            success = await analyze_and_update_content(
                db, content, dry_run=args.dry_run, timeout=args.timeout
            )

            if success:
                success_count += 1
            else:
                error_count += 1

            # Throttle to avoid overloading FFprobe/network
            if idx < total and args.delay > 0:
                await asyncio.sleep(args.delay)

        # Summary
        logger.info("\n" + "=" * 60)
        logger.info("SUMMARY")
        logger.info("=" * 60)
        logger.info(f"Total processed: {total}")
        logger.info(f"Successful: {success_count}")
        logger.info(f"Failed: {error_count}")

        if args.dry_run:
            logger.info("\nThis was a DRY RUN - no changes were made")
            logger.info("Run without --dry-run to apply changes")

        return 0 if error_count == 0 else 1

    finally:
        await close_mongo_connection()


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Populate video_metadata for content in the database",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python populate_video_metadata.py                    # Process all missing
    python populate_video_metadata.py --dry-run          # Preview changes
    python populate_video_metadata.py --limit 5          # Process 5 items
    python populate_video_metadata.py --content-id XXX   # Process one item
    python populate_video_metadata.py --force --limit 10 # Re-analyze 10 items
        """,
    )

    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without updating database",
    )

    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Maximum number of items to process (0 = no limit)",
    )

    parser.add_argument(
        "--content-id",
        type=str,
        default=None,
        help="Process only this specific content ID",
    )

    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-analyze content even if video_metadata exists",
    )

    parser.add_argument(
        "--timeout",
        type=int,
        default=60,
        help="FFprobe timeout in seconds (default: 60)",
    )

    parser.add_argument(
        "--delay",
        type=float,
        default=0.5,
        help="Delay between processing items in seconds (default: 0.5)",
    )

    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()

    try:
        exit_code = asyncio.run(main(args))
        sys.exit(exit_code)
    except KeyboardInterrupt:
        logger.info("\nInterrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
