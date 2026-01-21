"""
AI Agent Service - Facade for Autonomous AI Agent

This module provides backwards-compatible access to the AI agent functionality.
The actual implementation is split across the ai_agent package:

- ai_agent/agent.py - Main agent loop (run_ai_agent_audit)
- ai_agent/dispatcher.py - Tool execution routing
- ai_agent/tools.py - Tool definitions
- ai_agent/prompts.py - System prompts and instructions
- ai_agent/summary_logger.py - Audit summary generation
- ai_agent/logger.py - Database logging utilities
- ai_agent/executors/ - Tool execution functions by domain
"""

# Re-export all public interfaces for backwards compatibility
from app.services.ai_agent import (  # Main entry point; Tool dispatcher; Tools; Logging
    TOOLS, clear_title_cache, execute_tool, get_language_name,
    log_comprehensive_summary, log_to_database, run_ai_agent_audit)
# Re-export executor functions for backwards compatibility
from app.services.ai_agent.executors import (  # Content; Metadata; Stream; Storage; Subtitles; Notifications; Podcasts; Diagnostics
    execute_batch_download_subtitles, execute_calculate_storage_costs,
    execute_check_api_configuration, execute_check_storage_usage,
    execute_check_stream_url, execute_check_subtitle_quota,
    execute_clean_title, execute_download_external_subtitle,
    execute_extract_video_subtitles, execute_find_duplicates,
    execute_find_missing_metadata, execute_find_quality_variants,
    execute_fix_missing_metadata, execute_fix_missing_poster,
    execute_flag_for_manual_review, execute_get_categories,
    execute_get_content_details, execute_link_quality_variants,
    execute_list_content_items, execute_list_large_files,
    execute_manage_podcast_episodes, execute_recategorize_content,
    execute_reclassify_as_movie, execute_reclassify_as_series,
    execute_resolve_duplicates, execute_scan_video_subtitles,
    execute_search_external_subtitles, execute_search_tmdb,
    execute_send_email_notification, execute_verify_required_subtitles)

__all__ = [
    # Main entry point
    "run_ai_agent_audit",
    # Tool dispatcher
    "execute_tool",
    # Tools
    "TOOLS",
    "get_language_name",
    # Logging
    "log_to_database",
    "clear_title_cache",
    "log_comprehensive_summary",
    # Content executors
    "execute_list_content_items",
    "execute_get_content_details",
    "execute_get_categories",
    # Metadata executors
    "execute_search_tmdb",
    "execute_fix_missing_poster",
    "execute_fix_missing_metadata",
    "execute_recategorize_content",
    "execute_reclassify_as_series",
    "execute_reclassify_as_movie",
    "execute_flag_for_manual_review",
    "execute_clean_title",
    # Stream executors
    "execute_check_stream_url",
    # Storage executors
    "execute_check_storage_usage",
    "execute_list_large_files",
    "execute_calculate_storage_costs",
    # Subtitle executors
    "execute_scan_video_subtitles",
    "execute_extract_video_subtitles",
    "execute_verify_required_subtitles",
    "execute_search_external_subtitles",
    "execute_download_external_subtitle",
    "execute_batch_download_subtitles",
    "execute_check_subtitle_quota",
    # Notification executors
    "execute_send_email_notification",
    # Podcast executors
    "execute_manage_podcast_episodes",
    # Diagnostic executors
    "execute_check_api_configuration",
    "execute_find_duplicates",
    "execute_resolve_duplicates",
    "execute_find_quality_variants",
    "execute_link_quality_variants",
    "execute_find_missing_metadata",
]
