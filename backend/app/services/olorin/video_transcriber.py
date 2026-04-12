"""
Video Transcription Service

Extracts audio from video URLs and transcribes with speaker diarization
via ElevenLabs Scribe v2 API.
"""

import asyncio
import logging
import os
import re
import shutil
import tempfile
from dataclasses import dataclass, field
from typing import Optional

import httpx

from app.core.config import settings
from app.services.ffmpeg.service import ffmpeg_service

logger = logging.getLogger(__name__)

ELEVENLABS_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text"
SCRIBE_MODEL = "scribe_v2"


@dataclass
class TranscriptSegment:
    """A segment of transcribed speech with speaker label."""

    speaker: str
    text: str
    start: float
    end: float


@dataclass
class TranscriptionResult:
    """Complete transcription output with diarization."""

    full_text: str
    segments: list[TranscriptSegment] = field(default_factory=list)
    speakers_count: int = 0
    language: str = ""
    duration_seconds: float = 0.0


_DIRECT_MEDIA_PATTERN = re.compile(
    r"\.(mp4|webm|mkv|mov|avi|m4v|ts|flv|wmv|mp3|m4a|wav|ogg)(\?|$)",
    re.IGNORECASE,
)


async def _download_video(url: str, dest: str) -> str:
    """Download a video URL to a local file.

    Direct media URLs (.mp4, .webm, etc.) are fetched via HTTP.
    Everything else (YouTube, Vimeo, Dailymotion, etc.) goes through
    yt-dlp which supports 1000+ sites.
    """
    if _DIRECT_MEDIA_PATTERN.search(url):
        async with httpx.AsyncClient(timeout=300.0, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            with open(dest, "wb") as f:
                f.write(resp.content)
        return dest
    return await _download_via_ytdlp(url, dest)


def _ytdlp_command(url: str, dest: str, cookies_path: Optional[str]) -> list[str]:
    """Build the yt-dlp argv for a given url/dest.

    Injects ``--cookies <cookies_path>`` when cookies_path is provided.
    Callers pass a path to a WRITABLE copy of the cookies file because
    yt-dlp updates session cookies in place on exit; passing a read-only
    mounted file causes an OSError: Read-only file system crash after
    the download otherwise completes.

    Also enables ``--remote-components ejs:github`` so yt-dlp can fetch
    YouTube's JS challenge solver from the github component registry at
    runtime. Without this, YouTube silently drops some formats
    (SABR/n-sig challenges) and downloads fail with "Some formats may be
    missing. Ensure you have a supported JavaScript runtime".
    """
    args = [
        "yt-dlp",
        "--no-playlist",
        "-f", "bestvideo[height<=720]+bestaudio/best[height<=720]/best",
        "--merge-output-format", "mp4",
        "--remote-components", "ejs:github",
    ]
    if cookies_path:
        args.extend(["--cookies", cookies_path])
    args.extend(["-o", dest, url])
    return args


async def _download_via_ytdlp(url: str, dest: str) -> str:
    """Download video via yt-dlp (YouTube, Vimeo, etc.).

    Handles the cookies-file-is-read-only problem by copying the mounted
    cookies.txt to a tempfile on each invocation, passing the tempfile
    to yt-dlp, then discarding it. This means any server-side cookie
    rotations within a single download do not persist back to the
    mounted source — acceptable because the cookies.txt is expected to
    be refreshed manually from a browser export, not updated in situ.
    """
    src_cookies = settings.YTDLP_COOKIES_FILE
    tmp_cookies_path: Optional[str] = None
    if src_cookies:
        if not os.path.exists(src_cookies):
            raise RuntimeError(
                f"YTDLP_COOKIES_FILE points to missing path: {src_cookies!r}"
            )
        fd, tmp_cookies_path = tempfile.mkstemp(
            prefix="ytdlp-cookies-", suffix=".txt",
        )
        os.close(fd)
        shutil.copyfile(src_cookies, tmp_cookies_path)
        os.chmod(tmp_cookies_path, 0o600)

    try:
        args = _ytdlp_command(url, dest, tmp_cookies_path)
        proc = await asyncio.create_subprocess_exec(
            *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=300)
        if proc.returncode != 0:
            raise RuntimeError(
                f"yt-dlp failed (exit {proc.returncode}): {stderr.decode()[:500]}"
            )
        logger.info("Downloaded video via yt-dlp", extra={"url": url[:80]})
        return dest
    finally:
        if tmp_cookies_path and os.path.exists(tmp_cookies_path):
            try:
                os.unlink(tmp_cookies_path)
            except OSError:
                logger.warning(
                    "failed to unlink temporary cookies file",
                    extra={"path": tmp_cookies_path},
                )


async def _extract_audio(video_path: str) -> str:
    """Extract audio as mp3 from a video file."""
    audio_path = video_path.rsplit(".", 1)[0] + ".mp3"
    await ffmpeg_service.extract_audio(
        video_path, audio_path, audio_codec="libmp3lame", audio_bitrate="64k"
    )
    return audio_path


async def _call_elevenlabs_stt(
    audio_path: str,
    language_code: Optional[str] = None,
) -> dict:
    """Send audio to ElevenLabs Scribe v2 with diarization."""
    with open(audio_path, "rb") as f:
        audio_bytes = f.read()

    form_data = {
        "model_id": (None, SCRIBE_MODEL),
        "diarize": (None, "true"),
        "tag_audio_events": (None, "false"),
        "timestamps_granularity": (None, "word"),
    }
    if language_code:
        form_data["language_code"] = (None, language_code)

    files = {"file": ("audio.mp3", audio_bytes, "audio/mpeg")}

    async with httpx.AsyncClient(timeout=600.0) as client:
        resp = await client.post(
            ELEVENLABS_STT_URL,
            headers={"xi-api-key": settings.ELEVENLABS_API_KEY},
            files={**files, **form_data},
        )
        resp.raise_for_status()
        return resp.json()


async def _call_elevenlabs_stt_url(
    source_url: str,
    language_code: Optional[str] = None,
) -> dict:
    """Send a public URL to ElevenLabs Scribe v2 (no download needed)."""
    form_data = {
        "model_id": (None, SCRIBE_MODEL),
        "source_url": (None, source_url),
        "diarize": (None, "true"),
        "tag_audio_events": (None, "false"),
        "timestamps_granularity": (None, "word"),
    }
    if language_code:
        form_data["language_code"] = (None, language_code)

    async with httpx.AsyncClient(timeout=600.0) as client:
        resp = await client.post(
            ELEVENLABS_STT_URL,
            headers={"xi-api-key": settings.ELEVENLABS_API_KEY},
            files=form_data,
        )
        resp.raise_for_status()
        return resp.json()


def _group_words_into_segments(words: list[dict]) -> list[TranscriptSegment]:
    """Group consecutive same-speaker words into segments."""
    segments: list[TranscriptSegment] = []
    current_speaker: Optional[str] = None
    current_words: list[str] = []
    seg_start = 0.0
    seg_end = 0.0

    for word in words:
        if word.get("type") != "word":
            continue
        speaker = word.get("speaker_id", "unknown")
        if speaker != current_speaker and current_words:
            segments.append(TranscriptSegment(
                speaker=current_speaker or "unknown",
                text=" ".join(current_words),
                start=seg_start,
                end=seg_end,
            ))
            current_words = []
            seg_start = word.get("start", 0.0)
        if not current_words:
            seg_start = word.get("start", 0.0)
        current_speaker = speaker
        current_words.append(word.get("text", ""))
        seg_end = word.get("end", 0.0)

    if current_words:
        segments.append(TranscriptSegment(
            speaker=current_speaker or "unknown",
            text=" ".join(current_words),
            start=seg_start,
            end=seg_end,
        ))
    return segments


def _parse_response(data: dict) -> TranscriptionResult:
    """Parse ElevenLabs STT response into TranscriptionResult."""
    full_text = data.get("text", data.get("transcription", ""))
    language = data.get("language_code", data.get("language", ""))
    duration = data.get("duration", 0.0)

    words = data.get("words", [])
    if words:
        segments = _group_words_into_segments(words)
    else:
        segments = []
        for chunk in data.get("chunks", data.get("segments", [])):
            speaker = chunk.get("speaker_id", chunk.get("speaker", "unknown"))
            segments.append(TranscriptSegment(
                speaker=speaker,
                text=chunk.get("text", ""),
                start=chunk.get("start", 0.0),
                end=chunk.get("end", 0.0),
            ))

    speakers = {s.speaker for s in segments}
    return TranscriptionResult(
        full_text=full_text,
        segments=segments,
        speakers_count=len(speakers),
        language=language,
        duration_seconds=duration,
    )


async def fetch_native_chapters_via_ytdlp(
    url: str,
) -> tuple[list[dict], float]:
    """Probe a video URL for native chapter metadata via yt-dlp.

    Returns ``(chapters, duration_seconds)`` where chapters is a list of
    ``{"start_time": float, "end_time": float, "title": str}`` dicts (empty
    when the source has no native chapter feed). Raises ``RuntimeError`` on
    yt-dlp failure (cookies expired, video removed, network error) so the
    caller can degrade to AI generation cleanly.

    Uses ``--skip-download --print-json`` so this is a fast metadata probe
    even for hour-long videos. Reuses the cookies-tempfile pattern from
    ``_download_via_ytdlp`` because yt-dlp writes session cookies back on
    exit.
    """
    src_cookies = settings.YTDLP_COOKIES_FILE
    tmp_cookies_path: Optional[str] = None
    if src_cookies:
        if not os.path.exists(src_cookies):
            raise RuntimeError(
                f"YTDLP_COOKIES_FILE points to missing path: {src_cookies!r}"
            )
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
        args.append(url)

        proc = await asyncio.create_subprocess_exec(
            *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=60)
        if proc.returncode != 0:
            raise RuntimeError(
                f"yt-dlp metadata probe failed (exit {proc.returncode}): "
                f"{stderr.decode(errors='ignore')[:300]}"
            )

        import json as _json
        data = _json.loads(stdout.decode())
        raw_chapters = data.get("chapters") or []
        duration = float(data.get("duration") or 0.0)

        chapters: list[dict] = []
        for c in raw_chapters:
            chapters.append({
                "start_time": float(c.get("start_time", 0.0)),
                "end_time": float(c.get("end_time", 0.0)),
                "title": str(c.get("title", "")).strip(),
            })
        return chapters, duration
    finally:
        if tmp_cookies_path and os.path.exists(tmp_cookies_path):
            try:
                os.unlink(tmp_cookies_path)
            except OSError:
                logger.warning(
                    "failed to unlink temporary cookies file",
                    extra={"path": tmp_cookies_path},
                )


_YOUTUBE_PATTERN = re.compile(
    r"https?://(www\.)?(youtube\.com|youtu\.be)/",
)


async def transcribe_video(
    video_url: str,
    language_code: Optional[str] = None,
) -> TranscriptionResult:
    """
    Transcribe a video with speaker diarization.

    For YouTube URLs: sends the URL directly to ElevenLabs Scribe v2
    via source_url (no download needed, bypasses VPS IP blocks).
    For other URLs: downloads video, extracts audio, uploads to Scribe.

    Args:
        video_url: URL of the video to transcribe
        language_code: Optional ISO language code hint

    Returns:
        TranscriptionResult with full text, diarized segments, speaker count
    """
    if _YOUTUBE_PATTERN.search(video_url):
        logger.info(
            "Transcribing YouTube video via ElevenLabs Scribe v2 source_url",
            extra={"url": video_url[:80]},
        )
        raw = await _call_elevenlabs_stt_url(video_url, language_code)
    else:
        with tempfile.TemporaryDirectory() as tmpdir:
            video_path = f"{tmpdir}/video.mp4"
            await _download_video(video_url, video_path)
            audio_path = await _extract_audio(video_path)

            logger.info(
                "Transcribing video via ElevenLabs Scribe v2",
                extra={"url": video_url[:80]},
            )
            raw = await _call_elevenlabs_stt(audio_path, language_code)

    result = _parse_response(raw)
    logger.info(
        "Transcription complete",
        extra={
            "speakers": result.speakers_count,
            "duration": result.duration_seconds,
            "language": result.language,
        },
    )
    return result
