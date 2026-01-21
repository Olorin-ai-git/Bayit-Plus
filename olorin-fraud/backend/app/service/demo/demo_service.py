"""
Demo Investigation Service for Marketing Portal

Provides sandboxed demo investigation capabilities with rate limiting
for the Olorin marketing portal's interactive demo experience.
"""

import os
import time
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from threading import Lock
from typing import Any, Dict, Optional

from app.service.demo.demo_scenarios import (
    DemoScenario,
    get_demo_scenario,
    get_scenario_for_investigation,
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


@dataclass
class RateLimitEntry:
    """Rate limit tracking entry for an IP address."""

    count: int = 0
    reset_at: float = 0.0
    last_request: float = 0.0


class DemoRateLimiter:
    """
    Rate limiter for demo API endpoints.

    Limits demo investigation requests per IP address to prevent abuse
    while allowing legitimate marketing demo usage.
    """

    def __init__(self):
        self._entries: Dict[str, RateLimitEntry] = defaultdict(RateLimitEntry)
        self._lock = Lock()

        # Configuration from environment with defaults
        self._max_requests = int(os.getenv("DEMO_RATE_LIMIT_MAX_REQUESTS", "5"))
        self._window_seconds = int(os.getenv("DEMO_RATE_LIMIT_WINDOW_SECONDS", "3600"))
        self._session_timeout = int(os.getenv("DEMO_SESSION_TIMEOUT_SECONDS", "300"))

    def check_rate_limit(self, client_ip: str) -> Dict[str, Any]:
        """
        Check if client IP is within rate limits.

        Returns dict with 'allowed', 'remaining', 'reset_at' fields.
        """
        with self._lock:
            now = time.time()
            entry = self._entries[client_ip]

            # Reset if window expired
            if now >= entry.reset_at:
                entry.count = 0
                entry.reset_at = now + self._window_seconds

            # Check limit
            if entry.count >= self._max_requests:
                return {
                    "allowed": False,
                    "remaining": 0,
                    "reset_at": datetime.fromtimestamp(
                        entry.reset_at, tz=timezone.utc
                    ).isoformat(),
                    "retry_after_seconds": int(entry.reset_at - now),
                }

            # Increment and allow
            entry.count += 1
            entry.last_request = now

            return {
                "allowed": True,
                "remaining": self._max_requests - entry.count,
                "reset_at": datetime.fromtimestamp(
                    entry.reset_at, tz=timezone.utc
                ).isoformat(),
                "retry_after_seconds": 0,
            }

    def get_status(self, client_ip: str) -> Dict[str, Any]:
        """Get current rate limit status for an IP without incrementing."""
        with self._lock:
            now = time.time()
            entry = self._entries.get(client_ip)

            if not entry or now >= entry.reset_at:
                return {
                    "remaining": self._max_requests,
                    "reset_at": datetime.fromtimestamp(
                        now + self._window_seconds, tz=timezone.utc
                    ).isoformat(),
                    "used": 0,
                }

            return {
                "remaining": max(0, self._max_requests - entry.count),
                "reset_at": datetime.fromtimestamp(
                    entry.reset_at, tz=timezone.utc
                ).isoformat(),
                "used": entry.count,
            }


@dataclass
class DemoInvestigation:
    """Tracking data for an active demo investigation."""

    investigation_id: str
    scenario_id: str
    client_ip: str
    status: str
    started_at: datetime
    progress: float = 0.0
    current_agent: Optional[str] = None
    agent_results: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None


class DemoInvestigationService:
    """
    Service for managing demo investigations for marketing portal.

    Provides sandboxed investigation execution with progress tracking
    and rate limiting for enterprise prospect demonstrations.
    """

    def __init__(self, rate_limiter: Optional[DemoRateLimiter] = None):
        self._rate_limiter = rate_limiter or DemoRateLimiter()
        self._active_investigations: Dict[str, DemoInvestigation] = {}
        self._lock = Lock()

        # Max concurrent demos from environment
        self._max_concurrent = int(os.getenv("DEMO_MAX_CONCURRENT", "10"))

    @property
    def rate_limiter(self) -> DemoRateLimiter:
        """Access the rate limiter instance."""
        return self._rate_limiter

    def start_demo_investigation(
        self, scenario_id: str, client_ip: str
    ) -> Dict[str, Any]:
        """
        Start a new demo investigation for the specified scenario.

        Returns investigation ID and initial status, or error if rate limited.
        """
        # Check rate limit
        rate_check = self._rate_limiter.check_rate_limit(client_ip)
        if not rate_check["allowed"]:
            return {
                "status": "rate_limited",
                "error": "Demo rate limit exceeded. Please try again later.",
                "rate_limit": rate_check,
            }

        # Validate scenario
        scenario = get_demo_scenario(scenario_id)
        if not scenario:
            return {
                "status": "error",
                "error": f"Invalid demo scenario: {scenario_id}",
            }

        # Check concurrent limit
        with self._lock:
            active_count = len(
                [
                    inv
                    for inv in self._active_investigations.values()
                    if inv.status == "running"
                ]
            )
            if active_count >= self._max_concurrent:
                return {
                    "status": "busy",
                    "error": "Demo system is busy. Please try again shortly.",
                }

        # Create investigation
        investigation_id = f"DEMO_{scenario_id.upper()}_{uuid.uuid4().hex[:8]}"
        demo_inv = DemoInvestigation(
            investigation_id=investigation_id,
            scenario_id=scenario_id,
            client_ip=client_ip,
            status="starting",
            started_at=datetime.now(timezone.utc),
        )

        with self._lock:
            self._active_investigations[investigation_id] = demo_inv

        logger.info(
            f"Started demo investigation {investigation_id} "
            f"for scenario {scenario_id} from {client_ip}"
        )

        return {
            "status": "started",
            "investigation_id": investigation_id,
            "scenario": scenario.to_dict(),
            "rate_limit": rate_check,
        }

    def get_investigation_status(
        self, investigation_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get current status of a demo investigation."""
        with self._lock:
            inv = self._active_investigations.get(investigation_id)
            if not inv:
                return None

            return {
                "investigation_id": inv.investigation_id,
                "scenario_id": inv.scenario_id,
                "status": inv.status,
                "progress": inv.progress,
                "current_agent": inv.current_agent,
                "started_at": inv.started_at.isoformat(),
                "agent_results": inv.agent_results,
                "error": inv.error,
            }

    def update_investigation_progress(
        self,
        investigation_id: str,
        status: str,
        progress: float,
        current_agent: Optional[str] = None,
        agent_results: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None,
    ) -> bool:
        """Update progress of a demo investigation."""
        with self._lock:
            inv = self._active_investigations.get(investigation_id)
            if not inv:
                return False

            inv.status = status
            inv.progress = progress
            inv.current_agent = current_agent
            if agent_results:
                inv.agent_results.update(agent_results)
            if error:
                inv.error = error

            return True

    def get_scenario_for_execution(self, scenario_id: str) -> Optional[Dict[str, Any]]:
        """Get scenario data formatted for investigation execution."""
        return get_scenario_for_investigation(scenario_id)


# Global service instance
_demo_service: Optional[DemoInvestigationService] = None


def get_demo_service() -> DemoInvestigationService:
    """Get or create the global demo service instance."""
    global _demo_service
    if _demo_service is None:
        _demo_service = DemoInvestigationService()
    return _demo_service
