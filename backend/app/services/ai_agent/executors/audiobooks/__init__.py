"""
AI Agent Executors - Audiobook Management

Functions for organizing, unifying, and enriching audiobook content.

This module provides backward compatibility by re-exporting all executor functions
from their specialized submodules.
"""

from .discovery import (
    execute_find_audiobooks_without_posters,
    execute_find_multi_part_audiobooks,
)
from .metadata import execute_enrich_audiobook_metadata
from .orchestration import execute_organize_all_audiobooks
from .streams import execute_sync_audiobook_posters, execute_verify_audiobook_streams
from .unification import (
    execute_link_audiobook_parts,
    execute_unify_multi_part_audiobooks,
)

__all__ = [
    # Discovery
    "execute_find_multi_part_audiobooks",
    "execute_find_audiobooks_without_posters",
    # Metadata
    "execute_enrich_audiobook_metadata",
    # Unification
    "execute_unify_multi_part_audiobooks",
    "execute_link_audiobook_parts",
    # Streams
    "execute_verify_audiobook_streams",
    "execute_sync_audiobook_posters",
    # Orchestration
    "execute_organize_all_audiobooks",
]
