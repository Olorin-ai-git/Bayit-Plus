"""
Recording Capture Starter
Initializes subtitle and dubbing captures for recording sessions.
"""

import logging

from app.models.content import LiveChannel
from app.models.recording import RecordingSession

logger = logging.getLogger(__name__)


async def start_captures(
    session: RecordingSession,
    channel: LiveChannel,
    subtitle_captures: dict,
    dubbing_captures: dict,
) -> None:
    """Start subtitle and dubbing captures if enabled on the session."""
    source_lang = getattr(channel, "language", "he")

    if session.subtitle_enabled and session.subtitle_target_language:
        try:
            from app.services.subtitle_capture_service import SubtitleCaptureService

            capture = SubtitleCaptureService()
            await capture.start_capture(
                recording_id=session.recording_id,
                channel_id=session.channel_id,
                source_lang=source_lang,
                target_lang=session.subtitle_target_language,
            )
            subtitle_captures[session.recording_id] = capture
        except Exception as e:
            logger.error(
                "Failed to start subtitle capture",
                extra={"recording_id": session.recording_id, "error": str(e)},
            )

    if session.dubbing_enabled and session.dubbing_target_language:
        try:
            from app.services.dubbing_capture_service import DubbingCaptureService

            capture = DubbingCaptureService()
            await capture.start_capture(
                recording_id=session.recording_id,
                channel_id=session.channel_id,
                target_language=session.dubbing_target_language,
                source_language=source_lang,
            )
            dubbing_captures[session.recording_id] = capture
        except Exception as e:
            logger.error(
                "Failed to start dubbing capture",
                extra={"recording_id": session.recording_id, "error": str(e)},
            )
