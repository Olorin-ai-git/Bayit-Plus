"""ARQ worker for comprehension report generation (D-06, D-07).

Runbook:

  cd olorin-media/bayit-plus/backend
  poetry run arq app.services.olorin.comprehension.report_worker.WorkerSettings

On failure: ARQ-scheduled retry with explicit backoff [3, 9, 27] seconds
via arq.worker.Retry(defer=...). Terminal state after 3 attempts is
ComprehensionReport.status='generation_failed' with last_error captured.
"""
from typing import Any, Optional

from arq.connections import RedisSettings, create_pool
from arq.worker import Retry

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.comprehension_report import ComprehensionReport
from app.models.comprehension_session import ComprehensionSession
from app.services.olorin.comprehension.report_generator import (
    build_report_from_session,
)

logger = get_logger(__name__)

REPORT_WORKER_QUEUE_NAME = "comprehension_report_generation"
WORKER_MAX_TRIES = 3
WORKER_JOB_TIMEOUT = 60  # seconds
RETRY_BACKOFF_SECONDS = (3, 9, 27)


def _redis_settings_from_url(url: str) -> RedisSettings:
    """Build arq RedisSettings from the Bayit+ REDIS_URL."""
    return RedisSettings.from_dsn(url)


async def _upsert_report(report: ComprehensionReport) -> None:
    """Replace the existing report for comprehension_session_id, or insert."""
    existing = await ComprehensionReport.find_one(
        {"comprehension_session_id": report.comprehension_session_id},
    )
    if existing is not None:
        existing.partner_id = report.partner_id
        existing.user_id = report.user_id
        existing.profile_id = report.profile_id
        existing.content_id = report.content_id
        existing.character_name = report.character_name
        existing.turn_count = report.turn_count
        existing.avg_score = report.avg_score
        existing.high_count = report.high_count
        existing.med_count = report.med_count
        existing.low_count = report.low_count
        existing.turns = report.turns
        existing.status = report.status
        existing.generation_attempts = existing.generation_attempts + 1
        existing.last_error = None
        existing.generated_at = report.generated_at
        await existing.save()
        return
    report.generation_attempts = 1
    await report.insert()


async def _record_failure(
    session_id: str, exc: Exception, job_try: int,
) -> None:
    """Persist terminal generation_failed state (best-effort)."""
    existing = await ComprehensionReport.find_one(
        {"comprehension_session_id": session_id},
    )
    err = str(exc)[:500]
    if existing is not None:
        existing.status = "generation_failed"
        existing.last_error = err
        existing.generation_attempts = job_try
        try:
            await existing.save()
        except Exception:  # noqa: BLE001
            logger.warning(
                "Failed to persist generation_failed state",
                extra={"session_id": session_id},
            )


async def generate_comprehension_report(
    ctx: dict, session_id: str,
) -> None:
    """ARQ task: build + upsert a ComprehensionReport for the session (D-06)."""
    if not session_id:
        logger.warning("generate_comprehension_report: empty session_id")
        return
    try:
        session = await ComprehensionSession.get(session_id)
        if session is None:
            logger.info(
                "generate_comprehension_report: session not found",
                extra={"session_id": session_id},
            )
            return
        partner_id = session.partner_id or ""
        report = build_report_from_session(session, partner_id=partner_id)
        await _upsert_report(report)
        logger.info(
            "comprehension report generated",
            extra={"session_id": session_id, "turn_count": report.turn_count},
        )
    except Exception as exc:  # noqa: BLE001 — ARQ retry path
        job_try = int(ctx.get("job_try", 1))
        logger.warning(
            "generate_comprehension_report failed, scheduling retry",
            extra={
                "session_id": session_id,
                "job_try": job_try,
                "error": str(exc),
            },
        )
        await _record_failure(session_id, exc, job_try)
        backoff_index = min(job_try - 1, len(RETRY_BACKOFF_SECONDS) - 1)
        raise Retry(defer=RETRY_BACKOFF_SECONDS[backoff_index])


class WorkerSettings:
    """ARQ WorkerSettings for the comprehension report queue."""

    functions = [generate_comprehension_report]
    queue_name = REPORT_WORKER_QUEUE_NAME
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


async def enqueue_report_generation(session_id: str) -> None:
    """Enqueue a generate_comprehension_report job on the ARQ Redis queue."""
    pool = await _get_pool()
    await pool.enqueue_job(
        "generate_comprehension_report",
        session_id,
        _queue_name=REPORT_WORKER_QUEUE_NAME,
    )
