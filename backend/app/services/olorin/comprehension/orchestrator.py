"""Comprehension session orchestrator (D-02, D-17, D-18).

Integrates the four Task-1 primitives (scorer, adapter, question_generator,
film_memory_service) into a single run_turn() call that:

  1. scores the student answer (stateless, D-10)
  2. appends ScoredExchange to ComprehensionSession (D-01)
  3. dual-writes a FilmMemoryExchange tagged COMPREHENSION_GRADER to
     VODFilmMemory (D-02)
  4. on memory-append failure: flags memory_retry_pending=True, enqueues
     an ARQ retry task, and returns normally — NEVER blocks the student
     (D-18)
  5. advances the adapt_level state machine (D-12, D-13)
  6. builds a CHARACTER_CHAT-only memory projection (Pitfall 3)
  7. generates the next in-character follow-up question (D-08, D-09)
  8. persists the updated ComprehensionSession

No restart affordance per D-17.
"""
from datetime import datetime
from typing import List

from app.core.logging_config import get_logger
from app.models.comprehension_session import ComprehensionSession, ScoredExchange
from app.models.film_memory import FilmMemoryExchange, VODFilmMemory
from app.schemas.comprehension import AdaptLevel, ExchangeType
from app.services.olorin.comprehension.adapter import next_adapt_level
from app.services.olorin.comprehension.question_generator import (
    comprehension_question_generator,
)
from app.services.olorin.comprehension.scorer import rubric_scoring_service
from app.services.vod_interaction.character_animator import (
    character_animator_service,
)
from app.services.vod_interaction.film_memory_service import film_memory_service

logger = get_logger(__name__)

# D-08: the question generator sees the last 3 CHARACTER_CHAT exchanges only.
MEMORY_PROJECTION_WINDOW = 3


def _prior_wrong_streak(exchanges: List[ScoredExchange]) -> int:
    """Count consecutive score<=1 entries at the tail of exchanges."""
    streak = 0
    for exch in reversed(exchanges):
        if exch.score.score <= 1:
            streak += 1
        else:
            break
    return streak


def _project_character_memory_context(memory: VODFilmMemory) -> str:
    """Build memory_context filtered to CHARACTER_CHAT only (Pitfall 3).

    The character NEVER sees grader-written (COMPREHENSION_GRADER) exchanges
    in its prompt context. Last MEMORY_PROJECTION_WINDOW chat exchanges only.

    Mutates a shallow in-memory snapshot of the memory document rather than
    constructing a fresh Beanie Document (which would require a bound
    collection). The underlying memory instance is restored on exit.
    """
    chat_only = [
        e for e in memory.recent_exchanges
        if e.exchange_type == ExchangeType.CHARACTER_CHAT
    ]
    original_recent = memory.recent_exchanges
    try:
        memory.recent_exchanges = chat_only[-MEMORY_PROJECTION_WINDOW:]
        return film_memory_service.build_memory_context(memory)
    finally:
        memory.recent_exchanges = original_recent


class ComprehensionSessionOrchestrator:
    """Runs one turn of the comprehension loop. Single public method: run_turn."""

    async def run_turn(
        self,
        session: ComprehensionSession,
        scene_context: str,
        playback_seconds: float,
        question_text: str,
        student_answer: str,
        answer_modality: str,
        rubric: str,
        character_name: str,
        personality_traits: List[str],
        moment_timestamp: float,
    ) -> dict:
        """Execute one comprehension turn (stateless grade + dual-write + adapt + qgen)."""
        # 1. Score (stateless, D-10).
        score = await rubric_scoring_service.score(
            rubric=rubric,
            scene_context=scene_context,
            question=question_text,
            student_answer=student_answer,
        )

        # 2. Build and append ScoredExchange.
        prior_streak = _prior_wrong_streak(session.exchanges)
        parent_idx = (
            len(session.exchanges) - 1 if session.exchanges else None
        )
        scored = ScoredExchange(
            question_text=question_text,
            student_answer=student_answer,
            score=score,
            adapt_level=session.current_adapt_level,
            parent_exchange_index=parent_idx,
            moment_timestamp=moment_timestamp,
            answer_modality=answer_modality,
            memory_retry_pending=False,
        )
        session.exchanges.append(scored)

        # 3. Dual-write to VODFilmMemory (D-02), non-blocking on failure (D-18).
        memory = await film_memory_service.get_or_create(
            session.user_id, session.profile_id, session.content_id,
        )
        grader_mem_exchange = FilmMemoryExchange(
            moment_timestamp=moment_timestamp,
            character_name=session.character_name,
            user_message=student_answer,
            character_response=question_text,
            exchange_type=ExchangeType.COMPREHENSION_GRADER,
        )
        try:
            memory = await film_memory_service.ingest_exchanges(
                memory, [grader_mem_exchange],
            )
        except Exception as exc:  # noqa: BLE001 — D-18: never block student
            scored.memory_retry_pending = True
            logger.warning(
                "VODFilmMemory append failed; enqueuing ARQ retry (D-18)",
                extra={
                    "session_id": str(session.id) if session.id else None,
                    "error": str(exc),
                    "scored_exchange_index": len(session.exchanges) - 1,
                },
            )
            from app.services.olorin.comprehension.memory_retry_worker import (
                enqueue_memory_retry,
            )
            await enqueue_memory_retry(
                session_id=str(session.id) if session.id else "",
                scored_exchange_index=len(session.exchanges) - 1,
            )
            # Do not re-raise — student response must flow normally.

        # 4. Advance adapt level (D-12, D-13).
        new_adapt: AdaptLevel = next_adapt_level(
            current=session.current_adapt_level,
            last_score=score.score,
            prior_wrong_streak=prior_streak,
        )
        session.current_adapt_level = new_adapt

        # 5. Character-only memory projection (Pitfall 3).
        memory_context = _project_character_memory_context(memory)

        # 6. Generate in-character follow-up (D-08, D-09).
        follow_up = await comprehension_question_generator.generate(
            character_name=character_name,
            personality_traits=personality_traits,
            scene_context=scene_context,
            rubric=rubric,
            adapt_level=new_adapt,
            memory_context=memory_context,
            prior_question=question_text,
        )

        # 7. Generate character video response (TTS + lipsync).
        character_audio_url = ""
        character_animated_video_url = ""
        character_video_duration = 0.0
        voice_id = session.character_voice_id
        frame_url = session.character_frame_url
        if not voice_id:
            from app.models.character import Character
            char = await Character.find_one(Character.name == character_name)
            if char:
                voice_id = char.voice_id
                if not frame_url and char.face_url:
                    frame_url = char.face_url
        if voice_id and follow_up.in_character_phrasing:
            try:
                if frame_url:
                    animated = await character_animator_service.animate_character_response(
                        character_name=character_name,
                        dialogue_text=follow_up.in_character_phrasing,
                        character_frame_url=frame_url,
                        voice_id=voice_id,
                    )
                else:
                    animated = await character_animator_service.generate_audio_only(
                        character_name=character_name,
                        dialogue_text=follow_up.in_character_phrasing,
                        voice_id=voice_id,
                    )
                character_audio_url = animated.audio_url
                character_animated_video_url = animated.video_url
                character_video_duration = animated.duration
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "Comprehension video generation failed; returning text-only",
                    extra={"error": str(exc)},
                )

        # 8. Persist session.
        session.updated_at = datetime.utcnow()
        session.last_trigger_at_playback_seconds = playback_seconds
        await session.save()

        return {
            "score": score,
            "follow_up": follow_up,
            "adapt_level": new_adapt,
            "memory_retry_pending": scored.memory_retry_pending,
            "character_audio_url": character_audio_url,
            "character_animated_video_url": character_animated_video_url,
            "character_video_duration": character_video_duration,
        }


comprehension_session_orchestrator = ComprehensionSessionOrchestrator()
