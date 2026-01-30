"""
Channel Chat Session Management

Handles session token validation and message rate limiting
for live channel public chat.
"""

import asyncio
import secrets
from typing import Dict, Optional, Tuple

from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.rate_limiter_live import LiveFeatureRateLimiter

logger = get_logger(__name__)


class ChannelChatSessionManager:
    """
    Manages session tokens and rate limiting for channel chat.

    Session tokens are generated on join and validated on each message.
    Rate limiting uses the shared LiveFeatureRateLimiter.
    """

    def __init__(
        self,
        rate_limiter: Optional[LiveFeatureRateLimiter] = None,
        lock: Optional[asyncio.Lock] = None,
    ) -> None:
        """
        Initialize session manager.

        Args:
            rate_limiter: Rate limiting service (optional, graceful degradation)
            lock: Shared asyncio lock for thread safety
        """
        self.rate_limiter = rate_limiter
        self._user_sessions: Dict[str, str] = {}
        self._lock = lock or asyncio.Lock()

    def store_session(self, user_id: str, session_token: str) -> None:
        """Store session token for user (caller must hold lock)."""
        self._user_sessions[user_id] = session_token

    def remove_session(self, user_id: str) -> None:
        """Remove session token for user (caller must hold lock)."""
        if user_id in self._user_sessions:
            del self._user_sessions[user_id]

    async def validate_session_token(self, user_id: str, token: str) -> bool:
        """
        Validate session token for user.

        Uses constant-time comparison to prevent timing attacks.

        Args:
            user_id: User identifier
            token: Session token to validate

        Returns:
            True if valid, False otherwise
        """
        async with self._lock:
            stored_token = self._user_sessions.get(user_id)
            if not stored_token:
                return False
            return secrets.compare_digest(stored_token, token)

    async def check_message_rate(
        self, user_id: str, channel_id: str
    ) -> Tuple[bool, int]:
        """
        Check if user can send message based on rate limit.

        Args:
            user_id: User identifier
            channel_id: Channel identifier

        Returns:
            Tuple of (allowed, wait_seconds)
        """
        if not self.rate_limiter:
            logger.debug("Rate limiter not available, allowing message")
            return True, 0

        try:
            key = f"{user_id}:{channel_id}"
            allowed, wait_seconds = self.rate_limiter._check_limit(
                cache=self.rate_limiter._api_requests,
                key=f"chat_msg:{key}",
                limit=settings.olorin.channel_chat.max_messages_per_minute,
                window_seconds=60,
            )

            if not allowed:
                logger.warning(
                    f"Rate limit exceeded for user {user_id} in channel {channel_id}",
                    extra={
                        "user_id": user_id,
                        "channel_id": channel_id,
                        "wait_seconds": wait_seconds,
                    },
                )

            return allowed, wait_seconds

        except Exception as e:
            logger.error(
                f"Rate limit check failed: {e}",
                extra={"user_id": user_id, "channel_id": channel_id, "error": str(e)},
            )
            return True, 0
