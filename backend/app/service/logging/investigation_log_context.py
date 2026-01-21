"""
Investigation Log Context

Provides investigation context management using Python's contextvars for async propagation.
This allows investigation_id and metadata to be automatically available across async boundaries.

Author: Implementation for 001-custom-investigation-log
Date: 2025-01-11
"""

from contextvars import ContextVar
from typing import Any, Dict, Optional

# Context variable for investigation ID
investigation_id_var: ContextVar[Optional[str]] = ContextVar(
    "investigation_id", default=None
)

# Context variable for investigation metadata
investigation_metadata_var: ContextVar[Optional[Dict[str, Any]]] = ContextVar(
    "investigation_metadata", default=None
)


def set_investigation_context(investigation_id: str, metadata: Dict[str, Any]) -> None:
    """
    Set investigation context for current async context.

    Args:
        investigation_id: Investigation identifier
        metadata: Investigation metadata from frontend

    Raises:
        ValueError: If investigation_id is empty or None
        TypeError: If metadata is not a dictionary
    """
    if not investigation_id:
        raise ValueError("investigation_id cannot be empty or None")
    if not isinstance(metadata, dict):
        raise TypeError(f"metadata must be a dictionary, got {type(metadata)}")

    investigation_id_var.set(investigation_id)
    investigation_metadata_var.set(metadata)


def get_investigation_id() -> Optional[str]:
    """
    Get current investigation ID from context.

    Returns:
        Investigation ID if set, None otherwise
    """
    return investigation_id_var.get(None)


def get_investigation_metadata() -> Optional[Dict[str, Any]]:
    """
    Get current investigation metadata from context.

    Returns:
        Investigation metadata dictionary if set, None otherwise
    """
    return investigation_metadata_var.get(None)


def clear_investigation_context() -> None:
    """
    Clear investigation context from current async context.
    """
    investigation_id_var.set(None)
    investigation_metadata_var.set(None)
