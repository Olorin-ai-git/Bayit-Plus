"""
Recording Stop Handler
Handles the post-FFmpeg-stop processing: upload, captures finalization, quota update.
"""

import logging
from datetime import datetime

from app.models.recording import Recording, RecordingSession
from app.models.user import User
from app.services.recording_upload_handler import (
    finalize_dubbing_capture,
    finalize_subtitle_capture,
    upload_video_file,
)

logger = logging.getLogger(__name__)


async def process_stop(
    session: RecordingSession,
    user_id: str,
    subtitle_capture,
    dubbing_capture,
) -> Recording:
    """
    Process a stopped recording: upload files, finalize captures, create Recording.

    Args:
        session: The recording session being stopped
        user_id: Owner user ID
        subtitle_capture: SubtitleCaptureService instance or None
        dubbing_capture: DubbingCaptureService instance or None

    Returns:
        The created Recording document
    """
    video_url, thumbnail_url = await upload_video_file(
        session.output_path, session.recording_id, user_id
    )

    recording = Recording.from_session(session, video_url, session.file_size_bytes)
    recording.thumbnail = thumbnail_url

    if hasattr(session, "epg_entry_id") and session.epg_entry_id:
        recording.epg_entry_id = session.epg_entry_id
    if hasattr(session, "series_rule_id") and session.series_rule_id:
        recording.series_rule_id = session.series_rule_id

    if subtitle_capture:
        subtitle_url = await finalize_subtitle_capture(
            subtitle_capture, session.recording_id, user_id
        )
        if subtitle_url:
            recording.subtitle_url = subtitle_url

    if dubbing_capture:
        dubbed_url = await finalize_dubbing_capture(
            dubbing_capture, session.recording_id, user_id
        )
        if dubbed_url:
            recording.dubbed_audio_url = dubbed_url
            if hasattr(session, "dubbing_target_language"):
                recording.dubbed_audio_language = session.dubbing_target_language

    await recording.insert()

    user = await User.get(user_id)
    user.recording_quota.used_storage_bytes += session.file_size_bytes
    await user.save()

    session.status = "completed"
    await session.save()

    return recording
