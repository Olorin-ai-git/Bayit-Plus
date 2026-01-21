"""
AI Agent Executors - Series Management

Functions for linking episodes, finding duplicates, and organizing series.

This module provides backward compatibility by re-exporting all executor functions
from their specialized submodules.
"""

from .classification import (execute_create_series_from_episode,
                             execute_find_misclassified_episodes,
                             execute_fix_misclassified_series)
from .discovery import execute_find_unlinked_episodes
from .duplicates import (execute_find_duplicate_episodes,
                         execute_resolve_duplicate_episodes)
from .linking import execute_auto_link_episodes, execute_link_episode_to_series
from .orchestration import execute_organize_all_series
from .sync import execute_sync_series_posters_to_episodes

__all__ = [
    # Discovery
    "execute_find_unlinked_episodes",
    # Linking
    "execute_link_episode_to_series",
    "execute_auto_link_episodes",
    # Duplicates
    "execute_find_duplicate_episodes",
    "execute_resolve_duplicate_episodes",
    # Classification
    "execute_create_series_from_episode",
    "execute_find_misclassified_episodes",
    "execute_fix_misclassified_series",
    # Sync
    "execute_sync_series_posters_to_episodes",
    # Orchestration
    "execute_organize_all_series",
]
