"""
Pause & Ask Orchestrator

Central pipeline for the Dynamic Pause & Ask feature. Chains text polishing,
user avatar animation, character AI response, character animation, content
moderation, credit charging, and session persistence -- with parallel
execution where steps are independent.
"""

import asyncio
from datetime import datetime
from typing import Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.child_avatar import ChildAvatar
from app.models.vod_interaction import (
    AnimatedResponse,
    DialogueExchange,
    VODInteractionSession,
)
from app.services.beta.credit_service import credit_service
from app.services.vod_interaction.character_ai import character_ai_service
from app.services.vod_interaction.character_animator import (
    character_animator_service,
)
from app.services.vod_interaction.interaction_service import (
    BLOCKED_RESPONSE_PATTERNS,
    SAFE_FALLBACK_RESPONSE,
)
from app.services.vod_interaction.pause_ask_models import PauseAskResult
from app.services.vod_interaction.text_polisher import text_polisher
from app.services.vod_interaction.user_avatar_animator import (
    user_avatar_animator,
)

logger = get_logger(__name__)


class PauseAskOrchestrator:
    """Orchestrates the full Pause & Ask pipeline with parallel execution."""

    async def process_exchange(
        self,
        session: VODInteractionSession,
        user_message: str,
        language_hint: str = "",
    ) -> PauseAskResult:
        """Process a Pause & Ask exchange through the full pipeline."""
        session_id = str(session.id)
        logger.info(
            "Pause & Ask pipeline started",
            extra={
                "session_id": session_id,
                "message_length": len(user_message),
            },
        )

        # 1. Fetch user avatar
        avatar = await ChildAvatar.get(session.avatar_id)
        if not avatar:
            raise ValueError(f"Avatar not found: {session.avatar_id}")
        # 2. Polish user text
        polished_text = await text_polisher.polish(
            user_message, language_hint=language_hint,
        )

        # 3. PARALLEL: user avatar animation + character AI response
        #    User animation is skipped when voice clone is unavailable.
        scene_context = session.scene_context or ""
        char_desc = session.character_description or ""

        if avatar.has_voice_clone:
            user_anim_coro = self._animate_user_safe(polished_text, avatar)
        else:
            user_anim_coro = self._no_animation()
        char_response_coro = character_ai_service.generate_response(
            character_name=session.character_name,
            scene_context=scene_context,
            user_message=polished_text,
            conversation_history=session.dialogue_exchanges,
            character_description=char_desc,
            movie_context=scene_context,
        )

        user_animated, character_response = await asyncio.gather(
            user_anim_coro, char_response_coro,
        )

        # 4. Content moderation
        response_text = character_response.text
        if BLOCKED_RESPONSE_PATTERNS.search(response_text):
            logger.warning(
                "Pause & Ask character response blocked by content filter",
                extra={
                    "session_id": session_id,
                    "character_name": session.character_name,
                },
            )
            response_text = SAFE_FALLBACK_RESPONSE

        # 5. Animate character response
        voice_id = (
            session.character_voice_id
            or settings.CHARACTER_VOICE_DEFAULT
        )
        char_animated = await character_animator_service.animate_character_response(
            character_name=session.character_name,
            dialogue_text=response_text,
            character_frame_url=session.character_frame_url,
            voice_id=voice_id,
        )

        # 6. Save exchanges to session
        user_exchange = DialogueExchange(
            speaker="user",
            message_text=user_message,
            polished_text=polished_text,
            user_animated_video_url=(
                user_animated.video_url if user_animated else None
            ),
            audio_url=user_animated.audio_url if user_animated else None,
            timestamp=datetime.utcnow(),
        )
        character_exchange = DialogueExchange(
            speaker="character",
            message_text=response_text,
            audio_url=char_animated.audio_url,
            animated_video_url=char_animated.video_url,
            character_name=session.character_name,
            timestamp=datetime.utcnow(),
        )
        session.dialogue_exchanges.append(user_exchange)
        session.dialogue_exchanges.append(character_exchange)
        session.updated_at = datetime.utcnow()
        await session.save()

        # 7. Charge credits
        await credit_service.charge_credits(
            user_id=session.user_id,
            amount=settings.CREDIT_RATE_VOD_PAUSE_ASK,
            reason="vod_pause_ask_exchange",
            metadata={"session_id": session_id},
        )

        logger.info(
            "Pause & Ask pipeline completed",
            extra={
                "session_id": session_id,
                "character_name": session.character_name,
                "user_video_available": user_animated is not None,
            },
        )

        return PauseAskResult(
            user_polished_text=polished_text,
            user_audio_url=user_animated.audio_url if user_animated else "",
            user_animated_video_url=(
                user_animated.video_url if user_animated else ""
            ),
            user_video_duration=(
                user_animated.duration if user_animated else 0.0
            ),
            character_name=session.character_name,
            character_response_text=response_text,
            character_audio_url=char_animated.audio_url,
            character_animated_video_url=char_animated.video_url,
            character_video_duration=char_animated.duration,
        )

    async def _no_animation(self) -> Optional[AnimatedResponse]:
        """Return None immediately when voice clone is unavailable."""
        return None

    async def _animate_user_safe(
        self, polished_text: str, avatar: ChildAvatar,
    ) -> Optional[AnimatedResponse]:
        """Animate user avatar with graceful fallback on failure."""
        try:
            return await user_avatar_animator.animate_user_avatar(
                polished_text, avatar,
            )
        except Exception as exc:
            logger.warning(
                "User avatar animation failed, continuing without",
                extra={
                    "avatar_id": str(avatar.id),
                    "error": str(exc),
                },
            )
            return None


pause_ask_orchestrator = PauseAskOrchestrator()
