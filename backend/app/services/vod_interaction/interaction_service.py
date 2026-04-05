"""
VOD Interaction Service

Main orchestration for VOD avatar interactions with movie characters.
Manages sessions, processes user messages, generates character responses, and charges credits.
"""

import re
from datetime import datetime
from typing import List, Optional
from app.models.vod_interaction import (
    VODInteractionSession,
    ContentCharacter,
    DialogueExchange,
    InteractiveMoment
)
from app.models.content import Content
from app.models.child_avatar import ChildAvatar
from app.models.character import Character
from app.models.film_memory import FilmMemoryExchange
from app.services.vod_interaction.character_ai import character_ai_service
from app.services.vod_interaction.character_animator import character_animator_service
from app.services.vod_interaction.film_memory_service import film_memory_service
from app.services.beta.credit_service import credit_service
from app.core.logging_config import get_logger
from app.core.config import settings

logger = get_logger(__name__)


BLOCKED_RESPONSE_PATTERNS = re.compile(
    r"\b("
    r"violen(ce|t)|weapon|blood|death|kill|murder|"
    r"drug|alcohol|tobacco|smoking|"
    r"sexual|nude|naked|"
    r"hate|racist|discriminat|"
    r"suicide|self[- ]harm|"
    r"damn|hell|ass|shit|fuck|crap"
    r")\b",
    re.IGNORECASE,
)

SAFE_FALLBACK_RESPONSE = "Hmm, let me think about that differently..."


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
                scene_context=moment.scene_context,
                character_voice_id=moment.voice_id,
                character_frame_url=moment.character_frame_url,
                child_first_name=avatar.child_first_name,
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

    async def start_free_interaction_session(
        self,
        user_id: str,
        profile_id: str,
        avatar_id: Optional[str],
        content_id: str,
        character_name: str,
        current_timestamp: float = 0.0
    ) -> VODInteractionSession:
        """
        Start a free-form dialogue session with a character at any timestamp.
        Does not require a curated InteractiveMoment.
        When avatar_id is None, creates a voice-only session (no lip-sync).

        Args:
            user_id: User ID
            profile_id: Child profile ID
            avatar_id: Avatar mesh ID (None for voice-only demo)
            content_id: Content ID
            character_name: Character to converse with
            current_timestamp: Current playback position

        Returns:
            Created session
        """
        try:
            content = await Content.get(content_id)
            if not content:
                raise ValueError(f"Content not found: {content_id}")

            child_first_name = None
            if avatar_id:
                avatar = await ChildAvatar.get(avatar_id)
                if not avatar or avatar.profile_id != profile_id:
                    raise ValueError(f"Invalid avatar: {avatar_id}")
                child_first_name = avatar.child_first_name

            # Find character in interactive_characters list
            character = self._find_character(
                content.interactive_characters, character_name
            )

            # Denormalize context at session creation
            if character:
                scene_context = character.movie_context
                char_desc = character.description
                voice_id = character.voice_id
                frame_url = character.frame_url
            else:
                scene_context = f"{content.title}: {content.description or ''}"
                char_desc = None
                voice_id = await self._get_character_voice_id(character_name)
                frame_url = None

            session = VODInteractionSession(
                user_id=user_id,
                profile_id=profile_id,
                avatar_id=avatar_id,
                content_id=content_id,
                moment_timestamp=current_timestamp,
                character_name=character_name,
                scene_context=scene_context,
                character_description=char_desc,
                character_voice_id=voice_id,
                character_frame_url=frame_url,
                child_first_name=child_first_name,
                status="active"
            )
            await session.save()

            logger.info(
                "Free interaction session started",
                extra={
                    "session_id": str(session.id),
                    "character_name": character_name,
                    "user_id": user_id,
                    "has_character_data": character is not None
                }
            )

            return session

        except Exception as e:
            logger.error(
                "Failed to start free interaction session",
                extra={
                    "user_id": user_id,
                    "content_id": content_id,
                    "character_name": character_name,
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

            # Use denormalized context from session (no Content re-fetch)
            scene_context = session.scene_context or ""
            character_description = session.character_description or ""
            frame_url = session.character_frame_url
            voice_id = (
                session.character_voice_id
                or await self._get_character_voice_id(session.character_name)
            )

            memory_context = ""
            if settings.VOD_FILM_MEMORY_ENABLED:
                memory = await film_memory_service.get_or_create(
                    session.user_id, session.profile_id, session.content_id,
                )
                memory_context = film_memory_service.build_memory_context(memory)

            character_response = await character_ai_service.generate_response(
                character_name=session.character_name,
                scene_context=scene_context,
                user_message=user_message,
                conversation_history=session.dialogue_exchanges,
                character_description=character_description,
                movie_context=scene_context,
                child_name=session.child_first_name or "",
                memory_context=memory_context,
            )

            if BLOCKED_RESPONSE_PATTERNS.search(character_response.text):
                logger.warning(
                    "Character response failed content moderation",
                    extra={
                        "session_id": str(session.id),
                        "character_name": session.character_name,
                    }
                )
                character_response.text = SAFE_FALLBACK_RESPONSE

            animated = await character_animator_service.animate_character_response(
                character_name=session.character_name,
                dialogue_text=character_response.text,
                character_frame_url=frame_url,
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
        Mark session as completed. If VOD_FILM_MEMORY_ENABLED, also ingest
        this session's dialogue pairs into the film memory.
        """
        session = await VODInteractionSession.get(session_id)
        if not session:
            raise ValueError(f"Session not found: {session_id}")

        session.status = "completed"
        session.updated_at = datetime.utcnow()
        await session.save()

        if settings.VOD_FILM_MEMORY_ENABLED:
            film_exchanges = self._dialogue_to_film_exchanges(session)
            if film_exchanges:
                memory = await film_memory_service.get_or_create(
                    session.user_id, session.profile_id, session.content_id,
                )
                await film_memory_service.ingest_exchanges(memory, film_exchanges)

        logger.info(
            "Session completed",
            extra={
                "session_id": str(session.id),
                "exchanges_count": len(session.dialogue_exchanges),
            },
        )

        return session

    def _dialogue_to_film_exchanges(
        self, session: VODInteractionSession,
    ) -> List[FilmMemoryExchange]:
        """Pair user/character DialogueExchanges into FilmMemoryExchange entries."""
        pairs: List[FilmMemoryExchange] = []
        i = 0
        exchanges = session.dialogue_exchanges
        while i < len(exchanges) - 1:
            user_msg = exchanges[i]
            char_msg = exchanges[i + 1]
            if user_msg.speaker == "user" and char_msg.speaker == "character":
                pairs.append(FilmMemoryExchange(
                    moment_timestamp=session.moment_timestamp,
                    character_name=session.character_name,
                    user_message=user_msg.message_text,
                    character_response=char_msg.message_text,
                    created_at=char_msg.timestamp,
                ))
                i += 2
            else:
                i += 1
        return pairs

    def _find_moment(
        self,
        moments: List[InteractiveMoment],
        timestamp: float
    ) -> Optional[InteractiveMoment]:
        """Find interactive moment at timestamp, skipping incomplete entries."""
        for moment in moments:
            if not moment.is_complete:
                continue
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

    def _find_character(
        self,
        characters: List[ContentCharacter],
        character_name: str
    ) -> Optional[ContentCharacter]:
        """Find a character by name in the interactive_characters list"""
        for character in characters:
            if character.name == character_name:
                return character
        return None

    async def process_multi_character_message(
        self,
        session_id: str,
        user_message: str,
        addressed_character: str,
    ) -> List[DialogueExchange]:
        """Delegate multi-character message processing to handler"""
        from app.services.vod_interaction.multi_character_handler import (
            multi_character_handler,
        )
        session = await VODInteractionSession.get(session_id)
        if not session:
            raise ValueError(f"Session not found: {session_id}")
        if session.status != "active":
            raise ValueError(f"Session not active: {session.status}")
        return await multi_character_handler.process_multi_character_message(
            session, user_message, addressed_character,
        )

    async def _get_character_voice_id(self, character_name: str) -> str:
        """Look up ElevenLabs voice ID from the characters collection."""
        char = await Character.find_one(Character.name == character_name)
        if char:
            return char.voice_id
        logger.warning(
            "No character record found, using default voice",
            extra={"character_name": character_name},
        )
        return settings.CHARACTER_VOICE_DEFAULT


vod_interaction_service = VODInteractionService()
