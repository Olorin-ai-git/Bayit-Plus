"""ARQ retry worker for VODFilmMemory append failures (D-18).

Runbook: start this worker as a separate process alongside the FastAPI app.

  cd olorin-media/bayit-plus/backend
  poetry run arq app.services.olorin.comprehension.memory_retry_worker.WorkerSettings

The worker consumes retry tasks enqueued by
ComprehensionSessionOrchestrator.run_turn() when a dual-write to
VODFilmMemory fails. Each task reloads the ComprehensionSession and the
target ScoredExchange, rebuilds the COMPREHENSION_GRADER FilmMemoryExchange,
and retries the append. On success it clears memory_retry_pending. On
failure it raises so ARQ's built-in max_tries retry kicks in.
"""
from datetime import datetime
from typing import Any, Optional

from arq.connections import RedisSettings
from arq.connections import create_pool

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.comprehension_session import ComprehensionSession
from app.models.film_memory import FilmMemoryExchange
from app.schemas.comprehension import ExchangeType
from app.services.vod_interaction.film_memory_service import film_memory_service

logger = get_logger(__name__)

WORKER_QUEUE_NAME = "comprehension_memory_retry"
WORKER_MAX_TRIES = 5
WORKER_JOB_TIMEOUT = 30  # seconds


def _redis_settings_from_url(url: str) -> RedisSettings:
    """Build arq RedisSettings from the Bayit+ REDIS_URL."""
    return RedisSettings.from_dsn(url)


async def retry_memory_append(
    ctx: dict,
    session_id: str,
    scored_exchange_index: int,
) -> None:
    """ARQ task: re-attempt a VODFilmMemory append for a pending ScoredExchange.

    No-ops if the session or exchange is missing, or if the flag was already
    cleared by a concurrent writer. Raises on append failure so ARQ retries.
    """
    if not session_id:
        logger.warning("retry_memory_append called with empty session_id")
        return
    session = await ComprehensionSession.get(session_id)
    if session is None:
        logger.info(
            "retry_memory_append: session not found",
            extra={"session_id": session_id},
        )
        return
    if scored_exchange_index >= len(session.exchanges) or scored_exchange_index < 0:
        logger.info(
            "retry_memory_append: exchange index out of range",
            extra={
                "session_id": session_id,
                "index": scored_exchange_index,
                "exchanges_count": len(session.exchanges),
            },
        )
        return
    exch = session.exchanges[scored_exchange_index]
    if not exch.memory_retry_pending:
        # Already reconciled by a prior retry or concurrent writer.
        return

    memory = await film_memory_service.get_or_create(
        session.user_id, session.profile_id, session.content_id,
    )
    new_mem_exchange = FilmMemoryExchange(
        moment_timestamp=exch.moment_timestamp,
        character_name=session.character_name,
        user_message=exch.student_answer,
        character_response=exch.question_text,
        exchange_type=ExchangeType.COMPREHENSION_GRADER,
    )
    try:
        await film_memory_service.ingest_exchanges(memory, [new_mem_exchange])
    except Exception:
        logger.warning(
            "retry_memory_append: ingest failed, ARQ will retry",
            extra={
                "session_id": session_id,
                "index": scored_exchange_index,
            },
        )
        raise
    exch.memory_retry_pending = False
    session.updated_at = datetime.utcnow()
    await session.save()
    logger.info(
        "retry_memory_append: reconciled",
        extra={"session_id": session_id, "index": scored_exchange_index},
    )


class WorkerSettings:
    """ARQ WorkerSettings for the memory-retry queue."""

    functions = [retry_memory_append]
    queue_name = WORKER_QUEUE_NAME
    max_tries = WORKER_MAX_TRIES
    job_timeout = WORKER_JOB_TIMEOUT

    @staticmethod
    def redis_settings() -> RedisSettings:
        return _redis_settings_from_url(settings.REDIS_URL)


_pool: Optional[Any] = None


async def _get_pool() -> Any:
    """Lazily construct a shared ARQ Redis pool for enqueue calls."""
    global _pool
    if _pool is None:
        _pool = await create_pool(_redis_settings_from_url(settings.REDIS_URL))
    return _pool


async def enqueue_memory_retry(
    session_id: str,
    scored_exchange_index: int,
) -> None:
    """Enqueue a retry_memory_append job on the ARQ Redis queue (D-18)."""
    pool = await _get_pool()
    await pool.enqueue_job(
        "retry_memory_append",
        session_id,
        scored_exchange_index,
        _queue_name=WORKER_QUEUE_NAME,
    )
