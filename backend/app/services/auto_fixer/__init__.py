"""
Auto-Fixer Service

Automatically fixes content issues like missing metadata, posters, etc.

This module provides backward-compatible imports from the refactored submodules.
"""

from .batch_fixer import fix_content_issues
from .classification_fixer import fix_misclassification
from .metadata_fixer import (
    clean_title,
    fix_missing_metadata,
    is_youtube_thumbnail_url,
)
from .models import FixResult
from .rollback import rollback_action

__all__ = [
    "FixResult",
    "clean_title",
    "is_youtube_thumbnail_url",
    "fix_missing_metadata",
    "fix_content_issues",
    "fix_misclassification",
    "rollback_action",
]
