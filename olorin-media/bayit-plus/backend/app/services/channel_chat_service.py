"""
Channel Chat Service - Facade

Composes connection, broadcast, moderation, and session sub-components
into a unified service with the same public API.
"""

import asyncio
from typing import List, Optional, Tuple

from fastapi import WebSocket

from app.core.logging_config import get_logger
from app.models.channel_chat import ChannelChatMessage
from app.services.beta.credit_service import BetaCreditService
from app.services.channel_chat_broadcast import ChannelChatBroadcaster
from app.services.channel_chat_connection import ChannelChatConnectionManager
from app.services.channel_chat_moderation import ChannelChatModerator
from app.services.channel_chat_session import ChannelChatSessionManager
from app.services.chat_translation_service import ChatTranslationService
from app.services.rate_limiter_live import LiveFeatureRateLimiter

logger = get_logger(__name__)


class ChannelChatService:
    """
    Channel live chat management facade.

    Delegates to specialized sub-components for connection management,
    message broadcasting, moderation, and session/rate-limiting.
    """

    def __init__(
        self,
        rate_limiter: Optional[LiveFeatureRateLimiter] = None,
        credit_service: Optional[BetaCreditService] = None,
        translation_service: Optional[ChatTranslationService] = None,
    ):
        self.credit_service = credit_service
        self.translation_service = translation_service

        self._lock = asyncio.Lock()
        self._connection = ChannelChatConnectionManager(lock=self._lock)
        self._session = ChannelChatSessionManager(rate_limiter=rate_limiter, lock=self._lock)
        self._broadcaster = ChannelChatBroadcaster(
            get_channels=lambda: self._connection._channels,
            lock=self._lock,
        )
        self._moderator = ChannelChatModerator(lock=self._lock)

        # Expose mutable internal state references for test compatibility
        self._ip_connections = self._connection._ip_connections
        self._user_connections = self._connection._user_connections
        self._muted_users = self._moderator._muted_users

        logger.info("ChannelChatService initialized")

    @property
    def _connection_count(self) -> int:
        """Proxy to connection manager's connection count."""
        return self._connection._connection_count

    @_connection_count.setter
    def _connection_count(self, value: int) -> None:
        """Proxy setter for connection manager's connection count."""
        self._connection._connection_count = value

    async def join_channel_chat(
        self, channel_id: str, websocket: WebSocket,
        user_id: str, user_name: str, client_ip: str,
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """Register user connection to channel chat."""
        success, token, error = await self._connection.join_channel_chat(
            channel_id, websocket, user_id, user_name, client_ip,
        )
        if success and token:
            async with self._lock:
                self._session.store_session(user_id, token)
        return success, token, error

    async def leave_channel_chat(
        self, channel_id: str, user_id: str, client_ip: str,
    ) -> int:
        """Remove user connection from channel chat."""
        remaining = await self._connection.leave_channel_chat(channel_id, user_id, client_ip)
        async with self._lock:
            self._session.remove_session(user_id)
        return remaining

    async def broadcast_message(self, channel_id: str, message_data: dict) -> int:
        """Broadcast message to all connected users in channel."""
        return await self._broadcaster.broadcast_message(channel_id, message_data)

    async def get_channel_user_count(self, channel_id: str) -> int:
        """Get current connected user count for channel."""
        return await self._connection.get_channel_user_count(channel_id)

    async def validate_session_token(self, user_id: str, token: str) -> bool:
        """Validate session token for user."""
        return await self._session.validate_session_token(user_id, token)

    async def check_message_rate(
        self, user_id: str, channel_id: str,
    ) -> Tuple[bool, int]:
        """Check if user can send message based on rate limit."""
        return await self._session.check_message_rate(user_id, channel_id)

    async def is_user_muted(self, channel_id: str, user_id: str) -> bool:
        """Check if user is muted in channel."""
        return await self._moderator.is_user_muted(channel_id, user_id)

    async def save_message(
        self, channel_id: str, user_id: str, user_name: str,
        message: str, detected_language: str,
    ) -> ChannelChatMessage:
        """Save chat message to database."""
        return await self._broadcaster.save_message(
            channel_id, user_id, user_name, message, detected_language,
        )

    async def get_recent_messages(
        self, channel_id: str,
        limit: Optional[int] = None, before_id: Optional[str] = None,
    ) -> List[ChannelChatMessage]:
        """Get recent messages for channel with pagination."""
        return await self._broadcaster.get_recent_messages(channel_id, limit, before_id)

    async def pin_message(
        self, message_id: str, channel_id: str,
        actor_id: str, actor_role: str, actor_ip: str,
    ) -> bool:
        """Pin message in channel (admin action)."""
        return await self._moderator.pin_message(
            message_id, channel_id, actor_id, actor_role, actor_ip,
        )

    async def unpin_message(
        self, message_id: str, channel_id: str,
        actor_id: str, actor_role: str, actor_ip: str,
    ) -> bool:
        """Unpin message in channel (admin action)."""
        return await self._moderator.unpin_message(
            message_id, channel_id, actor_id, actor_role, actor_ip,
        )

    async def delete_message(
        self, message_id: str, channel_id: str,
        actor_id: str, actor_role: str, actor_ip: str,
        reason: Optional[str] = None,
    ) -> bool:
        """Soft delete message (admin action)."""
        return await self._moderator.delete_message(
            message_id, channel_id, actor_id, actor_role, actor_ip, reason,
        )

    async def mute_user(
        self, channel_id: str, target_user_id: str,
        actor_id: str, actor_role: str, actor_ip: str,
        reason: Optional[str] = None,
    ) -> bool:
        """Mute user in channel (admin action)."""
        return await self._moderator.mute_user(
            channel_id, target_user_id, actor_id, actor_role, actor_ip, reason,
        )

    async def unmute_user(
        self, channel_id: str, target_user_id: str,
        actor_id: str, actor_role: str, actor_ip: str,
    ) -> bool:
        """Unmute user in channel (admin action)."""
        return await self._moderator.unmute_user(
            channel_id, target_user_id, actor_id, actor_role, actor_ip,
        )


# Module-level singleton
_channel_chat_service: Optional[ChannelChatService] = None


def get_channel_chat_service() -> ChannelChatService:
    """
    Get or create global ChannelChatService singleton.

    Returns:
        Singleton ChannelChatService instance
    """
    global _channel_chat_service
    if _channel_chat_service is None:
        _channel_chat_service = ChannelChatService()
    return _channel_chat_service
