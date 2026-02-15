"""
Scheduler Execution Handlers
Handles the actual start/stop of scheduled recordings (called by APScheduler).
"""

import logging
from datetime import datetime

from app.models.content import LiveChannel
from app.models.recording import RecordingSchedule

logger = logging.getLogger(__name__)


async def execute_scheduled_recording(schedule_id: str) -> None:
    """Execute a scheduled recording (called by APScheduler at start time)."""
    try:
        schedule = await RecordingSchedule.get(schedule_id)
        if not schedule or schedule.status != "pending":
            return

        channel = await LiveChannel.get(schedule.channel_id)
        if not channel or not channel.is_active:
            schedule.status = "failed"
            schedule.updated_at = datetime.utcnow()
            await schedule.save()
            return

        schedule.status = "recording"
        schedule.updated_at = datetime.utcnow()
        await schedule.save()

        from app.services.live_recording_service import live_recording_service

        session = await live_recording_service.start_recording(
            user_id=schedule.user_id,
            channel_id=schedule.channel_id,
            stream_url=channel.stream_url,
            subtitle_enabled=schedule.subtitle_enabled,
            subtitle_target_language=schedule.subtitle_target_language,
            dubbing_enabled=schedule.dubbing_enabled,
            dubbing_target_language=schedule.dubbing_target_language,
            trigger_type="scheduled",
            schedule_id=str(schedule.id),
            epg_entry_id=schedule.epg_entry_id,
            series_rule_id=schedule.series_rule_id,
            program_title=schedule.program_title,
        )

        schedule.recording_id = session.recording_id
        schedule.updated_at = datetime.utcnow()
        await schedule.save()

    except Exception as e:
        logger.error(
            "Failed to execute scheduled recording",
            extra={"schedule_id": schedule_id, "error": str(e)},
        )
        try:
            schedule = await RecordingSchedule.get(schedule_id)
            if schedule:
                schedule.status = "failed"
                schedule.updated_at = datetime.utcnow()
                await schedule.save()
        except Exception as save_err:
            logger.error(
                "Failed to update schedule status",
                extra={"schedule_id": schedule_id, "error": str(save_err)},
            )


async def stop_scheduled_recording(schedule_id: str) -> None:
    """Stop a scheduled recording at its end time (called by APScheduler)."""
    try:
        schedule = await RecordingSchedule.get(schedule_id)
        if not schedule or schedule.status != "recording" or not schedule.recording_id:
            return

        from app.models.recording import RecordingSession

        session = await RecordingSession.find_one(
            {"recording_id": schedule.recording_id, "status": "recording"}
)

        if not session:
            schedule.status = "completed"
            schedule.updated_at = datetime.utcnow()
            await schedule.save()
            return

        from app.services.live_recording_service import live_recording_service

        await live_recording_service.stop_recording(
            str(session.id), schedule.user_id
        )

        schedule.status = "completed"
        schedule.updated_at = datetime.utcnow()
        await schedule.save()

    except Exception as e:
        logger.error(
            "Failed to stop scheduled recording",
            extra={"schedule_id": schedule_id, "error": str(e)},
        )
