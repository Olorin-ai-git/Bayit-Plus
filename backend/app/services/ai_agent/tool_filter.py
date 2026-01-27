"""
AI Agent Tool Filter

Filters available tools based on enabled audit capabilities.
This ensures the AI agent only sees tools relevant to its current task,
preventing it from using tools for capabilities that are disabled.
"""

from typing import Any, Dict, List

from app.services.ai_agent.tool_definitions import (
    AUDIT_TOOLS,
    CONTENT_TOOLS,
    DIAGNOSTICS_TOOLS,
    INTEGRITY_TOOLS,
    METADATA_TOOLS,
    NOTIFICATION_TOOLS,
    PODCAST_TOOLS,
    SERIES_TOOLS,
    STORAGE_TOOLS,
    STREAM_TOOLS,
    SUBTITLE_TOOLS,
    TAXONOMY_TOOLS,
)

# Core tools always available (required for basic audit operation)
CORE_TOOL_NAMES = {
    "list_content_items",
    "get_content_details",
    "get_categories",
    "complete_audit",
    "check_api_configuration",
    "flag_for_manual_review",
}

# Mapping of capabilities to their required tool names
CAPABILITY_TOOL_MAPPING: Dict[str, set] = {
    "validate_integrity": {
        "check_stream_url",
        "delete_broken_content",
        "verify_database_integrity",
        "verify_storage_integrity",
        "run_full_integrity_check",
    },
    "clean_titles": {
        "clean_title",
        "search_tmdb",  # Needed to verify cleaned titles
    },
    "tmdb_metadata": {
        "search_tmdb",
        "fix_missing_poster",
        "fix_missing_metadata",
        "find_missing_metadata",  # Diagnostic tool to find items needing metadata
    },
    "subtitles": {
        "verify_required_subtitles",
        "scan_video_subtitles",
        "extract_video_subtitles",
        "search_external_subtitles",
        "download_external_subtitle",
        "batch_download_subtitles",
        "check_subtitle_quota",
    },
    "verify_classification": {
        "reclassify_as_series",
        "reclassify_as_movie",
        "recategorize_content",
        "search_tmdb",  # Needed to verify classification
    },
    "remove_duplicates": {
        "find_duplicates",
        "resolve_duplicates",
        "find_quality_variants",
        "link_quality_variants",
    },
    "fix_series_structure": {
        "find_misclassified_episodes",
        "fix_misclassified_series",
        "sync_series_posters_to_episodes",
        "find_unlinked_episodes",
        "auto_link_episodes",
        "create_series_from_episode",
        "find_duplicate_episodes",
        "resolve_duplicate_episodes",
        "search_tmdb",  # Needed for series metadata
        "fix_missing_poster",  # Needed for series posters
    },
    "enforce_taxonomy": {
        "get_taxonomy_summary",
        "batch_migrate_taxonomy",
        "list_taxonomy_violations",
        "set_content_taxonomy",
        "get_taxonomy_stats",
    },
}

# Additional tools for comprehensive audits (when no specific capability is selected)
COMPREHENSIVE_AUDIT_TOOLS = {
    "check_storage_usage",
    "list_large_files",
    "calculate_storage_costs",
    "manage_podcast_episodes",
    "send_email_notification",
}


def get_allowed_tool_names(enabled_capabilities: List[str]) -> set:
    """
    Get the set of allowed tool names based on enabled capabilities.

    Args:
        enabled_capabilities: List of capability keys (e.g., ["clean_titles", "tmdb_metadata"])

    Returns:
        Set of tool names that should be available to the agent
    """
    allowed = CORE_TOOL_NAMES.copy()

    if not enabled_capabilities:
        # Comprehensive mode - allow all tools
        allowed.update(COMPREHENSIVE_AUDIT_TOOLS)
        for tools in CAPABILITY_TOOL_MAPPING.values():
            allowed.update(tools)
    else:
        # Task-specific mode - only allow tools for enabled capabilities
        for capability in enabled_capabilities:
            if capability in CAPABILITY_TOOL_MAPPING:
                allowed.update(CAPABILITY_TOOL_MAPPING[capability])

    return allowed


def filter_tools_by_capabilities(
    all_tools: List[Dict[str, Any]], enabled_capabilities: List[str]
) -> List[Dict[str, Any]]:
    """
    Filter the tool list to only include tools relevant to enabled capabilities.

    Args:
        all_tools: Complete list of tool definitions
        enabled_capabilities: List of capability keys

    Returns:
        Filtered list of tool definitions
    """
    allowed_names = get_allowed_tool_names(enabled_capabilities)

    filtered = []
    for tool in all_tools:
        tool_name = tool.get("name", "")
        if tool_name in allowed_names:
            filtered.append(tool)

    return filtered


def get_tools_for_capabilities(enabled_capabilities: List[str]) -> List[Dict[str, Any]]:
    """
    Get the filtered tool list for the given capabilities.

    This is the main entry point for the agent to get its available tools.

    Args:
        enabled_capabilities: List of capability keys from get_enabled_capabilities()

    Returns:
        List of tool definitions filtered by enabled capabilities
    """
    from app.services.ai_agent.tool_definitions import TOOLS

    return filter_tools_by_capabilities(TOOLS, enabled_capabilities)
