"""
Catch-Up TV Service
Enables time-shifted playback of past programs using recorded streams.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from beanie.operators import And

from app.core.config import settings
from app.models.content import EPGEntry, LiveChannel
from app.models.recording import Recording, RecordingSession

logger = logging.getLogger(__name__)


class CatchUpService:
    """Service for catch-up TV (time-shifted playback)"""

    def __init__(self):
        self.retention_days = getattr(settings, "CATCHUP_RETENTION_DAYS", 7)
        self.max_duration_hours = getattr(settings, "CATCHUP_MAX_DURATION_HOURS", 4)

    async def get_catchup_stream(
        self, program_id: str, user_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get catch-up stream URL for a past program.

        Args:
            program_id: EPG program ID
            user_id: User ID requesting catch-up

        Returns:
            Dict with stream URL, seek position, and metadata, or None if not available
        """
        try:
            # Get EPG program
            program = await EPGEntry.get(program_id)
            if not program:
                logger.error(f"Program {program_id} not found")
                return None

            # Verify program is in the past
            now = datetime.now(timezone.utc)
            if program.start_time > now:
                logger.error(f"Program {program_id} has not aired yet")
                return None

            # Check retention period
            cutoff_date = now - timedelta(days=self.retention_days)
            if program.start_time < cutoff_date:
                logger.error(f"Program {program_id} is outside retention period")
                return None

            # Find recording that covers this program
            recording = await self._find_covering_recording(program, user_id)
            if not recording:
                logger.error(f"No recording found for program {program_id}")
                return None

            # Calculate seek position
            seek_seconds = await self._calculate_seek_position(program, recording)

            # Build response
            return {
                "success": True,
                "program_id": program_id,
                "program_title": program.title,
                "program_start": program.start_time.isoformat(),
                "program_end": program.end_time.isoformat(),
                "recording_id": recording.id,
                "stream_url": recording.video_url,
                "seek_seconds": seek_seconds,
                "duration_seconds": (
                    program.end_time - program.start_time
                ).total_seconds(),
                "subtitle_url": (
                    recording.subtitle_url if recording.subtitle_enabled else None
                ),
                "thumbnail": program.thumbnail or recording.thumbnail,
                "channel_name": recording.channel_name,
                "available_until": (
                    program.start_time + timedelta(days=self.retention_days)
                ).isoformat(),
            }

        except Exception as e:
            logger.error(f"Failed to get catch-up stream: {e}", exc_info=True)
            return None

    async def _find_covering_recording(
        self, program: EPGEntry, user_id: str
    ) -> Optional[Recording]:
        """
        Find a recording that covers the program's time range.

        Strategy:
        1. Find recordings for the same channel
        2. Find recordings that overlap with program time
        3. Prioritize user's own recordings
        4. Fall back to system-wide DVR recordings (if implemented)
        """
        # Look for recordings that overlap with the program
        # A recording covers a program if:
        # recording.started_at <= program.start_time AND recording.ended_at >= program.end_time

        recordings = await Recording.find(
            And(
                {"channel_id": program.channel_id},
                {"started_at": {"$lte": program.start_time}},
                {"ended_at": {"$gte": program.end_time}},
                {"status": "completed"},
            )
        ).to_list()

        if not recordings:
            logger.info(f"No recordings found covering program {program.id}")
            return None

        # Prioritize user's own recordings
        user_recordings = [r for r in recordings if r.user_id == user_id]
        if user_recordings:
            # Return the most recent user recording
            return max(user_recordings, key=lambda r: r.recorded_at)

        # Fall back to any available recording (system DVR)
        # In production, you might want to check if user has access rights
        return recordings[0]

    async def _calculate_seek_position(
        self, program: EPGEntry, recording: Recording
    ) -> int:
        """
        Calculate seek position in seconds from recording start.

        The seek position is the time difference between when the recording started
        and when the program started.
        """
        # Calculate time difference in seconds
        seek_seconds = (program.start_time - recording.started_at).total_seconds()

        # Ensure seek is non-negative
        seek_seconds = max(0, seek_seconds)

        return int(seek_seconds)

    async def check_availability(self, program_id: str) -> Dict[str, Any]:
        """
        Check if catch-up is available for a program.

        Returns:
            Dict with availability status and reason
        """
        try:
            # Get EPG program
            program = await EPGEntry.get(program_id)
            if not program:
                return {"available": False, "reason": "program_not_found"}

            # Check if program is past
            now = datetime.now(timezone.utc)
            if program.start_time > now:
                return {
                    "available": False,
                    "reason": "not_aired_yet",
                    "starts_at": program.start_time.isoformat(),
                }

            # Check retention period
            cutoff_date = now - timedelta(days=self.retention_days)
            if program.start_time < cutoff_date:
                return {
                    "available": False,
                    "reason": "retention_expired",
                    "expired_at": cutoff_date.isoformat(),
                }

            # Check if recording exists
            recordings = await Recording.find(
                And(
                    {"channel_id": program.channel_id},
                    {"started_at": {"$lte": program.start_time}},
                    {"ended_at": {"$gte": program.end_time}},
                    {"status": "completed"},
                )
            ).to_list()

            if not recordings:
                return {
                    "available": False,
                    "reason": "no_recording",
                    "message": "This program was not recorded",
                }

            return {
                "available": True,
                "program_id": program_id,
                "program_title": program.title,
                "available_until": (
                    program.start_time + timedelta(days=self.retention_days)
                ).isoformat(),
            }

        except Exception as e:
            logger.error(f"Failed to check catch-up availability: {e}", exc_info=True)
            return {"available": False, "reason": "error", "message": str(e)}

    async def get_available_catchup_programs(
        self, channel_id: Optional[str] = None, limit: int = 50
    ) -> list[Dict[str, Any]]:
        """
        Get list of programs available for catch-up.

        Args:
            channel_id: Optional filter by channel
            limit: Maximum number of programs to return

        Returns:
            List of programs with catch-up availability
        """
        try:
            # Get EPG entries within retention period
            now = datetime.now(timezone.utc)
            cutoff_date = now - timedelta(days=self.retention_days)

            query_conditions = [
                {"start_time": {"$gte": cutoff_date, "$lt": now}},
                {"end_time": {"$lt": now}},
            ]

            if channel_id:
                query_conditions.append({"channel_id": channel_id})

            programs = (
                await EPGEntry.find(And(*query_conditions))
                .sort("-start_time")
                .limit(limit)
                .to_list()
            )

            # Filter programs that have recordings
            available_programs = []
            for program in programs:
                recordings = await Recording.find(
                    And(
                        {"channel_id": program.channel_id},
                        {"started_at": {"$lte": program.start_time}},
                        {"ended_at": {"$gte": program.end_time}},
                        {"status": "completed"},
                    )
                ).to_list()

                if recordings:
                    available_programs.append(
                        {
                            "id": str(program.id),
                            "title": program.title,
                            "description": program.description,
                            "channel_id": program.channel_id,
                            "start_time": program.start_time.isoformat(),
                            "end_time": program.end_time.isoformat(),
                            "thumbnail": program.thumbnail,
                            "category": program.category,
                            "available_until": (
                                program.start_time + timedelta(days=self.retention_days)
                            ).isoformat(),
                        }
                    )

            return available_programs

        except Exception as e:
            logger.error(
                f"Failed to get available catch-up programs: {e}", exc_info=True
            )
            return []


# Singleton instance
catchup_service = CatchUpService()
