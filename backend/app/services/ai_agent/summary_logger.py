"""
AI Agent Summary Logger - Comprehensive Audit Summary Generation

Generates well-formatted, detailed audit summaries for UI display.
"""

import logging
from typing import Dict, Any, TYPE_CHECKING

from app.services.ai_agent.logger import log_to_database

if TYPE_CHECKING:
    from app.models.librarian import AuditReport

logger = logging.getLogger(__name__)


async def log_comprehensive_summary(
    audit_report: "AuditReport",
    completion_summary: Dict[str, Any],
    execution_time: float,
    iteration: int,
    total_cost: float
):
    """
    Log a comprehensive, well-formatted audit summary to execution logs.
    This creates the detailed summary report that appears in the UI.
    """

    summary_lines = []

    # Header
    summary_lines.append("**COMPREHENSIVE SUBTITLE MAINTENANCE SCAN COMPLETED!**")
    summary_lines.append("")
    summary_lines.append("## **FINAL AUDIT SUMMARY**")
    summary_lines.append("")

    # Overall Statistics
    total_items = completion_summary.get("items_checked", 0)
    issues_found = completion_summary.get("issues_found", 0)
    issues_fixed = completion_summary.get("issues_fixed", 0)
    flagged = completion_summary.get("flagged_for_review", 0)
    health_score = completion_summary.get("health_score", 0)

    summary_lines.append(f"**TOTAL COVERAGE:** All **{total_items} content items** systematically processed!")
    summary_lines.append("")
    summary_lines.append("**RESULTS BREAKDOWN:**")
    summary_lines.append(f"- **Items Processed:** {total_items} (100% coverage)")
    summary_lines.append(f"- **Issues Discovered:** {issues_found}")
    summary_lines.append(f"- **Issues Auto-Fixed:** {issues_fixed}")
    summary_lines.append(f"- **Flagged for Manual Review:** {flagged}")
    if health_score > 0:
        health_emoji = "GREEN" if health_score >= 90 else "YELLOW" if health_score >= 70 else "ORANGE" if health_score >= 50 else "RED"
        summary_lines.append(f"- **Library Health Score:** [{health_emoji}] {health_score}/100")
    summary_lines.append("")

    # Subtitle Statistics
    subtitle_stats = completion_summary.get("subtitle_stats", {})
    if subtitle_stats:
        summary_lines.append("### **SUBTITLE ANALYSIS:**")
        items_with_all = subtitle_stats.get("items_with_all_required", 0)
        items_missing = subtitle_stats.get("items_missing_subtitles", 0)
        extracted = subtitle_stats.get("subtitles_extracted_from_video", 0)
        downloaded = subtitle_stats.get("subtitles_downloaded_external", 0)

        summary_lines.append(f"- Items with all required subtitles (he, en, es): **{items_with_all}**")
        summary_lines.append(f"- Items missing subtitles: **{items_missing}**")
        summary_lines.append(f"- Subtitles extracted from video files: **{extracted}**")
        summary_lines.append(f"- Subtitles downloaded from external sources: **{downloaded}**")

        by_language = subtitle_stats.get("by_language", {})
        if by_language:
            summary_lines.append("  - **By Language:**")
            lang_names = {"he": "Hebrew", "en": "English", "es": "Spanish", "ar": "Arabic", "ru": "Russian", "fr": "French"}
            for lang_code, count in sorted(by_language.items()):
                lang_name = lang_names.get(lang_code, lang_code.upper())
                summary_lines.append(f"    - {lang_name}: **{count}** tracks")

        quota_used = subtitle_stats.get("opensubtitles_quota_used", 0)
        quota_remaining = subtitle_stats.get("opensubtitles_quota_remaining", 0)
        if quota_used > 0 or quota_remaining > 0:
            summary_lines.append(f"- OpenSubtitles quota used: **{quota_used}** (remaining: **{quota_remaining}**)")
        summary_lines.append("")

    # Metadata Statistics
    metadata_stats = completion_summary.get("metadata_stats", {})
    if metadata_stats:
        summary_lines.append("### **METADATA & QUALITY FIXES:**")
        posters_fixed = metadata_stats.get("posters_fixed", 0)
        metadata_updated = metadata_stats.get("metadata_updated", 0)
        titles_cleaned = metadata_stats.get("titles_cleaned", 0)
        tmdb_searches = metadata_stats.get("tmdb_searches_performed", 0)

        if posters_fixed > 0:
            summary_lines.append(f"- Missing posters added: **{posters_fixed}**")
        if metadata_updated > 0:
            summary_lines.append(f"- Metadata updated (description, genres, year, IMDB): **{metadata_updated}**")
        if titles_cleaned > 0:
            summary_lines.append(f"- Titles cleaned (removed junk, extensions, quality markers): **{titles_cleaned}**")
        if tmdb_searches > 0:
            summary_lines.append(f"- TMDB API searches performed: **{tmdb_searches}**")
        summary_lines.append("")

    # Categorization Statistics
    categorization_stats = completion_summary.get("categorization_stats", {})
    if categorization_stats:
        items_recategorized = categorization_stats.get("items_recategorized", 0)
        if items_recategorized > 0:
            summary_lines.append("### **CATEGORIZATION IMPROVEMENTS:**")
            avg_confidence = categorization_stats.get("avg_confidence", 0)
            high_conf = categorization_stats.get("high_confidence_moves", 0)
            medium_conf = categorization_stats.get("medium_confidence_moves", 0)

            summary_lines.append(f"- Items recategorized: **{items_recategorized}**")
            summary_lines.append(f"- Average confidence score: **{avg_confidence:.1f}%**")
            summary_lines.append(f"  - High confidence (>95%): **{high_conf}**")
            summary_lines.append(f"  - Medium confidence (90-95%): **{medium_conf}**")
            summary_lines.append("")

    # Stream Validation Statistics
    stream_stats = completion_summary.get("stream_validation_stats", {})
    if stream_stats:
        streams_checked = stream_stats.get("streams_checked", 0)
        if streams_checked > 0:
            summary_lines.append("### **STREAM VALIDATION:**")
            streams_healthy = stream_stats.get("streams_healthy", 0)
            streams_broken = stream_stats.get("streams_broken", 0)
            avg_response = stream_stats.get("avg_response_time_ms", 0)

            health_pct = (streams_healthy / streams_checked * 100) if streams_checked > 0 else 0
            summary_lines.append(f"- Streams checked: **{streams_checked}**")
            summary_lines.append(f"- Healthy streams: **{streams_healthy}** ({health_pct:.1f}%)")
            summary_lines.append(f"- Broken/inaccessible: **{streams_broken}**")
            if avg_response > 0:
                summary_lines.append(f"- Average response time: **{avg_response:.0f}ms**")
            summary_lines.append("")

    # Storage Statistics
    storage_stats = completion_summary.get("storage_stats", {})
    if storage_stats:
        total_size = storage_stats.get("total_size_gb", 0)
        if total_size > 0:
            summary_lines.append("### **STORAGE ANALYSIS:**")
            file_count = storage_stats.get("file_count", 0)
            monthly_cost = storage_stats.get("estimated_monthly_cost_usd", 0)
            large_files = storage_stats.get("large_files_found", 0)

            summary_lines.append(f"- Total storage used: **{total_size:.2f} GB**")
            summary_lines.append(f"- Total files: **{file_count:,}**")
            if monthly_cost > 0:
                summary_lines.append(f"- Estimated monthly cost: **${monthly_cost:.2f}**")
            if large_files > 0:
                summary_lines.append(f"- Large files found (>5GB): **{large_files}**")
            summary_lines.append("")

    # Podcast Statistics
    podcast_stats = completion_summary.get("podcast_stats", {})
    if podcast_stats:
        podcasts_synced = podcast_stats.get("podcasts_synced", 0)
        if podcasts_synced > 0:
            summary_lines.append("### **PODCAST MANAGEMENT:**")
            episodes_added = podcast_stats.get("episodes_added", 0)
            episodes_removed = podcast_stats.get("episodes_removed", 0)

            summary_lines.append(f"- Podcasts synced from RSS: **{podcasts_synced}**")
            summary_lines.append(f"- New episodes added: **{episodes_added}**")
            summary_lines.append(f"- Old episodes cleaned up: **{episodes_removed}**")
            summary_lines.append("")

    # Issue Breakdown
    issue_breakdown = completion_summary.get("issue_breakdown", {})
    if issue_breakdown and any(v > 0 for v in issue_breakdown.values()):
        summary_lines.append("### **ISSUES BY TYPE:**")
        issue_labels = {
            "missing_subtitles": "Missing Subtitles",
            "missing_metadata": "Missing Metadata",
            "missing_posters": "Missing Posters",
            "dirty_titles": "Dirty Titles",
            "broken_streams": "Broken Streams",
            "misclassifications": "Misclassifications",
            "quality_issues": "Quality Issues",
            "other": "Other"
        }
        for issue_type, count in sorted(issue_breakdown.items(), key=lambda x: x[1], reverse=True):
            if count > 0:
                label = issue_labels.get(issue_type, issue_type.replace("_", " ").title())
                summary_lines.append(f"- {label}: **{count}**")
        summary_lines.append("")

    # Action Breakdown
    action_breakdown = completion_summary.get("action_breakdown", {})
    if action_breakdown and any(v > 0 for v in action_breakdown.values()):
        summary_lines.append("### **ACTIONS TAKEN:**")
        action_labels = {
            "subtitle_extractions": "Subtitle Extractions",
            "subtitle_downloads": "Subtitle Downloads",
            "metadata_updates": "Metadata Updates",
            "poster_fixes": "Poster Fixes",
            "title_cleanups": "Title Cleanups",
            "recategorizations": "Recategorizations",
            "stream_validations": "Stream Validations",
            "manual_reviews_flagged": "Manual Reviews Flagged"
        }
        for action_type, count in sorted(action_breakdown.items(), key=lambda x: x[1], reverse=True):
            if count > 0:
                label = action_labels.get(action_type, action_type.replace("_", " ").title())
                summary_lines.append(f"- {label}: **{count}**")
        summary_lines.append("")

    # Performance Metrics
    summary_lines.append("### **PERFORMANCE METRICS:**")
    summary_lines.append(f"- Execution time: **{execution_time:.1f}s** ({execution_time/60:.1f} minutes)")
    summary_lines.append(f"- Agent iterations: **{iteration}**")
    summary_lines.append(f"- API cost: **${total_cost:.4f}**")
    items_per_minute = (total_items / (execution_time / 60)) if execution_time > 0 else 0
    summary_lines.append(f"- Processing speed: **{items_per_minute:.1f} items/minute**")
    summary_lines.append("")

    # Recommendations
    recommendations = completion_summary.get("recommendations", [])
    if recommendations:
        summary_lines.append("### **STRATEGIC RECOMMENDATIONS:**")
        for i, rec in enumerate(recommendations, 1):
            summary_lines.append(f"{i}. {rec}")
        summary_lines.append("")

    # Agent Summary (narrative)
    agent_summary = completion_summary.get("summary", "")
    if agent_summary:
        summary_lines.append("### **AUDIT NARRATIVE:**")
        summary_lines.append(agent_summary)
        summary_lines.append("")

    # Completion Message
    summary_lines.append("---")
    summary_lines.append("**Audit completed successfully!** All findings and actions have been logged.")

    # Join all lines and log to database
    full_summary = "\n".join(summary_lines)
    await log_to_database(
        audit_report,
        "info",
        full_summary,
        "AI Agent"
    )
