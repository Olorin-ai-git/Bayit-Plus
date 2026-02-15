"""
Recording Scheduler Service
Manages APScheduler for executing scheduled recordings at their configured times.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.date import DateTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.core.config import settings
from app.models.recording import RecordingSchedule

logger = logging.getLogger(__name__)


class RecordingSchedulerService:
    """Manages scheduled recording execution via APScheduler."""

    def __init__(self):
        self._scheduler: Optional[AsyncIOScheduler] = None
        self._is_running: bool = False

    async def initialize(self) -> None:
        """Initialize the scheduler and load pending schedules."""
        if self._is_running:
            logger.warning("Recording scheduler already running")
            return

        self._scheduler = AsyncIOScheduler()
        self._scheduler.start()
        self._is_running = True

        from app.services.scheduler_periodic_tasks import (
            detect_dead_sessions,
            load_pending_schedules,
            periodic_recovery,
            periodic_series_rule_scan,
        )

        await load_pending_schedules(self)
        await detect_dead_sessions()

        scan_interval = settings.RECORDING_RULE_SCAN_INTERVAL_MINUTES
        self._scheduler.add_job(
            periodic_series_rule_scan,
            trigger=IntervalTrigger(minutes=scan_interval),
            id="series_rule_scan",
            replace_existing=True,
        )

        recovery_interval = settings.RECORDING_RECOVERY_INTERVAL_MINUTES
        self._scheduler.add_job(
            periodic_recovery,
            trigger=IntervalTrigger(minutes=recovery_interval),
            id="recording_recovery",
            replace_existing=True,
        )

        logger.info("Recording scheduler initialized")

    async def shutdown(self) -> None:
        """Shut down the scheduler gracefully."""
        if self._scheduler and self._is_running:
            self._scheduler.shutdown(wait=False)
            self._is_running = False
            logger.info("Recording scheduler shut down")

    async def schedule_recording(self, schedule: RecordingSchedule) -> RecordingSchedule:
        """Add a recording schedule to APScheduler."""
        if not self._scheduler or not self._is_running:
            raise RuntimeError("Recording scheduler not initialized")

        from app.services.scheduler_execution import (
            execute_scheduled_recording,
            stop_scheduled_recording,
        )

        buffer_seconds = settings.RECORDING_SCHEDULER_BUFFER_SECONDS
        start_at = schedule.start_time - timedelta(seconds=buffer_seconds)

        now = datetime.utcnow()
        if start_at <= now:
            start_at = now + timedelta(seconds=2)

        self._scheduler.add_job(
            execute_scheduled_recording,
            trigger=DateTrigger(run_date=start_at),
            id=f"rec_start_{schedule.id}",
            args=[str(schedule.id)],
            replace_existing=True,
            misfire_grace_time=int(buffer_seconds * 2),
        )

        self._scheduler.add_job(
            stop_scheduled_recording,
            trigger=DateTrigger(run_date=schedule.end_time),
            id=f"rec_stop_{schedule.id}",
            args=[str(schedule.id)],
            replace_existing=True,
            misfire_grace_time=settings.RECORDING_MISFIRE_GRACE_TIME_SECONDS,
        )

        logger.info(
            "Scheduled recording",
            extra={
                "schedule_id": str(schedule.id),
                "program_title": schedule.program_title,
                "start_at": start_at.isoformat(),
                "end_time": schedule.end_time.isoformat(),
            },
        )
        return schedule

    async def cancel_schedule(self, schedule_id: str) -> None:
        """Cancel a scheduled recording by removing APScheduler jobs."""
        if self._scheduler:
            for prefix in ("rec_start_", "rec_stop_"):
                try:
                    self._scheduler.remove_job(f"{prefix}{schedule_id}")
                except Exception:
                    pass

        schedule = await RecordingSchedule.get(schedule_id)
        if schedule and schedule.status == "pending":
            schedule.status = "cancelled"
            schedule.updated_at = datetime.utcnow()
            await schedule.save()

        logger.info(
            "Cancelled scheduled recording",
            extra={"schedule_id": schedule_id},
        )

    async def check_conflicts(
        self,
        user_id: str,
        start_time: datetime,
        end_time: datetime,
        channel_id: str,
        exclude_schedule_id: Optional[str] = None,
    ) -> list[RecordingSchedule]:
        """Check for scheduling conflicts with existing schedules."""
        query = RecordingSchedule.find(
            {"user_id": user_id}, 
            RecordingSchedule.status.is_in(["pending", "recording"]), 
            RecordingSchedule.start_time < end_time, 
            RecordingSchedule.end_time > start_time, 
        )
        conflicts = await query.to_list(length=settings.RECORDING_QUERY_LIMIT)

        if exclude_schedule_id:
            conflicts = [c for c in conflicts if str(c.id) != exclude_schedule_id]

        return conflicts


# Singleton instance
recording_scheduler_service = RecordingSchedulerService()
