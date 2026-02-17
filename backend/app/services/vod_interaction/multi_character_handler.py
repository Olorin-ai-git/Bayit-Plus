"""
Multi-Character Interaction Handler

Orchestrates multi-character interactions: AI generation, content moderation,
animation, credit charging, and session persistence.
"""

from datetime import datetime
from typing import List, Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.content import Content
from app.models.vod_interaction import (
    CharacterProfile,
    DialogueExchange,
    InteractiveMoment,
    VODInteractionSession,
)
from app.services.beta.credit_service import credit_service
from app.services.vod_interaction.character_animator import character_animator_service
from app.services.vod_interaction.interaction_service import (
    BLOCKED_RESPONSE_PATTERNS,
    SAFE_FALLBACK_RESPONSE,
)
from app.services.vod_interaction.multi_character_ai import multi_character_ai_service

logger = get_logger(__name__)


class MultiCharacterHandler:
    """Orchestrates multi-character dialogue processing"""

    async def process_multi_character_message(
        self,
        session: VODInteractionSession,
        user_message: str,
        addressed_character: str,
    ) -> List[DialogueExchange]:
        """
        Process user message targeting a specific character in a multi-character moment.

        Args:
            session: Active interaction session
            user_message: User's message text
            addressed_character: Name of character being spoken to

        Returns:
            List of DialogueExchange entries (user msg + primary + reactions)
        """
        try:
            characters = await self._load_moment_characters(session)
            addressed = self._find_character(characters, addressed_character)
            if not addressed:
                raise ValueError(
                    f"Character not found in moment: {addressed_character}"
                )

            multi_response = await multi_character_ai_service.generate_multi_character_response(
                addressed_character=addressed_character,
                all_characters=characters,
                scene_context=session.scene_context or "",
                user_message=user_message,
                history=session.dialogue_exchanges,
                allow_reactions=True,
                reaction_probability=settings.VOD_INTERACTION_REACTION_PROBABILITY,
            )

            primary_text = multi_response.primary.text
            if BLOCKED_RESPONSE_PATTERNS.search(primary_text):
                logger.warning(
                    "Multi-character response failed moderation",
                    extra={
                        "session_id": str(session.id),
                        "character_name": addressed_character,
                    },
                )
                primary_text = SAFE_FALLBACK_RESPONSE

            animated = await character_animator_service.animate_character_response(
                character_name=addressed_character,
                dialogue_text=primary_text,
                character_frame_url=addressed.frame_url,
                voice_id=addressed.voice_id,
            )

            await credit_service.charge_credits(
                user_id=session.user_id,
                amount=settings.CREDIT_RATE_VOD_INTERACTION_MESSAGE,
                reason="vod_interaction_multi_character",
                metadata={"session_id": str(session.id)},
            )

            exchanges = self._build_exchanges(
                user_message, addressed_character, primary_text,
                animated.audio_url, animated.video_url, multi_response.reactions,
            )

            session.dialogue_exchanges.extend(exchanges)
            session.updated_at = datetime.utcnow()
            await session.save()

            logger.info(
                "Multi-character message processed",
                extra={
                    "session_id": str(session.id),
                    "addressed": addressed_character,
                    "reaction_count": len(multi_response.reactions),
                    "total_exchanges": len(session.dialogue_exchanges),
                },
            )
            return exchanges

        except Exception as exc:
            logger.error(
                "Failed to process multi-character message",
                extra={
                    "session_id": str(session.id),
                    "addressed_character": addressed_character,
                    "error": str(exc),
                },
            )
            raise

    @staticmethod
    async def _load_moment_characters(
        session: VODInteractionSession,
    ) -> List[CharacterProfile]:
        """Load character profiles from the content's interactive moment"""
        content = await Content.get(session.content_id)
        if not content:
            raise ValueError(f"Content not found: {session.content_id}")

        for moment in content.interactive_moments or []:
            ts = session.moment_timestamp
            if moment.timestamp <= ts <= moment.timestamp + moment.duration:
                if moment.characters:
                    return moment.characters

        raise ValueError(
            f"No multi-character moment at timestamp {session.moment_timestamp}"
        )

    @staticmethod
    def _find_character(
        characters: List[CharacterProfile], name: str,
    ) -> Optional[CharacterProfile]:
        """Find character by name in profiles list"""
        for char in characters:
            if char.name == name:
                return char
        return None

    @staticmethod
    def _build_exchanges(
        user_message: str,
        addressed_character: str,
        primary_text: str,
        audio_url: str,
        video_url: str,
        reactions: list,
    ) -> List[DialogueExchange]:
        """Build dialogue exchange entries for user, primary, and reactions"""
        now = datetime.utcnow()
        exchanges: List[DialogueExchange] = []

        exchanges.append(DialogueExchange(
            speaker="user",
            message_text=user_message,
            addressed_to=addressed_character,
            timestamp=now,
        ))
        exchanges.append(DialogueExchange(
            speaker="character",
            message_text=primary_text,
            character_name=addressed_character,
            audio_url=audio_url,
            animated_video_url=video_url,
            timestamp=now,
        ))
        for reaction in reactions:
            exchanges.append(DialogueExchange(
                speaker="character",
                message_text=reaction.text,
                character_name=reaction.character_name,
                reaction_to=addressed_character,
                timestamp=now,
            ))
        return exchanges


multi_character_handler = MultiCharacterHandler()
