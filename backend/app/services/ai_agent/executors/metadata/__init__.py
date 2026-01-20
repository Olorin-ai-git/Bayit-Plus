"""
AI Agent Executors - Metadata Management

Functions for TMDB metadata, poster fixes, recategorization, and title cleaning.

This module provides backward-compatible imports from the refactored submodules.
"""

from .tmdb import (
    execute_search_tmdb,
)
from .fixes import (
    execute_fix_missing_poster,
    execute_fix_missing_metadata,
    execute_delete_broken_content,
    execute_flag_for_manual_review,
)
from .classification import (
    execute_recategorize_content,
    execute_reclassify_as_series,
    execute_reclassify_as_movie,
)
from .titles import (
    execute_clean_title,
)

__all__ = [
    # TMDB operations
    "execute_search_tmdb",
    # Fix operations
    "execute_fix_missing_poster",
    "execute_fix_missing_metadata",
    "execute_delete_broken_content",
    "execute_flag_for_manual_review",
    # Classification operations
    "execute_recategorize_content",
    "execute_reclassify_as_series",
    "execute_reclassify_as_movie",
    # Title operations
    "execute_clean_title",
]
