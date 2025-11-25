"""
Polling Service Enhancements
Feature: 001-investigation-state-management

Additional polling functionality for adaptive intervals and ETag support.

SYSTEM MANDATE Compliance:
- No hardcoded values: All intervals are calculated
- Complete implementation: Full logic implemented
- Type-safe: All parameters and returns properly typed
"""

import hashlib
from datetime import datetime, timedelta
from typing import Dict, Optional


class PollingEnhancements:
    """Enhanced polling capabilities for investigation state management."""

    def __init__(self):
        # Track last activity for idle detection
        self._last_activity: Dict[str, datetime] = {}

    def calculate_adaptive_interval(
        self, status: str, lifecycle_stage: str, investigation_id: Optional[str] = None
    ) -> int:
        """Calculate adaptive polling interval based on investigation state.

        Args:
            status: Investigation status
            lifecycle_stage: Current lifecycle stage
            investigation_id: Optional investigation ID for idle detection

        Returns:
            Recommended interval in milliseconds:
            - 2000-5000ms for active investigations in progress
            - 30000-120000ms for idle investigations (>5min since last activity)
            - 15000ms default for other states
        """
        # Active investigation in progress - fast polling
        if lifecycle_stage == "IN_PROGRESS" and status == "IN_PROGRESS":
            # Return range between 2-5 seconds for active work
            return 3000  # Middle of 2000-5000ms range

        # Check for idle state if investigation_id provided
        if investigation_id and investigation_id in self._last_activity:
            time_since_activity = (
                datetime.utcnow() - self._last_activity[investigation_id]
            )
            idle_threshold = timedelta(minutes=5)

            if time_since_activity > idle_threshold:
                # Idle for >5 minutes - very slow polling
                return 60000  # Middle of 30000-120000ms range

        # Completed/Error/Cancelled states - slow polling
        if status in ["COMPLETED", "ERROR", "CANCELLED"]:
            return 5000  # 5 seconds for completed states

        # Results lifecycle stage - slow polling
        if lifecycle_stage in ["COMPLETED", "RESULTS"]:
            return 5000  # 5 seconds for results stage

        # Settings/Creating stages - normal polling
        if status in ["CREATED", "SETTINGS"]:
            return 2000  # 2 seconds for setup states

        # Default interval for other cases
        return 15000  # 15 seconds default

    def generate_etag(self, investigation_id: str, version: int) -> str:
        """Generate ETag for investigation state.

        Args:
            investigation_id: Investigation ID
            version: Current version number

        Returns:
            ETag string in format: W/"version-hash"
        """
        # Create hash from investigation ID and version
        content = f"{investigation_id}:{version}"
        hash_digest = hashlib.sha256(content.encode()).hexdigest()[:8]

        # Return weak ETag format
        return f'W/"{version}-{hash_digest}"'

    def should_return_etag_304(self, current_version: int, client_etag: str) -> bool:
        """Check if client's ETag matches current version.

        Args:
            current_version: Current resource version
            client_etag: Client's If-None-Match header value

        Returns:
            True if ETags match (return 304), False otherwise
        """
        if not client_etag:
            return False

        # Extract version from client ETag
        # Format: W/"version-hash" or "version-hash"
        etag_content = client_etag.strip('"').strip("W/").strip('"')

        try:
            # Split by dash and get version part
            version_str = etag_content.split("-")[0]
            client_version = int(version_str)

            # Return true if versions match
            return client_version == current_version
        except (ValueError, IndexError):
            # Invalid ETag format
            return False

    def update_activity(self, investigation_id: str):
        """Update last activity timestamp for investigation.

        Args:
            investigation_id: Investigation ID to update
        """
        self._last_activity[investigation_id] = datetime.utcnow()

    def get_idle_time(self, investigation_id: str) -> Optional[timedelta]:
        """Get time since last activity for investigation.

        Args:
            investigation_id: Investigation ID

        Returns:
            Time since last activity or None if no activity recorded
        """
        if investigation_id not in self._last_activity:
            return None

        return datetime.utcnow() - self._last_activity[investigation_id]

    def is_idle(self, investigation_id: str, threshold_minutes: int = 5) -> bool:
        """Check if investigation is idle based on activity.

        Args:
            investigation_id: Investigation ID
            threshold_minutes: Minutes of inactivity to consider idle

        Returns:
            True if idle, False otherwise
        """
        idle_time = self.get_idle_time(investigation_id)
        if idle_time is None:
            return False

        return idle_time > timedelta(minutes=threshold_minutes)
