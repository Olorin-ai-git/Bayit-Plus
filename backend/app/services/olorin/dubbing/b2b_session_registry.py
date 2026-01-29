"""
B2B Session Registry (P1-2)

Redis-backed session metadata registry for cross-instance visibility.
Local in-memory service objects are tracked separately (not serializable).
"""

import json
import logging
import time
from typing import Dict, List, Optional

from app.core.config import settings
from app.core.redis_client import get_redis_client

logger = logging.getLogger(__name__)

KEY_PREFIX = "olorin:dubbing:b2b_session:"
PARTNER_INDEX_PREFIX = "olorin:dubbing:partner_sessions:"


class B2BSessionRegistry:
    """
    Redis-backed registry for B2B dubbing session metadata.

    Stores session metadata (partner_id, languages, timestamps) in Redis
    for cross-instance discovery and counting. Service objects remain
    in local memory since they hold WebSocket state.
    """

    async def register(
        self,
        session_id: str,
        partner_id: str,
        metadata: Dict,
    ) -> bool:
        """
        Register session metadata in Redis.

        Args:
            session_id: Unique session identifier
            partner_id: Partner who owns this session
            metadata: Session metadata (languages, voice_id, etc.)

        Returns:
            True if registered, False if at capacity
        """
        redis = await get_redis_client(
            redis_url=settings.olorin.dubbing.redis_url,
            max_connections=settings.olorin.dubbing.redis_max_connections,
        )

        # Check capacity
        active_count = await self.get_active_count(partner_id)
        max_sessions = settings.olorin.dubbing.max_active_sessions
        if active_count >= max_sessions:
            logger.warning(
                f"Session registry at capacity for partner {partner_id}: "
                f"{active_count}/{max_sessions}"
            )
            return False

        session_key = f"{KEY_PREFIX}{session_id}"
        session_data = {
            "session_id": session_id,
            "partner_id": partner_id,
            "registered_at": time.time(),
            "status": "active",
            **metadata,
        }

        ttl = settings.olorin.dubbing.redis_session_ttl_seconds
        await redis.set_with_ttl(session_key, session_data, ttl)

        # Add to partner index (set of session IDs)
        partner_key = f"{PARTNER_INDEX_PREFIX}{partner_id}"
        if redis.is_connected and redis._client:
            try:
                await redis._client.sadd(partner_key, session_id)
                await redis._client.expire(partner_key, ttl)
            except Exception as e:
                logger.warning(
                    f"Error updating partner index: {e}"
                )

        logger.info(
            f"Registered session {session_id} for partner {partner_id}"
        )
        return True

    async def unregister(self, session_id: str) -> None:
        """Remove session from Redis registry."""
        redis = await get_redis_client(
            redis_url=settings.olorin.dubbing.redis_url,
            max_connections=settings.olorin.dubbing.redis_max_connections,
        )

        session_key = f"{KEY_PREFIX}{session_id}"

        # Get partner_id to clean up index
        session_data = await redis.get(session_key)
        if session_data and isinstance(session_data, dict):
            partner_id = session_data.get("partner_id")
            if partner_id and redis.is_connected and redis._client:
                try:
                    partner_key = f"{PARTNER_INDEX_PREFIX}{partner_id}"
                    await redis._client.srem(partner_key, session_id)
                except Exception as e:
                    logger.warning(
                        f"Error cleaning partner index: {e}"
                    )

        await redis.delete(session_key)
        logger.info(f"Unregistered session {session_id}")

    async def get_active_count(self, partner_id: str) -> int:
        """Count active sessions for a partner across all instances."""
        redis = await get_redis_client(
            redis_url=settings.olorin.dubbing.redis_url,
            max_connections=settings.olorin.dubbing.redis_max_connections,
        )

        if not redis.is_connected or not redis._client:
            return 0

        try:
            partner_key = f"{PARTNER_INDEX_PREFIX}{partner_id}"
            count = await redis._client.scard(partner_key)
            return count or 0
        except Exception as e:
            logger.warning(
                f"Error counting sessions for partner {partner_id}: {e}"
            )
            return 0

    async def list_sessions(
        self, partner_id: str
    ) -> List[Dict]:
        """List active session metadata for a partner."""
        redis = await get_redis_client(
            redis_url=settings.olorin.dubbing.redis_url,
            max_connections=settings.olorin.dubbing.redis_max_connections,
        )

        if not redis.is_connected or not redis._client:
            return []

        try:
            partner_key = f"{PARTNER_INDEX_PREFIX}{partner_id}"
            session_ids = await redis._client.smembers(partner_key)
            if not session_ids:
                return []

            sessions = []
            for sid in session_ids:
                session_key = f"{KEY_PREFIX}{sid}"
                data = await redis.get(session_key)
                if data:
                    sessions.append(data)
                else:
                    # Session expired from Redis but still in set
                    await redis._client.srem(partner_key, sid)

            return sessions
        except Exception as e:
            logger.warning(
                f"Error listing sessions for partner {partner_id}: {e}"
            )
            return []


# Module-level singleton
_registry: Optional[B2BSessionRegistry] = None


def get_session_registry() -> B2BSessionRegistry:
    """Get the global B2B session registry."""
    global _registry
    if _registry is None:
        _registry = B2BSessionRegistry()
    return _registry
