#!/usr/bin/env python3
"""
Library Integrity Verification CLI

Zero-trust verification of complete media library.

Usage:
    # Quick preview (dry-run, metadata + GCS checks only)
    python scripts/backend/verify_library_integrity.py --dry-run

    # Live verification with metadata rehydration
    python scripts/backend/verify_library_integrity.py --live --rehydrate-metadata

    # Deep verification with streaming tests (slow)
    python scripts/backend/verify_library_integrity.py --verify-streaming --dry-run

    # Verify specific category
    python scripts/backend/verify_library_integrity.py --category movies --limit 500

    # Resume interrupted verification
    python scripts/backend/verify_library_integrity.py --resume-from /tmp/checkpoint.json

    # Full zero-trust verification (very slow, ~69 hours)
    python scripts/backend/verify_library_integrity.py --verify-hashes --verify-streaming --live
"""

import argparse
import asyncio
import logging
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# Add backend directory to Python path
script_dir = Path(__file__).parent
project_root = script_dir.parent.parent
backend_dir = project_root / "backend"
sys.path.insert(0, str(backend_dir))

from app.core.config import settings
from app.core.database import connect_to_mongo
from app.services.library_integrity_service import (
    LibraryIntegrityService,
    VerificationStats,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


# ============================================================================
# Progress Display
# ============================================================================


class ProgressTracker:
    """Track and display verification progress."""

    def __init__(self, total: int = 0):
        self.total = total
        self.processed = 0
        self.verified = 0
        self.issues = 0
        self.critical = 0
        self.start_time = time.time()
        self.current_title = ""

    def update(
        self,
        processed: int,
        verified: int,
        issues: int,
        critical: int,
        current_title: str = "",
    ):
        """Update progress."""
        self.processed = processed
        self.verified = verified
        self.issues = issues
        self.critical = critical
        self.current_title = current_title

    def display(self):
        """Display progress line."""
        elapsed = time.time() - self.start_time
        rate = self.processed / elapsed if elapsed > 0 else 0
        eta_seconds = (self.total - self.processed) / rate if rate > 0 and self.total > 0 else 0

        # Format ETA
        eta_hours = int(eta_seconds // 3600)
        eta_minutes = int((eta_seconds % 3600) // 60)
        eta_str = f"{eta_hours}h {eta_minutes}m"

        # Format progress
        if self.total > 0:
            pct = (self.processed / self.total) * 100
            progress_str = f"[{self.processed}/{self.total}] ({pct:.1f}%)"
        else:
            progress_str = f"[{self.processed}]"

        # Print progress (overwrite line)
        print(
            f"\r{progress_str} - Current: {self.current_title[:40]:<40} - "
            f"Verified: {self.verified}, Issues: {self.issues} (Critical: {self.critical}) - "
            f"ETA: {eta_str}",
            end="",
            flush=True,
        )


# ============================================================================
# Report Generation
# ============================================================================


async def generate_report(
    stats: VerificationStats, config: dict, output_path: Path
) -> None:
    """
    Generate comprehensive markdown report.

    Args:
        stats: VerificationStats from verification run
        config: Verification configuration dict
        output_path: Path to save report
    """
    # Categorize results
    critical_results = [r for r in stats.results if r.has_critical_issues]
    warning_results = [r for r in stats.results if r.has_warnings and not r.has_critical_issues]

    # Group by issue type
    hash_mismatches = [r for r in stats.results if r.hash_verified and not r.hash_matches]
    gcs_missing = [r for r in stats.results if not r.gcs_exists]
    gcs_inaccessible = [r for r in stats.results if r.gcs_exists and not r.gcs_accessible]
    streaming_failures = [r for r in stats.results if r.streaming_tested and not r.streaming_works]
    metadata_incomplete = [r for r in stats.results if not r.metadata_complete]
    metadata_rehydrated = [r for r in stats.results if r.metadata_rehydrated]

    # Build report
    report = f"""# Library Integrity Verification Report

**Date**: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}
**Mode**: {"Dry-Run (Preview Only)" if config['dry_run'] else "Live (Changes Applied)"}
**Scope**: {"All Content" if not config.get('category_filter') else f"Category: {config['category_filter']}"}
**Limit**: {config.get('limit', 'None')}

## Executive Summary

- **Total files scanned**: {stats.total_scanned:,}
- **Files verified**: {stats.total_verified:,}
- **Hash mismatches**: {stats.hash_mismatches} {f"(rehydrated: {stats.hash_mismatches})" if not config['dry_run'] else ""}
- **GCS files missing**: {stats.gcs_missing}
- **GCS files inaccessible**: {stats.gcs_inaccessible}
- **Streaming failures**: {stats.streaming_failures}
- **Metadata incomplete**: {stats.metadata_incomplete}
- **Metadata rehydrated**: {stats.metadata_rehydrated}
- **Total issues**: {stats.total_issues}
- **Critical issues**: {stats.critical_issues}

---

## Critical Issues (Immediate Attention Required)

"""

    # GCS Missing Files
    if gcs_missing:
        report += f"### Missing GCS Files ({len(gcs_missing)})\n\n"
        report += "| Content ID | Title | Stream URL |\n"
        report += "|------------|-------|------------|\n"
        for r in gcs_missing[:20]:  # Limit to 20 for readability
            report += f"| {r.content_id[:8]}... | {r.title[:50]} | {r.stream_url[:60]}... |\n"
        if len(gcs_missing) > 20:
            report += f"\n*... and {len(gcs_missing) - 20} more*\n"
        report += "\n"

    # Hash Mismatches
    if hash_mismatches:
        report += f"### Hash Mismatches ({len(hash_mismatches)})\n\n"
        report += "| Content ID | Title | Expected Hash | Actual Hash | Action |\n"
        report += "|------------|-------|---------------|-------------|--------|\n"
        for r in hash_mismatches[:20]:
            action = "Hash updated" if not config['dry_run'] else "Preview only"
            report += (
                f"| {r.content_id[:8]}... | {r.title[:40]} | "
                f"{r.expected_hash[:16] if r.expected_hash else 'N/A'}... | "
                f"{r.recalculated_hash[:16] if r.recalculated_hash else 'N/A'}... | "
                f"{action} |\n"
            )
        if len(hash_mismatches) > 20:
            report += f"\n*... and {len(hash_mismatches) - 20} more*\n"
        report += "\n"

    report += """---

## Warnings

"""

    # Broken Streaming URLs
    if streaming_failures:
        report += f"### Broken Streaming URLs ({len(streaming_failures)})\n\n"
        report += "| Content ID | Title | Error |\n"
        report += "|------------|-------|-------|\n"
        for r in streaming_failures[:20]:
            error_msg = r.warnings[0] if r.warnings else "Unknown error"
            report += f"| {r.content_id[:8]}... | {r.title[:50]} | {error_msg[:60]} |\n"
        if len(streaming_failures) > 20:
            report += f"\n*... and {len(streaming_failures) - 20} more*\n"
        report += "\n"

    # GCS Inaccessible
    if gcs_inaccessible:
        report += f"### Inaccessible GCS Files ({len(gcs_inaccessible)})\n\n"
        report += "| Content ID | Title | Status Code |\n"
        report += "|------------|-------|-------------|\n"
        for r in gcs_inaccessible[:20]:
            report += f"| {r.content_id[:8]}... | {r.title[:50]} | {r.gcs_status_code or 'N/A'} |\n"
        if len(gcs_inaccessible) > 20:
            report += f"\n*... and {len(gcs_inaccessible) - 20} more*\n"
        report += "\n"

    # Stale Metadata
    if metadata_incomplete:
        report += f"### Incomplete Metadata ({len(metadata_incomplete)})\n\n"
        report += "| Content ID | Title | Missing Fields |\n"
        report += "|------------|-------|----------------|\n"
        for r in metadata_incomplete[:20]:
            fields = ", ".join(r.missing_metadata_fields) if r.missing_metadata_fields else "N/A"
            report += f"| {r.content_id[:8]}... | {r.title[:50]} | {fields} |\n"
        if len(metadata_incomplete) > 20:
            report += f"\n*... and {len(metadata_incomplete) - 20} more*\n"
        report += "\n"

    report += f"""---

## Actions Taken

"""
    if not config['dry_run']:
        report += f"- Updated file_hash for {stats.hash_mismatches} content items\n"
        report += f"- Fetched fresh metadata from TMDB for {stats.metadata_rehydrated} items\n"
        report += f"- Marked {stats.gcs_missing} items as needs_review=True\n"
    else:
        report += "**DRY-RUN MODE**: No changes were made to the database.\n"

    report += f"""

## Recommendations

1. **Immediate**: {"Restore " + str(stats.gcs_missing) + " missing GCS files from backup" if stats.gcs_missing > 0 else "No critical GCS issues"}
2. **High Priority**: {"Fix " + str(stats.gcs_inaccessible) + " inaccessible GCS files" if stats.gcs_inaccessible > 0 else "No accessibility issues"}
3. **Medium Priority**: {"Re-run with --rehydrate-metadata for " + str(stats.metadata_incomplete) + " incomplete items" if stats.metadata_incomplete > 0 and not config.get('rehydrate_metadata') else "Metadata complete"}
4. **Low Priority**: Schedule weekly integrity checks with medium verification level

---

## Verification Configuration

```yaml
batch_size: {config['batch_size']}
concurrency: {config['concurrency']}
verify_hashes: {config['verify_hashes']}
verify_streaming: {config['verify_streaming']}
rehydrate_metadata: {config['rehydrate_metadata']}
dry_run: {config['dry_run']}
category_filter: {config.get('category_filter', 'None')}
limit: {config.get('limit', 'None')}
total_duration: {int(stats.duration_seconds // 60)}m {int(stats.duration_seconds % 60)}s
avg_time_per_item: {stats.duration_seconds / stats.total_verified if stats.total_verified > 0 else 0:.2f}s
```

---

## Detailed Results

<details>
<summary>Hash Mismatches ({len(hash_mismatches)} items)</summary>

"""

    for r in hash_mismatches:
        report += f"- **{r.title}** (`{r.content_id[:8]}...`)\n"
        report += f"  - Expected: `{r.expected_hash}`\n"
        report += f"  - Actual: `{r.recalculated_hash}`\n"
        report += "\n"

    report += "</details>\n\n"

    report += f"""<details>
<summary>Missing GCS Files ({len(gcs_missing)} items)</summary>

"""

    for r in gcs_missing:
        report += f"- **{r.title}** (`{r.content_id[:8]}...`)\n"
        report += f"  - URL: `{r.stream_url}`\n"
        report += "\n"

    report += "</details>\n\n"

    report += f"""<details>
<summary>Incomplete Metadata ({len(metadata_incomplete)} items)</summary>

"""

    for r in metadata_incomplete:
        fields = ", ".join(r.missing_metadata_fields) if r.missing_metadata_fields else "N/A"
        report += f"- **{r.title}** (`{r.content_id[:8]}...`)\n"
        report += f"  - Missing: {fields}\n"
        report += "\n"

    report += "</details>\n"

    # Write report
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        f.write(report)

    logger.info(f"📄 Report saved to: {output_path}")


async def update_docs_index(report_path: Path) -> None:
    """
    Update /docs/README.md with new report entry.

    Args:
        report_path: Path to generated report
    """
    docs_index = project_root / "docs" / "README.md"

    if not docs_index.exists():
        logger.warning(f"Documentation index not found: {docs_index}")
        return

    try:
        # Read existing index
        with open(docs_index, "r") as f:
            content = f.read()

        # Generate entry
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        report_name = report_path.stem
        relative_path = report_path.relative_to(docs_index.parent)
        entry = f"- [{report_name}]({relative_path}) - Zero-trust verification of media library - {timestamp}\n"

        # Find Reviews section
        if "### Reviews" in content:
            # Insert after "### Reviews" header
            parts = content.split("### Reviews\n", 1)
            if len(parts) == 2:
                # Find next line after header
                lines = parts[1].split("\n")
                # Insert at beginning of review list
                lines.insert(0, entry)
                new_content = parts[0] + "### Reviews\n" + "\n".join(lines)

                # Write back
                with open(docs_index, "w") as f:
                    f.write(new_content)

                logger.info(f"✅ Documentation index updated: {docs_index}")
            else:
                logger.warning("Could not parse Reviews section in docs index")
        else:
            logger.warning("Reviews section not found in docs index")

    except Exception as e:
        logger.error(f"Failed to update docs index: {e}", exc_info=True)


# ============================================================================
# Main CLI
# ============================================================================


async def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Verify Bayit+ media library integrity",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )

    parser.add_argument(
        "--batch-size",
        type=int,
        default=50,
        help="Items per batch (default: 50)",
    )
    parser.add_argument(
        "--concurrency",
        type=int,
        default=10,
        help="Max concurrent verifications (default: 10)",
    )
    parser.add_argument(
        "--category",
        type=str,
        help="Filter by category ID",
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Max items to process",
    )
    parser.add_argument(
        "--verify-hashes",
        action="store_true",
        help="Recalculate and verify file hashes (EXPENSIVE, adds ~30s per 1GB file)",
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
        "--live",
        action="store_true",
        help="Execute changes (update hashes, metadata, etc.)",
    )
    parser.add_argument(
        "--resume-from",
        type=str,
        help="Resume from checkpoint file",
    )

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
    logger.info(f"  Mode: {'DRY-RUN (Preview)' if args.dry_run else 'LIVE (Changes Enabled)'}")
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
        logger.info(f"Duration: {int(stats.duration_seconds // 60)}m {int(stats.duration_seconds % 60)}s")
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
        await update_docs_index(report_path)

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
