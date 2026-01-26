"""
Report Generation for Library Integrity Verification

Generates comprehensive markdown reports and updates documentation index.
"""

import logging
from datetime import datetime, timezone
from pathlib import Path

from .models import VerificationStats
from .report_builders import (
    build_actions_section,
    build_configuration_section,
    build_gcs_inaccessible_section,
    build_gcs_missing_section,
    build_hash_mismatches_section,
    build_header,
    build_metadata_incomplete_section,
    build_recommendations_section,
    build_streaming_failures_section,
)

logger = logging.getLogger(__name__)


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
    hash_mismatches = [r for r in stats.results if r.hash_verified and not r.hash_matches]
    gcs_missing = [r for r in stats.results if not r.gcs_exists]
    gcs_inaccessible = [
        r for r in stats.results if r.gcs_exists and not r.gcs_accessible
    ]
    streaming_failures = [
        r for r in stats.results if r.streaming_tested and not r.streaming_works
    ]
    metadata_incomplete = [r for r in stats.results if not r.metadata_complete]

    # Build report sections
    config_with_stats = {
        **config,
        "total_scanned": stats.total_scanned,
        "total_verified": stats.total_verified,
        "hash_mismatches": stats.hash_mismatches,
        "gcs_missing": stats.gcs_missing,
        "gcs_inaccessible": stats.gcs_inaccessible,
        "streaming_failures": stats.streaming_failures,
        "metadata_incomplete": stats.metadata_incomplete,
        "metadata_rehydrated": stats.metadata_rehydrated,
        "total_issues": stats.total_issues,
        "critical_issues": stats.critical_issues,
    }

    report = build_header(config_with_stats)
    report += build_gcs_missing_section(gcs_missing)
    report += build_hash_mismatches_section(hash_mismatches, config["dry_run"])
    report += "---\n\n## Warnings\n\n"
    report += build_streaming_failures_section(streaming_failures)
    report += build_gcs_inaccessible_section(gcs_inaccessible)
    report += build_metadata_incomplete_section(metadata_incomplete)
    report += build_actions_section(stats, config["dry_run"])
    report += build_recommendations_section(stats, config)
    report += build_configuration_section(config, stats)

    # Write report
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        f.write(report)

    logger.info(f"📄 Report saved to: {output_path}")


async def update_docs_index(report_path: Path, project_root: Path) -> None:
    """
    Update documentation index with new report entry.

    Args:
        report_path: Path to generated report
        project_root: Project root directory
    """
    docs_index = project_root / "docs" / "README.md"

    if not docs_index.exists():
        logger.warning(f"Documentation index not found: {docs_index}")
        return

    try:
        with open(docs_index, "r") as f:
            content = f.read()

        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        report_name = report_path.stem
        relative_path = report_path.relative_to(project_root / "docs")
        entry = f"- [{report_name}]({relative_path}) - Zero-trust verification of media library - {timestamp}\n"

        if "### Reviews" in content:
            parts = content.split("### Reviews\n", 1)
            if len(parts) == 2:
                lines = parts[1].split("\n")
                lines.insert(0, entry)
                new_content = parts[0] + "### Reviews\n" + "\n".join(lines)

                with open(docs_index, "w") as f:
                    f.write(new_content)

                logger.info(f"✅ Documentation index updated: {docs_index}")
            else:
                logger.warning("Could not parse Reviews section in docs index")
        else:
            logger.warning("Reviews section not found in docs index")

    except Exception as e:
        logger.error(f"Failed to update docs index: {e}", exc_info=True)
