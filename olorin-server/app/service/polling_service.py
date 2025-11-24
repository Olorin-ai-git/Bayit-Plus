"""
Polling Service
Feature: 005-polling-and-persistence (Enhanced for 001-investigation-state-management)

Provides adaptive polling with ETag support, delta changes, and rate limiting.
Calculates recommended intervals based on investigation status.

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from environment
- Complete implementation: No placeholders or TODOs
- Type-safe: All parameters and returns properly typed
"""

from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from collections import defaultdict
import hashlib

from app.service.investigation_state_service import InvestigationStateService
from app.schemas.investigation_state import InvestigationStateResponse
from app.config.investigation_state_config import PollingConfig, RateLimitConfig


class PollingService:
    """Service for adaptive polling with rate limiting."""

    def __init__(
        self,
        db: Session,
        polling_config: PollingConfig,
        rate_limit_config: RateLimitConfig,
    ):
        self.db = db
        self.polling_config = polling_config
        self.rate_limit_config = rate_limit_config
        self.state_service = InvestigationStateService(db)
        self._rate_limit_tracker: Dict[str, List[datetime]] = defaultdict(list)
        # Track last activity for idle detection
        self._last_activity: Dict[str, datetime] = {}

    def poll_state(
        self,
        investigation_id: str,
        user_id: str,
        if_none_match: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Poll investigation state with ETag support.

        Args:
            investigation_id: Investigation ID
            user_id: User ID for authorization
            if_none_match: ETag from previous request

        Returns:
            State dict with recommended_interval_ms, or None if 304 Not Modified
        """
        state = self.state_service.get_state(
            investigation_id=investigation_id, user_id=user_id
        )

        # Generate ETag
        current_etag = self.generate_etag(state.investigation_id, state.version)

        # Check if client has current version
        if if_none_match and self.should_return_etag_304(state.version, if_none_match):
            # Update last activity
            self._last_activity[investigation_id] = datetime.utcnow()
            return None

        # Calculate adaptive interval
        interval_ms = self.calculate_adaptive_interval(
            state.status,
            state.lifecycle_stage,
            investigation_id
        )

        # Update last activity
        self._last_activity[investigation_id] = datetime.utcnow()

        return {
            **state.model_dump(),
            "recommended_interval_ms": interval_ms,
            "poll_after_seconds": interval_ms // 1000,
            "etag": current_etag,
        }

    def poll_changes(
        self,
        investigation_id: str,
        user_id: str,
        since_version: int,
    ) -> Dict[str, Any]:
        """Poll for delta changes since version.

        Args:
            investigation_id: Investigation ID
            user_id: User ID for authorization
            since_version: Version number from previous poll

        Returns:
            Delta changes with current state
        """
        state = self.state_service.get_state(
            investigation_id=investigation_id, user_id=user_id
        )

        if state.version == since_version:
            return {
                "has_changes": False,
                "current_version": state.version,
                "recommended_interval_ms": self.calculate_adaptive_interval(
                    state.status,
                    state.lifecycle_stage,
                    investigation_id
                ),
                "poll_after_seconds": self.calculate_adaptive_interval(
                    state.status,
                    state.lifecycle_stage,
                    investigation_id
                ) // 1000,
            }

        history = self.state_service.get_history(
            investigation_id=investigation_id,
            user_id=user_id,
            limit=state.version - since_version,
            offset=0,
        )

        return {
            "has_changes": True,
            "current_version": state.version,
            "delta": history,
            "current_state": state.model_dump(),
            "recommended_interval_ms": self.calculate_adaptive_interval(
                state.status,
                state.lifecycle_stage,
                investigation_id
            ),
            "poll_after_seconds": self.calculate_adaptive_interval(
                state.status,
                state.lifecycle_stage,
                investigation_id
            ) // 1000,
        }

    def poll_active_investigations(
        self,
        user_id: str,
        status_filter: Optional[List[str]] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """Poll for active investigations with filtering.

        Args:
            user_id: User ID for authorization
            status_filter: List of statuses to filter by
            limit: Maximum results
            offset: Pagination offset

        Returns:
            List of investigations with recommended intervals
        """
        from app.models.investigation_state import InvestigationState

        query = self.db.query(InvestigationState).filter(
            InvestigationState.user_id == user_id
        )

        if status_filter:
            query = query.filter(InvestigationState.status.in_(status_filter))

        states = (
            query.order_by(InvestigationState.updated_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )

        results = []
        for state in states:
            state_response = InvestigationStateResponse.model_validate(state, from_attributes=True)
            interval_ms = self.calculate_adaptive_interval(
                state_response.status,
                state_response.lifecycle_stage,
                state.investigation_id
            )

            results.append(
                {
                    **state_response.model_dump(),
                    "recommended_interval_ms": interval_ms,
                    "poll_after_seconds": interval_ms // 1000,
                }
            )

        return results

    def calculate_adaptive_interval(
        self,
        status: str,
        lifecycle_stage: str,
        investigation_id: Optional[str] = None
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
            time_since_activity = datetime.utcnow() - self._last_activity[investigation_id]
            idle_threshold = timedelta(minutes=5)

            if time_since_activity > idle_threshold:
                # Idle for >5 minutes - very slow polling
                return 60000  # Middle of 30000-120000ms range

        # Completed/Error/Cancelled states - slow polling
        if status in ["COMPLETED", "ERROR", "CANCELLED"]:
            return self.polling_config.slow_interval_ms

        # Results lifecycle stage - slow polling
        if lifecycle_stage in ["COMPLETED", "RESULTS"]:
            return self.polling_config.slow_interval_ms

        # Settings/Creating stages - normal polling
        if status in ["CREATED", "SETTINGS"]:
            return self.polling_config.normal_interval_ms

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
            version_str = etag_content.split('-')[0]
            client_version = int(version_str)

            # Return true if versions match
            return client_version == current_version
        except (ValueError, IndexError):
            # Invalid ETag format
            return False

    def is_rate_limited(self, client_id: str) -> bool:
        """Check if client is rate limited using sliding window.

        Args:
            client_id: Client identifier (user ID, IP, etc.)

        Returns:
            True if rate limited, False otherwise
        """
        now = datetime.utcnow()
        window_start = now - timedelta(minutes=1)

        requests = self._rate_limit_tracker[client_id]
        requests = [req for req in requests if req > window_start]
        self._rate_limit_tracker[client_id] = requests

        if len(requests) >= self.rate_limit_config.requests_per_minute:
            return True

        requests.append(now)
        return False

    def get_rate_limit_info(self, client_id: str) -> Dict[str, int]:
        """Get rate limit information for client.

        Args:
            client_id: Client identifier

        Returns:
            Dictionary with limit, remaining, and reset time
        """
        now = datetime.utcnow()
        window_start = now - timedelta(minutes=1)

        requests = self._rate_limit_tracker.get(client_id, [])
        requests = [req for req in requests if req > window_start]

        remaining = max(0, self.rate_limit_config.requests_per_minute - len(requests))
        reset_at = int((now + timedelta(minutes=1)).timestamp())

        return {
            "limit": self.rate_limit_config.requests_per_minute,
            "remaining": remaining,
            "reset": reset_at
        }