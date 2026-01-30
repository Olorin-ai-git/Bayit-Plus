"""
Channel Chat Connection Management

Manages WebSocket connections, session tracking, and connection limits
for live channel public chat.
"""

import asyncio
import secrets
from typing import Dict, Optional, Tuple

from fastapi import WebSocket

from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class ChannelChatConnectionManager:
    """
    Manages WebSocket connections for channel chat.

    Enforces global, per-IP, and per-user connection limits.
    Tracks active channels, user sessions, and connection counters.
    """

    def __init__(self, lock: Optional[asyncio.Lock] = None) -> None:
        """Initialize connection tracking state with optional shared lock."""
        self._channels: Dict[str, Dict[str, WebSocket]] = {}
        self._connection_count: int = 0
        self._ip_connections: Dict[str, int] = {}
        self._user_connections: Dict[str, int] = {}
        self._lock = lock or asyncio.Lock()

    async def join_channel_chat(
        self,
        channel_id: str,
        websocket: WebSocket,
        user_id: str,
        user_name: str,
        client_ip: str,
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Register user connection to channel chat.

        Args:
            channel_id: Channel identifier
            websocket: WebSocket connection
            user_id: User identifier
            user_name: User display name
            client_ip: Client IP address

        Returns:
            Tuple of (success, session_token_or_none, error_message_or_none)
        """
        async with self._lock:
            rejection = self._check_limits(user_id, client_ip)
            if rejection:
                return False, None, rejection

            session_token = secrets.token_urlsafe(32)

            if channel_id not in self._channels:
                self._channels[channel_id] = {}
                logger.info(f"Initialized channel {channel_id}")

            self._channels[channel_id][user_id] = websocket
            self._increment_counters(user_id, client_ip)

            logger.info(
                f"User {user_id} ({user_name}) joined channel {channel_id} from {client_ip}",
                extra={
                    "channel_id": channel_id,
                    "user_id": user_id,
                    "user_name": user_name,
                    "client_ip": client_ip,
                    "global_connections": self._connection_count,
                    "channel_users": len(self._channels[channel_id]),
                },
            )

            return True, session_token, None

    async def leave_channel_chat(
        self, channel_id: str, user_id: str, client_ip: str
    ) -> int:
        """
        Remove user connection from channel chat.

        Args:
            channel_id: Channel identifier
            user_id: User identifier
            client_ip: Client IP address

        Returns:
            Remaining user count in channel
        """
        async with self._lock:
            self._remove_from_channel(channel_id, user_id)
            self._decrement_counters(user_id, client_ip)

            remaining_users = (
                len(self._channels[channel_id])
                if channel_id in self._channels
                else 0
            )

            logger.info(
                f"User {user_id} left channel {channel_id}",
                extra={
                    "channel_id": channel_id,
                    "user_id": user_id,
                    "client_ip": client_ip,
                    "remaining_users": remaining_users,
                    "global_connections": self._connection_count,
                },
            )

            return remaining_users

    async def get_channel_user_count(self, channel_id: str) -> int:
        """Get current connected user count for channel."""
        async with self._lock:
            if channel_id not in self._channels:
                return 0
            return len(self._channels[channel_id])

    async def get_channel_connections(
        self, channel_id: str
    ) -> Dict[str, WebSocket]:
        """Get copy of current channel connections."""
        async with self._lock:
            if channel_id not in self._channels:
                return {}
            return dict(self._channels[channel_id])

    def _check_limits(self, user_id: str, client_ip: str) -> Optional[str]:
        """Check connection limits. Returns error message or None."""
        chat_cfg = settings.olorin.channel_chat

        if self._connection_count >= chat_cfg.max_global_connections:
            logger.warning(
                f"Global connection limit reached ({self._connection_count}), rejecting user {user_id}"
            )
            return "Server at maximum capacity. Please try again later."

        ip_count = self._ip_connections.get(client_ip, 0)
        if ip_count >= chat_cfg.max_connections_per_ip:
            logger.warning(
                f"Per-IP limit reached for {client_ip} ({ip_count} connections), rejecting user {user_id}"
            )
            return f"Maximum {chat_cfg.max_connections_per_ip} connections per IP address."

        user_count = self._user_connections.get(user_id, 0)
        if user_count >= chat_cfg.max_connections_per_user:
            logger.warning(
                f"Per-user limit reached for {user_id} ({user_count} connections)"
            )
            return f"Maximum {chat_cfg.max_connections_per_user} connections per user."

        return None

    def _increment_counters(self, user_id: str, client_ip: str) -> None:
        """Increment connection counters."""
        self._connection_count += 1
        self._ip_connections[client_ip] = self._ip_connections.get(client_ip, 0) + 1
        self._user_connections[user_id] = self._user_connections.get(user_id, 0) + 1

    def _decrement_counters(self, user_id: str, client_ip: str) -> None:
        """Decrement connection counters and clean up zeroes."""
        self._connection_count = max(0, self._connection_count - 1)

        if client_ip in self._ip_connections:
            self._ip_connections[client_ip] = max(0, self._ip_connections[client_ip] - 1)
            if self._ip_connections[client_ip] == 0:
                del self._ip_connections[client_ip]

        if user_id in self._user_connections:
            self._user_connections[user_id] = max(0, self._user_connections[user_id] - 1)
            if self._user_connections[user_id] == 0:
                del self._user_connections[user_id]

    def _remove_from_channel(self, channel_id: str, user_id: str) -> None:
        """Remove user from channel and clean up empty channels."""
        if channel_id in self._channels:
            if user_id in self._channels[channel_id]:
                del self._channels[channel_id][user_id]
            if not self._channels[channel_id]:
                del self._channels[channel_id]
                logger.info(f"Channel {channel_id} is now empty, cleaned up")
