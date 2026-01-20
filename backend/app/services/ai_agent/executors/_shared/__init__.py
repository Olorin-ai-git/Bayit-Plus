"""
Shared Utilities for AI Agent Executors

Common patterns and utilities used across all executor modules to eliminate duplication.
"""

from .content_utils import (
    get_content_or_error,
    get_content_section_or_error,
    validate_content_exists,
    validate_content_section_exists,
    handle_dry_run,
)
from .action_logging import (
    log_librarian_action,
    create_action_description,
)

__all__ = [
    # Content utilities
    "get_content_or_error",
    "get_content_section_or_error",
    "validate_content_exists",
    "validate_content_section_exists",
    "handle_dry_run",
    # Action logging
    "log_librarian_action",
    "create_action_description",
]
