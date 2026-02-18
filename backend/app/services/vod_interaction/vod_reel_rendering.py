"""
VOD Reel Rendering

FFmpeg video-concat pipeline for VOD interaction reels. Downloads the
animated Creatify MP4 clips from signed URLs, concatenates them into a
single MP4 (video + audio), extracts a thumbnail, and uploads to GCS.

Separated from zeh_ani/highlight_rendering.py which processes audio-only
clips from Phonetic Mirror / V2V sessions.
"""

import asyncio
import os
import tempfile
from typing import List

from app.core.logging_config import get_logger

logger = get_logger(__name__)


async def render_vod_reel(
    video_urls: List[str],
    user_id: str,
    reel_id: str,
) -> tuple[str, str]:
    """Download Creatify animated clips, concatenate, upload to GCS.

    Returns (video_gcs_path, thumbnail_gcs_path).
    """
    from app.services.olorin.storage_service import storage_service

    with tempfile.TemporaryDirectory() as tmpdir:
        clip_paths = await _download_video_clips(tmpdir, video_urls)
        if not clip_paths:
            raise ValueError("No video clips available for VOD reel rendering")

        concat_list = _write_concat_list(tmpdir, clip_paths)
        output_video = os.path.join(tmpdir, "reel.mp4")
        output_thumb = os.path.join(tmpdir, "thumb.jpg")

        await _run_ffmpeg_video_concat(concat_list, output_video)
        await _run_ffmpeg_thumbnail(output_video, output_thumb)

        video_path = f"vod-interaction-reels/{user_id}/{reel_id}/reel.mp4"
        thumb_path = f"vod-interaction-reels/{user_id}/{reel_id}/thumb.jpg"

        await _upload(storage_service, output_video, video_path, "video/mp4")
        if os.path.exists(output_thumb):
            await _upload(storage_service, output_thumb, thumb_path, "image/jpeg")

    logger.info(
        "VOD reel rendered",
        extra={"user_id": user_id, "reel_id": reel_id, "clips": len(clip_paths)},
    )
    return video_path, thumb_path


async def _download_video_clips(tmpdir: str, video_urls: List[str]) -> List[str]:
    """Download each animated MP4 URL to disk. Skips unreachable URLs."""
    import httpx

    clip_paths: List[str] = []
    async with httpx.AsyncClient(timeout=30.0) as client:
        for i, url in enumerate(video_urls):
            try:
                resp = await client.get(url)
                resp.raise_for_status()
                path = os.path.join(tmpdir, f"clip_{i}.mp4")
                with open(path, "wb") as f:
                    f.write(resp.content)
                clip_paths.append(path)
            except Exception as exc:
                logger.warning(
                    "Failed to download video clip",
                    extra={"url": url[:80], "error": str(exc)},
                )
    return clip_paths


def _write_concat_list(tmpdir: str, clip_paths: List[str]) -> str:
    """Write FFmpeg concat demuxer list file."""
    concat_list = os.path.join(tmpdir, "concat.txt")
    with open(concat_list, "w") as f:
        for cp in clip_paths:
            f.write(f"file '{cp}'\n")
    return concat_list


async def _run_ffmpeg_video_concat(concat_list: str, output_video: str) -> None:
    """Concatenate MP4 video clips into a single file with re-encode."""
    process = await asyncio.create_subprocess_exec(
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0", "-i", concat_list,
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        output_video,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await process.communicate()
    if process.returncode != 0:
        raise RuntimeError(
            f"FFmpeg video concat failed: {stderr.decode()[:300]}"
        )


async def _run_ffmpeg_thumbnail(output_video: str, output_thumb: str) -> None:
    """Extract first frame of video as JPEG thumbnail."""
    process = await asyncio.create_subprocess_exec(
        "ffmpeg", "-y", "-i", output_video,
        "-vframes", "1", "-q:v", "2", output_thumb,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    await process.communicate()


async def _upload(
    storage_service,
    local_path: str,
    gcs_path: str,
    content_type: str,
) -> None:
    """Read file from disk and upload bytes to GCS."""
    with open(local_path, "rb") as f:
        data = f.read()
    await storage_service.upload_bytes(data, gcs_path, content_type=content_type)
