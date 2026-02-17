"""
VOD Interaction Service

Main orchestration for VOD avatar interactions with movie characters.
Manages sessions, processes user messages, generates character responses, and charges credits.
"""

from datetime import datetime
from typing import List, Optional
from app.models.vod_interaction import (
    VODInteractionSession,
    DialogueExchange,
    InteractiveMoment
)
from app.models.content import Content
from app.models.child_avatar import ChildAvatar
from app.services.vod_interaction.character_ai import character_ai_service
from app.services.vod_interaction.character_animator import character_animator_service
from app.services.beta.credit_service import credit_service
from app.core.logging_config import get_logger
from app.core.config import settings

logger = get_logger(__name__)


CHARACTER_VOICE_MAP = {
    "Moshe Rabbenu": settings.CHARACTER_VOICE_MOSHE,
    "David HaMelech": settings.CHARACTER_VOICE_DAVID,
    "Miriam": settings.CHARACTER_VOICE_MIRIAM,
    "Esther": settings.CHARACTER_VOICE_ESTHER,
    "Doc Brown": settings.CHARACTER_VOICE_DOC_BROWN,
    "George McFly": settings.CHARACTER_VOICE_GEORGE_MCFLY,
    "Lorraine Baines": settings.CHARACTER_VOICE_LORRAINE_BAINES,
    "Marty McFly": settings.CHARACTER_VOICE_MARTY_MCFLY,
    "Jennifer Parker": settings.CHARACTER_VOICE_JENNIFER_PARKER,
}


class VODInteractionService:
    """Main orchestration for VOD interactions"""

    async def start_interaction_session(
        self,
        user_id: str,
        profile_id: str,
        avatar_id: str,
        content_id: str,
        moment_timestamp: float
    ) -> VODInteractionSession:
        """
        Start new interaction session at an interactive moment

        Args:
            user_id: User ID
            profile_id: Child profile ID
            avatar_id: Avatar mesh ID
            content_id: Content ID
            moment_timestamp: Timestamp in video

        Returns:
            Created session
        """
        try:
            content = await Content.get(content_id)
            if not content:
                raise ValueError(f"Content not found: {content_id}")

            moment = self._find_moment(content.interactive_moments, moment_timestamp)
            if not moment:
                raise ValueError(f"No interactive moment at timestamp {moment_timestamp}")

            avatar = await ChildAvatar.get(avatar_id)
            if not avatar or avatar.profile_id != profile_id:
                raise ValueError(f"Invalid avatar: {avatar_id}")

            session = VODInteractionSession(
                user_id=user_id,
                profile_id=profile_id,
                avatar_id=avatar_id,
                content_id=content_id,
                moment_timestamp=moment_timestamp,
                character_name=moment.character_name,
                status="active"
            )
            await session.save()

            logger.info(
                "Interaction session started",
                extra={
                    "session_id": str(session.id),
                    "character_name": moment.character_name,
                    "user_id": user_id
                }
            )

            return session

        except Exception as e:
            logger.error(
                "Failed to start interaction session",
                extra={
                    "user_id": user_id,
                    "content_id": content_id,
                    "error": str(e)
                }
            )
            raise

    async def process_user_message(
        self,
        session_id: str,
        user_message: str
    ) -> DialogueExchange:
        """
        Process user message and generate animated character response

        Args:
            session_id: Session ID
            user_message: User's message text

        Returns:
            Character's dialogue exchange
        """
        try:
            session = await VODInteractionSession.get(session_id)
            if not session:
                raise ValueError(f"Session not found: {session_id}")

            if session.status != "active":
                raise ValueError(f"Session not active: {session.status}")

            if len(session.dialogue_exchanges) >= settings.VOD_INTERACTION_MAX_EXCHANGES:
                raise ValueError("Maximum dialogue exchanges reached")

            user_exchange = DialogueExchange(
                speaker="user",
                message_text=user_message,
                timestamp=datetime.utcnow()
            )
            session.dialogue_exchanges.append(user_exchange)

            moment = await self._get_moment(session.content_id, session.moment_timestamp)

            character_response = await character_ai_service.generate_response(
                character_name=session.character_name,
                scene_context=moment.scene_context,
                user_message=user_message,
                conversation_history=session.dialogue_exchanges
            )

            voice_id = self._get_character_voice_id(session.character_name)

            animated = await character_animator_service.animate_character_response(
                character_name=session.character_name,
                dialogue_text=character_response.text,
                character_frame_url=moment.character_frame_url,
                voice_id=voice_id
            )

            character_exchange = DialogueExchange(
                speaker="character",
                message_text=character_response.text,
                audio_url=animated.audio_url,
                animated_video_url=animated.video_url,
                timestamp=datetime.utcnow()
            )

            session.dialogue_exchanges.append(character_exchange)
            session.updated_at = datetime.utcnow()
            await session.save()

            await credit_service.charge_credits(
                user_id=session.user_id,
                amount=settings.CREDIT_RATE_VOD_INTERACTION_MESSAGE,
                reason="vod_interaction_exchange",
                metadata={"session_id": str(session.id)}
            )

            logger.info(
                "User message processed",
                extra={
                    "session_id": str(session.id),
                    "character_name": session.character_name,
                    "exchanges_count": len(session.dialogue_exchanges)
                }
            )

            return character_exchange

        except Exception as e:
            logger.error(
                "Failed to process user message",
                extra={
                    "session_id": session_id,
                    "error": str(e)
                }
            )
            raise

    async def complete_session(self, session_id: str) -> VODInteractionSession:
        """
        Mark session as completed

        Args:
            session_id: Session ID

        Returns:
            Updated session
        """
        session = await VODInteractionSession.get(session_id)
        if not session:
            raise ValueError(f"Session not found: {session_id}")

        session.status = "completed"
        session.updated_at = datetime.utcnow()
        await session.save()

        logger.info(
            "Session completed",
            extra={
                "session_id": str(session.id),
                "exchanges_count": len(session.dialogue_exchanges)
            }
        )

        return session

    def _find_moment(
        self,
        moments: List[InteractiveMoment],
        timestamp: float
    ) -> Optional[InteractiveMoment]:
        """Find interactive moment at timestamp"""
        for moment in moments:
            if moment.timestamp <= timestamp <= moment.timestamp + moment.duration:
                return moment
        return None

    async def _get_moment(
        self,
        content_id: str,
        timestamp: float
    ) -> InteractiveMoment:
        """Get interactive moment from content"""
        content = await Content.get(content_id)
        moment = self._find_moment(content.interactive_moments, timestamp)
        if not moment:
            raise ValueError(f"Interactive moment not found at {timestamp}")
        return moment

    def _get_character_voice_id(self, character_name: str) -> str:
        """Get ElevenLabs voice ID for character"""
        voice_id = CHARACTER_VOICE_MAP.get(character_name)
        if not voice_id:
            voice_id = settings.CHARACTER_VOICE_DEFAULT
            logger.warning(
                "Using default voice for character",
                extra={"character_name": character_name}
            )
        return voice_id


vod_interaction_service = VODInteractionService()
