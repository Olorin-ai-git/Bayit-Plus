"""
Active Sessions State

In-memory tracking of active dubbing services.
In production, this could be moved to Redis for multi-instance support.
"""

from typing import Dict

from app.services.olorin.realtime_dubbing_service import RealtimeDubbingService

# In-memory tracking of active dubbing services
active_services: Dict[str, RealtimeDubbingService] = {}


def get_service(session_id: str) -> RealtimeDubbingService | None:
    """Get an active dubbing service by session ID."""
    return active_services.get(session_id)


def add_service(session_id: str, service: RealtimeDubbingService) -> None:
    """Add a service to active tracking."""
    active_services[session_id] = service


def remove_service(session_id: str) -> RealtimeDubbingService | None:
    """Remove and return a service from active tracking."""
    return active_services.pop(session_id, None)
