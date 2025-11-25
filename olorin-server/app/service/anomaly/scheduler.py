"""
Detection Scheduler

Schedules periodic anomaly detection runs for enabled detectors using APScheduler.
NO HARDCODED VALUES - All configuration from environment variables.
"""

import os
from datetime import datetime, timedelta
from typing import Optional

try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.triggers.cron import CronTrigger
    from apscheduler.triggers.interval import IntervalTrigger

    APSCHEDULER_AVAILABLE = True
except ImportError:
    APSCHEDULER_AVAILABLE = False
    AsyncIOScheduler = None
    IntervalTrigger = None
    CronTrigger = None

from app.service.anomaly.scheduler_jobs import register_detector_jobs, run_detection_job
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class DetectionScheduler:
    """
    Scheduler for periodic anomaly detection runs.

    Uses APScheduler to schedule detection jobs for enabled detectors
    at configurable intervals.

    Note: Requires apscheduler package to be installed.
    """

    def __init__(self):
        """Initialize the detection scheduler."""
        self.scheduler: Optional[AsyncIOScheduler] = None
        self._running = False

        # Get configuration from environment
        self.default_interval_minutes = int(
            os.getenv("ANOMALY_DETECTION_INTERVAL_MINUTES", "15")
        )
        self.enabled = os.getenv("ENABLE_SCHEDULED_DETECTION", "true").lower() == "true"

        logger.info(
            f"Detection scheduler initialized: enabled={self.enabled}, "
            f"default_interval={self.default_interval_minutes} minutes"
        )

    async def start(self):
        """Start the scheduler and register jobs for enabled detectors."""
        if not APSCHEDULER_AVAILABLE:
            logger.warning(
                "APScheduler not available - scheduled detection disabled. Install with: pip install apscheduler"
            )
            return

        if not self.enabled:
            logger.info("Scheduled detection is disabled via environment variable")
            return

        if self._running:
            logger.warning("Detection scheduler already running")
            return

        try:
            # Suppress APScheduler's internal INFO logs (reduce noise)
            import logging

            apscheduler_logger = logging.getLogger("apscheduler")
            apscheduler_logger.setLevel(logging.WARNING)

            self.scheduler = AsyncIOScheduler()
            self.scheduler.start()
            self._running = True

            # Register jobs for all enabled detectors
            await register_detector_jobs(self.scheduler, self.default_interval_minutes)

            logger.info("Detection scheduler started successfully")
        except Exception as e:
            logger.error(f"Failed to start detection scheduler: {e}", exc_info=True)
            raise

    async def stop(self):
        """Stop the scheduler gracefully."""
        if not self._running or not self.scheduler:
            return

        try:
            logger.info("Stopping detection scheduler...")
            self.scheduler.shutdown(wait=True)
            self._running = False
            logger.info("Detection scheduler stopped")
        except Exception as e:
            logger.error(f"Error stopping detection scheduler: {e}", exc_info=True)

    async def refresh_jobs(self):
        """Refresh scheduled jobs (e.g., when detectors are enabled/disabled)."""
        if not self._running or not self.scheduler:
            return

        logger.info("Refreshing detector jobs...")

        # Remove all existing detector jobs
        jobs_to_remove = [
            job.id
            for job in self.scheduler.get_jobs()
            if job.id.startswith("detector_")
        ]
        for job_id in jobs_to_remove:
            self.scheduler.remove_job(job_id)

        # Re-register jobs
        await register_detector_jobs(self.scheduler, self.default_interval_minutes)

        logger.info(
            f"Refreshed detector jobs (removed {len(jobs_to_remove)}, added new)"
        )


# Global scheduler instance
_scheduler_instance: Optional[DetectionScheduler] = None


def get_detection_scheduler() -> DetectionScheduler:
    """Get the global detection scheduler instance."""
    global _scheduler_instance
    if _scheduler_instance is None:
        _scheduler_instance = DetectionScheduler()
    return _scheduler_instance
