"""
Channel Chat Moderation

Admin moderation for live channel public chat: pin/unpin/delete messages,
mute/unmute users, with audit logging.
"""

import asyncio
from datetime import datetime, timezone
from typing import Dict, Optional, Set

from bson import ObjectId

from app.core.logging_config import get_logger
from app.models.channel_chat import (
    AuditAction, ChannelChatMessage, ModerationAuditLog, ModerationStatus,
)

logger = get_logger(__name__)


class ChannelChatModerator:
    """Manages moderation actions for channel chat with full audit logging."""

    def __init__(self, lock: asyncio.Lock) -> None:
        """Initialize moderation state with shared lock."""
        self._muted_users: Dict[str, Set[str]] = {}
        self._lock = lock

    async def is_user_muted(self, channel_id: str, user_id: str) -> bool:
        """Check if user is muted in channel."""
        async with self._lock:
            return user_id in self._muted_users.get(channel_id, set())

    async def pin_message(
        self, message_id: str, channel_id: str,
        actor_id: str, actor_role: str, actor_ip: str,
    ) -> bool:
        """Pin message in channel (admin action)."""
        try:
            message = await ChannelChatMessage.get(ObjectId(message_id))
            if not message or message.channel_id != channel_id:
                logger.warning(f"Message {message_id} not found or wrong channel",
                               extra={"message_id": message_id, "channel_id": channel_id})
                return False

            message.is_pinned = True
            message.pinned_by = actor_id
            await message.save()

            await self._audit(actor_id, actor_role, actor_ip,
                              AuditAction.MESSAGE_PIN, channel_id, target_message_id=message_id)
            logger.info(f"Message {message_id} pinned by {actor_id}",
                        extra={"message_id": message_id, "channel_id": channel_id,
                               "actor_id": actor_id, "actor_role": actor_role})
            return True
        except Exception as e:
            logger.error(f"Failed to pin message: {e}",
                         extra={"message_id": message_id, "channel_id": channel_id, "error": str(e)})
            return False

    async def unpin_message(
        self, message_id: str, channel_id: str,
        actor_id: str, actor_role: str, actor_ip: str,
    ) -> bool:
        """Unpin message in channel (admin action)."""
        try:
            message = await ChannelChatMessage.get(ObjectId(message_id))
            if not message or message.channel_id != channel_id:
                logger.warning(f"Message {message_id} not found or wrong channel",
                               extra={"message_id": message_id, "channel_id": channel_id})
                return False

            message.is_pinned = False
            message.pinned_by = None
            await message.save()

            await self._audit(actor_id, actor_role, actor_ip,
                              AuditAction.MESSAGE_UNPIN, channel_id, target_message_id=message_id)
            logger.info(f"Message {message_id} unpinned by {actor_id}",
                        extra={"message_id": message_id, "channel_id": channel_id,
                               "actor_id": actor_id, "actor_role": actor_role})
            return True
        except Exception as e:
            logger.error(f"Failed to unpin message: {e}",
                         extra={"message_id": message_id, "channel_id": channel_id, "error": str(e)})
            return False

    async def delete_message(
        self, message_id: str, channel_id: str,
        actor_id: str, actor_role: str, actor_ip: str,
        reason: Optional[str] = None,
    ) -> bool:
        """Soft delete message (admin action)."""
        try:
            message = await ChannelChatMessage.get(ObjectId(message_id))
            if not message or message.channel_id != channel_id:
                logger.warning(f"Message {message_id} not found or wrong channel",
                               extra={"message_id": message_id, "channel_id": channel_id})
                return False

            message.is_deleted = True
            message.deleted_at = datetime.now(timezone.utc)
            message.moderation_status = ModerationStatus.REMOVED
            await message.save()

            await self._audit(actor_id, actor_role, actor_ip,
                              AuditAction.MESSAGE_DELETE, channel_id,
                              target_message_id=message_id, reason=reason)
            logger.info(f"Message {message_id} deleted by {actor_id}",
                        extra={"message_id": message_id, "channel_id": channel_id,
                               "actor_id": actor_id, "actor_role": actor_role, "reason": reason})
            return True
        except Exception as e:
            logger.error(f"Failed to delete message: {e}",
                         extra={"message_id": message_id, "channel_id": channel_id, "error": str(e)})
            return False

    async def mute_user(
        self, channel_id: str, target_user_id: str,
        actor_id: str, actor_role: str, actor_ip: str,
        reason: Optional[str] = None,
    ) -> bool:
        """Mute user in channel (admin action)."""
        try:
            async with self._lock:
                if channel_id not in self._muted_users:
                    self._muted_users[channel_id] = set()
                self._muted_users[channel_id].add(target_user_id)

            await self._audit(actor_id, actor_role, actor_ip,
                              AuditAction.USER_MUTE, channel_id,
                              target_user_id=target_user_id, reason=reason)
            logger.info(f"User {target_user_id} muted in channel {channel_id} by {actor_id}",
                        extra={"channel_id": channel_id, "target_user_id": target_user_id,
                               "actor_id": actor_id, "actor_role": actor_role, "reason": reason})
            return True
        except Exception as e:
            logger.error(f"Failed to mute user: {e}",
                         extra={"channel_id": channel_id, "target_user_id": target_user_id, "error": str(e)})
            return False

    async def unmute_user(
        self, channel_id: str, target_user_id: str,
        actor_id: str, actor_role: str, actor_ip: str,
    ) -> bool:
        """Unmute user in channel (admin action)."""
        try:
            async with self._lock:
                if channel_id in self._muted_users:
                    self._muted_users[channel_id].discard(target_user_id)
                    if not self._muted_users[channel_id]:
                        del self._muted_users[channel_id]

            await self._audit(actor_id, actor_role, actor_ip,
                              AuditAction.USER_UNMUTE, channel_id, target_user_id=target_user_id)
            logger.info(f"User {target_user_id} unmuted in channel {channel_id} by {actor_id}",
                        extra={"channel_id": channel_id, "target_user_id": target_user_id,
                               "actor_id": actor_id, "actor_role": actor_role})
            return True
        except Exception as e:
            logger.error(f"Failed to unmute user: {e}",
                         extra={"channel_id": channel_id, "target_user_id": target_user_id, "error": str(e)})
            return False

    async def _audit(
        self, actor_id: str, actor_role: str, actor_ip: str,
        action: AuditAction, channel_id: str, **kwargs,
    ) -> None:
        """Create moderation audit log entry."""
        audit_log = ModerationAuditLog(
            timestamp=datetime.now(timezone.utc),
            actor_id=actor_id, actor_role=actor_role, actor_ip=actor_ip,
            action=action, channel_id=channel_id, **kwargs,
        )
        await audit_log.insert()
