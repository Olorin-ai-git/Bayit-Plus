"""Video selfie validation helpers."""

import asyncio
import logging
import tempfile
from pathlib import Path

from app.core.config import settings

logger = logging.getLogger(__name__)


async def validate_video_duration(video_bytes: bytes) -> None:
    """Validate video duration using ffprobe."""
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name
    try:
        proc = await asyncio.create_subprocess_exec(
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            tmp_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()
        duration = float(stdout.decode().strip())
        max_dur = settings.VIDEO_SELFIE_MAX_DURATION_SECONDS
        if duration > max_dur:
            raise ValueError(
                f"Video duration {duration:.1f}s exceeds maximum {max_dur:.0f}s"
            )
    except (ValueError, TypeError) as exc:
        if "exceeds" in str(exc):
            raise
        logger.warning("Could not verify video duration", extra={"error": str(exc)})
    finally:
        Path(tmp_path).unlink(missing_ok=True)


async def extract_first_frame(video_bytes: bytes) -> bytes:
    """Extract first frame from video as PNG bytes."""
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp_video:
        tmp_video.write(video_bytes)
        tmp_video_path = tmp_video.name
    tmp_frame_path = tmp_video_path.replace(".mp4", "_frame.png")
    try:
        proc = await asyncio.create_subprocess_exec(
            "ffmpeg", "-i", tmp_video_path,
            "-vframes", "1", "-f", "image2",
            tmp_frame_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        await proc.communicate()
        return Path(tmp_frame_path).read_bytes()
    finally:
        Path(tmp_video_path).unlink(missing_ok=True)
        Path(tmp_frame_path).unlink(missing_ok=True)


async def validate_face(video_bytes: bytes) -> None:
    """Extract first frame and validate face detection."""
    from app.services.star_story.avatar_generation_service import avatar_generation_service
    first_frame = await extract_first_frame(video_bytes)
    face_detected = await avatar_generation_service.detect_face(first_frame)
    if not face_detected:
        raise ValueError(
            "No face detected in video selfie. "
            "Please ensure your face is clearly visible."
        )
