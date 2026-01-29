"""
Active Sessions State

In-memory tracking of active dubbing services with capacity limits.
Redis-backed session registry for cross-instance visibility (P1-2).
"""

import logging
from typing import Dict, Optional

from app.core.config import settings
from app.services.olorin.dubbing.b2b_session_registry import (
    get_session_registry,
)
from app.services.olorin.dubbing.service import RealtimeDubbingService

logger = logging.getLogger(__name__)

# In-memory tracking of active dubbing services
_local_services: Dict[str, RealtimeDubbingService] = {}


def get_service(session_id: str) -> Optional[RealtimeDubbingService]:
    """Get an active dubbing service by session ID."""
    return _local_services.get(session_id)


def add_service(session_id: str, service: RealtimeDubbingService) -> bool:
    """
    Add a service to active tracking.

    Returns:
        True if added, False if at capacity (P0-5).
    """
    max_sessions = settings.olorin.dubbing.max_active_sessions
    if len(_local_services) >= max_sessions:
        logger.warning(
            f"Cannot add session {session_id}: "
            f"at capacity ({len(_local_services)}/{max_sessions})"
        )
        return False
    _local_services[session_id] = service
    return True


async def register_b2b_session(
    session_id: str,
    partner_id: str,
    source_language: str,
    target_language: str,
    voice_id: str,
) -> bool:
    """P1-2: Register session in Redis for cross-instance visibility."""
    try:
        registry = get_session_registry()
        return await registry.register(
            session_id=session_id,
            partner_id=partner_id,
            metadata={
                "source_language": source_language,
                "target_language": target_language,
                "voice_id": voice_id,
            },
        )
    except Exception as e:
        logger.warning(f"Redis session registration failed: {e}")
        return True  # Graceful degradation: allow session to proceed


async def unregister_b2b_session(session_id: str) -> None:
    """P1-2: Remove session from Redis registry."""
    try:
        registry = get_session_registry()
        await registry.unregister(session_id)
    except Exception as e:
        logger.warning(f"Redis session unregistration failed: {e}")


def remove_service(session_id: str) -> Optional[RealtimeDubbingService]:
    """Remove and return a service from active tracking."""
    return _local_services.pop(session_id, None)


def get_active_count() -> int:
    """Get count of locally active sessions."""
    return len(_local_services)
