"""
Live Recording Service
Manages live stream recording sessions.
"""

import logging
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

try:
    import psutil
except ImportError:
    psutil = None

from app.core.config import settings
from app.models.content import LiveChannel
from app.models.recording import Recording, RecordingSession
from app.models.user import User
from app.services.ffmpeg_service import ffmpeg_service

logger = logging.getLogger(__name__)


class LiveRecordingService:
    """Manages live stream recording sessions."""

    def __init__(self):
        self.temp_dir = Path(settings.RECORDING_TEMP_DIR)
        self.temp_dir.mkdir(exist_ok=True, parents=True)
        self._subtitle_captures = {}
        self._dubbing_captures = {}

    async def start_recording(
        self,
        user_id: str,
        channel_id: str,
        stream_url: str,
        subtitle_enabled: bool = False,
        subtitle_target_language: Optional[str] = None,
        dubbing_enabled: bool = False,
        dubbing_target_language: Optional[str] = None,
        trigger_type: str = "manual",
        schedule_id: Optional[str] = None,
        epg_entry_id: Optional[str] = None,
        series_rule_id: Optional[str] = None,
        program_title: Optional[str] = None,
    ) -> RecordingSession:
        """Start a new recording session."""
        channel = await LiveChannel.get(channel_id)
        if not channel:
            raise Exception(f"Channel {channel_id} not found")

        user = await User.get(user_id)
        if not user:
            raise Exception(f"User {user_id} not found")

        existing_session = await RecordingSession.find_one(
            {"user_id": user_id, "status": "recording"}
)
        if existing_session:
            raise Exception(
                f"Recording already in progress on {existing_session.channel_name}"
            )

        if not user.recording_quota.has_storage_available():
            raise Exception("Storage quota exceeded. Delete old recordings to free up space.")

        recording_id = str(uuid.uuid4())
        output_path = str(self.temp_dir / f"{recording_id}.mp4")

        session = RecordingSession(
            user_id=user_id,
            channel_id=channel_id,
            channel_name=channel.name,
            recording_id=recording_id,
            stream_url=stream_url,
            subtitle_enabled=subtitle_enabled,
            subtitle_target_language=subtitle_target_language,
            dubbing_enabled=dubbing_enabled,
            dubbing_target_language=dubbing_target_language,
            trigger_type=trigger_type,
            schedule_id=schedule_id,
            epg_entry_id=epg_entry_id,
            series_rule_id=series_rule_id,
            output_path=output_path,
        )

        try:
            ffmpeg_process = await ffmpeg_service.start_recording_stream(
                stream_url=stream_url,
                output_path=session.output_path,
                recording_id=session.recording_id,
                max_duration_seconds=user.recording_quota.max_recording_duration_seconds,
            )
            session.ffmpeg_pid = ffmpeg_process.pid
            session.status = "recording"
            await session.insert()
            from app.services.recording_capture_starter import start_captures

            await start_captures(session, channel, self._subtitle_captures, self._dubbing_captures)
            return session

        except Exception as e:
            logger.error(f"Failed to start FFmpeg recording: {str(e)}")
            session.status = "failed"
            session.error_message = str(e)
            await session.insert()
            raise

    async def stop_recording(self, session_id: str, user_id: str) -> Recording:
        """Stop recording, upload files, and create Recording document."""
        session = await RecordingSession.find_one({"recording_id": session_id})
        if not session:
            raise Exception(f"Recording session {session_id} not found")
        if session.user_id != user_id:
            raise Exception("Not authorized to stop this recording")
        if session.status != "recording":
            raise Exception(f"Recording is not active (status: {session.status})")

        try:
            session.status = "processing"
            session.actual_end_at = datetime.utcnow()
            await session.save()

            await self._stop_ffmpeg(session)
            await self._collect_video_info(session)

            from app.services.recording_stop_handler import process_stop

            sub_capture = self._subtitle_captures.pop(session.recording_id, None)
            dub_capture = self._dubbing_captures.pop(session.recording_id, None)

            return await process_stop(session, user_id, sub_capture, dub_capture)

        except Exception as e:
            logger.error(f"Failed to stop recording: {str(e)}")
            if session:
                session.status = "failed"
                session.error_message = str(e)
                await session.save()
            raise

    async def _stop_ffmpeg(self, session: RecordingSession) -> None:
        """Stop the FFmpeg process for a session."""
        if not session.ffmpeg_pid:
            return
        try:
            if psutil is None:
                raise Exception("psutil library not installed")
            process = psutil.Process(session.ffmpeg_pid)
            await ffmpeg_service.stop_recording(process)
        except Exception as e:
            if psutil and isinstance(e, psutil.NoSuchProcess):
                logger.warning(f"FFmpeg process {session.ffmpeg_pid} not found")
            else:
                logger.error(f"Error stopping FFmpeg: {str(e)}")

    async def _collect_video_info(self, session: RecordingSession) -> None:
        """Collect video duration and file size info."""
        if not os.path.exists(session.output_path):
            raise Exception("Recording file not found")
        video_info = await ffmpeg_service.get_video_info(session.output_path)
        session.duration_seconds = int(video_info["duration"])
        session.file_size_bytes = video_info["size"]
        await session.save()

    async def get_active_session(
        self, user_id: str, channel_id: Optional[str] = None
    ) -> Optional[RecordingSession]:
        """Get active recording session for user."""
        query = RecordingSession.find(
            {"user_id": user_id, "status": "recording"}
)
        if channel_id:
            query = query.find({"channel_id": channel_id})
        return await query.first_or_none()

    async def handle_recording_error(self, session_id: str, error: Exception):
        """Handle recording failure."""
        try:
            session = await RecordingSession.get(session_id)
            if session:
                session.status = "failed"
                session.error_message = str(error)
                session.actual_end_at = datetime.utcnow()
                await session.save()
        except Exception as e:
            logger.error(f"Failed to handle recording error: {str(e)}")


# Singleton instance
live_recording_service = LiveRecordingService()
