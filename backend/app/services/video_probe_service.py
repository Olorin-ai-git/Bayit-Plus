"""Video duration probe and truncation via FFprobe/FFmpeg."""
import asyncio
import json
import uuid
from pathlib import Path

from app.core.logging_config import get_logger
from app.services.olorin.storage_service import storage_service

logger = get_logger(__name__)

_TEMP_DIR = Path("/tmp/olorin-demo-probe")


async def probe_duration(video_url: str) -> float:
    """Probe video duration in seconds via FFprobe (stream-probes, no full download)."""
    if not video_url.startswith(("http://", "https://")):
        raise ValueError("Only HTTP and HTTPS URLs are accepted")
    cmd = [
        "ffprobe", "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        video_url,
    ]
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()

    if proc.returncode != 0:
        logger.warning(
            "FFprobe failed",
            extra={"url": video_url, "stderr": stderr.decode()[:500]},
        )
        raise ValueError("Could not determine video duration")

    data = json.loads(stdout)
    duration_str = data.get("format", {}).get("duration")
    if not duration_str:
        raise ValueError("Could not determine video duration")
    return float(duration_str)


async def truncate_and_upload(
    video_url: str,
    max_seconds: int,
    user_id: str,
) -> str:
    """Truncate video to max_seconds, upload to GCS, return new URL."""
    _TEMP_DIR.mkdir(parents=True, exist_ok=True)
    file_id = uuid.uuid4().hex
    output_path = _TEMP_DIR / f"{file_id}.mp4"

    cmd = [
        "ffmpeg", "-y",
        "-i", video_url,
        "-t", str(max_seconds),
        "-c", "copy",
        "-movflags", "+faststart",
        str(output_path),
    ]
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()

    if proc.returncode != 0 or not output_path.exists():
        logger.error(
            "FFmpeg truncation failed",
            extra={"url": video_url, "stderr": stderr.decode()[:500]},
        )
        raise ValueError("Video truncation failed")

    try:
        data = output_path.read_bytes()
        remote_path = f"demo/{user_id}/{file_id}.mp4"
        url = await storage_service.upload_bytes(data, remote_path, "video/mp4")
        logger.info(
            "Truncated video uploaded",
            extra={
                "user_id": user_id,
                "max_seconds": max_seconds,
                "size_bytes": len(data),
            },
        )
        return url
    finally:
        output_path.unlink(missing_ok=True)
