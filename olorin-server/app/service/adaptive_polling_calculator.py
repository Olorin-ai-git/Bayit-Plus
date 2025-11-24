"""
Adaptive Polling Calculator
Feature: 001-investigation-state-management

Calculates intelligent polling intervals based on investigation status.
Reduces bandwidth for idle investigations and enables real-time updates for active ones.

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from environment
- Complete implementation: No placeholders or TODOs
- Type-safe: All parameters and returns properly typed
"""

import os
from app.models.investigation_state import InvestigationState


class AdaptivePollingCalculator:
    """Calculates adaptive polling intervals based on investigation state."""

    # Configuration from environment
    DEFAULT_POLL_INTERVAL = int(os.getenv("EVENT_FEED_POLL_INTERVAL", "30"))
    IDLE_POLL_INTERVAL = int(os.getenv("EVENT_FEED_IDLE_POLL_INTERVAL", "60"))
    ACTIVE_POLL_INTERVAL = int(os.getenv("EVENT_FEED_ACTIVE_POLL_INTERVAL", "30"))

    @classmethod
    def calculate_interval(cls, state: InvestigationState) -> int:
        """
        Calculate adaptive polling interval based on investigation status.

        Implements intelligent polling to reduce bandwidth:
        - Active investigations (IN_PROGRESS): 30 seconds
        - Idle investigations (COMPLETED/ERROR/CANCELLED): 60 seconds
        - Default/other states: 30 seconds

        Args:
            state: Investigation state object

        Returns:
            Poll interval in seconds
        """
        if state.status == "IN_PROGRESS":
            return cls.ACTIVE_POLL_INTERVAL

        if state.status in ("COMPLETED", "ERROR", "CANCELLED"):
            return cls.IDLE_POLL_INTERVAL

        return cls.DEFAULT_POLL_INTERVAL

    @classmethod
    def get_default_interval(cls) -> int:
        """Get default polling interval when state is unknown."""
        return cls.DEFAULT_POLL_INTERVAL

    @classmethod
    def is_active_status(cls, status: str) -> bool:
        """Check if status represents an active investigation."""
        return status == "IN_PROGRESS"

    @classmethod
    def is_terminal_status(cls, status: str) -> bool:
        """Check if status represents a terminal state."""
        return status in ("COMPLETED", "ERROR", "CANCELLED")
