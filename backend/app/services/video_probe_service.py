"""Video duration probe and truncation via YouTube Data API / FFprobe / yt-dlp."""
import asyncio
import json
import os
import re
import shutil
import tempfile
import uuid
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import httpx

from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.olorin.storage_service import storage_service

logger = get_logger(__name__)

_TEMP_DIR = Path("/tmp/olorin-demo-probe")

_YTDLP_URL_PATTERN = re.compile(
    r"https?://(www\.)?(youtube\.com|youtu\.be|vimeo\.com)/",
)

_YOUTUBE_URL_PATTERN = re.compile(
    r"https?://(www\.)?(youtube\.com|youtu\.be)/",
)

YT_API_BASE = "https://www.googleapis.com/youtube/v3"


def _extract_youtube_video_id(url: str) -> str | None:
    """Extract video ID from a YouTube URL."""
    parsed = urlparse(url)
    if parsed.hostname in ("youtu.be",):
        return parsed.path.lstrip("/").split("/")[0] or None
    qs = parse_qs(parsed.query)
    vid = qs.get("v", [None])[0]
    return vid if vid else None


def _parse_iso8601_duration(iso_duration: str) -> float:
    """Parse ISO 8601 duration (PT1H2M3S) to seconds."""
    match = re.match(
        r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso_duration,
    )
    if not match:
        return 0.0
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    return float(hours * 3600 + minutes * 60 + seconds)


async def _probe_duration_youtube_api(video_url: str) -> float | None:
    """Probe YouTube video duration via Data API v3 (no cookies needed).

    Returns duration in seconds, or None if API key is missing or call fails.
    """
    api_key = getattr(settings, "YOUTUBE_API_KEY", "")
    if not api_key:
        return None

    video_id = _extract_youtube_video_id(video_url)
    if not video_id:
        return None

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{YT_API_BASE}/videos",
                params={
                    "key": api_key,
                    "id": video_id,
                    "part": "contentDetails",
                },
            )
        if resp.status_code != 200:
            logger.warning(
                "YouTube Data API probe failed",
                extra={"status": resp.status_code, "video_id": video_id},
            )
            return None

        items = resp.json().get("items", [])
        if not items:
            return None

        iso_duration = items[0].get("contentDetails", {}).get("duration", "")
        duration = _parse_iso8601_duration(iso_duration)
        if duration > 0:
            logger.info(
                "YouTube duration from Data API",
                extra={"video_id": video_id, "duration": duration},
            )
            return duration
        return None
    except Exception as exc:
        logger.warning(
            "YouTube Data API probe error",
            extra={"video_id": video_id, "error": str(exc)},
        )
        return None


async def probe_duration(video_url: str) -> float:
    """Probe video duration in seconds.

    For YouTube URLs: tries YouTube Data API v3 first (no cookies, reliable),
    then falls back to yt-dlp metadata probe.
    For Vimeo/other: uses yt-dlp.
    For direct URLs: uses ffprobe.
    """
    if not video_url.startswith(("http://", "https://")):
        raise ValueError("Only HTTP and HTTPS URLs are accepted")

    if _YOUTUBE_URL_PATTERN.search(video_url):
        api_duration = await _probe_duration_youtube_api(video_url)
        if api_duration is not None:
            return api_duration
        logger.info("YouTube API unavailable, falling back to yt-dlp")

    if _YTDLP_URL_PATTERN.search(video_url):
        return await _probe_duration_ytdlp(video_url)
    return await _probe_duration_ffprobe(video_url)


async def _probe_duration_ffprobe(video_url: str) -> float:
    """Probe duration via FFprobe (works for direct video URLs)."""
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


async def _probe_duration_ytdlp(video_url: str) -> float:
    """Probe duration via yt-dlp metadata (no download, fast)."""
    src_cookies = settings.YTDLP_COOKIES_FILE
    tmp_cookies_path: str | None = None
    if src_cookies:
        if not os.path.exists(src_cookies):
            logger.warning(
                "YTDLP_COOKIES_FILE missing, probing without cookies",
                extra={"path": src_cookies},
            )
        else:
            fd, tmp_cookies_path = tempfile.mkstemp(
                prefix="ytdlp-cookies-", suffix=".txt",
            )
            os.close(fd)
            shutil.copyfile(src_cookies, tmp_cookies_path)
            os.chmod(tmp_cookies_path, 0o600)

    try:
        args = [
            "yt-dlp",
            "--skip-download",
            "--no-playlist",
            "--print-json",
            "--remote-components", "ejs:github",
        ]
        if tmp_cookies_path:
            args.extend(["--cookies", tmp_cookies_path])
        args.append(video_url)

        proc = await asyncio.create_subprocess_exec(
            *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=60)

        if proc.returncode != 0:
            logger.warning(
                "yt-dlp metadata probe failed",
                extra={
                    "url": video_url,
                    "stderr": stderr.decode(errors="ignore")[:500],
                },
            )
            raise ValueError("Could not determine video duration")

        data = json.loads(stdout.decode())
        duration = data.get("duration")
        if not duration:
            raise ValueError("Could not determine video duration")
        return float(duration)
    finally:
        if tmp_cookies_path:
            os.unlink(tmp_cookies_path)


async def _resolve_to_local(video_url: str, dest: Path) -> None:
    """Download a YouTube/Vimeo URL to a local file via yt-dlp."""
    src_cookies = settings.YTDLP_COOKIES_FILE
    tmp_cookies_path: str | None = None
    if src_cookies and os.path.exists(src_cookies):
        fd, tmp_cookies_path = tempfile.mkstemp(
            prefix="ytdlp-cookies-", suffix=".txt",
        )
        os.close(fd)
        shutil.copyfile(src_cookies, tmp_cookies_path)
        os.chmod(tmp_cookies_path, 0o600)

    try:
        args = [
            "yt-dlp",
            "--no-playlist",
            "-f", "bestvideo[height<=720]+bestaudio/best[height<=720]/best",
            "--merge-output-format", "mp4",
            "--remote-components", "ejs:github",
        ]
        if tmp_cookies_path:
            args.extend(["--cookies", tmp_cookies_path])
        args.extend(["-o", str(dest), video_url])

        proc = await asyncio.create_subprocess_exec(
            *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await asyncio.wait_for(proc.communicate(), timeout=300)

        if proc.returncode != 0 or not dest.exists():
            raise ValueError(
                f"yt-dlp download failed: {stderr.decode(errors='ignore')[:300]}"
            )
    finally:
        if tmp_cookies_path:
            os.unlink(tmp_cookies_path)


async def truncate_and_upload(
    video_url: str,
    max_seconds: int,
    user_id: str,
) -> str:
    """Truncate video to max_seconds, upload to GCS, return new URL."""
    _TEMP_DIR.mkdir(parents=True, exist_ok=True)
    file_id = uuid.uuid4().hex
    output_path = _TEMP_DIR / f"{file_id}.mp4"
    source_path = _TEMP_DIR / f"{file_id}_src.mp4"
    is_ytdlp_url = bool(_YTDLP_URL_PATTERN.search(video_url))

    try:
        if is_ytdlp_url:
            await _resolve_to_local(video_url, source_path)
            ffmpeg_input = str(source_path)
        else:
            ffmpeg_input = video_url

        cmd = [
            "ffmpeg", "-y",
            "-i", ffmpeg_input,
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
        source_path.unlink(missing_ok=True)
