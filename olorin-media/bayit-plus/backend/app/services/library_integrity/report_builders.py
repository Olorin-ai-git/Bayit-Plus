"""
Report Section Builders for Library Integrity Verification

Helper functions to build specific sections of the markdown report.
"""

from datetime import datetime, timezone
from typing import List

from .models import VerificationResult, VerificationStats


def build_header(config: dict) -> str:
    """Build report header section."""
    return f"""# Library Integrity Verification Report

**Date**: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}
**Mode**: {"Dry-Run (Preview Only)" if config['dry_run'] else "Live (Changes Applied)"}
**Scope**: {"All Content" if not config.get('category_filter') else f"Category: {config['category_filter']}"}
**Limit**: {config.get('limit', 'None')}

## Executive Summary

- **Total files scanned**: {config['total_scanned']:,}
- **Files verified**: {config['total_verified']:,}
- **Hash mismatches**: {config['hash_mismatches']} {f"(rehydrated: {config['hash_mismatches']})" if not config['dry_run'] else ""}
- **GCS files missing**: {config['gcs_missing']}
- **GCS files inaccessible**: {config['gcs_inaccessible']}
- **Streaming failures**: {config['streaming_failures']}
- **Metadata incomplete**: {config['metadata_incomplete']}
- **Metadata rehydrated**: {config['metadata_rehydrated']}
- **Total issues**: {config['total_issues']}
- **Critical issues**: {config['critical_issues']}

---

## Critical Issues (Immediate Attention Required)

"""


def build_gcs_missing_section(gcs_missing: List[VerificationResult]) -> str:
    """Build GCS missing files section."""
    if not gcs_missing:
        return ""

    section = f"### Missing GCS Files ({len(gcs_missing)})\n\n"
    section += "| Content ID | Title | Stream URL |\n"
    section += "|------------|-------|------------|\n"
    for r in gcs_missing[:20]:
        section += f"| {r.content_id[:8]}... | {r.title[:50]} | {r.stream_url[:60]}... |\n"
    if len(gcs_missing) > 20:
        section += f"\n*... and {len(gcs_missing) - 20} more*\n"
    section += "\n"
    return section


def build_hash_mismatches_section(
    hash_mismatches: List[VerificationResult], dry_run: bool
) -> str:
    """Build hash mismatches section."""
    if not hash_mismatches:
        return ""

    section = f"### Hash Mismatches ({len(hash_mismatches)})\n\n"
    section += "| Content ID | Title | Expected Hash | Actual Hash | Action |\n"
    section += "|------------|-------|---------------|-------------|--------|\n"
    for r in hash_mismatches[:20]:
        action = "Hash updated" if not dry_run else "Preview only"
        section += (
            f"| {r.content_id[:8]}... | {r.title[:40]} | "
            f"{r.expected_hash[:16] if r.expected_hash else 'N/A'}... | "
            f"{r.recalculated_hash[:16] if r.recalculated_hash else 'N/A'}... | "
            f"{action} |\n"
        )
    if len(hash_mismatches) > 20:
        section += f"\n*... and {len(hash_mismatches) - 20} more*\n"
    section += "\n"
    return section


def build_streaming_failures_section(
    streaming_failures: List[VerificationResult]
) -> str:
    """Build streaming failures section."""
    if not streaming_failures:
        return ""

    section = f"### Broken Streaming URLs ({len(streaming_failures)})\n\n"
    section += "| Content ID | Title | Error |\n"
    section += "|------------|-------|-------|\n"
    for r in streaming_failures[:20]:
        error_msg = r.warnings[0] if r.warnings else "Unknown error"
        section += f"| {r.content_id[:8]}... | {r.title[:50]} | {error_msg[:60]} |\n"
    if len(streaming_failures) > 20:
        section += f"\n*... and {len(streaming_failures) - 20} more*\n"
    section += "\n"
    return section


def build_gcs_inaccessible_section(
    gcs_inaccessible: List[VerificationResult]
) -> str:
    """Build GCS inaccessible files section."""
    if not gcs_inaccessible:
        return ""

    section = f"### Inaccessible GCS Files ({len(gcs_inaccessible)})\n\n"
    section += "| Content ID | Title | Status Code |\n"
    section += "|------------|-------|-------------|\n"
    for r in gcs_inaccessible[:20]:
        section += f"| {r.content_id[:8]}... | {r.title[:50]} | {r.gcs_status_code or 'N/A'} |\n"
    if len(gcs_inaccessible) > 20:
        section += f"\n*... and {len(gcs_inaccessible) - 20} more*\n"
    section += "\n"
    return section


def build_metadata_incomplete_section(
    metadata_incomplete: List[VerificationResult]
) -> str:
    """Build metadata incomplete section."""
    if not metadata_incomplete:
        return ""

    section = f"### Incomplete Metadata ({len(metadata_incomplete)})\n\n"
    section += "| Content ID | Title | Missing Fields |\n"
    section += "|------------|-------|----------------|\n"
    for r in metadata_incomplete[:20]:
        fields = ", ".join(r.missing_metadata_fields) if r.missing_metadata_fields else "N/A"
        section += f"| {r.content_id[:8]}... | {r.title[:50]} | {fields} |\n"
    if len(metadata_incomplete) > 20:
        section += f"\n*... and {len(metadata_incomplete) - 20} more*\n"
    section += "\n"
    return section


def build_actions_section(stats: VerificationStats, dry_run: bool) -> str:
    """Build actions taken section."""
    section = "---\n\n## Actions Taken\n\n"
    if not dry_run:
        section += f"- Updated file_hash for {stats.hash_mismatches} content items\n"
        section += f"- Fetched fresh metadata from TMDB for {stats.metadata_rehydrated} items\n"
        section += f"- Marked {stats.gcs_missing} items as needs_review=True\n"
    else:
        section += "**DRY-RUN MODE**: No changes were made to the database.\n"
    return section


def build_recommendations_section(stats: VerificationStats, config: dict) -> str:
    """Build recommendations section."""
    rec_1 = (
        f"Restore {stats.gcs_missing} missing GCS files from backup"
        if stats.gcs_missing > 0
        else "No critical GCS issues"
    )
    rec_2 = (
        f"Fix {stats.gcs_inaccessible} inaccessible GCS files"
        if stats.gcs_inaccessible > 0
        else "No accessibility issues"
    )
    rec_3 = (
        f"Re-run with --rehydrate-metadata for {stats.metadata_incomplete} incomplete items"
        if stats.metadata_incomplete > 0 and not config.get('rehydrate_metadata')
        else "Metadata complete"
    )

    return f"""
## Recommendations

1. **Immediate**: {rec_1}
2. **High Priority**: {rec_2}
3. **Medium Priority**: {rec_3}
4. **Low Priority**: Schedule weekly integrity checks with medium verification level

---

"""


def build_configuration_section(config: dict, stats: VerificationStats) -> str:
    """Build verification configuration section."""
    avg_time = stats.duration_seconds / stats.total_verified if stats.total_verified > 0 else 0

    return f"""## Verification Configuration

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
avg_time_per_item: {avg_time:.2f}s
```
"""
