"""
Live Recording Service
Manages live stream recording sessions
"""

import logging
import os
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
    """Manages live stream recording sessions"""

    def __init__(self):
        self.temp_dir = Path("/tmp/recordings")
        self.temp_dir.mkdir(exist_ok=True, parents=True)

    async def start_recording(
        self,
        user_id: str,
        channel_id: str,
        stream_url: str,
        subtitle_enabled: bool = False,
        subtitle_target_language: Optional[str] = None,
        trigger_type: str = "manual",
        schedule_id: Optional[str] = None,
    ) -> RecordingSession:
        """
        Start a new recording session.

        Args:
            user_id: User initiating the recording
            channel_id: Channel being recorded
            stream_url: HLS stream URL
            subtitle_enabled: Whether to capture subtitles
            subtitle_target_language: Target language for subtitles
            trigger_type: 'manual' or 'scheduled'
            schedule_id: Schedule ID if triggered by schedule

        Returns:
            Created RecordingSession

        Raises:
            Exception: If recording cannot be started
        """
        try:
            # Get channel info
            channel = await LiveChannel.get(channel_id)
            if not channel:
                raise Exception(f"Channel {channel_id} not found")

            # Check user quota (implemented in RecordingQuotaService)
            user = await User.get(user_id)
            if not user:
                raise Exception(f"User {user_id} not found")

            # Check if user already has an active recording
            existing_session = await RecordingSession.find_one(
                RecordingSession.user_id == user_id,
                RecordingSession.status == "recording",
            )

            if existing_session:
                raise Exception(
                    f"Recording already in progress on {existing_session.channel_name}"
                )

            # Check recording quota
            if not user.recording_quota.has_storage_available():
                raise Exception(
                    "Storage quota exceeded. Delete old recordings to free up space."
                )

            # Generate recording ID first
            import uuid

            recording_id = str(uuid.uuid4())
            output_path = str(self.temp_dir / f"{recording_id}.mp4")

            # Create recording session
            session = RecordingSession(
                user_id=user_id,
                channel_id=channel_id,
                channel_name=channel.name,
                recording_id=recording_id,
                stream_url=stream_url,
                subtitle_enabled=subtitle_enabled,
                subtitle_target_language=subtitle_target_language,
                trigger_type=trigger_type,
                schedule_id=schedule_id,
                output_path=output_path,
            )

            # Start FFmpeg recording
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

                logger.info(
                    f"Recording started - User: {user_id}, Channel: {channel.name}, "
                    f"Recording ID: {session.recording_id}"
                )

                # Subtitle capture during recording is not yet implemented
                # Implementation requires: SubtitleCaptureService for real-time subtitle extraction
                if subtitle_enabled:
                    logger.warning(
                        f"Subtitle capture requested for recording {session.recording_id} but not yet implemented"
                    )

                return session

            except Exception as e:
                logger.error(f"Failed to start FFmpeg recording: {str(e)}")
                session.status = "failed"
                session.error_message = str(e)
                await session.insert()
                raise

        except Exception as e:
            logger.error(f"Failed to start recording: {str(e)}")
            raise

    async def stop_recording(self, session_id: str, user_id: str) -> Recording:
        """
        Stop recording and process.

        Args:
            session_id: Recording session ID
            user_id: User ID (for verification)

        Returns:
            Created Recording document

        Raises:
            Exception: If recording cannot be stopped
        """
        try:
            # Get session
            session = await RecordingSession.get(session_id)
            if not session:
                raise Exception(f"Recording session {session_id} not found")

            # Verify ownership
            if session.user_id != user_id:
                raise Exception("Not authorized to stop this recording")

            if session.status != "recording":
                raise Exception(f"Recording is not active (status: {session.status})")

            logger.info(f"Stopping recording {session.recording_id}")

            # Update session status
            session.status = "processing"
            session.actual_end_at = datetime.utcnow()
            await session.save()

            # Stop FFmpeg process
            if session.ffmpeg_pid:
                try:
                    if psutil is None:
                        logger.error(
                            "psutil not available - cannot stop FFmpeg process gracefully"
                        )
                        raise Exception("psutil library not installed")

                    # Get process handle
                    process = psutil.Process(session.ffmpeg_pid)
                    await ffmpeg_service.stop_recording(process)
                except Exception as e:
                    if psutil and isinstance(e, psutil.NoSuchProcess):
                        logger.warning(f"FFmpeg process {session.ffmpeg_pid} not found")
                    else:
                        logger.error(f"Error stopping FFmpeg: {str(e)}")

            # Subtitle capture during recording is not yet implemented
            # (warning logged at recording start if subtitles were requested)

            # Get video info
            if os.path.exists(session.output_path):
                video_info = await ffmpeg_service.get_video_info(session.output_path)
                session.duration_seconds = int(video_info["duration"])
                session.file_size_bytes = video_info["size"]
                await session.save()
            else:
                raise Exception("Recording file not found")

            # Upload recording to configured storage and extract thumbnail
            from app.core.config import settings

            if settings.STORAGE_TYPE == "local":
                video_url = (
                    f"/uploads/recordings/{os.path.basename(session.output_path)}"
                )
                thumbnail_url = None
            elif settings.STORAGE_TYPE in ("s3", "gcs"):
                raise NotImplementedError(
                    f"Recording upload for {settings.STORAGE_TYPE} storage is not yet implemented. "
                    f"Please configure STORAGE_TYPE=local in your environment or implement the upload logic."
                )
            else:
                raise ValueError(f"Invalid STORAGE_TYPE: {settings.STORAGE_TYPE}")

            # Create Recording document
            recording = Recording.from_session(
                session, video_url, session.file_size_bytes
            )
            recording.thumbnail = thumbnail_url

            # Subtitle capture is not yet implemented
            # Implementation requires: SubtitleCaptureService for real-time subtitle extraction
            # from live streams and WebVTT file generation
            if session.subtitle_enabled:
                logger.warning(
                    f"Subtitle capture requested for recording {session.recording_id} but not yet implemented"
                )

            await recording.insert()

            # Update user quota
            user = await User.get(user_id)
            user.recording_quota.used_storage_bytes += session.file_size_bytes
            await user.save()

            # Update session status
            session.status = "completed"
            await session.save()

            logger.info(
                f"Recording completed - ID: {recording.id}, "
                f"Duration: {recording.duration_seconds}s, "
                f"Size: {recording.file_size_bytes} bytes"
            )

            return recording

        except Exception as e:
            logger.error(f"Failed to stop recording: {str(e)}")

            # Update session with error
            if session:
                session.status = "failed"
                session.error_message = str(e)
                await session.save()

            raise

    async def get_active_session(
        self, user_id: str, channel_id: Optional[str] = None
    ) -> Optional[RecordingSession]:
        """
        Get active recording session for user.

        Args:
            user_id: User ID
            channel_id: Optional channel ID to filter by

        Returns:
            Active RecordingSession or None
        """
        query = RecordingSession.find(
            RecordingSession.user_id == user_id, RecordingSession.status == "recording"
        )

        if channel_id:
            query = query.find(RecordingSession.channel_id == channel_id)

        return await query.first_or_none()

    async def update_session_progress(
        self, session_id: str, duration_seconds: int, file_size_bytes: int
    ):
        """
        Update recording progress.

        Args:
            session_id: Session ID
            duration_seconds: Current duration
            file_size_bytes: Current file size
        """
        try:
            session = await RecordingSession.get(session_id)
            if session and session.status == "recording":
                session.duration_seconds = duration_seconds
                session.file_size_bytes = file_size_bytes
                session.updated_at = datetime.utcnow()
                await session.save()

        except Exception as e:
            logger.error(f"Failed to update session progress: {str(e)}")

    async def handle_recording_error(self, session_id: str, error: Exception):
        """
        Handle recording failure.

        Args:
            session_id: Session ID
            error: Exception that occurred
        """
        try:
            session = await RecordingSession.get(session_id)
            if session:
                session.status = "failed"
                session.error_message = str(error)
                session.actual_end_at = datetime.utcnow()
                await session.save()

                logger.error(
                    f"Recording failed - ID: {session.recording_id}, "
                    f"Error: {str(error)}"
                )

        except Exception as e:
            logger.error(f"Failed to handle recording error: {str(e)}")


# Singleton instance
live_recording_service = LiveRecordingService()
