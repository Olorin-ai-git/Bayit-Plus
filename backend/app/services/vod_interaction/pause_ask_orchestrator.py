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
from app.services.vod_interaction.pause_ask_models import (
    PauseAskResult,
    PauseAskServiceError,
)
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
        voice_only: bool = False,
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

        # 1. Fetch user avatar (skip for voice-only sessions without avatar)
        avatar = None
        if session.avatar_id:
            avatar = await ChildAvatar.get(session.avatar_id)
            if not avatar and not voice_only:
                raise ValueError(f"Avatar not found: {session.avatar_id}")
        # 2. Polish user text
        polished_text = await text_polisher.polish(
            user_message, language_hint=language_hint,
        )

        # 3. PARALLEL: user avatar animation + character AI response
        #    Voice-only mode skips all animation (lip-sync) for lower cost.
        #    Full mode uses personal voice clone if ready, otherwise falls back
        #    to the configured default kid voice.
        scene_context = session.scene_context or ""
        char_desc = session.character_description or ""

        if voice_only or not avatar:
            user_anim_coro = self._no_animation()
        else:
            fallback_voice = settings.MOVIE_INTERACTION_DEFAULT_VOICE_MALE
            has_face = bool(avatar.creatify_avatar_image_url or avatar.primary_avatar_gcs_path)
            if avatar.has_voice_clone or (has_face and fallback_voice):
                fb = "" if avatar.has_voice_clone else fallback_voice
                user_anim_coro = self._animate_user_safe(polished_text, avatar, fb)
            else:
                user_anim_coro = self._no_animation()
        char_response_coro = character_ai_service.generate_response(
            character_name=session.character_name,
            scene_context=scene_context,
            user_message=polished_text,
            conversation_history=session.dialogue_exchanges,
            character_description=char_desc,
            movie_context=scene_context,
            child_name=session.child_first_name or "",
        )

        try:
            user_animated, character_response = await asyncio.gather(
                user_anim_coro, char_response_coro,
            )
        except PauseAskServiceError:
            raise
        except Exception as exc:
            raise self._classify_error(exc, "anthropic", session_id) from exc

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

        # 5. Character voice/animation
        voice_id = (
            session.character_voice_id
            or settings.CHARACTER_VOICE_DEFAULT
        )
        try:
            if voice_only:
                char_animated = await character_animator_service.generate_audio_only(
                    character_name=session.character_name,
                    dialogue_text=response_text,
                    voice_id=voice_id,
                )
            else:
                char_animated = await character_animator_service.animate_character_response(
                    character_name=session.character_name,
                    dialogue_text=response_text,
                    character_frame_url=session.character_frame_url,
                    voice_id=voice_id,
                )
        except Exception as exc:
            svc = "elevenlabs" if voice_only else "fal_ai"
            raise self._classify_error(exc, svc, session_id) from exc

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

        # 7. Charge credits (skip for demo content — demo.olorin.ai is free)
        is_demo_content = (
            settings.DEMO_CONTENT_ID
            and session.content_id == settings.DEMO_CONTENT_ID
        )
        if not is_demo_content:
            credit_amount = (
                settings.CREDIT_RATE_VOD_PAUSE_ASK_VOICE_ONLY
                if voice_only
                else settings.CREDIT_RATE_VOD_PAUSE_ASK
            )
            await credit_service.charge_credits(
                user_id=session.user_id,
                amount=credit_amount,
                reason="vod_pause_ask_exchange",
                metadata={"session_id": session_id, "voice_only": voice_only},
            )

        logger.info(
            "Pause & Ask pipeline completed",
            extra={
                "session_id": session_id,
                "character_name": session.character_name,
                "voice_only": voice_only,
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
        self, polished_text: str, avatar: ChildAvatar, fallback_voice_id: str = "",
    ) -> Optional[AnimatedResponse]:
        """Animate user avatar with graceful fallback on failure."""
        try:
            return await user_avatar_animator.animate_user_avatar(
                polished_text, avatar, fallback_voice_id,
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

    def _classify_error(
        self, exc: Exception, default_service: str, session_id: str,
    ) -> PauseAskServiceError:
        """Classify an exception to identify which external service failed."""
        import anthropic
        import httpx

        error_str = str(exc)
        error_lower = error_str.lower()

        # Anthropic SDK errors
        if isinstance(exc, anthropic.APIError):
            status = getattr(exc, "status_code", 0)
            if status == 401 or "authentication" in error_lower:
                detail = "Anthropic API authentication failed"
            elif status == 429 or "rate" in error_lower:
                detail = "Anthropic API rate limit exceeded"
            elif status == 402 or "insufficient" in error_lower or "billing" in error_lower:
                detail = "Anthropic API insufficient funds"
            else:
                detail = f"Anthropic API error ({status})"
            logger.error(
                "Pause & Ask Anthropic failure",
                extra={"session_id": session_id, "status": status, "error": error_str},
            )
            return PauseAskServiceError(failed_service="anthropic", detail=detail)

        # httpx errors (fal.ai / ElevenLabs)
        if isinstance(exc, httpx.HTTPStatusError):
            status = exc.response.status_code
            service = self._identify_http_service(str(exc.request.url))
            if status == 401 or status == 403:
                detail = f"{service} authentication failed"
            elif status == 402 or status == 429:
                detail = f"{service} quota or rate limit exceeded"
            else:
                detail = f"{service} error ({status})"
            logger.error(
                "Pause & Ask HTTP service failure",
                extra={
                    "session_id": session_id,
                    "service": service,
                    "status": status,
                    "error": error_str,
                },
            )
            return PauseAskServiceError(failed_service=service, detail=detail)

        # Timeout / connection errors
        if isinstance(exc, (httpx.TimeoutException, TimeoutError)):
            service = default_service
            logger.error(
                "Pause & Ask timeout",
                extra={"session_id": session_id, "service": service, "error": error_str},
            )
            return PauseAskServiceError(
                failed_service=service, detail=f"{service} request timed out",
            )

        # RuntimeError from fal_aurora_client (job failed/cancelled)
        if isinstance(exc, RuntimeError) and "aurora" in error_lower:
            logger.error(
                "Pause & Ask fal.ai Aurora job failure",
                extra={"session_id": session_id, "error": error_str},
            )
            return PauseAskServiceError(
                failed_service="fal_ai", detail=f"fal.ai lip-sync failed: {error_str}",
            )

        logger.error(
            "Pause & Ask unclassified failure",
            extra={"session_id": session_id, "service": default_service, "error": error_str},
        )
        return PauseAskServiceError(
            failed_service=default_service, detail=error_str[:200],
        )

    @staticmethod
    def _identify_http_service(url: str) -> str:
        """Identify which service an HTTP URL belongs to."""
        if "fal.run" in url or "fal.ai" in url or "queue.fal" in url:
            return "fal_ai"
        if "elevenlabs" in url:
            return "elevenlabs"
        if "anthropic" in url:
            return "anthropic"
        return "external_service"


pause_ask_orchestrator = PauseAskOrchestrator()
