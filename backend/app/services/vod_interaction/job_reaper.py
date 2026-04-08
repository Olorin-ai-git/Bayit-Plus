"""
Stale Job Reaper

Periodic task that marks stuck Pause & Ask jobs as failed and
refunds credits. Runs every 60 seconds, catches jobs that have
been in a non-terminal state for longer than the stale timeout.
"""

import asyncio
from datetime import datetime, timedelta

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.pause_ask_job import (
    JobError,
    JobStatus,
    PauseAskJob,
    TERMINAL_STATUSES,
)
from app.services.beta.credit_service import credit_service

logger = get_logger(__name__)


async def reap_stale_jobs() -> int:
    """Find and fail stale jobs. Returns count of reaped jobs."""
    cutoff = datetime.utcnow() - timedelta(
        seconds=settings.PAUSE_ASK_JOB_STALE_TIMEOUT_SECONDS,
    )

    stale_jobs = await PauseAskJob.find(
        {
            "status": {"$nin": [s.value for s in TERMINAL_STATUSES]},
            "created_at": {"$lt": cutoff},
        },
    ).to_list()

    for job in stale_jobs:
        job.status = JobStatus.failed
        job.error = JobError(
            error_type="timeout",
            user_message="Request timed out. Please try again.",
            can_retry=True,
        )
        job.completed_at = datetime.utcnow()
        job.progress_message = "Timed out"
        await job.save()

        if job.credits_charged > 0 and job.credits_refunded == 0:
            await credit_service.refund_credits(
                user_id=job.user_id,
                amount=job.credits_charged,
                reason="pause_ask_stale_timeout",
                metadata={"job_id": job.job_id},
            )
            job.credits_refunded = job.credits_charged
            await job.save()

        logger.warning(
            "Reaped stale Pause & Ask job",
            extra={
                "job_id": job.job_id,
                "created_at": job.created_at.isoformat(),
            },
        )

    return len(stale_jobs)


async def run_reaper_loop() -> None:
    """Run the reaper periodically until cancelled."""
    interval = settings.PAUSE_ASK_JOB_REAPER_INTERVAL_SECONDS
    logger.info(
        "Pause & Ask job reaper started",
        extra={"interval_seconds": interval},
    )
    while True:
        try:
            count = await reap_stale_jobs()
            if count > 0:
                logger.info(
                    "Reaper cycle complete",
                    extra={"reaped_count": count},
                )
        except Exception as exc:
            logger.error(
                "Job reaper error",
                extra={"error": str(exc)},
            )
        await asyncio.sleep(interval)
