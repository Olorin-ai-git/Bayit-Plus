"""
Live Recording Service
Manages live stream recording sessions
"""

import logging
import os
from datetime import datetime
from typing import Optional
from pathlib import Path

from app.models.recording import RecordingSession, Recording
from app.models.content import LiveChannel
from app.models.user import User
from app.services.ffmpeg_service import ffmpeg_service
from app.core.config import settings

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
        trigger_type: str = 'manual',
        schedule_id: Optional[str] = None
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
                RecordingSession.status == "recording"
            )

            if existing_session:
                raise Exception(
                    f"Recording already in progress on {existing_session.channel_name}"
                )

            # Check recording quota
            if not user.recording_quota.has_storage_available():
                raise Exception("Storage quota exceeded. Delete old recordings to free up space.")

            # Create recording session
            session = RecordingSession(
                user_id=user_id,
                channel_id=channel_id,
                channel_name=channel.name,
                stream_url=stream_url,
                subtitle_enabled=subtitle_enabled,
                subtitle_target_language=subtitle_target_language,
                trigger_type=trigger_type,
                schedule_id=schedule_id,
                output_path=str(self.temp_dir / f"{session.recording_id}.mp4")
            )

            # Start FFmpeg recording
            try:
                ffmpeg_process = await ffmpeg_service.start_recording_stream(
                    stream_url=stream_url,
                    output_path=session.output_path,
                    recording_id=session.recording_id,
                    max_duration_seconds=user.recording_quota.max_recording_duration_seconds
                )

                session.ffmpeg_pid = ffmpeg_process.pid
                session.status = "recording"

                await session.insert()

                logger.info(
                    f"Recording started - User: {user_id}, Channel: {channel.name}, "
                    f"Recording ID: {session.recording_id}"
                )

                # TODO: If subtitle_enabled, start SubtitleCaptureService
                # if subtitle_enabled:
                #     await subtitle_capture_service.start_capture(
                #         session.recording_id, channel_id, subtitle_target_language
                #     )

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

    async def stop_recording(
        self,
        session_id: str,
        user_id: str
    ) -> Recording:
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
                    # Get process handle
                    import psutil
                    process = psutil.Process(session.ffmpeg_pid)
                    await ffmpeg_service.stop_recording(process)
                except psutil.NoSuchProcess:
                    logger.warning(f"FFmpeg process {session.ffmpeg_pid} not found")
                except Exception as e:
                    logger.error(f"Error stopping FFmpeg: {str(e)}")

            # TODO: If subtitles enabled, stop capture and generate WebVTT
            # if session.subtitle_enabled:
            #     await subtitle_capture_service.stop_capture(session.recording_id)
            #     subtitle_url = await subtitle_capture_service.generate_subtitle_file(
            #         session.recording_id
            #     )

            # Get video info
            if os.path.exists(session.output_path):
                video_info = await ffmpeg_service.get_video_info(session.output_path)
                session.duration_seconds = int(video_info['duration'])
                session.file_size_bytes = video_info['size']
                await session.save()
            else:
                raise Exception("Recording file not found")

            # TODO: Upload to GCS and extract thumbnail
            # video_url = await gcs_service.upload_recording(session)
            # thumbnail_url = await self.extract_and_upload_thumbnail(session)
            video_url = f"file://{session.output_path}"  # Temporary local path
            thumbnail_url = None

            # Create Recording document
            recording = Recording.from_session(session, video_url, session.file_size_bytes)
            # TODO: Set subtitle_url if available
            recording.thumbnail = thumbnail_url
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
        self,
        user_id: str,
        channel_id: Optional[str] = None
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
            RecordingSession.user_id == user_id,
            RecordingSession.status == "recording"
        )

        if channel_id:
            query = query.find(RecordingSession.channel_id == channel_id)

        return await query.first_or_none()

    async def update_session_progress(
        self,
        session_id: str,
        duration_seconds: int,
        file_size_bytes: int
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

    async def handle_recording_error(
        self,
        session_id: str,
        error: Exception
    ):
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
