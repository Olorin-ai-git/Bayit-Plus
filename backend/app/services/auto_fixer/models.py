"""
Auto-Fixer Models

Data classes for auto-fixer operations.
"""

from dataclasses import dataclass
from typing import List, Optional


@dataclass
class FixResult:
    """Result of a fix operation."""

    success: bool
    action_id: Optional[str] = None
    error_message: Optional[str] = None
    fields_updated: Optional[List[str]] = None
