"""
AI Agent Executors

Tool execution functions organized by domain.
"""

from .content import (
    execute_list_content_items,
    execute_get_content_details,
    execute_get_categories,
)

from .metadata import (
    execute_search_tmdb,
    execute_fix_missing_poster,
    execute_fix_missing_metadata,
    execute_recategorize_content,
    execute_flag_for_manual_review,
    execute_clean_title,
)

from .stream import (
    execute_check_stream_url,
)

from .storage import (
    execute_check_storage_usage,
    execute_list_large_files,
    execute_calculate_storage_costs,
)

from .subtitles import (
    execute_scan_video_subtitles,
    execute_extract_video_subtitles,
    execute_verify_required_subtitles,
    execute_search_external_subtitles,
    execute_download_external_subtitle,
    execute_batch_download_subtitles,
    execute_check_subtitle_quota,
)

from .notifications import (
    execute_send_email_notification,
)

__all__ = [
    # Content
    "execute_list_content_items",
    "execute_get_content_details",
    "execute_get_categories",
    # Metadata
    "execute_search_tmdb",
    "execute_fix_missing_poster",
    "execute_fix_missing_metadata",
    "execute_recategorize_content",
    "execute_flag_for_manual_review",
    "execute_clean_title",
    # Stream
    "execute_check_stream_url",
    # Storage
    "execute_check_storage_usage",
    "execute_list_large_files",
    "execute_calculate_storage_costs",
    # Subtitles
    "execute_scan_video_subtitles",
    "execute_extract_video_subtitles",
    "execute_verify_required_subtitles",
    "execute_search_external_subtitles",
    "execute_download_external_subtitle",
    "execute_batch_download_subtitles",
    "execute_check_subtitle_quota",
    # Notifications
    "execute_send_email_notification",
]
