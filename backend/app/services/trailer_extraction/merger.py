"""
ffmpeg merger for combining separate video and audio streams.

Merges video-only and audio-only files into a single MP4 using
stream copy for video and AAC encoding for universal compatibility.
"""

import asyncio
import logging
import os
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

AUDIO_BITRATE = "192k"


async def merge_streams(
    video_path: str,
    audio_path: str,
    output_path: str,
) -> Optional[str]:
    """
    Merge separate video and audio files into a single MP4.

    Uses ``-c:v copy`` (no re-encode) and ``-c:a aac`` for iOS/tvOS
    compatibility, with ``-movflags +faststart`` for streaming readiness.

    Args:
        video_path: Path to the video-only file.
        audio_path: Path to the audio-only file.
        output_path: Destination path for the merged MP4.

    Returns:
        Path to the merged MP4, or None on failure.
    """
    timeout = settings.TRAILER_EXTRACTION_FFMPEG_TIMEOUT

    output_dir = os.path.dirname(output_path)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    cmd = [
        "ffmpeg",
        "-i", video_path,
        "-i", audio_path,
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", AUDIO_BITRATE,
        "-movflags", "+faststart",
        "-y",
        output_path,
    ]

    logger.info(
        "Merging streams",
        extra={"output": output_path},
    )

    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    try:
        stdout, stderr = await asyncio.wait_for(
            process.communicate(),
            timeout=timeout,
        )
    except asyncio.TimeoutError:
        process.kill()
        logger.error(
            "ffmpeg merge timed out",
            extra={"timeout_seconds": timeout, "output": output_path},
        )
        return None

    if process.returncode != 0:
        logger.error(
            "ffmpeg merge failed",
            extra={
                "returncode": process.returncode,
                "stderr": stderr.decode(errors="replace")[:500],
            },
        )
        return None

    if not os.path.isfile(output_path):
        logger.error("Merged file not found on disk", extra={"output": output_path})
        return None

    file_size = os.path.getsize(output_path)
    logger.info(
        "Streams merged",
        extra={"output": output_path, "size_bytes": file_size},
    )

    return output_path
