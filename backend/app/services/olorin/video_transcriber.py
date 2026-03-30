"""
Video Transcription Service

Extracts audio from video URLs and transcribes with speaker diarization
via ElevenLabs Scribe v2 API.
"""

import logging
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


async def _download_video(url: str, dest: str) -> str:
    """Download a video URL to a local file."""
    async with httpx.AsyncClient(timeout=300.0, follow_redirects=True) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        with open(dest, "wb") as f:
            f.write(resp.content)
    return dest


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


async def transcribe_video(
    video_url: str,
    language_code: Optional[str] = None,
) -> TranscriptionResult:
    """
    Transcribe a video with speaker diarization.

    Downloads video, extracts audio, sends to ElevenLabs Scribe v2.

    Args:
        video_url: URL of the video to transcribe
        language_code: Optional ISO language code hint

    Returns:
        TranscriptionResult with full text, diarized segments, speaker count
    """
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
