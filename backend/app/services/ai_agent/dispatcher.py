"""
AI Agent Dispatcher - Tool Execution Router

Routes tool calls to the appropriate executor functions.
"""

import logging
from typing import Dict, Any

from app.services.ai_agent.executors import (
    # Content
    execute_list_content_items,
    execute_get_content_details,
    execute_get_categories,
    # Metadata
    execute_search_tmdb,
    execute_fix_missing_poster,
    execute_fix_missing_metadata,
    execute_recategorize_content,
    execute_reclassify_as_series,
    execute_reclassify_as_movie,
    execute_flag_for_manual_review,
    execute_delete_broken_content,
    execute_clean_title,
    # Stream
    execute_check_stream_url,
    # Storage
    execute_check_storage_usage,
    execute_list_large_files,
    execute_calculate_storage_costs,
    # Subtitles
    execute_scan_video_subtitles,
    execute_extract_video_subtitles,
    execute_verify_required_subtitles,
    execute_search_external_subtitles,
    execute_download_external_subtitle,
    execute_batch_download_subtitles,
    execute_check_subtitle_quota,
    # Notifications
    execute_send_email_notification,
    # Podcasts
    execute_manage_podcast_episodes,
    # Diagnostics
    execute_check_api_configuration,
    execute_find_duplicates,
    execute_resolve_duplicates,
    execute_find_quality_variants,
    execute_link_quality_variants,
    execute_find_missing_metadata,
    # Series Management
    execute_find_unlinked_episodes,
    execute_link_episode_to_series,
    execute_auto_link_episodes,
    execute_find_duplicate_episodes,
    execute_resolve_duplicate_episodes,
    execute_create_series_from_episode,
    # Integrity Tools
    execute_get_integrity_status,
    execute_find_orphaned_gcs_files,
    execute_find_orphaned_content_records,
    execute_find_stuck_upload_jobs,
    execute_cleanup_orphans,
    execute_recover_stuck_jobs,
    execute_run_full_cleanup,
)

logger = logging.getLogger(__name__)


async def execute_tool(
    tool_name: str,
    tool_input: Dict[str, Any],
    audit_id: str,
    dry_run: bool = False
) -> Dict[str, Any]:
    """Execute a tool based on its name."""

    logger.info(f"Executing tool: {tool_name}", extra={"input": tool_input})

    try:
        if tool_name == "list_content_items":
            return await execute_list_content_items(**tool_input)

        elif tool_name == "get_content_details":
            return await execute_get_content_details(**tool_input)

        elif tool_name == "get_categories":
            return await execute_get_categories()

        elif tool_name == "check_stream_url":
            return await execute_check_stream_url(**tool_input)

        elif tool_name == "search_tmdb":
            return await execute_search_tmdb(**tool_input)

        elif tool_name == "fix_missing_poster":
            return await execute_fix_missing_poster(**tool_input, audit_id=audit_id, dry_run=dry_run)

        elif tool_name == "fix_missing_metadata":
            return await execute_fix_missing_metadata(**tool_input, audit_id=audit_id, dry_run=dry_run)

        elif tool_name == "recategorize_content":
            return await execute_recategorize_content(**tool_input, audit_id=audit_id, dry_run=dry_run)

        elif tool_name == "reclassify_as_series":
            return await execute_reclassify_as_series(**tool_input, audit_id=audit_id, dry_run=dry_run)

        elif tool_name == "reclassify_as_movie":
            return await execute_reclassify_as_movie(**tool_input, audit_id=audit_id, dry_run=dry_run)

        elif tool_name == "flag_for_manual_review":
            return await execute_flag_for_manual_review(**tool_input)

        elif tool_name == "delete_broken_content":
            return await execute_delete_broken_content(**tool_input, audit_id=audit_id, dry_run=dry_run)

        elif tool_name == "clean_title":
            return await execute_clean_title(**tool_input, audit_id=audit_id, dry_run=dry_run)

        elif tool_name == "check_storage_usage":
            return await execute_check_storage_usage(**tool_input)

        elif tool_name == "list_large_files":
            return await execute_list_large_files(**tool_input)

        elif tool_name == "calculate_storage_costs":
            return await execute_calculate_storage_costs(**tool_input)

        elif tool_name == "send_email_notification":
            return await execute_send_email_notification(**tool_input)

        elif tool_name == "scan_video_subtitles":
            return await execute_scan_video_subtitles(**tool_input)

        elif tool_name == "extract_video_subtitles":
            return await execute_extract_video_subtitles(**tool_input, audit_id=audit_id)

        elif tool_name == "verify_required_subtitles":
            return await execute_verify_required_subtitles(**tool_input)

        elif tool_name == "search_external_subtitles":
            return await execute_search_external_subtitles(**tool_input)

        elif tool_name == "download_external_subtitle":
            return await execute_download_external_subtitle(**tool_input, audit_id=audit_id)

        elif tool_name == "batch_download_subtitles":
            return await execute_batch_download_subtitles(**tool_input, audit_id=audit_id)

        elif tool_name == "check_subtitle_quota":
            return await execute_check_subtitle_quota()

        elif tool_name == "check_api_configuration":
            return await execute_check_api_configuration()

        elif tool_name == "find_duplicates":
            return await execute_find_duplicates(**tool_input)

        elif tool_name == "resolve_duplicates":
            return await execute_resolve_duplicates(**tool_input, audit_id=audit_id)

        elif tool_name == "find_quality_variants":
            return await execute_find_quality_variants(**tool_input)

        elif tool_name == "link_quality_variants":
            return await execute_link_quality_variants(**tool_input, audit_id=audit_id)

        elif tool_name == "find_missing_metadata":
            return await execute_find_missing_metadata(**tool_input)

        elif tool_name == "manage_podcast_episodes":
            return await execute_manage_podcast_episodes(**tool_input)

        # Series Management Tools
        elif tool_name == "find_unlinked_episodes":
            return await execute_find_unlinked_episodes(**tool_input)

        elif tool_name == "link_episode_to_series":
            return await execute_link_episode_to_series(**tool_input, audit_id=audit_id, dry_run=dry_run)

        elif tool_name == "auto_link_episodes":
            return await execute_auto_link_episodes(**tool_input, audit_id=audit_id, dry_run=dry_run)

        elif tool_name == "find_duplicate_episodes":
            return await execute_find_duplicate_episodes(**tool_input)

        elif tool_name == "resolve_duplicate_episodes":
            return await execute_resolve_duplicate_episodes(**tool_input, audit_id=audit_id, dry_run=dry_run)

        elif tool_name == "create_series_from_episode":
            return await execute_create_series_from_episode(**tool_input, audit_id=audit_id, dry_run=dry_run)

        # Integrity Tools
        elif tool_name == "get_integrity_status":
            return await execute_get_integrity_status()

        elif tool_name == "find_orphaned_gcs_files":
            return await execute_find_orphaned_gcs_files(**tool_input)

        elif tool_name == "find_orphaned_content_records":
            return await execute_find_orphaned_content_records(**tool_input)

        elif tool_name == "find_stuck_upload_jobs":
            return await execute_find_stuck_upload_jobs(**tool_input)

        elif tool_name == "cleanup_orphans":
            return await execute_cleanup_orphans(**tool_input)

        elif tool_name == "recover_stuck_jobs":
            return await execute_recover_stuck_jobs(**tool_input)

        elif tool_name == "run_full_cleanup":
            return await execute_run_full_cleanup(**tool_input)

        elif tool_name == "complete_audit":
            # This is handled specially in the agent loop
            return {"success": True, "completed": True, **tool_input}

        else:
            return {"success": False, "error": f"Unknown tool: {tool_name}"}

    except Exception as e:
        logger.error(f"Error executing tool {tool_name}: {str(e)}")
        return {"success": False, "error": str(e)}
