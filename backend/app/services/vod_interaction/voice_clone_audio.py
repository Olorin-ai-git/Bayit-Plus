"""
Voice Clone Audio Extraction

FFmpeg-based audio extraction and concatenation helpers for the
character voice cloning pipeline.
"""

import asyncio
from pathlib import Path
from typing import List

from app.core.logging_config import get_logger
from app.models.subtitles import SubtitleCueModel

logger = get_logger(__name__)


async def run_ffmpeg(args: List[str], timeout: int) -> bytes:
    """Run an FFmpeg command and return stdout bytes."""
    proc = await asyncio.create_subprocess_exec(
        "ffmpeg", *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        stdout, stderr = await asyncio.wait_for(
            proc.communicate(), timeout=timeout,
        )
    except asyncio.TimeoutError:
        proc.kill()
        raise TimeoutError("FFmpeg timed out")
    if proc.returncode != 0:
        raise RuntimeError(f"FFmpeg failed: {stderr.decode()[:500]}")
    return stdout


async def extract_cue_audio(
    stream_url: str,
    cue: SubtitleCueModel,
    output_path: str,
    audio_filter: str,
    timeout: int,
) -> bool:
    """Extract a single cue's audio from the stream. Returns True on success."""
    duration = cue.end_time - cue.start_time
    if duration <= 0.1:
        return False
    args = [
        "-ss", f"{cue.start_time:.3f}",
        "-t", f"{duration:.3f}",
        "-i", stream_url,
        "-vn",
        "-af", audio_filter,
        "-c:a", "libmp3lame",
        "-b:a", "192k",
        "-y", output_path,
    ]
    try:
        await run_ffmpeg(args, timeout)
        return Path(output_path).stat().st_size > 0
    except Exception:
        logger.warning(
            "Cue audio extraction failed",
            extra={"start": cue.start_time, "end": cue.end_time},
        )
        return False


async def concat_audio_files(
    segment_paths: List[str], output_path: str, timeout: int,
) -> float:
    """Concatenate MP3 segments into one file. Returns duration in seconds."""
    list_content = "\n".join(f"file '{p}'" for p in segment_paths)
    list_path = output_path + ".txt"
    Path(list_path).write_text(list_content)
    args = [
        "-f", "concat", "-safe", "0",
        "-i", list_path,
        "-c", "copy", "-y", output_path,
    ]
    await run_ffmpeg(args, timeout)

    probe_args = [
        "-i", output_path,
        "-show_entries", "format=duration",
        "-v", "quiet", "-of", "csv=p=0",
    ]
    proc = await asyncio.create_subprocess_exec(
        "ffprobe", *probe_args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=30)
    try:
        return float(stdout.decode().strip())
    except (ValueError, TypeError):
        return 0.0
