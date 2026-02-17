"""
Shared Interaction Service

Manages shared interactive sessions within watch parties.
"""

from datetime import datetime
from typing import List, Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.vod_interaction import (
    DialogueExchange, SharedParticipant, SharedSessionMetadata,
    VODInteractionSession,
)
from app.services.connection_manager import connection_manager
from app.services.vod_interaction.interaction_service import vod_interaction_service

logger = get_logger(__name__)


class SharedInteractionService:
    """Manages shared interactive sessions in watch parties"""

    async def start_shared_session(
        self, party_id: str, content_id: str, moment_timestamp: float,
        character_name: str, host_user_id: str, host_profile_id: str,
        host_avatar_id: str, host_display_name: str,
    ) -> VODInteractionSession:
        """Start a shared interaction session with the host as first participant"""
        host = SharedParticipant(
            user_id=host_user_id, profile_id=host_profile_id,
            avatar_id=host_avatar_id, display_name=host_display_name,
        )
        metadata = SharedSessionMetadata(
            party_id=party_id, participants=[host],
            turn_order=[host_user_id], current_turn_user_id=host_user_id,
            current_turn_started_at=datetime.utcnow(),
            max_turns_per_participant=settings.VOD_INTERACTION_MAX_TURNS_PER_PARTICIPANT,
        )
        session = VODInteractionSession(
            user_id=host_user_id, profile_id=host_profile_id,
            avatar_id=host_avatar_id, content_id=content_id,
            moment_timestamp=moment_timestamp, character_name=character_name,
            status="active", is_shared=True, shared_metadata=metadata,
        )
        await session.save()
        await self._broadcast_event(party_id, "interaction_start", {
            "session_id": str(session.id), "character_name": character_name,
            "host_user_id": host_user_id,
        })
        logger.info(
            "Shared session started",
            extra={"session_id": str(session.id), "party_id": party_id},
        )
        return session

    async def join_shared_session(
        self, session_id: str, user_id: str, profile_id: str,
        avatar_id: str, avatar_image_url: Optional[str], display_name: str,
    ) -> VODInteractionSession:
        """Add a participant to a shared session"""
        session = await VODInteractionSession.get(session_id)
        if not session or not session.is_shared or not session.shared_metadata:
            raise ValueError(f"Shared session not found: {session_id}")
        meta = session.shared_metadata
        if len(meta.participants) >= settings.VOD_INTERACTION_MAX_SHARED_PARTICIPANTS:
            raise ValueError("Session is full")
        for p in meta.participants:
            if p.user_id == user_id:
                raise ValueError("User already in session")
        meta.participants.append(SharedParticipant(
            user_id=user_id, profile_id=profile_id, avatar_id=avatar_id,
            avatar_image_url=avatar_image_url, display_name=display_name,
        ))
        meta.turn_order.append(user_id)
        session.updated_at = datetime.utcnow()
        await session.save()
        await self._broadcast_event(meta.party_id, "participant_joined", {
            "session_id": str(session.id), "user_id": user_id,
            "display_name": display_name,
        })
        logger.info(
            "Participant joined shared session",
            extra={"session_id": str(session.id), "user_id": user_id},
        )
        return session

    async def process_participant_message(
        self, session_id: str, user_id: str, message: str,
        addressed_character: Optional[str] = None,
    ) -> List[DialogueExchange]:
        """Process a message from the current-turn participant"""
        session = await VODInteractionSession.get(session_id)
        if not session or not session.is_shared or not session.shared_metadata:
            raise ValueError(f"Shared session not found: {session_id}")
        if session.status != "active":
            raise ValueError(f"Session not active: {session.status}")
        meta = session.shared_metadata
        if meta.current_turn_user_id != user_id:
            raise ValueError("Not your turn")
        participant = self._find_participant(meta.participants, user_id)
        if not participant:
            raise ValueError("User not in session")
        if addressed_character:
            from app.services.vod_interaction.multi_character_handler import (
                multi_character_handler,
            )
            exchanges = await multi_character_handler.process_multi_character_message(
                session, message, addressed_character,
            )
        else:
            exchange = await vod_interaction_service.process_user_message(
                session_id, message,
            )
            exchanges = [exchange]
        for ex in exchanges:
            ex.participant_user_id = user_id
            ex.participant_name = participant.display_name
        await self._broadcast_event(meta.party_id, "character_response", {
            "session_id": str(session.id), "user_id": user_id,
        })
        await self._advance_turn(session)
        return exchanges

    async def _advance_turn(self, session: VODInteractionSession) -> None:
        """Rotate to next participant in turn order"""
        meta = session.shared_metadata
        if not meta or not meta.turn_order:
            return
        current_idx = meta.turn_order.index(meta.current_turn_user_id)
        next_idx = (current_idx + 1) % len(meta.turn_order)
        meta.current_turn_user_id = meta.turn_order[next_idx]
        meta.current_turn_started_at = datetime.utcnow()
        meta.turns_completed += 1
        total_max = meta.max_turns_per_participant * len(meta.participants)
        if meta.turns_completed >= total_max:
            session.status = "completed"
        session.updated_at = datetime.utcnow()
        await session.save()
        await self._broadcast_event(meta.party_id, "turn_change", {
            "session_id": str(session.id),
            "current_turn_user_id": meta.current_turn_user_id,
            "turns_completed": meta.turns_completed,
        })

    async def handle_turn_timeout(self, session_id: str, expected_user_id: str) -> None:
        """Auto-skip if the expected user's turn has timed out"""
        session = await VODInteractionSession.get(session_id)
        if not session or not session.shared_metadata:
            return
        if session.shared_metadata.current_turn_user_id != expected_user_id:
            return
        await self._broadcast_event(session.shared_metadata.party_id, "turn_skipped", {
            "session_id": str(session.id), "skipped_user_id": expected_user_id,
        })
        await self._advance_turn(session)

    async def end_shared_session(
        self, session_id: str, user_id: str,
    ) -> VODInteractionSession:
        """Complete a shared session"""
        session = await VODInteractionSession.get(session_id)
        if not session or not session.is_shared or not session.shared_metadata:
            raise ValueError(f"Shared session not found: {session_id}")
        session.status = "completed"
        session.updated_at = datetime.utcnow()
        await session.save()
        await self._broadcast_event(
            session.shared_metadata.party_id, "interaction_end",
            {"session_id": str(session.id), "ended_by": user_id},
        )
        logger.info(
            "Shared session ended",
            extra={"session_id": str(session.id), "ended_by": user_id},
        )
        return session

    @staticmethod
    def _find_participant(
        participants: List[SharedParticipant], user_id: str,
    ) -> Optional[SharedParticipant]:
        for p in participants:
            if p.user_id == user_id:
                return p
        return None

    @staticmethod
    async def _broadcast_event(
        party_id: str, event_type: str, data: dict,
        exclude_user_id: Optional[str] = None,
    ) -> int:
        return await connection_manager.broadcast_interaction_event(
            party_id=party_id, event_type=event_type,
            data=data, exclude_user_id=exclude_user_id,
        )


shared_interaction_service = SharedInteractionService()
