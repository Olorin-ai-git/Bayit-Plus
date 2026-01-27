"""
Apply fixes from existing audit results without re-scanning.

This script reads the findings from the most recent audit report and applies
the fixes directly using the executor functions, without using the LLM.

Usage:
    poetry run python scripts/apply_audit_fixes.py [--audit-id AUDIT_ID] [--dry-run]
"""

import argparse
import asyncio
import logging
import sys
from datetime import datetime
from typing import Any, Dict, List

# Add parent directory to path for imports
sys.path.insert(0, "/Users/olorin/Documents/olorin/olorin-media/bayit-plus/backend")

from app.core.config import settings
from app.core.database import init_db
from app.core.logging_config import get_logger

logger = get_logger(__name__)


async def get_latest_audit_report(audit_id: str = None):
    """Get the most recent audit report or a specific one by ID."""
    from app.models.librarian import AuditReport

    if audit_id:
        report = await AuditReport.find_one(AuditReport.audit_id == audit_id)
        if not report:
            logger.error(f"Audit report {audit_id} not found")
            return None
        return report

    # Get the most recent completed audit
    report = (
        await AuditReport.find({"status": {"$in": ["completed", "partial"]}})
        .sort([("audit_date", -1)])
        .first_or_none()
    )
    return report


async def apply_dirty_title_fixes(
    audit_id: str, items: List[Dict[str, Any]], dry_run: bool
) -> Dict[str, int]:
    """Clean dirty titles."""
    from app.services.ai_agent.executors.metadata.titles import execute_clean_title

    stats = {"attempted": 0, "success": 0, "failed": 0}

    for item in items:
        content_id = item.get("id") or item.get("content_id")
        if not content_id:
            continue

        stats["attempted"] += 1
        try:
            result = await execute_clean_title(
                content_id=content_id, audit_id=audit_id, dry_run=dry_run
            )
            if result.get("success"):
                stats["success"] += 1
                logger.info(f"Cleaned title for {content_id}")
            else:
                stats["failed"] += 1
                logger.warning(f"Failed to clean title {content_id}: {result.get('error')}")
        except Exception as e:
            stats["failed"] += 1
            logger.error(f"Error cleaning title {content_id}: {e}")

    return stats


async def apply_missing_metadata_fixes(
    audit_id: str, items: List[Dict[str, Any]], dry_run: bool
) -> Dict[str, int]:
    """Fix missing metadata using TMDB lookup."""
    from app.services.ai_agent.executors.metadata.fixes import execute_fix_missing_metadata

    stats = {"attempted": 0, "success": 0, "failed": 0}

    for item in items:
        content_id = item.get("id") or item.get("content_id")
        if not content_id:
            continue

        stats["attempted"] += 1
        try:
            reason = "Missing metadata fields from audit scan"
            result = await execute_fix_missing_metadata(
                content_id=content_id, reason=reason, audit_id=audit_id, dry_run=dry_run
            )
            if result.get("success"):
                stats["success"] += 1
                logger.info(f"Fixed metadata for {content_id}")
            else:
                stats["failed"] += 1
                logger.warning(
                    f"Failed to fix metadata {content_id}: {result.get('error')}"
                )
        except Exception as e:
            stats["failed"] += 1
            logger.error(f"Error fixing metadata {content_id}: {e}")

    return stats


async def apply_missing_poster_fixes(
    audit_id: str, items: List[Dict[str, Any]], dry_run: bool
) -> Dict[str, int]:
    """Fix missing posters using TMDB lookup."""
    from app.services.ai_agent.executors.metadata.fixes import execute_fix_missing_poster

    stats = {"attempted": 0, "success": 0, "failed": 0}

    for item in items:
        content_id = item.get("id") or item.get("content_id")
        if not content_id:
            continue

        stats["attempted"] += 1
        try:
            reason = "Missing poster from audit scan"
            result = await execute_fix_missing_poster(
                content_id=content_id, reason=reason, audit_id=audit_id, dry_run=dry_run
            )
            if result.get("success") or result.get("fixed"):
                stats["success"] += 1
                logger.info(f"Fixed poster for {content_id}")
            else:
                stats["failed"] += 1
                logger.warning(
                    f"Failed to fix poster {content_id}: {result.get('error')}"
                )
        except Exception as e:
            stats["failed"] += 1
            logger.error(f"Error fixing poster {content_id}: {e}")

    return stats


async def apply_subtitle_downloads(
    audit_id: str, items: List[Dict[str, Any]], dry_run: bool
) -> Dict[str, int]:
    """Download missing subtitles from OpenSubtitles."""
    from app.services.ai_agent.executors.subtitles import (
        execute_check_subtitle_quota,
        execute_download_external_subtitle,
    )

    stats = {"attempted": 0, "success": 0, "failed": 0, "quota_exhausted": False}

    # Check quota first
    quota_result = await execute_check_subtitle_quota()
    if not quota_result.get("quota_available"):
        logger.warning(
            f"OpenSubtitles quota exhausted: {quota_result.get('used')}/{quota_result.get('daily_limit')}"
        )
        stats["quota_exhausted"] = True
        return stats

    remaining_quota = quota_result.get("remaining", 0)
    logger.info(f"OpenSubtitles quota remaining: {remaining_quota}")

    for item in items:
        if stats["success"] >= remaining_quota:
            logger.warning("Reached quota limit, stopping subtitle downloads")
            stats["quota_exhausted"] = True
            break

        content_id = item.get("id") or item.get("content_id")
        if not content_id:
            continue

        # Default to Hebrew subtitles first, then English
        languages = item.get("missing_languages", ["he", "en"])

        for language in languages:
            if stats["success"] >= remaining_quota:
                break

            stats["attempted"] += 1
            try:
                if dry_run:
                    logger.info(f"[DRY RUN] Would download {language} subtitle for {content_id}")
                    stats["success"] += 1
                    continue

                result = await execute_download_external_subtitle(
                    content_id=content_id, language=language, audit_id=audit_id
                )
                if result.get("success"):
                    stats["success"] += 1
                    logger.info(
                        f"Downloaded {language} subtitle for {content_id} from {result.get('source')}"
                    )
                else:
                    stats["failed"] += 1
                    logger.warning(
                        f"Failed to download subtitle {content_id}/{language}: {result.get('error')}"
                    )
            except Exception as e:
                stats["failed"] += 1
                logger.error(f"Error downloading subtitle {content_id}/{language}: {e}")

    return stats


async def apply_misclassification_fixes(
    audit_id: str, items: List[Dict[str, Any]], dry_run: bool
) -> Dict[str, int]:
    """Fix misclassified content."""
    from app.services.ai_agent.executors.series.classification import (
        execute_fix_misclassified_series,
    )

    stats = {"attempted": 0, "success": 0, "failed": 0}

    for item in items:
        content_id = item.get("id") or item.get("content_id")
        if not content_id:
            continue

        stats["attempted"] += 1
        try:
            result = await execute_fix_misclassified_series(
                content_id=content_id, audit_id=audit_id, dry_run=dry_run
            )
            if result.get("success") or result.get("fixed"):
                stats["success"] += 1
                logger.info(f"Fixed misclassified content {content_id}")
            else:
                stats["failed"] += 1
                logger.warning(
                    f"Failed to fix misclassification {content_id}: {result.get('error')}"
                )
        except Exception as e:
            stats["failed"] += 1
            logger.error(f"Error fixing misclassification {content_id}: {e}")

    return stats


async def apply_broken_stream_fixes(
    audit_id: str, items: List[Dict[str, Any]], dry_run: bool
) -> Dict[str, int]:
    """Flag broken streams for manual review (can't auto-fix broken streams)."""
    from app.services.ai_agent.executors.metadata.fixes import (
        execute_flag_for_manual_review,
    )

    stats = {"attempted": 0, "success": 0, "failed": 0}

    for item in items:
        content_id = item.get("id") or item.get("content_id")
        if not content_id:
            continue

        stats["attempted"] += 1
        try:
            if dry_run:
                logger.info(f"[DRY RUN] Would flag {content_id} for review")
                stats["success"] += 1
                continue

            result = await execute_flag_for_manual_review(
                content_id=content_id,
                audit_id=audit_id,
                reason=f"Broken stream: {item.get('error', 'Stream validation failed')}",
            )
            if result.get("success"):
                stats["success"] += 1
                logger.info(f"Flagged broken stream {content_id} for review")
            else:
                stats["failed"] += 1
                logger.warning(
                    f"Failed to flag broken stream {content_id}: {result.get('error')}"
                )
        except Exception as e:
            stats["failed"] += 1
            logger.error(f"Error flagging broken stream {content_id}: {e}")

    return stats


async def get_issues_from_audit(report) -> Dict[str, List[Dict[str, Any]]]:
    """Extract issue lists from audit report summary and execution logs."""
    issues = {
        "dirty_titles": [],
        "missing_metadata": [],
        "missing_posters": [],
        "missing_subtitles": [],
        "misclassifications": [],
        "broken_streams": [],
    }

    # Direct lists from report
    issues["missing_metadata"] = report.missing_metadata or []
    issues["misclassifications"] = report.misclassifications or []
    issues["broken_streams"] = report.broken_streams or []

    # Parse execution logs to find identified issues
    for log in report.execution_logs or []:
        metadata = log.get("metadata", {})
        content_id = log.get("contentId") or metadata.get("content_id")

        if not content_id:
            continue

        message = log.get("message", "").lower()
        level = log.get("level", "")

        # Identify dirty titles from logs
        if "dirty" in message and "title" in message:
            issues["dirty_titles"].append({"id": content_id, "title": log.get("itemName")})

        # Identify missing metadata
        elif "missing metadata" in message or "no metadata" in message:
            if content_id not in [i.get("id") for i in issues["missing_metadata"]]:
                issues["missing_metadata"].append(
                    {"id": content_id, "title": log.get("itemName")}
                )

        # Identify missing posters
        elif "missing poster" in message or "no poster" in message:
            issues["missing_posters"].append(
                {"id": content_id, "title": log.get("itemName")}
            )

        # Identify missing subtitles
        elif "missing subtitle" in message or "no subtitle" in message:
            issues["missing_subtitles"].append(
                {"id": content_id, "title": log.get("itemName")}
            )

    # Also get from summary breakdown if available
    summary = report.summary or {}
    if "issue_breakdown" in summary:
        breakdown = summary["issue_breakdown"]
        # The breakdown gives counts, not IDs, so we already have what we need from logs

    return issues


async def main():
    parser = argparse.ArgumentParser(
        description="Apply fixes from existing audit results"
    )
    parser.add_argument(
        "--audit-id", type=str, help="Specific audit ID to apply fixes from"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate fixes without applying them",
    )
    parser.add_argument(
        "--fix-types",
        type=str,
        nargs="+",
        choices=[
            "titles",
            "metadata",
            "posters",
            "subtitles",
            "misclassifications",
            "broken_streams",
            "all",
        ],
        default=["all"],
        help="Types of fixes to apply",
    )
    args = parser.parse_args()

    # Initialize database
    logger.info("Initializing database connection...")
    await init_db()

    # Get audit report
    logger.info(
        f"Loading audit report{' ' + args.audit_id if args.audit_id else ' (latest)'}..."
    )
    report = await get_latest_audit_report(args.audit_id)

    if not report:
        logger.error("No completed audit report found")
        return

    logger.info(f"Using audit report: {report.audit_id}")
    logger.info(f"Audit date: {report.audit_date}")
    logger.info(f"Status: {report.status}")
    logger.info(f"Summary: {report.summary}")

    # Create a new audit ID for tracking these fixes
    import uuid

    fix_audit_id = f"fix-{str(uuid.uuid4())[:8]}"
    logger.info(f"Creating fix session: {fix_audit_id}")

    # Extract issues from the report
    issues = await get_issues_from_audit(report)

    fix_types = args.fix_types
    if "all" in fix_types:
        fix_types = [
            "titles",
            "metadata",
            "posters",
            "subtitles",
            "misclassifications",
            "broken_streams",
        ]

    all_stats = {}
    dry_run = args.dry_run

    if dry_run:
        logger.info("=== DRY RUN MODE - No changes will be made ===")

    # Apply fixes in order
    if "titles" in fix_types and issues["dirty_titles"]:
        logger.info(f"\n--- Cleaning {len(issues['dirty_titles'])} dirty titles ---")
        stats = await apply_dirty_title_fixes(fix_audit_id, issues["dirty_titles"], dry_run)
        all_stats["dirty_titles"] = stats

    if "metadata" in fix_types and issues["missing_metadata"]:
        logger.info(
            f"\n--- Fixing {len(issues['missing_metadata'])} missing metadata items ---"
        )
        stats = await apply_missing_metadata_fixes(
            fix_audit_id, issues["missing_metadata"], dry_run
        )
        all_stats["missing_metadata"] = stats

    if "posters" in fix_types and issues["missing_posters"]:
        logger.info(
            f"\n--- Fixing {len(issues['missing_posters'])} missing posters ---"
        )
        stats = await apply_missing_poster_fixes(
            fix_audit_id, issues["missing_posters"], dry_run
        )
        all_stats["missing_posters"] = stats

    if "subtitles" in fix_types and issues["missing_subtitles"]:
        logger.info(
            f"\n--- Downloading {len(issues['missing_subtitles'])} missing subtitles ---"
        )
        stats = await apply_subtitle_downloads(
            fix_audit_id, issues["missing_subtitles"], dry_run
        )
        all_stats["missing_subtitles"] = stats

    if "misclassifications" in fix_types and issues["misclassifications"]:
        logger.info(
            f"\n--- Fixing {len(issues['misclassifications'])} misclassifications ---"
        )
        stats = await apply_misclassification_fixes(
            fix_audit_id, issues["misclassifications"], dry_run
        )
        all_stats["misclassifications"] = stats

    if "broken_streams" in fix_types and issues["broken_streams"]:
        logger.info(
            f"\n--- Flagging {len(issues['broken_streams'])} broken streams for review ---"
        )
        stats = await apply_broken_stream_fixes(
            fix_audit_id, issues["broken_streams"], dry_run
        )
        all_stats["broken_streams"] = stats

    # Print summary
    logger.info("\n" + "=" * 60)
    logger.info("FIX APPLICATION SUMMARY")
    logger.info("=" * 60)

    total_attempted = 0
    total_success = 0
    total_failed = 0

    for fix_type, stats in all_stats.items():
        logger.info(
            f"{fix_type}: {stats['success']}/{stats['attempted']} successful"
            f" ({stats['failed']} failed)"
        )
        total_attempted += stats["attempted"]
        total_success += stats["success"]
        total_failed += stats["failed"]

    logger.info("-" * 60)
    logger.info(f"TOTAL: {total_success}/{total_attempted} successful ({total_failed} failed)")

    if dry_run:
        logger.info("\n=== DRY RUN COMPLETE - No actual changes were made ===")


if __name__ == "__main__":
    asyncio.run(main())
