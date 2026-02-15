"""
Scheduler Periodic Tasks
Startup initialization and recurring jobs for the recording scheduler.
"""

import logging
from datetime import datetime

from app.core.config import settings
from app.models.recording import RecordingSchedule

logger = logging.getLogger(__name__)


async def load_pending_schedules(scheduler_service) -> None:
    """Load all pending schedules and create APScheduler jobs."""
    try:
        now = datetime.utcnow()
        pending_schedules = await RecordingSchedule.find(
            {"status": "pending"}, 
            RecordingSchedule.end_time > now, 
        ).to_list(length=settings.RECORDING_QUERY_LIMIT)

        loaded_count = 0
        for schedule in pending_schedules:
            try:
                await scheduler_service.schedule_recording(schedule)
                loaded_count += 1
            except Exception as e:
                logger.warning(
                    "Failed to load pending schedule",
                    extra={"schedule_id": str(schedule.id), "error": str(e)},
                )

        expired = await RecordingSchedule.find(
            {"status": "pending"}, 
            RecordingSchedule.end_time <= now, 
        ).to_list(length=settings.RECORDING_QUERY_LIMIT)

        for schedule in expired:
            schedule.status = "failed"
            schedule.updated_at = now
            await schedule.save()

        if expired:
            logger.info(
                "Marked expired schedules as failed",
                extra={"count": len(expired)},
            )

        logger.info(
            "Loaded pending recording schedules",
            extra={"loaded": loaded_count, "expired": len(expired)},
        )

    except Exception as e:
        logger.error(
            "Failed to load pending schedules",
            extra={"error": str(e)},
        )


async def detect_dead_sessions() -> None:
    """
    Detect recording sessions with dead FFmpeg processes on startup.
    Marks sessions as failed if their FFmpeg process is no longer running.
    """
    try:
        from app.models.recording import RecordingSession

        active_sessions = await RecordingSession.find(
            {"status": "recording"}
).to_list(length=settings.RECORDING_QUERY_LIMIT)

        if not active_sessions:
            return

        try:
            import psutil
        except ImportError:
            logger.warning(
                "psutil not available - cannot detect dead recording sessions"
            )
            return

        dead_count = 0
        for session in active_sessions:
            if not session.ffmpeg_pid:
                continue

            try:
                process = psutil.Process(session.ffmpeg_pid)
                if not process.is_running():
                    raise psutil.NoSuchProcess(session.ffmpeg_pid)
            except psutil.NoSuchProcess:
                session.status = "failed"
                session.error_message = (
                    "FFmpeg process not found on startup recovery"
                )
                session.actual_end_at = datetime.utcnow()
                await session.save()
                dead_count += 1

                logger.warning(
                    "Marked dead recording session as failed",
                    extra={
                        "session_id": str(session.id),
                        "recording_id": session.recording_id,
                        "ffmpeg_pid": session.ffmpeg_pid,
                    },
                )

        if dead_count > 0:
            logger.info(
                "Dead session detection complete",
                extra={"dead_sessions": dead_count},
            )

    except Exception as e:
        logger.error(
            "Failed to detect dead sessions",
            extra={"error": str(e)},
        )


async def periodic_series_rule_scan() -> None:
    """
    Periodically re-scan all active series rules against EPG data.
    Ensures new EPG entries are matched outside normal ingestion hook.
    """
    try:
        from app.models.series_recording_rule import SeriesRecordingRule
        from app.services.series_epg_matcher import scan_upcoming_epg

        active_rules = await SeriesRecordingRule.find(
            {"is_active": True},   # noqa: E712
        ).to_list(length=settings.RECORDING_QUERY_LIMIT)

        if not active_rules:
            return

        total_created = 0
        for rule in active_rules:
            try:
                created = await scan_upcoming_epg(rule)
                total_created += created
            except Exception as e:
                logger.warning(
                    "Failed to scan rule during periodic scan",
                    extra={"rule_id": str(rule.id), "error": str(e)},
                )

        if total_created > 0:
            logger.info(
                "Periodic series rule scan complete",
                extra={
                    "rules_scanned": len(active_rules),
                    "schedules_created": total_created,
                },
            )

    except Exception as e:
        logger.error(
            "Failed periodic series rule scan",
            extra={"error": str(e)},
        )


async def periodic_recovery() -> None:
    """
    Run the recording recovery service periodically.
    Recovers stuck sessions, cleans orphaned files, deletes expired recordings.
    """
    try:
        from app.services.recording_recovery_service import (
            recording_recovery_service,
        )

        await recording_recovery_service.run_recovery_cycle()

    except Exception as e:
        logger.error(
            "Failed periodic recovery cycle",
            extra={"error": str(e)},
        )
