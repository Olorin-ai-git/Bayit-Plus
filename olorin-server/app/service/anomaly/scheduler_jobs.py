"""
Scheduler Job Management

This module provides job registration and execution functions for the detection scheduler.
"""

from datetime import datetime, timedelta
from typing import Optional

from app.models.anomaly import Detector
from app.persistence.database import get_db
from app.service.anomaly.detection_job import DetectionJob
from app.service.logging import get_bridge_logger

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

logger = get_bridge_logger(__name__)


async def register_detector_jobs(
    scheduler: AsyncIOScheduler, default_interval_minutes: int
) -> None:
    """
    Register scheduled jobs for all enabled detectors.

    Args:
        scheduler: APScheduler instance
        default_interval_minutes: Default interval in minutes
    """
    db = next(get_db())
    try:
        detectors = db.query(Detector).filter(Detector.enabled == True).all()

        if not detectors:
            logger.info("No enabled detectors found for scheduling")
            return

        for detector in detectors:
            await register_detector_job(scheduler, detector, default_interval_minutes)

        logger.info(f"Registered {len(detectors)} detector jobs")
    finally:
        db.close()


async def register_detector_job(
    scheduler: AsyncIOScheduler, detector: Detector, default_interval_minutes: int
) -> None:
    """
    Register a scheduled job for a detector.

    Args:
        scheduler: APScheduler instance
        detector: Detector configuration
        default_interval_minutes: Default interval in minutes
    """
    try:
        # Get schedule configuration from detector params or use default
        schedule_config = detector.params.get("schedule", {})
        interval_minutes = schedule_config.get(
            "interval_minutes", default_interval_minutes
        )

        # Use cron expression if provided, otherwise use interval
        cron_expression = schedule_config.get("cron")

        if cron_expression:
            # Parse cron expression (e.g., "*/15 * * * *" for every 15 minutes)
            trigger = CronTrigger.from_crontab(cron_expression)
        else:
            # Use interval trigger
            trigger = IntervalTrigger(minutes=interval_minutes)

        # Create job function
        job_id = f"detector_{detector.id}"

        scheduler.add_job(
            func=run_detection_job,
            trigger=trigger,
            id=job_id,
            args=[str(detector.id)],
            replace_existing=True,
            max_instances=1,
            misfire_grace_time=300,
        )

        logger.debug(
            f"Registered scheduled job for detector {detector.id} "
            f"({detector.name}): {trigger}"
        )
    except Exception as e:
        logger.error(
            f"Failed to register job for detector {detector.id}: {e}", exc_info=True
        )


async def run_detection_job(detector_id: str):
    """
    Execute a scheduled detection run for a detector.

    This is the function that gets called by the scheduler.

    Args:
        detector_id: Detector UUID as string
    """
    logger.info(f"Starting scheduled detection run for detector {detector_id}")

    db = next(get_db())
    try:
        import uuid

        detector_uuid = uuid.UUID(detector_id)
        detector = db.query(Detector).filter(Detector.id == detector_uuid).first()

        if not detector:
            logger.warning(f"Detector {detector_id} not found, skipping scheduled run")
            return

        if not detector.enabled:
            logger.info(f"Detector {detector_id} is disabled, skipping scheduled run")
            return

        # Calculate time window (default: last 1 hour)
        window_to = datetime.now()
        window_from = window_to - timedelta(hours=1)

        # Override with detector-specific window if configured
        schedule_config = detector.params.get("schedule", {})
        window_hours = schedule_config.get("window_hours", 1)
        window_from = window_to - timedelta(hours=window_hours)

        # Run detection (synchronous call)
        detection_job = DetectionJob()
        detection_run = detection_job.run_detection(
            detector=detector, window_from=window_from, window_to=window_to
        )

        logger.info(
            f"Completed scheduled detection run {detection_run.id} "
            f"for detector {detector_id}"
        )
    except Exception as e:
        logger.error(
            f"Error in scheduled detection run for detector {detector_id}: {e}",
            exc_info=True,
        )
    finally:
        db.close()
