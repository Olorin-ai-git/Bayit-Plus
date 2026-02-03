"""
Batch HLS Converter with Chunked Resume Support

Converts multiple movies/series to HLS format with embedded subtitle tracks
using a multi-stage approach with checkpointing for resume capability.

Each content item is processed through 6 stages:
    1. Initialize - Fetch content info and create state file
    2. Download - Prepare source file
    3. Transcode - Convert to HLS segments
    4. Subtitles - Generate VTT files from database
    5. Upload - Upload HLS files to GCS with progress tracking
    6. Finalize - Update database with new URL

Usage:
    # Dry run - see what would be converted
    python scripts/backend/batch_convert_to_hls_with_subtitles.py --dry-run

    # Convert all movies needing HLS
    python scripts/backend/batch_convert_to_hls_with_subtitles.py --content-type movies

    # Convert all series needing HLS
    python scripts/backend/batch_convert_to_hls_with_subtitles.py --content-type series

    # Convert everything
    python scripts/backend/batch_convert_to_hls_with_subtitles.py --all

    # Limit to first N items (for testing)
    python scripts/backend/batch_convert_to_hls_with_subtitles.py --all --limit 5

    # Force re-convert even if already HLS
    python scripts/backend/batch_convert_to_hls_with_subtitles.py --all --force

    # Resume from where batch left off (uses saved state)
    python scripts/backend/batch_convert_to_hls_with_subtitles.py --all --resume
"""
import argparse
import asyncio
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import List

# Add backend and shared packages to path
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))
sys.path.insert(0, str(PROJECT_ROOT / "packages" / "olorin-shared"))
sys.path.insert(0, str(PROJECT_ROOT / "packages" / "python" / "olorin-i18n"))

from bson import ObjectId

# Import chunked converter components
from convert_to_hls_chunked import (
    ConversionState,
    run_stage_init,
    run_stage_download,
    run_stage_transcode,
    run_stage_subtitles,
    run_stage_upload,
    run_stage_finalize,
)

# File extensions that need HLS conversion
NEEDS_CONVERSION_EXTENSIONS = {".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm", ".m4v"}

# Batch state file for tracking overall progress
BATCH_STATE_FILE = Path(__file__).parent / ".hls_conversion_state" / "_batch_state.json"


class BatchState:
    """Tracks batch conversion progress for resume."""

    def __init__(self):
        self.state_file = BATCH_STATE_FILE
        self.state = self._load_or_create()

    def _load_or_create(self) -> dict:
        """Load existing state or create new."""
        self.state_file.parent.mkdir(parents=True, exist_ok=True)

        if self.state_file.exists():
            with open(self.state_file) as f:
                return json.load(f)

        return {
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "completed_ids": [],
            "failed_ids": [],
            "current_id": None,
            "total_count": 0,
        }

    def save(self):
        """Persist state to disk."""
        self.state["updated_at"] = datetime.now().isoformat()
        with open(self.state_file, "w") as f:
            json.dump(self.state, f, indent=2)

    def mark_complete(self, content_id: str):
        """Mark a content item as completed."""
        if content_id not in self.state["completed_ids"]:
            self.state["completed_ids"].append(content_id)
        if content_id in self.state["failed_ids"]:
            self.state["failed_ids"].remove(content_id)
        self.state["current_id"] = None
        self.save()

    def mark_failed(self, content_id: str):
        """Mark a content item as failed."""
        if content_id not in self.state["failed_ids"]:
            self.state["failed_ids"].append(content_id)
        self.state["current_id"] = None
        self.save()

    def set_current(self, content_id: str):
        """Set current processing item."""
        self.state["current_id"] = content_id
        self.save()

    def is_complete(self, content_id: str) -> bool:
        """Check if content was already processed."""
        return content_id in self.state["completed_ids"]

    def cleanup(self):
        """Remove batch state file."""
        if self.state_file.exists():
            self.state_file.unlink()


def needs_hls_conversion(stream_url: str) -> bool:
    """Check if a stream URL needs HLS conversion."""
    if not stream_url:
        return False
    if ".m3u8" in stream_url.lower():
        return False
    url_path = stream_url.split("?")[0]
    ext = Path(url_path).suffix.lower()
    return ext in NEEDS_CONVERSION_EXTENSIONS


async def get_content_needing_conversion(
    db,
    content_type: str = None,
    force: bool = False,
    limit: int = None,
) -> List[dict]:
    """Get list of content items needing HLS conversion."""
    query = {}

    if content_type == "movies":
        query["content_type"] = "movie"
    elif content_type == "series":
        query["content_type"] = "series"
    else:
        query["content_type"] = {"$in": ["movie", "series"]}

    # Only get content with stream URLs
    query["stream_url"] = {"$exists": True, "$ne": None}

    cursor = db["content"].find(query)
    if limit:
        cursor = cursor.limit(limit * 3)  # Get extra to filter

    all_content = await cursor.to_list(length=None)

    # Filter to content needing conversion
    if force:
        filtered = [c for c in all_content if c.get("stream_url")]
    else:
        filtered = [c for c in all_content if needs_hls_conversion(c.get("stream_url", ""))]

    if limit:
        filtered = filtered[:limit]

    return filtered


async def convert_single_content_chunked(
    db,
    content: dict,
    batch_state: BatchState,
    force: bool = False,
) -> bool:
    """
    Convert a single content item to HLS using chunked stages.
    Returns True on success, False on failure.
    Supports resume if interrupted.
    """
    content_id = str(content["_id"])
    title = content.get("title", content_id)

    print(f"\n{'=' * 70}")
    print(f"Converting: {title}")
    print(f"{'=' * 70}")
    print(f"  ID: {content_id}")
    print(f"  Source: {content.get('stream_url', 'N/A')[:80]}...")

    # Initialize conversion state (supports resume)
    state = ConversionState(content_id)

    if force:
        print("  [FORCE] Re-running all stages")
        state.state["completed_stages"] = []
        state.state["current_stage"] = "init"
        state.save()

    # Show resume info
    if state.state["completed_stages"]:
        print(f"  [RESUME] Completed stages: {', '.join(state.state['completed_stages'])}")

    batch_state.set_current(content_id)

    # Run all stages
    stages = [
        ("init", lambda: run_stage_init(state, db)),
        ("download", lambda: run_stage_download(state)),
        ("transcode", lambda: run_stage_transcode(state)),
        ("subtitles", lambda: run_stage_subtitles(state, db)),
        ("upload", lambda: run_stage_upload(state)),
        ("finalize", lambda: run_stage_finalize(state, db)),
    ]

    for stage_name, stage_func in stages:
        try:
            if not await stage_func():
                print(f"  [FAILED] Stage '{stage_name}' failed: {state.state.get('error')}")
                batch_state.mark_failed(content_id)
                return False
        except Exception as e:
            print(f"  [ERROR] Stage '{stage_name}' exception: {e}")
            state.set_error(str(e))
            batch_state.mark_failed(content_id)
            return False

    # Cleanup state file on success
    state.cleanup()
    batch_state.mark_complete(content_id)

    print(f"  [SUCCESS] Conversion complete")
    return True


async def main():
    parser = argparse.ArgumentParser(
        description="Batch convert content to HLS with embedded subtitles (chunked with resume)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be converted without making changes",
    )

    parser.add_argument(
        "--force",
        action="store_true",
        help="Force re-convert even if already in HLS format",
    )

    parser.add_argument(
        "--resume",
        action="store_true",
        help="Resume batch from where it left off (skip completed items)",
    )

    parser.add_argument(
        "--reset",
        action="store_true",
        help="Clear batch state and start fresh",
    )

    parser.add_argument(
        "--content-type",
        choices=["movies", "series"],
        help="Filter by content type",
    )

    parser.add_argument(
        "--all",
        action="store_true",
        help="Convert all content (movies and series)",
    )

    parser.add_argument(
        "--limit",
        type=int,
        help="Limit number of items to process",
    )

    parser.add_argument(
        "--skip-failed",
        action="store_true",
        help="Skip previously failed items (use with --resume)",
    )

    args = parser.parse_args()

    if not any([args.content_type, args.all]):
        parser.error("Must specify --content-type or --all")

    print("=" * 70)
    print("Batch HLS Converter with Chunked Resume Support")
    print("=" * 70)

    if args.dry_run:
        print("MODE: Dry run (no changes will be made)")
    if args.force:
        print("MODE: Force re-convert")
    if args.resume:
        print("MODE: Resume from previous batch")
    if args.limit:
        print(f"LIMIT: {args.limit} items")

    # Initialize batch state
    batch_state = BatchState()

    if args.reset:
        print("\nClearing batch state...")
        batch_state.cleanup()
        batch_state = BatchState()

    # Connect to database
    print("\nConnecting to MongoDB...")
    from olorin_shared.database import init_mongodb
    mongo_connection = await init_mongodb()
    db = mongo_connection.get_database()
    print("  Connected")

    # Get content to convert
    content_type = args.content_type if not args.all else None
    content_list = await get_content_needing_conversion(
        db,
        content_type=content_type,
        force=args.force,
        limit=args.limit,
    )

    # Filter based on batch state
    original_count = len(content_list)
    if args.resume:
        content_list = [
            c for c in content_list
            if not batch_state.is_complete(str(c["_id"]))
        ]
        if args.skip_failed:
            content_list = [
                c for c in content_list
                if str(c["_id"]) not in batch_state.state["failed_ids"]
            ]
        skipped = original_count - len(content_list)
        if skipped > 0:
            print(f"\n[RESUME] Skipped {skipped} previously processed items")

    batch_state.state["total_count"] = len(content_list)
    batch_state.save()

    print(f"\nFound {len(content_list)} content items to process:")
    for i, content in enumerate(content_list[:20], 1):
        ext = Path(content.get("stream_url", "").split("?")[0]).suffix
        status = ""
        cid = str(content["_id"])
        if cid in batch_state.state["failed_ids"]:
            status = " [PREVIOUSLY FAILED]"
        print(f"  {i}. {content.get('title')} ({ext}){status}")
    if len(content_list) > 20:
        print(f"  ... and {len(content_list) - 20} more")

    if not content_list:
        print("\nNo content needs conversion. Done!")
        return

    if args.dry_run:
        print("\n" + "=" * 70)
        print("DRY RUN - No changes made")
        print("=" * 70)
        return

    # Process each content item
    stats = {"success": 0, "failed": 0, "skipped": 0}

    print(f"\n{'=' * 70}")
    print("Starting batch conversion...")
    print("Press Ctrl+C to interrupt (progress will be saved)")
    print(f"{'=' * 70}")

    try:
        for i, content in enumerate(content_list, 1):
            content_id = str(content["_id"])

            print(f"\n[{i}/{len(content_list)}]", end="")

            # Skip if already complete
            if batch_state.is_complete(content_id):
                print(f" SKIP: {content.get('title')} (already converted)")
                stats["skipped"] += 1
                continue

            success = await convert_single_content_chunked(
                db, content, batch_state, force=args.force
            )

            if success:
                stats["success"] += 1
            else:
                stats["failed"] += 1

    except KeyboardInterrupt:
        print("\n\n[INTERRUPTED] Batch conversion interrupted by user")
        print("Progress has been saved. Run with --resume to continue.")

    # Summary
    print(f"\n{'=' * 70}")
    print("BATCH CONVERSION SUMMARY")
    print(f"{'=' * 70}")
    print(f"Total in queue: {len(content_list)}")
    print(f"Successful: {stats['success']}")
    print(f"Failed: {stats['failed']}")
    print(f"Skipped (already done): {stats['skipped']}")
    print(f"\nBatch state saved to: {batch_state.state_file}")

    if stats["failed"] > 0:
        print(f"\nFailed items: {batch_state.state['failed_ids'][:10]}")
        if len(batch_state.state["failed_ids"]) > 10:
            print(f"  ... and {len(batch_state.state['failed_ids']) - 10} more")
        print("\nTo retry failed items, run again without --skip-failed")
        print("To skip failed items, use --resume --skip-failed")

    if stats["success"] == len(content_list):
        print("\nAll items processed successfully!")
        batch_state.cleanup()

    print(f"{'=' * 70}")


if __name__ == "__main__":
    asyncio.run(main())
