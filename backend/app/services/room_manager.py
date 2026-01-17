"""
Room Manager for Watch Parties.
Handles watch party creation, joining, leaving, and state management.
"""
from typing import Optional, List
from datetime import datetime
import secrets
import string

from app.models.realtime import (
    WatchParty,
    WatchPartyCreate,
    WatchPartyResponse,
    ChatMessage,
    ChatMessageCreate,
    ChatMessageResponse,
    ParticipantState,
    PlaybackSync
)
from app.services.connection_manager import connection_manager


def generate_room_code(length: int = 6) -> str:
    """Generate a random room code (uppercase letters and digits)"""
    chars = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(length))


class RoomManager:
    """
    Manages watch party rooms and their lifecycle.
    Works with the connection manager for WebSocket communication.
    """

    async def create_party(
        self,
        host_id: str,
        host_name: str,
        data: WatchPartyCreate
    ) -> WatchParty:
        """Create a new watch party"""
        # Generate unique room code
        room_code = generate_room_code()
        while await WatchParty.find_one(
            WatchParty.room_code == room_code,
            WatchParty.ended_at == None
        ):
            room_code = generate_room_code()

        party = WatchParty(
            host_id=host_id,
            host_name=host_name,
            content_id=data.content_id,
            content_type=data.content_type,
            content_title=data.content_title,
            room_code=room_code,
            is_private=data.is_private,
            audio_enabled=data.audio_enabled,
            chat_enabled=data.chat_enabled,
            sync_playback=data.sync_playback,
            participants=[
                ParticipantState(
                    user_id=host_id,
                    user_name=host_name
                )
            ],
            started_at=datetime.utcnow()
        )

        await party.insert()
        return party

    async def get_party(self, party_id: str) -> Optional[WatchParty]:
        """Get a watch party by ID"""
        return await WatchParty.get(party_id)

    async def get_party_by_code(self, room_code: str) -> Optional[WatchParty]:
        """Get an active watch party by room code"""
        return await WatchParty.find_one(
            WatchParty.room_code == room_code.upper(),
            WatchParty.ended_at == None
        )

    async def get_user_parties(self, user_id: str) -> List[WatchParty]:
        """Get all active parties where user is host or participant"""
        parties = await WatchParty.find(
            WatchParty.ended_at == None,
            {
                "$or": [
                    {"host_id": user_id},
                    {"participants.user_id": user_id}
                ]
            }
        ).to_list()
        return parties

    async def join_party(
        self,
        party_id: str,
        user_id: str,
        user_name: str
    ) -> Optional[WatchParty]:
        """Add a user to a watch party"""
        party = await self.get_party(party_id)
        if not party or not party.is_active:
            return None

        if party.participant_count >= party.max_participants:
            return None

        # Check if user is already a participant
        for p in party.participants:
            if p.user_id == user_id:
                return party

        # Add new participant
        party.participants.append(
            ParticipantState(
                user_id=user_id,
                user_name=user_name
            )
        )
        await party.save()

        # Notify other participants
        await connection_manager.broadcast_to_party(
            {
                "type": "participant_joined",
                "user_id": user_id,
                "user_name": user_name,
                "participant_count": party.participant_count
            },
            str(party.id),
            exclude_user_id=user_id
        )

        return party

    async def leave_party(
        self,
        party_id: str,
        user_id: str
    ) -> Optional[WatchParty]:
        """Remove a user from a watch party"""
        party = await self.get_party(party_id)
        if not party:
            return None

        # Remove participant
        party.participants = [
            p for p in party.participants
            if p.user_id != user_id
        ]

        # If host leaves and there are other participants, transfer host
        if party.host_id == user_id and party.participants:
            new_host = party.participants[0]
            party.host_id = new_host.user_id
            party.host_name = new_host.user_name

            await connection_manager.broadcast_to_party(
                {
                    "type": "host_changed",
                    "new_host_id": new_host.user_id,
                    "new_host_name": new_host.user_name
                },
                str(party.id)
            )

        # If no participants left, end the party
        if not party.participants:
            party.ended_at = datetime.utcnow()
        else:
            # Notify remaining participants
            await connection_manager.broadcast_to_party(
                {
                    "type": "participant_left",
                    "user_id": user_id,
                    "participant_count": party.participant_count
                },
                str(party.id)
            )

        await party.save()
        return party

    async def end_party(self, party_id: str, user_id: str) -> bool:
        """End a watch party (host only)"""
        party = await self.get_party(party_id)
        if not party or party.host_id != user_id:
            return False

        party.ended_at = datetime.utcnow()
        await party.save()

        # Notify all participants
        await connection_manager.broadcast_to_party(
            {"type": "party_ended"},
            str(party.id)
        )

        return True

    async def update_participant_state(
        self,
        party_id: str,
        user_id: str,
        is_speaking: Optional[bool] = None,
        is_muted: Optional[bool] = None
    ) -> Optional[WatchParty]:
        """Update a participant's audio/video state"""
        party = await self.get_party(party_id)
        if not party:
            return None

        for p in party.participants:
            if p.user_id == user_id:
                if is_speaking is not None:
                    p.is_speaking = is_speaking
                if is_muted is not None:
                    p.is_muted = is_muted
                break

        await party.save()

        # Notify other participants of state change
        await connection_manager.broadcast_to_party(
            {
                "type": "participant_state_changed",
                "user_id": user_id,
                "is_speaking": is_speaking,
                "is_muted": is_muted
            },
            str(party.id),
            exclude_user_id=user_id
        )

        return party

    async def send_chat_message(
        self,
        party_id: str,
        user_id: str,
        user_name: str,
        data: ChatMessageCreate
    ) -> Optional[ChatMessage]:
        """Send a chat message in a watch party with translation support"""
        from app.services.chat_translation_service import chat_translation_service

        party = await self.get_party(party_id)
        if not party or not party.chat_enabled:
            return None

        # Verify user is a participant
        if not any(p.user_id == user_id for p in party.participants):
            return None

        # Detect language
        detection = await chat_translation_service.detect_language(data.message)
        source_lang = detection.detected_language

        message = ChatMessage(
            party_id=party_id,
            user_id=user_id,
            user_name=user_name,
            message=data.message,
            message_type=data.message_type,
            source_language=source_lang
        )

        # Get recipient user IDs (all participants except sender)
        recipient_ids = [p.user_id for p in party.participants if p.user_id != user_id]

        # Translate for recipients based on their preferences
        translations_result = await chat_translation_service.translate_for_recipients(
            data.message, source_lang, recipient_ids
        )

        # Store translations in message
        translations = {}
        for recipient_id, result in translations_result.items():
            if result.translated_text != data.message:
                translations[result.target_language] = result.translated_text

        if translations:
            message.translations = translations
            message.has_translations = True

        await message.insert()

        # Send personalized messages to each participant via connection_manager
        # First, get all connections for this party
        party_connections = connection_manager.get_party_connections(party_id)

        for ws, ws_user_id in party_connections:
            if ws_user_id == user_id:
                # Sender sees original
                msg_data = {
                    "type": "chat_message",
                    "message": {
                        "id": str(message.id),
                        "user_id": user_id,
                        "user_name": user_name,
                        "message": data.message,
                        "display_message": data.message,
                        "message_type": message.message_type,
                        "source_language": source_lang,
                        "is_translated": False,
                        "translation_available": message.has_translations,
                        "timestamp": message.timestamp.isoformat()
                    }
                }
            else:
                # Recipient sees translated if available
                translation = translations_result.get(ws_user_id)
                if translation and translation.translated_text != data.message:
                    display_msg = translation.translated_text
                    is_translated = True
                else:
                    display_msg = data.message
                    is_translated = False

                msg_data = {
                    "type": "chat_message",
                    "message": {
                        "id": str(message.id),
                        "user_id": user_id,
                        "user_name": user_name,
                        "message": data.message,
                        "display_message": display_msg,
                        "message_type": message.message_type,
                        "source_language": source_lang,
                        "is_translated": is_translated,
                        "translation_available": message.has_translations,
                        "timestamp": message.timestamp.isoformat()
                    }
                }

            try:
                await ws.send_json(msg_data)
            except Exception:
                pass  # Connection will be cleaned up by disconnect handler

        return message

    async def get_chat_history(
        self,
        party_id: str,
        limit: int = 50,
        before: Optional[datetime] = None
    ) -> List[ChatMessage]:
        """Get chat message history for a party"""
        query = ChatMessage.find(ChatMessage.party_id == party_id)

        if before:
            query = query.find(ChatMessage.timestamp < before)

        messages = await query.sort(-ChatMessage.timestamp).limit(limit).to_list()
        return list(reversed(messages))

    async def sync_playback(
        self,
        party_id: str,
        user_id: str,
        position: float,
        is_playing: bool
    ) -> bool:
        """Sync playback position across party participants"""
        party = await self.get_party(party_id)
        if not party or not party.sync_playback:
            return False

        # Only host can control playback
        if party.host_id != user_id:
            return False

        await connection_manager.broadcast_to_party(
            {
                "type": "playback_sync",
                "position": position,
                "is_playing": is_playing,
                "timestamp": datetime.utcnow().isoformat()
            },
            party_id,
            exclude_user_id=user_id
        )

        return True

    async def add_reaction(
        self,
        message_id: str,
        user_id: str,
        emoji: str
    ) -> Optional[ChatMessage]:
        """Add a reaction to a chat message"""
        message = await ChatMessage.get(message_id)
        if not message:
            return None

        if emoji not in message.reactions:
            message.reactions[emoji] = []

        if user_id not in message.reactions[emoji]:
            message.reactions[emoji].append(user_id)
            await message.save()

            # Broadcast reaction update
            await connection_manager.broadcast_to_party(
                {
                    "type": "message_reaction",
                    "message_id": message_id,
                    "emoji": emoji,
                    "user_id": user_id,
                    "action": "add"
                },
                message.party_id
            )

        return message

    async def remove_reaction(
        self,
        message_id: str,
        user_id: str,
        emoji: str
    ) -> Optional[ChatMessage]:
        """Remove a reaction from a chat message"""
        message = await ChatMessage.get(message_id)
        if not message:
            return None

        if emoji in message.reactions and user_id in message.reactions[emoji]:
            message.reactions[emoji].remove(user_id)
            if not message.reactions[emoji]:
                del message.reactions[emoji]
            await message.save()

            # Broadcast reaction update
            await connection_manager.broadcast_to_party(
                {
                    "type": "message_reaction",
                    "message_id": message_id,
                    "emoji": emoji,
                    "user_id": user_id,
                    "action": "remove"
                },
                message.party_id
            )

        return message

    def to_response(self, party: WatchParty) -> WatchPartyResponse:
        """Convert WatchParty to response model"""
        return WatchPartyResponse(
            id=str(party.id),
            host_id=party.host_id,
            host_name=party.host_name,
            content_id=party.content_id,
            content_type=party.content_type,
            content_title=party.content_title,
            room_code=party.room_code,
            is_private=party.is_private,
            max_participants=party.max_participants,
            audio_enabled=party.audio_enabled,
            chat_enabled=party.chat_enabled,
            sync_playback=party.sync_playback,
            participants=party.participants,
            participant_count=party.participant_count,
            is_active=party.is_active,
            created_at=party.created_at,
            started_at=party.started_at
        )


# Global room manager instance
room_manager = RoomManager()
