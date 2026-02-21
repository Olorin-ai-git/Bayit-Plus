"""
yt-dlp downloader for separate HD video and audio streams.

Downloads the best video (up to 1080p) and best audio streams
concurrently using asyncio.gather with run_in_executor.
"""

import asyncio
import logging
import os
from dataclasses import dataclass
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

VIDEO_FORMAT = "bestvideo[height<=1080][ext=mp4]/bestvideo[height<=1080]/bestvideo"
AUDIO_FORMAT = "bestaudio[ext=m4a]/bestaudio"


@dataclass
class DownloadResult:
    video_path: str
    audio_path: str
    video_id: str


def _download_stream_sync(
    watch_url: str,
    output_template: str,
    format_str: str,
    timeout: int,
) -> Optional[str]:
    """Download a single stream (video or audio) synchronously."""
    from yt_dlp import YoutubeDL

    ydl_opts = {
        "format": format_str,
        "outtmpl": output_template,
        "quiet": True,
        "no_warnings": True,
        "socket_timeout": timeout,
    }

    with YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(watch_url, download=True)
        if info:
            return ydl.prepare_filename(info)
    return None


async def download_separate_streams(
    video_id: str,
    work_dir: str,
) -> Optional[DownloadResult]:
    """
    Download separate video and audio streams for a YouTube video.

    Args:
        video_id: YouTube video ID.
        work_dir: Temp directory for downloads.

    Returns:
        DownloadResult with paths to downloaded files, or None on failure.
    """
    watch_url = f"https://www.youtube.com/watch?v={video_id}"
    timeout = settings.TRAILER_EXTRACTION_YTDLP_TIMEOUT

    os.makedirs(work_dir, exist_ok=True)

    video_template = os.path.join(work_dir, f"{video_id}_video.%(ext)s")
    audio_template = os.path.join(work_dir, f"{video_id}_audio.%(ext)s")

    loop = asyncio.get_running_loop()

    logger.info(
        "Downloading separate streams",
        extra={"video_id": video_id},
    )

    try:
        video_path, audio_path = await asyncio.gather(
            loop.run_in_executor(
                None,
                _download_stream_sync,
                watch_url,
                video_template,
                VIDEO_FORMAT,
                timeout,
            ),
            loop.run_in_executor(
                None,
                _download_stream_sync,
                watch_url,
                audio_template,
                AUDIO_FORMAT,
                timeout,
            ),
        )
    except Exception:
        logger.exception(
            "yt-dlp download failed",
            extra={"video_id": video_id},
        )
        return None

    if not video_path or not audio_path:
        logger.warning(
            "Missing stream after download",
            extra={
                "video_id": video_id,
                "has_video": video_path is not None,
                "has_audio": audio_path is not None,
            },
        )
        return None

    if not os.path.isfile(video_path) or not os.path.isfile(audio_path):
        logger.warning(
            "Downloaded files missing on disk",
            extra={"video_id": video_id},
        )
        return None

    logger.info(
        "Streams downloaded",
        extra={
            "video_id": video_id,
            "video_size": os.path.getsize(video_path),
            "audio_size": os.path.getsize(audio_path),
        },
    )

    return DownloadResult(
        video_path=video_path,
        audio_path=audio_path,
        video_id=video_id,
    )
