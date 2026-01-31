"""Helper functions for audit endpoints."""
from ._reapply_quick import _try_reapply_from_recent_audit
from ._reapply_full import _run_reapply_fixes
from ._extraction import _extract_issues_from_database, _log_fix_progress
from ._fixers import _apply_title_fixes, _apply_metadata_fixes, _apply_poster_fixes
from ._fixers_extended import (
    _apply_subtitle_fixes,
    _apply_misclassification_fixes,
    _apply_broken_stream_fixes,
    _retry_failed_tool_calls,
)

__all__ = [
    "_try_reapply_from_recent_audit",
    "_run_reapply_fixes",
    "_extract_issues_from_database",
    "_log_fix_progress",
    "_apply_title_fixes",
    "_apply_metadata_fixes",
    "_apply_poster_fixes",
    "_apply_subtitle_fixes",
    "_apply_misclassification_fixes",
    "_apply_broken_stream_fixes",
    "_retry_failed_tool_calls",
]
