"""
Redis-backed Session Store for Live Dubbing Sessions

Provides distributed session state management for horizontal scaling.
Sessions are stored in Redis with 2-hour TTL for recovery on reconnect.
"""

import logging
from datetime import datetime
from typing import Optional

from app.core.redis_client import get_redis_client

logger = logging.getLogger(__name__)


class LiveDubbingSessionStore:
    """Redis-backed store for live dubbing session state."""

    KEY_PREFIX = "dubbing_session:"

    async def save_session_state(
        self,
        session_id: str,
        state: dict,
        ttl_seconds: int = 7200,  # 2 hours default
    ) -> None:
        """
        Save session state to Redis.

        Args:
            session_id: Unique session ID
            state: Session state dictionary
            ttl_seconds: Time-to-live in seconds
        """
        key = f"{self.KEY_PREFIX}{session_id}"
        redis = await get_redis_client()

        try:
            await redis.set_with_ttl(key, state, ttl_seconds)
            logger.debug(f"Saved session state for {session_id} (TTL: {ttl_seconds}s)")
        except Exception as e:
            logger.error(f"Error saving session state: {e}")
            raise

    async def get_session_state(self, session_id: str) -> Optional[dict]:
        """
        Get session state from Redis.

        Args:
            session_id: Unique session ID

        Returns:
            Session state dictionary or None if not found
        """
        key = f"{self.KEY_PREFIX}{session_id}"
        redis = await get_redis_client()

        try:
            state = await redis.get(key)
            if state:
                logger.debug(f"Retrieved session state for {session_id}")
            return state
        except Exception as e:
            logger.error(f"Error retrieving session state: {e}")
            return None

    async def update_session_activity(self, session_id: str) -> None:
        """
        Update last activity timestamp for session.

        Args:
            session_id: Unique session ID
        """
        key = f"{self.KEY_PREFIX}{session_id}"
        redis = await get_redis_client()

        try:
            state = await redis.get(key)
            if state:
                state["last_activity_at"] = datetime.utcnow().isoformat()
                # Extend TTL to 2 hours from now
                await redis.set_with_ttl(key, state, 7200)
        except Exception as e:
            logger.error(f"Error updating session activity: {e}")

    async def delete_session_state(self, session_id: str) -> None:
        """
        Delete session state from Redis.

        Args:
            session_id: Unique session ID
        """
        key = f"{self.KEY_PREFIX}{session_id}"
        redis = await get_redis_client()

        try:
            await redis.delete(key)
            logger.debug(f"Deleted session state for {session_id}")
        except Exception as e:
            logger.error(f"Error deleting session state: {e}")

    async def session_exists(self, session_id: str) -> bool:
        """
        Check if session exists in Redis.

        Args:
            session_id: Unique session ID

        Returns:
            True if session exists, False otherwise
        """
        key = f"{self.KEY_PREFIX}{session_id}"
        redis = await get_redis_client()

        try:
            return await redis.exists(key)
        except Exception as e:
            logger.error(f"Error checking session existence: {e}")
            return False

    async def record_session_usage(
        self,
        session_id: str,
        bytes_processed: int,
        segments_processed: int,
    ) -> None:
        """
        Record metering data for session (for billing/quotas).

        Args:
            session_id: Unique session ID
            bytes_processed: Audio bytes processed
            segments_processed: Number of segments dubbed
        """
        key = f"{self.KEY_PREFIX}{session_id}"
        redis = await get_redis_client()

        try:
            state = await redis.get(key)
            if state:
                state["metering"] = state.get("metering", {})
                state["metering"]["bytes_processed"] = bytes_processed
                state["metering"]["segments_processed"] = segments_processed
                state["metering"]["last_metering_at"] = datetime.utcnow().isoformat()
                await redis.set_with_ttl(key, state, 7200)
        except Exception as e:
            logger.error(f"Error recording session usage: {e}")


# Global singleton instance
_session_store: Optional[LiveDubbingSessionStore] = None


async def get_session_store() -> LiveDubbingSessionStore:
    """Get or initialize the global session store."""
    global _session_store

    if _session_store is None:
        _session_store = LiveDubbingSessionStore()

    return _session_store
