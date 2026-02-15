"""
Highlight Rendering.

FFmpeg-based rendering pipeline for highlight reel generation: downloads
audio clips from GCS, concatenates via FFmpeg, extracts thumbnail frame,
and uploads results. Also provides moment collection from learning data.
"""

import asyncio
import os
import tempfile
from datetime import datetime, timedelta, timezone
from typing import List

from app.core.logging_config import get_logger
from app.models.highlight_reel import (
    HighlightMoment,
    HighlightSourceType,
)

logger = get_logger(__name__)


async def collect_highlight_moments(
    user_id: str,
    profile_id: str,
    time_range_hours: int,
) -> List[HighlightMoment]:
    """Gather scorable interactions from the past N hours."""
    from app.models.phonetic_mirror_attempt import PhoneticMirrorAttempt
    from app.models.v2v_session import V2VSession

    cutoff = datetime.now(timezone.utc) - timedelta(
        hours=time_range_hours,
    )
    moments: List[HighlightMoment] = []

    mirror_attempts = await PhoneticMirrorAttempt.find(
        {"user_id": user_id}, 
        {"profile_id": profile_id}, 
        PhoneticMirrorAttempt.created_at >= cutoff, 
    ).to_list()

    for attempt in mirror_attempts:
        moments.append(
            HighlightMoment(
                source_type=HighlightSourceType.MIRROR_ATTEMPT,
                source_id=str(attempt.id),
                score=attempt.pronunciation_score or 0.0,
                transcript_he=attempt.target_phrase or "",
            ),
        )

    v2v_sessions = await V2VSession.find(
        {"user_id": user_id}, 
        {"profile_id": profile_id}, 
        V2VSession.created_at >= cutoff, 
    ).to_list()

    for session in v2v_sessions:
        for transform in session.transforms:
            moments.append(
                HighlightMoment(
                    source_type=HighlightSourceType.V2V_SESSION,
                    source_id=str(session.id),
                    score=transform.pronunciation_score_after or 0.0,
                    transcript_he=transform.corrected_transcript or "",
                    audio_gcs_path=transform.v2v_audio_gcs_path,
                ),
            )

    return moments


async def render_reel(
    user_id: str,
    profile_id: str,
    moments: List[HighlightMoment],
) -> tuple:
    """Render moments into a video reel via FFmpeg and upload to GCS."""
    from app.services.olorin.storage_service import storage_service

    audio_clips = []
    for moment in moments:
        if moment.audio_gcs_path:
            clip_bytes = await storage_service.download_bytes(
                moment.audio_gcs_path,
            )
            audio_clips.append(clip_bytes)

    if not audio_clips:
        raise ValueError("No audio clips available for reel rendering")

    with tempfile.TemporaryDirectory() as tmpdir:
        clip_paths = _write_clips_to_disk(tmpdir, audio_clips)
        concat_list = _write_concat_list(tmpdir, clip_paths)

        output_video = os.path.join(tmpdir, "reel.mp4")
        output_thumb = os.path.join(tmpdir, "thumb.jpg")

        await _run_ffmpeg_concat(concat_list, output_video)
        await _run_ffmpeg_thumbnail(output_video, output_thumb)

        video_path, thumb_path = _build_gcs_paths(user_id, profile_id)
        await _upload_outputs(
            storage_service, output_video, video_path,
            output_thumb, thumb_path,
        )

    return video_path, thumb_path


def _write_clips_to_disk(
    tmpdir: str, audio_clips: List[bytes],
) -> List[str]:
    """Write audio clip bytes to individual files in tmpdir."""
    clip_paths = []
    for i, clip in enumerate(audio_clips):
        path = os.path.join(tmpdir, f"clip_{i}.wav")
        with open(path, "wb") as f:
            f.write(clip)
        clip_paths.append(path)
    return clip_paths


def _write_concat_list(tmpdir: str, clip_paths: List[str]) -> str:
    """Write FFmpeg concat demuxer list file."""
    concat_list = os.path.join(tmpdir, "concat.txt")
    with open(concat_list, "w") as f:
        for cp in clip_paths:
            f.write(f"file '{cp}'\n")
    return concat_list


async def _run_ffmpeg_concat(concat_list: str, output_video: str) -> None:
    """Run FFmpeg to concatenate audio clips into a single video."""
    process = await asyncio.create_subprocess_exec(
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", concat_list, "-c:a", "aac", "-b:a", "128k",
        output_video,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await process.communicate()
    if process.returncode != 0:
        raise RuntimeError(
            f"FFmpeg concat failed: {stderr.decode()[:200]}"
        )


async def _run_ffmpeg_thumbnail(
    output_video: str, output_thumb: str,
) -> None:
    """Extract a single frame from video as thumbnail."""
    thumb_process = await asyncio.create_subprocess_exec(
        "ffmpeg", "-y", "-i", output_video,
        "-vframes", "1", "-q:v", "2", output_thumb,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    await thumb_process.communicate()


def _build_gcs_paths(user_id: str, profile_id: str) -> tuple:
    """Build timestamped GCS paths for video and thumbnail."""
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    video_path = (
        f"zeh-ani/highlights/{user_id}/{profile_id}/"
        f"reel_{timestamp}.mp4"
    )
    thumb_path = video_path.replace(".mp4", "_thumb.jpg")
    return video_path, thumb_path


async def _upload_outputs(
    storage_service,
    output_video: str,
    video_path: str,
    output_thumb: str,
    thumb_path: str,
) -> None:
    """Upload rendered video and thumbnail to GCS."""
    with open(output_video, "rb") as f:
        video_bytes = f.read()
    await storage_service.upload_bytes(
        video_bytes, video_path, content_type="video/mp4",
    )

    if os.path.exists(output_thumb):
        with open(output_thumb, "rb") as f:
            thumb_bytes = f.read()
        await storage_service.upload_bytes(
            thumb_bytes, thumb_path, content_type="image/jpeg",
        )
