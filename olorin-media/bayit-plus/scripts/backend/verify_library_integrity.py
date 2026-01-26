#!/usr/bin/env python3
"""
Library Integrity Verification CLI

Zero-trust verification of complete media library.

Usage:
    python scripts/backend/verify_library_integrity.py --dry-run --limit 5
    python scripts/backend/verify_library_integrity.py --live --rehydrate-metadata
"""

import argparse
import asyncio
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path

# Add backend directory to Python path
script_dir = Path(__file__).parent
project_root = script_dir.parent.parent
backend_dir = project_root / "backend"
sys.path.insert(0, str(backend_dir))

from app.core.database import connect_to_mongo
from app.services.library_integrity import LibraryIntegrityService
from app.services.library_integrity.report import generate_report, update_docs_index

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


async def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Verify Bayit+ media library integrity",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    parser.add_argument(
        "--batch-size", type=int, default=50, help="Items per batch (default: 50)"
    )
    parser.add_argument(
        "--concurrency",
        type=int,
        default=10,
        help="Max concurrent verifications (default: 10)",
    )
    parser.add_argument("--category", type=str, help="Filter by category ID")
    parser.add_argument("--limit", type=int, help="Max items to process")
    parser.add_argument(
        "--verify-hashes",
        action="store_true",
        help="Recalculate and verify file hashes (EXPENSIVE)",
    )
    parser.add_argument(
        "--verify-streaming",
        action="store_true",
        help="Test streaming URLs (adds ~2-5s per item)",
    )
    parser.add_argument(
        "--rehydrate-metadata",
        action="store_true",
        help="Re-fetch metadata from TMDB for incomplete items",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=True,
        help="Preview only, no database updates (default: True)",
    )
    parser.add_argument(
        "--live", action="store_true", help="Execute changes (update hashes, metadata)"
    )
    parser.add_argument("--resume-from", type=str, help="Resume from checkpoint file")

    args = parser.parse_args()

    # Override dry_run if --live specified
    if args.live:
        args.dry_run = False

    # Initialize database
    logger.info("🔌 Connecting to database...")
    await connect_to_mongo()

    # Create service
    service = LibraryIntegrityService(
        batch_size=args.batch_size,
        concurrency=args.concurrency,
        verify_hashes=args.verify_hashes,
        verify_streaming=args.verify_streaming,
        rehydrate_metadata=args.rehydrate_metadata,
        dry_run=args.dry_run,
    )

    # Display configuration
    logger.info("📋 Verification Configuration:")
    logger.info(
        f"  Mode: {'DRY-RUN (Preview)' if args.dry_run else 'LIVE (Changes Enabled)'}"
    )
    logger.info(f"  Batch size: {args.batch_size}")
    logger.info(f"  Concurrency: {args.concurrency}")
    logger.info(f"  Verify hashes: {args.verify_hashes}")
    logger.info(f"  Verify streaming: {args.verify_streaming}")
    logger.info(f"  Rehydrate metadata: {args.rehydrate_metadata}")
    if args.category:
        logger.info(f"  Category filter: {args.category}")
    if args.limit:
        logger.info(f"  Limit: {args.limit}")
    if args.resume_from:
        logger.info(f"  Resume from: {args.resume_from}")

    # Run verification
    logger.info("🚀 Starting verification...")
    try:
        stats = await service.verify_library(
            category_filter=args.category,
            limit=args.limit,
            resume_from=args.resume_from,
        )

        # Print newline after progress display
        print()

        # Display summary
        logger.info("=" * 80)
        logger.info("VERIFICATION COMPLETE")
        logger.info("=" * 80)
        logger.info(f"Total scanned: {stats.total_scanned:,}")
        logger.info(f"Total verified: {stats.total_verified:,}")
        logger.info(f"Total issues: {stats.total_issues}")
        logger.info(f"Critical issues: {stats.critical_issues}")
        logger.info(f"Hash mismatches: {stats.hash_mismatches}")
        logger.info(f"GCS missing: {stats.gcs_missing}")
        logger.info(f"GCS inaccessible: {stats.gcs_inaccessible}")
        logger.info(f"Streaming failures: {stats.streaming_failures}")
        logger.info(f"Metadata incomplete: {stats.metadata_incomplete}")
        logger.info(f"Metadata rehydrated: {stats.metadata_rehydrated}")
        logger.info(
            f"Duration: {int(stats.duration_seconds // 60)}m {int(stats.duration_seconds % 60)}s"
        )
        logger.info("=" * 80)

        # Generate report
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d_%H-%M-%S")
        report_filename = f"LIBRARY_INTEGRITY_{timestamp}.md"
        report_path = project_root / "docs" / "reviews" / report_filename

        logger.info("📝 Generating report...")
        await generate_report(
            stats,
            {
                "batch_size": args.batch_size,
                "concurrency": args.concurrency,
                "verify_hashes": args.verify_hashes,
                "verify_streaming": args.verify_streaming,
                "rehydrate_metadata": args.rehydrate_metadata,
                "dry_run": args.dry_run,
                "category_filter": args.category,
                "limit": args.limit,
            },
            report_path,
        )

        # Update docs index
        await update_docs_index(report_path, project_root)

        logger.info(f"✅ Verification complete! Report: {report_path}")

    except KeyboardInterrupt:
        print()
        logger.warning("⚠️ Verification interrupted by user")
        logger.info("💾 Progress saved to checkpoint. Resume with --resume-from")
        sys.exit(1)

    except Exception as e:
        logger.error(f"❌ Verification failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
