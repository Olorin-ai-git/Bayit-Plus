"""
Channel Chat Service

Manages WebSocket connections, message broadcasting, rate limiting, and
admin moderation for live channel public chat.

Uses structured logging, configuration injection, and thread-safe state management.
"""

import asyncio
import json
import secrets
from datetime import datetime
from typing import Dict, List, Optional, Set, Tuple

from bson import ObjectId
from fastapi import WebSocket

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.channel_chat import (
    AuditAction,
    ChannelChatMessage,
    ModerationAuditLog,
    ModerationStatus,
)
from app.services.beta.credit_service import BetaCreditService
from app.services.chat_translation_service import ChatTranslationService
from app.services.rate_limiter_live import LiveFeatureRateLimiter

logger = get_logger(__name__)


class ChannelChatService:
    """
    Channel live chat management service.

    Features:
    - WebSocket connection management with limits
    - Message broadcasting and persistence
    - Rate limiting per user/channel
    - Admin moderation (pin/delete/mute)
    - Graceful degradation on service failures
    """

    def __init__(
        self,
        rate_limiter: Optional[LiveFeatureRateLimiter] = None,
        credit_service: Optional[BetaCreditService] = None,
        translation_service: Optional[ChatTranslationService] = None,
    ):
        """
        Initialize channel chat service with optional dependencies.

        Args:
            rate_limiter: Rate limiting service (optional, graceful degradation)
            credit_service: Beta credit service (optional, for future credit-based features)
            translation_service: Chat translation service (optional, graceful degradation)
        """
        self.rate_limiter = rate_limiter
        self.credit_service = credit_service
        self.translation_service = translation_service

        # WebSocket connections: channel_id -> {user_id: websocket}
        self._channels: Dict[str, Dict[str, WebSocket]] = {}

        # Session tokens: user_id -> token (for connection validation)
        self._user_sessions: Dict[str, str] = {}

        # Connection counters
        self._connection_count: int = 0
        self._ip_connections: Dict[str, int] = {}
        self._user_connections: Dict[str, int] = {}

        # Moderation state: channel_id -> set of muted user_ids
        self._muted_users: Dict[str, Set[str]] = {}

        # Thread safety lock
        self._lock = asyncio.Lock()

        logger.info("ChannelChatService initialized")

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

        Enforces global, per-IP, and per-user connection limits.

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
            # Check global connection limit
            if (
                self._connection_count
                >= settings.olorin.channel_chat.max_global_connections
            ):
                error_msg = "Server at maximum capacity. Please try again later."
                logger.warning(
                    f"Global connection limit reached ({self._connection_count}), rejecting user {user_id}"
                )
                return False, None, error_msg

            # Check per-IP limit
            ip_count = self._ip_connections.get(client_ip, 0)
            if ip_count >= settings.olorin.channel_chat.max_connections_per_ip:
                error_msg = f"Maximum {settings.olorin.channel_chat.max_connections_per_ip} connections per IP address."
                logger.warning(
                    f"Per-IP limit reached for {client_ip} ({ip_count} connections), rejecting user {user_id}"
                )
                return False, None, error_msg

            # Check per-user limit
            user_count = self._user_connections.get(user_id, 0)
            if user_count >= settings.olorin.channel_chat.max_connections_per_user:
                error_msg = f"Maximum {settings.olorin.channel_chat.max_connections_per_user} connections per user."
                logger.warning(
                    f"Per-user limit reached for {user_id} ({user_count} connections)"
                )
                return False, None, error_msg

            # Generate session token
            session_token = secrets.token_urlsafe(32)

            # Initialize channel if needed
            if channel_id not in self._channels:
                self._channels[channel_id] = {}
                logger.info(f"Initialized channel {channel_id}")

            # Store connection
            self._channels[channel_id][user_id] = websocket
            self._user_sessions[user_id] = session_token

            # Increment counters
            self._connection_count += 1
            self._ip_connections[client_ip] = ip_count + 1
            self._user_connections[user_id] = user_count + 1

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
            # Remove from channel
            if channel_id in self._channels:
                if user_id in self._channels[channel_id]:
                    del self._channels[channel_id][user_id]

                # Clean up empty channel
                if not self._channels[channel_id]:
                    del self._channels[channel_id]
                    logger.info(f"Channel {channel_id} is now empty, cleaned up")

            # Remove session token
            if user_id in self._user_sessions:
                del self._user_sessions[user_id]

            # Decrement counters
            self._connection_count = max(0, self._connection_count - 1)

            if client_ip in self._ip_connections:
                self._ip_connections[client_ip] = max(
                    0, self._ip_connections[client_ip] - 1
                )
                if self._ip_connections[client_ip] == 0:
                    del self._ip_connections[client_ip]

            if user_id in self._user_connections:
                self._user_connections[user_id] = max(
                    0, self._user_connections[user_id] - 1
                )
                if self._user_connections[user_id] == 0:
                    del self._user_connections[user_id]

            remaining_users = (
                len(self._channels[channel_id]) if channel_id in self._channels else 0
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

    async def broadcast_message(self, channel_id: str, message_data: dict) -> int:
        """
        Broadcast message to all connected users in channel.

        Handles send failures gracefully by logging and continuing.

        Args:
            channel_id: Channel identifier
            message_data: Message payload as dictionary

        Returns:
            Number of successful recipients
        """
        async with self._lock:
            if channel_id not in self._channels:
                logger.debug(f"No users in channel {channel_id} for broadcast")
                return 0

            channel_users = self._channels[channel_id]
            if not channel_users:
                return 0

            message_json = json.dumps(message_data)
            recipient_count = 0
            failed_users = []

            for user_id, websocket in list(channel_users.items()):
                try:
                    await websocket.send_text(message_json)
                    recipient_count += 1
                except Exception as e:
                    logger.warning(
                        f"Failed to send message to user {user_id} in channel {channel_id}: {e}",
                        extra={
                            "channel_id": channel_id,
                            "user_id": user_id,
                            "error": str(e),
                        },
                    )
                    failed_users.append(user_id)

            # Clean up failed connections (done outside iteration to avoid dict modification during iteration)
            for user_id in failed_users:
                if user_id in channel_users:
                    del channel_users[user_id]

            logger.debug(
                f"Broadcast message to channel {channel_id}: {recipient_count} recipients, {len(failed_users)} failures",
                extra={
                    "channel_id": channel_id,
                    "recipients": recipient_count,
                    "failures": len(failed_users),
                },
            )

            return recipient_count

    async def get_channel_user_count(self, channel_id: str) -> int:
        """
        Get current connected user count for channel.

        Args:
            channel_id: Channel identifier

        Returns:
            Number of connected users
        """
        async with self._lock:
            if channel_id not in self._channels:
                return 0
            return len(self._channels[channel_id])

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
            # Graceful degradation: allow if rate limiter not available
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
            # Graceful degradation: allow on error
            return True, 0

    async def is_user_muted(self, channel_id: str, user_id: str) -> bool:
        """
        Check if user is muted in channel.

        Args:
            channel_id: Channel identifier
            user_id: User identifier

        Returns:
            True if muted, False otherwise
        """
        async with self._lock:
            if channel_id not in self._muted_users:
                return False
            return user_id in self._muted_users[channel_id]

    async def save_message(
        self,
        channel_id: str,
        user_id: str,
        user_name: str,
        message: str,
        detected_language: str,
    ) -> ChannelChatMessage:
        """
        Save chat message to database.

        Args:
            channel_id: Channel identifier
            user_id: User identifier
            user_name: User display name
            message: Message text (will be sanitized by model validator)
            detected_language: Detected language code

        Returns:
            Saved message document
        """
        try:
            chat_message = ChannelChatMessage(
                channel_id=channel_id,
                user_id=user_id,
                user_name=user_name,
                message=message,
                original_language=detected_language,
                timestamp=datetime.utcnow(),
                moderation_status=ModerationStatus.APPROVED,
            )

            await chat_message.insert()

            logger.info(
                f"Saved message from user {user_id} in channel {channel_id}",
                extra={
                    "channel_id": channel_id,
                    "user_id": user_id,
                    "message_id": str(chat_message.id),
                    "language": detected_language,
                },
            )

            return chat_message

        except Exception as e:
            logger.error(
                f"Failed to save message: {e}",
                extra={
                    "channel_id": channel_id,
                    "user_id": user_id,
                    "error": str(e),
                },
            )
            raise

    async def get_recent_messages(
        self,
        channel_id: str,
        limit: Optional[int] = None,
        before_id: Optional[str] = None,
    ) -> List[ChannelChatMessage]:
        """
        Get recent messages for channel with pagination.

        Args:
            channel_id: Channel identifier
            limit: Maximum messages to return (uses config default if not specified)
            before_id: Cursor for pagination (get messages before this ID)

        Returns:
            List of messages (oldest first)
        """
        try:
            if limit is None:
                limit = settings.olorin.channel_chat.history_limit

            query = {
                "channel_id": channel_id,
                "is_deleted": False,
                "moderation_status": ModerationStatus.APPROVED,
            }

            # Cursor pagination
            if before_id:
                try:
                    query["_id"] = {"$lt": ObjectId(before_id)}
                except Exception as e:
                    logger.warning(
                        f"Invalid before_id {before_id}: {e}",
                        extra={"before_id": before_id, "error": str(e)},
                    )

            # Query with descending order, then reverse for oldest-first
            messages = (
                await ChannelChatMessage.find(query)
                .sort("-timestamp")
                .limit(limit)
                .to_list()
            )

            # Reverse to get oldest first
            messages.reverse()

            logger.debug(
                f"Retrieved {len(messages)} recent messages for channel {channel_id}",
                extra={
                    "channel_id": channel_id,
                    "count": len(messages),
                    "before_id": before_id,
                },
            )

            return messages

        except Exception as e:
            logger.error(
                f"Failed to retrieve messages: {e}",
                extra={"channel_id": channel_id, "error": str(e)},
            )
            return []

    async def pin_message(
        self,
        message_id: str,
        channel_id: str,
        actor_id: str,
        actor_role: str,
        actor_ip: str,
    ) -> bool:
        """
        Pin message in channel (admin action).

        Args:
            message_id: Message identifier
            channel_id: Channel identifier
            actor_id: Admin user ID
            actor_role: Admin role
            actor_ip: Admin IP address

        Returns:
            True if successful, False otherwise
        """
        try:
            message = await ChannelChatMessage.get(ObjectId(message_id))
            if not message or message.channel_id != channel_id:
                logger.warning(
                    f"Message {message_id} not found or wrong channel",
                    extra={"message_id": message_id, "channel_id": channel_id},
                )
                return False

            # Update message
            message.is_pinned = True
            message.pinned_by = actor_id
            await message.save()

            # Audit log
            audit_log = ModerationAuditLog(
                timestamp=datetime.utcnow(),
                actor_id=actor_id,
                actor_role=actor_role,
                actor_ip=actor_ip,
                action=AuditAction.MESSAGE_PIN,
                channel_id=channel_id,
                target_message_id=message_id,
            )
            await audit_log.insert()

            logger.info(
                f"Message {message_id} pinned by {actor_id}",
                extra={
                    "message_id": message_id,
                    "channel_id": channel_id,
                    "actor_id": actor_id,
                    "actor_role": actor_role,
                },
            )

            return True

        except Exception as e:
            logger.error(
                f"Failed to pin message: {e}",
                extra={
                    "message_id": message_id,
                    "channel_id": channel_id,
                    "error": str(e),
                },
            )
            return False

    async def unpin_message(
        self,
        message_id: str,
        channel_id: str,
        actor_id: str,
        actor_role: str,
        actor_ip: str,
    ) -> bool:
        """
        Unpin message in channel (admin action).

        Args:
            message_id: Message identifier
            channel_id: Channel identifier
            actor_id: Admin user ID
            actor_role: Admin role
            actor_ip: Admin IP address

        Returns:
            True if successful, False otherwise
        """
        try:
            message = await ChannelChatMessage.get(ObjectId(message_id))
            if not message or message.channel_id != channel_id:
                logger.warning(
                    f"Message {message_id} not found or wrong channel",
                    extra={"message_id": message_id, "channel_id": channel_id},
                )
                return False

            # Update message
            message.is_pinned = False
            message.pinned_by = None
            await message.save()

            # Audit log
            audit_log = ModerationAuditLog(
                timestamp=datetime.utcnow(),
                actor_id=actor_id,
                actor_role=actor_role,
                actor_ip=actor_ip,
                action=AuditAction.MESSAGE_UNPIN,
                channel_id=channel_id,
                target_message_id=message_id,
            )
            await audit_log.insert()

            logger.info(
                f"Message {message_id} unpinned by {actor_id}",
                extra={
                    "message_id": message_id,
                    "channel_id": channel_id,
                    "actor_id": actor_id,
                    "actor_role": actor_role,
                },
            )

            return True

        except Exception as e:
            logger.error(
                f"Failed to unpin message: {e}",
                extra={
                    "message_id": message_id,
                    "channel_id": channel_id,
                    "error": str(e),
                },
            )
            return False

    async def delete_message(
        self,
        message_id: str,
        channel_id: str,
        actor_id: str,
        actor_role: str,
        actor_ip: str,
        reason: Optional[str] = None,
    ) -> bool:
        """
        Soft delete message (admin action).

        Args:
            message_id: Message identifier
            channel_id: Channel identifier
            actor_id: Admin user ID
            actor_role: Admin role
            actor_ip: Admin IP address
            reason: Optional deletion reason

        Returns:
            True if successful, False otherwise
        """
        try:
            message = await ChannelChatMessage.get(ObjectId(message_id))
            if not message or message.channel_id != channel_id:
                logger.warning(
                    f"Message {message_id} not found or wrong channel",
                    extra={"message_id": message_id, "channel_id": channel_id},
                )
                return False

            # Soft delete
            message.is_deleted = True
            message.deleted_at = datetime.utcnow()
            message.moderation_status = ModerationStatus.REMOVED
            await message.save()

            # Audit log
            audit_log = ModerationAuditLog(
                timestamp=datetime.utcnow(),
                actor_id=actor_id,
                actor_role=actor_role,
                actor_ip=actor_ip,
                action=AuditAction.MESSAGE_DELETE,
                channel_id=channel_id,
                target_message_id=message_id,
                reason=reason,
            )
            await audit_log.insert()

            logger.info(
                f"Message {message_id} deleted by {actor_id}",
                extra={
                    "message_id": message_id,
                    "channel_id": channel_id,
                    "actor_id": actor_id,
                    "actor_role": actor_role,
                    "reason": reason,
                },
            )

            return True

        except Exception as e:
            logger.error(
                f"Failed to delete message: {e}",
                extra={
                    "message_id": message_id,
                    "channel_id": channel_id,
                    "error": str(e),
                },
            )
            return False

    async def mute_user(
        self,
        channel_id: str,
        target_user_id: str,
        actor_id: str,
        actor_role: str,
        actor_ip: str,
        reason: Optional[str] = None,
    ) -> bool:
        """
        Mute user in channel (admin action).

        Args:
            channel_id: Channel identifier
            target_user_id: User to mute
            actor_id: Admin user ID
            actor_role: Admin role
            actor_ip: Admin IP address
            reason: Optional mute reason

        Returns:
            True if successful, False otherwise
        """
        try:
            async with self._lock:
                if channel_id not in self._muted_users:
                    self._muted_users[channel_id] = set()

                self._muted_users[channel_id].add(target_user_id)

            # Audit log
            audit_log = ModerationAuditLog(
                timestamp=datetime.utcnow(),
                actor_id=actor_id,
                actor_role=actor_role,
                actor_ip=actor_ip,
                action=AuditAction.USER_MUTE,
                channel_id=channel_id,
                target_user_id=target_user_id,
                reason=reason,
            )
            await audit_log.insert()

            logger.info(
                f"User {target_user_id} muted in channel {channel_id} by {actor_id}",
                extra={
                    "channel_id": channel_id,
                    "target_user_id": target_user_id,
                    "actor_id": actor_id,
                    "actor_role": actor_role,
                    "reason": reason,
                },
            )

            return True

        except Exception as e:
            logger.error(
                f"Failed to mute user: {e}",
                extra={
                    "channel_id": channel_id,
                    "target_user_id": target_user_id,
                    "error": str(e),
                },
            )
            return False

    async def unmute_user(
        self,
        channel_id: str,
        target_user_id: str,
        actor_id: str,
        actor_role: str,
        actor_ip: str,
    ) -> bool:
        """
        Unmute user in channel (admin action).

        Args:
            channel_id: Channel identifier
            target_user_id: User to unmute
            actor_id: Admin user ID
            actor_role: Admin role
            actor_ip: Admin IP address

        Returns:
            True if successful, False otherwise
        """
        try:
            async with self._lock:
                if channel_id in self._muted_users:
                    self._muted_users[channel_id].discard(target_user_id)

                    # Clean up empty set
                    if not self._muted_users[channel_id]:
                        del self._muted_users[channel_id]

            # Audit log
            audit_log = ModerationAuditLog(
                timestamp=datetime.utcnow(),
                actor_id=actor_id,
                actor_role=actor_role,
                actor_ip=actor_ip,
                action=AuditAction.USER_UNMUTE,
                channel_id=channel_id,
                target_user_id=target_user_id,
            )
            await audit_log.insert()

            logger.info(
                f"User {target_user_id} unmuted in channel {channel_id} by {actor_id}",
                extra={
                    "channel_id": channel_id,
                    "target_user_id": target_user_id,
                    "actor_id": actor_id,
                    "actor_role": actor_role,
                },
            )

            return True

        except Exception as e:
            logger.error(
                f"Failed to unmute user: {e}",
                extra={
                    "channel_id": channel_id,
                    "target_user_id": target_user_id,
                    "error": str(e),
                },
            )
            return False


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
