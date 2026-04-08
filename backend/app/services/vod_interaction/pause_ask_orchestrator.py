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
from app.models.film_memory import FilmMemoryExchange
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
from app.services.vod_interaction.film_memory_service import film_memory_service
from app.services.vod_interaction.interaction_service import (
    BLOCKED_RESPONSE_PATTERNS,
    SAFE_FALLBACK_RESPONSE,
)
from app.services.vod_interaction.memory_reference_service import find_reference
from app.models.pause_ask_job import (
    JobError,
    JobResult,
    JobStatus,
    PauseAskJob,
    STAGE_MESSAGES,
    TERMINAL_STATUSES,
)
from app.services.vod_interaction.pause_ask_models import (
    PauseAskResult,
    PauseAskServiceError,
)
from app.services.vod_interaction.text_polisher import text_polisher

logger = get_logger(__name__)


class PauseAskOrchestrator:
    """Orchestrates the full Pause & Ask pipeline with parallel execution."""

    async def run_job(self, job: PauseAskJob) -> None:
        """Execute the pipeline as a background job, updating job state."""
        try:
            job.status = JobStatus.accepted
            job.started_at = datetime.utcnow()
            await job.save()

            await self._execute_job_pipeline(job)
        except Exception as exc:
            await self._fail_job(job, exc)

    async def _execute_job_pipeline(self, job: PauseAskJob) -> None:
        """Run pipeline stages, updating job document at each stage."""
        from app.models.content import Content
        from app.models.integration_partner import IntegrationPartner
        from beanie import PydanticObjectId

        # Look up content and character
        content = await Content.get(PydanticObjectId(job.content_id))
        if not content:
            raise ValueError(f"Content not found: {job.content_id}")

        chars = getattr(content, "interactive_characters", []) or []
        character = None
        for c in chars:
            if c.name.lower() == job.character.lower():
                character = c
                break
        if not character:
            raise ValueError(f"Character not found: {job.character}")

        # Create ephemeral session
        session = VODInteractionSession(
            user_id=job.user_id,
            profile_id=job.user_id,
            content_id=job.content_id,
            character_name=character.name,
            character_description=character.description,
            character_voice_id=character.voice_id,
            character_frame_url=character.frame_url,
            scene_context=character.movie_context,
            persona_mode=getattr(content, "persona_mode", "character"),
            audience_description=getattr(content, "audience_description", ""),
            status="active",
        )
        await session.insert()
        job.session_id = str(session.id)
        await job.save()

        voice_only = job.mode == "voice"

        try:
            result = await self._run_staged_pipeline(
                job, session, voice_only,
            )

            # Determine final status
            if result.voice_only_fallback:
                job.status = JobStatus.completed_voice_only
                refund_amount = (
                    settings.CREDIT_RATE_VOD_PAUSE_ASK
                    - settings.CREDIT_RATE_VOD_PAUSE_ASK_VOICE_ONLY
                )
                if refund_amount > 0 and job.credits_charged > 0:
                    from app.services.beta.credit_service import credit_service
                    await credit_service.refund_credits(
                        user_id=job.user_id,
                        amount=refund_amount,
                        reason="pause_ask_voice_only_fallback",
                        metadata={"job_id": job.job_id},
                    )
                    job.credits_refunded = refund_amount
            else:
                job.status = JobStatus.completed

            job.result = JobResult(
                video_url=result.character_animated_video_url,
                audio_url=result.character_audio_url,
                frame_url=result.character_frame_url,
                response_text=result.character_response_text,
                character_name=result.character_name,
                duration=result.character_video_duration,
            )
            job.completed_at = datetime.utcnow()
            job.progress_message = "Ready"
            await job.save()

        finally:
            session.status = "completed"
            await session.save()

    async def _run_staged_pipeline(
        self,
        job: PauseAskJob,
        session: VODInteractionSession,
        voice_only: bool,
    ) -> PauseAskResult:
        """Run the pipeline with stage tracking and Aurora fallback."""

        # Stage: polishing
        await self._update_stage(job, JobStatus.polishing)

        polished_text = await text_polisher.polish(
            job.question, language_hint=job.language_hint,
        )

        # Stage: generating response
        await self._update_stage(job, JobStatus.generating_response)

        scene_context = session.scene_context or ""
        char_desc = session.character_description or ""

        memory_context = ""
        memory = None
        if settings.VOD_FILM_MEMORY_ENABLED:
            memory = await film_memory_service.get_or_create(
                session.user_id, session.profile_id, session.content_id,
            )
            memory_context = film_memory_service.build_memory_context(memory)

        character_response = await character_ai_service.generate_response(
            character_name=session.character_name,
            scene_context=scene_context,
            user_message=polished_text,
            conversation_history=session.dialogue_exchanges,
            character_description=char_desc,
            movie_context=scene_context,
            child_name=session.child_first_name or "",
            memory_context=memory_context,
            persona_mode=session.persona_mode or "character",
            audience_description=session.audience_description or "",
        )

        # Content moderation
        response_text = character_response.text
        if BLOCKED_RESPONSE_PATTERNS.search(response_text):
            logger.warning(
                "Character response blocked by content filter",
                extra={"job_id": job.job_id},
            )
            response_text = SAFE_FALLBACK_RESPONSE

        # Stage: voice / animation
        voice_id = (
            session.character_voice_id or settings.CHARACTER_VOICE_DEFAULT
        )
        voice_only_fallback = False
        character_frame_url = session.character_frame_url or ""

        if voice_only:
            # Voice-only: TTS only, no lip-sync
            await self._update_stage(job, JobStatus.generating_voice)
            char_animated = await character_animator_service.generate_audio_only(
                character_name=session.character_name,
                dialogue_text=response_text,
                voice_id=voice_id,
            )
        else:
            # Lip-sync: TTS + Aurora in one call (animate_character_response
            # calls _generate_tts internally, so we skip generate_audio_only
            # to avoid double TTS generation)
            await self._update_stage(job, JobStatus.animating)
            try:
                char_animated = await character_animator_service.animate_character_response(
                    character_name=session.character_name,
                    dialogue_text=response_text,
                    character_frame_url=character_frame_url,
                    voice_id=voice_id,
                )
            except (TimeoutError, RuntimeError, Exception) as exc:
                logger.warning(
                    "Aurora lip-sync failed, falling back to voice-only",
                    extra={
                        "job_id": job.job_id,
                        "error": str(exc),
                    },
                )
                voice_only_fallback = True
                # Fallback: generate audio-only (TTS without Aurora)
                await self._update_stage(job, JobStatus.generating_voice)
                char_animated = await character_animator_service.generate_audio_only(
                    character_name=session.character_name,
                    dialogue_text=response_text,
                    voice_id=voice_id,
                )

        # Save exchanges to session
        user_exchange = DialogueExchange(
            speaker="user",
            message_text=job.question,
            polished_text=polished_text,
            timestamp=datetime.utcnow(),
        )
        character_exchange = DialogueExchange(
            speaker="character",
            message_text=response_text,
            audio_url=char_animated.audio_url,
            animated_video_url=char_animated.video_url or None,
            character_name=session.character_name,
            timestamp=datetime.utcnow(),
        )
        session.dialogue_exchanges.append(user_exchange)
        session.dialogue_exchanges.append(character_exchange)
        session.updated_at = datetime.utcnow()
        await session.save()

        # Film memory
        if settings.VOD_FILM_MEMORY_ENABLED:
            film_exchange = FilmMemoryExchange(
                moment_timestamp=session.moment_timestamp,
                character_name=session.character_name,
                user_message=job.question,
                character_response=response_text,
                created_at=character_exchange.timestamp,
            )
            memory = await film_memory_service.get_or_create(
                session.user_id, session.profile_id, session.content_id,
            )
            await film_memory_service.ingest_exchanges(memory, [film_exchange])

        # Memory reference
        prior_user_messages = [
            ex.message_text
            for ex in session.dialogue_exchanges
            if ex.speaker == "user"
        ]
        memory_metadata = find_reference(response_text, prior_user_messages)

        return PauseAskResult(
            user_polished_text=polished_text,
            character_name=session.character_name,
            character_response_text=response_text,
            character_audio_url=char_animated.audio_url,
            character_animated_video_url=char_animated.video_url or "",
            character_frame_url=character_frame_url,
            character_video_duration=char_animated.duration,
            voice_only_fallback=voice_only_fallback,
            memory_metadata=memory_metadata,
        )

    async def _update_stage(
        self, job: PauseAskJob, status: JobStatus,
    ) -> None:
        """Update job stage and progress message."""
        job.status = status
        job.stage = status.value
        job.progress_message = STAGE_MESSAGES.get(status, "Processing...")
        await job.save()

    async def _fail_job(
        self, job: PauseAskJob, exc: Exception,
    ) -> None:
        """Mark job as failed, classify error, refund credits."""
        error_type, user_message, can_retry = self._classify_job_error(exc)

        job.status = JobStatus.failed
        job.error = JobError(
            error_type=error_type,
            user_message=user_message,
            can_retry=can_retry,
        )
        job.completed_at = datetime.utcnow()
        job.progress_message = user_message
        await job.save()

        # Refund credits on failure
        if job.credits_charged > 0:
            from app.services.beta.credit_service import credit_service
            await credit_service.refund_credits(
                user_id=job.user_id,
                amount=job.credits_charged,
                reason=f"pause_ask_failed:{error_type}",
                metadata={"job_id": job.job_id},
            )
            job.credits_refunded = job.credits_charged
            await job.save()

        logger.error(
            "Pause & Ask job failed",
            extra={
                "job_id": job.job_id,
                "error_type": error_type,
                "error": str(exc),
            },
        )

    def _classify_job_error(
        self, exc: Exception,
    ) -> tuple[str, str, bool]:
        """Classify exception into (error_type, user_message, can_retry)."""
        error_lower = str(exc).lower()

        if isinstance(exc, ValueError):
            return (
                "content_not_ready",
                str(exc),
                False,
            )

        if "anthropic" in error_lower or "claude" in error_lower:
            return (
                "ai_response_failed",
                "Character couldn't respond. Please try again.",
                True,
            )

        if "elevenlabs" in error_lower or "tts" in error_lower:
            return (
                "voice_generation_failed",
                "Voice generation failed. Please try again.",
                True,
            )

        if "whisper" in error_lower or "transcri" in error_lower:
            return (
                "transcription_failed",
                "Couldn't understand the audio. Please try again.",
                True,
            )

        return (
            "unknown",
            "Something went wrong. Please try again.",
            True,
        )

    async def process_exchange(
        self,
        session: VODInteractionSession,
        user_message: str,
        language_hint: str = "",
        voice_only: bool = False,
        cancel_event: Optional[asyncio.Event] = None,
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

        # 2b. Load cross-moment film memory if enabled
        memory_context = ""
        memory = None
        if settings.VOD_FILM_MEMORY_ENABLED:
            memory = await film_memory_service.get_or_create(
                session.user_id, session.profile_id, session.content_id,
            )
            memory_context = film_memory_service.build_memory_context(memory)

        user_anim_coro = self._no_animation()
        char_response_coro = character_ai_service.generate_response(
            character_name=session.character_name,
            scene_context=scene_context,
            user_message=polished_text,
            conversation_history=session.dialogue_exchanges,
            character_description=char_desc,
            movie_context=scene_context,
            child_name=session.child_first_name or "",
            memory_context=memory_context,
            persona_mode=session.persona_mode or "character",
            audience_description=session.audience_description or "",
        )

        try:
            user_animated, character_response = await asyncio.gather(
                user_anim_coro, char_response_coro,
            )
        except PauseAskServiceError:
            raise
        except Exception as exc:
            raise self._classify_error(exc, "anthropic", session_id) from exc

        # 4. Compute memory reference against prior user turns in this session
        #    AND cross-session film memory (so Hildy can reference Walter's exchange).
        prior_user_messages = [
            ex.message_text
            for ex in session.dialogue_exchanges
            if ex.speaker == "user"
        ]
        if memory and memory.recent_exchanges:
            film_user_messages = [
                ex.user_message for ex in memory.recent_exchanges
            ]
            prior_user_messages = film_user_messages + prior_user_messages

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
                    cancel_event=cancel_event,
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

        # 6b. Ingest this pause-ask pair into cross-moment film memory
        if settings.VOD_FILM_MEMORY_ENABLED:
            film_exchange = FilmMemoryExchange(
                moment_timestamp=session.moment_timestamp,
                character_name=session.character_name,
                user_message=user_message,
                character_response=response_text,
                created_at=character_exchange.timestamp,
            )
            memory = await film_memory_service.get_or_create(
                session.user_id, session.profile_id, session.content_id,
            )
            await film_memory_service.ingest_exchanges(memory, [film_exchange])
            session.memory_ingested_count = len(session.dialogue_exchanges)
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

        memory_metadata = find_reference(response_text, prior_user_messages)

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
            memory_metadata=memory_metadata,
        )

    async def _no_animation(self) -> Optional[AnimatedResponse]:
        """Return None immediately when voice clone is unavailable."""
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
