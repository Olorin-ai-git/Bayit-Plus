"""
Channel Chat Broadcast and Persistence

Handles message broadcasting to connected users, message persistence,
and message history retrieval for live channel public chat.
"""

import json
from datetime import datetime, timezone
from typing import List, Optional

from bson import ObjectId

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.channel_chat import ChannelChatMessage, ModerationStatus

logger = get_logger(__name__)


class ChannelChatBroadcaster:
    """Broadcasts messages and manages message persistence for channel chat."""

    def __init__(self, get_channels: callable, lock) -> None:
        """Initialize with channel data accessor and shared lock."""
        self._get_channels = get_channels
        self._lock = lock

    async def broadcast_message(self, channel_id: str, message_data: dict) -> int:
        """Broadcast message to all connected users in channel. Returns recipient count."""
        async with self._lock:
            channels = self._get_channels()
            if channel_id not in channels:
                logger.debug(f"No users in channel {channel_id} for broadcast")
                return 0

            channel_users = channels[channel_id]
            if not channel_users:
                return 0

            message_json = json.dumps(message_data)
            recipient_count = 0
            failed_users: List[str] = []

            for user_id, websocket in list(channel_users.items()):
                try:
                    await websocket.send_text(message_json)
                    recipient_count += 1
                except Exception as e:
                    logger.warning(
                        f"Failed to send message to user {user_id} in channel {channel_id}: {e}",
                        extra={"channel_id": channel_id, "user_id": user_id, "error": str(e)},
                    )
                    failed_users.append(user_id)

            for user_id in failed_users:
                if user_id in channel_users:
                    del channel_users[user_id]

            logger.debug(
                f"Broadcast to channel {channel_id}: {recipient_count} recipients, {len(failed_users)} failures",
                extra={"channel_id": channel_id, "recipients": recipient_count, "failures": len(failed_users)},
            )
            return recipient_count

    async def save_message(
        self, channel_id: str, user_id: str, user_name: str,
        message: str, detected_language: str,
    ) -> ChannelChatMessage:
        """Save chat message to database and return saved document."""
        try:
            chat_message = ChannelChatMessage(
                channel_id=channel_id,
                user_id=user_id,
                user_name=user_name,
                message=message,
                original_language=detected_language,
                timestamp=datetime.now(timezone.utc),
                moderation_status=ModerationStatus.APPROVED,
            )
            await chat_message.insert()

            logger.info(
                f"Saved message from user {user_id} in channel {channel_id}",
                extra={
                    "channel_id": channel_id, "user_id": user_id,
                    "message_id": str(chat_message.id), "language": detected_language,
                },
            )
            return chat_message

        except Exception as e:
            logger.error(
                f"Failed to save message: {e}",
                extra={"channel_id": channel_id, "user_id": user_id, "error": str(e)},
            )
            raise

    async def get_recent_messages(
        self, channel_id: str,
        limit: Optional[int] = None, before_id: Optional[str] = None,
    ) -> List[ChannelChatMessage]:
        """Get recent messages for channel with cursor pagination. Returns oldest-first."""
        try:
            if limit is None:
                limit = settings.olorin.channel_chat.history_limit

            query = {
                "channel_id": channel_id,
                "is_deleted": False,
                "moderation_status": ModerationStatus.APPROVED,
            }

            if before_id:
                try:
                    query["_id"] = {"$lt": ObjectId(before_id)}
                except Exception as e:
                    logger.warning(
                        f"Invalid before_id {before_id}: {e}",
                        extra={"before_id": before_id, "error": str(e)},
                    )

            messages = (
                await ChannelChatMessage.find(query)
                .sort("-timestamp")
                .limit(limit)
                .to_list()
            )
            messages.reverse()

            logger.debug(
                f"Retrieved {len(messages)} recent messages for channel {channel_id}",
                extra={"channel_id": channel_id, "count": len(messages), "before_id": before_id},
            )
            return messages

        except Exception as e:
            logger.error(
                f"Failed to retrieve messages: {e}",
                extra={"channel_id": channel_id, "error": str(e)},
            )
            return []
