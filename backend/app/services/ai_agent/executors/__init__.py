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
    execute_reclassify_as_series,
    execute_reclassify_as_movie,
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

from .podcasts import (
    execute_manage_podcast_episodes,
)

from .diagnostics import (
    execute_check_api_configuration,
    execute_find_duplicates,
    execute_resolve_duplicates,
    execute_find_quality_variants,
    execute_link_quality_variants,
    execute_find_missing_metadata,
)

from .series import (
    execute_find_unlinked_episodes,
    execute_link_episode_to_series,
    execute_auto_link_episodes,
    execute_find_duplicate_episodes,
    execute_resolve_duplicate_episodes,
    execute_create_series_from_episode,
)

from .integrity import (
    execute_get_integrity_status,
    execute_find_orphaned_gcs_files,
    execute_find_orphaned_content_records,
    execute_find_stuck_upload_jobs,
    execute_cleanup_orphans,
    execute_recover_stuck_jobs,
    execute_run_full_cleanup,
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
    "execute_reclassify_as_series",
    "execute_reclassify_as_movie",
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
    # Podcasts
    "execute_manage_podcast_episodes",
    # Diagnostics
    "execute_check_api_configuration",
    "execute_find_duplicates",
    "execute_resolve_duplicates",
    "execute_find_quality_variants",
    "execute_link_quality_variants",
    "execute_find_missing_metadata",
    # Series Management
    "execute_find_unlinked_episodes",
    "execute_link_episode_to_series",
    "execute_auto_link_episodes",
    "execute_find_duplicate_episodes",
    "execute_resolve_duplicate_episodes",
    "execute_create_series_from_episode",
    # Integrity Tools
    "execute_get_integrity_status",
    "execute_find_orphaned_gcs_files",
    "execute_find_orphaned_content_records",
    "execute_find_stuck_upload_jobs",
    "execute_cleanup_orphans",
    "execute_recover_stuck_jobs",
    "execute_run_full_cleanup",
]
