"""SCORM character enricher — face extraction and voice cloning."""

import asyncio
import subprocess
import tempfile
from pathlib import Path
from typing import List, Optional, Set

import httpx

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.storage import storage_service
from app.models.scorm_export import CharacterExportStatus
from app.models.vod_interaction import ContentCharacter

logger = get_logger(__name__)


def _needs_face_extraction(character: ContentCharacter) -> bool:
    """Check if character is missing a usable face image."""
    return not character.frame_url


def _needs_voice_clone(
    character: ContentCharacter, default_voices: Set[str]
) -> bool:
    """Check if character has only a default (non-cloned) voice."""
    if character.voice_clone_status == "cloned":
        return False
    return character.voice_id in default_voices


async def _extract_face_still(
    video_url: str,
    timestamp_sec: float,
    export_id: str,
    char_name: str,
) -> Optional[str]:
    """
    Extract a face still from video at the given timestamp via ffmpeg.

    Returns GCS URL of uploaded face image, or None on failure.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        output_path = Path(tmpdir) / "face.jpg"
        cmd = [
            "ffmpeg", "-y",
            "-ss", str(timestamp_sec),
            "-i", video_url,
            "-vframes", "1",
            "-q:v", "2",
            str(output_path),
        ]
        try:
            proc = await asyncio.to_thread(
                subprocess.run, cmd,
                capture_output=True, timeout=60,
            )
            if proc.returncode != 0 or not output_path.exists():
                logger.warning(
                    "ffmpeg face extraction failed",
                    extra={
                        "export_id": export_id,
                        "character": char_name,
                        "stderr": proc.stderr.decode()[:200],
                    },
                )
                return None
        except (subprocess.TimeoutExpired, FileNotFoundError):
            logger.exception(
                "ffmpeg face extraction error",
                extra={"export_id": export_id, "character": char_name},
            )
            return None

        gcs_path = (
            f"{settings.SCORM_EXPORT_GCS_PREFIX}/{export_id}"
            f"/faces/{char_name.replace(' ', '_').lower()}.jpg"
        )
        gcs_url = await storage_service.upload_bytes(
            output_path.read_bytes(), gcs_path, "image/jpeg"
        )
        return gcs_url


async def _clone_voice(
    video_url: str,
    speaker_segments: List[dict],
    char_name: str,
) -> Optional[str]:
    """
    Clone a voice from speaker audio segments via ElevenLabs.

    Extracts audio segments, concatenates, and submits for cloning.
    Returns new voice_id or None on failure.
    """
    if not speaker_segments:
        return None

    total_audio = sum(
        seg.get("end", 0) - seg.get("start", 0)
        for seg in speaker_segments
    )
    min_duration = settings.VOICE_CLONE_MIN_AUDIO_DURATION_SEC
    if total_audio < min_duration:
        logger.info(
            "Insufficient audio for voice clone",
            extra={
                "character": char_name,
                "total_seconds": total_audio,
                "minimum": min_duration,
            },
        )
        return None

    with tempfile.TemporaryDirectory() as tmpdir:
        target = settings.VOICE_CLONE_TARGET_AUDIO_DURATION_SEC
        collected = 0.0
        filter_parts = []
        for seg in speaker_segments:
            start = seg.get("start", 0)
            end = seg.get("end", 0)
            duration = end - start
            if duration <= 0:
                continue
            filter_parts.append((start, end))
            collected += duration
            if collected >= target:
                break

        if not filter_parts:
            return None

        segment_files = []
        for i, (start, end) in enumerate(filter_parts):
            seg_path = Path(tmpdir) / f"seg_{i}.mp3"
            cmd = [
                "ffmpeg", "-y",
                "-ss", str(start), "-to", str(end),
                "-i", video_url,
                "-vn", "-acodec", "libmp3lame",
                str(seg_path),
            ]
            try:
                proc = await asyncio.to_thread(
                    subprocess.run, cmd,
                    capture_output=True, timeout=120,
                )
                if proc.returncode == 0 and seg_path.exists():
                    segment_files.append(seg_path)
            except (subprocess.TimeoutExpired, FileNotFoundError):
                continue

        if not segment_files:
            return None

        output_path = Path(tmpdir) / "voice_sample.mp3"
        concat_list = Path(tmpdir) / "concat.txt"
        concat_list.write_text(
            "\n".join(f"file '{f}'" for f in segment_files)
        )
        cmd = [
            "ffmpeg", "-y", "-f", "concat", "-safe", "0",
            "-i", str(concat_list), "-acodec", "libmp3lame",
            str(output_path),
        ]
        try:
            proc = await asyncio.to_thread(
                subprocess.run, cmd,
                capture_output=True, timeout=120,
            )
            if proc.returncode != 0 or not output_path.exists():
                return None
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return None

        audio_bytes = output_path.read_bytes()
        try:
            async with httpx.AsyncClient(timeout=120.0) as http:
                elevenlabs_url = (
                    settings.ELEVENLABS_API_URL or "https://api.elevenlabs.io"
                ).rstrip("/")
                resp = await http.post(
                    f"{elevenlabs_url}/v1/voices/add",
                    headers={"xi-api-key": settings.ELEVENLABS_API_KEY},
                    files={"files": (f"{char_name}.mp3", audio_bytes, "audio/mpeg")},
                    data={
                        "name": f"SCORM-{char_name}",
                        "description": "Auto-cloned for SCORM export",
                    },
                )
                if resp.status_code == 200:
                    voice_id = resp.json().get("voice_id")
                    logger.info(
                        "Voice cloned for SCORM export",
                        extra={"character": char_name, "voice_id": voice_id},
                    )
                    return voice_id
                logger.warning(
                    "ElevenLabs voice clone failed",
                    extra={
                        "character": char_name,
                        "status": resp.status_code,
                        "body": resp.text[:200],
                    },
                )
        except Exception:
            logger.exception(
                "Voice cloning API error",
                extra={"character": char_name},
            )

    return None


def _find_speaker_timestamp(
    transcript_segments: List[dict],
    character_name: str,
) -> float:
    """Find the midpoint of the longest segment for a speaker."""
    best_start = 0.0
    best_duration = 0.0
    for seg in transcript_segments:
        speaker = seg.get("speaker", "")
        if character_name.lower() in speaker.lower():
            start = seg.get("start", 0)
            end = seg.get("end", 0)
            duration = end - start
            if duration > best_duration:
                best_start = start
                best_duration = duration
    if best_duration > 0:
        return best_start + best_duration / 2
    if transcript_segments:
        s = transcript_segments[0]
        return (s.get("start", 0) + s.get("end", 0)) / 2
    return 10.0


def _find_speaker_segments(
    transcript_segments: List[dict],
    character_name: str,
) -> List[dict]:
    """Filter transcript segments belonging to a specific speaker."""
    return [
        seg for seg in transcript_segments
        if character_name.lower() in seg.get("speaker", "").lower()
    ]


async def enrich_character(
    character: ContentCharacter,
    status: CharacterExportStatus,
    video_url: str,
    transcript_segments: List[dict],
    export_id: str,
    default_voices: Set[str],
) -> CharacterExportStatus:
    """
    Enrich a character with face and voice assets if missing.

    Mutates the character's frame_url and voice_id in place.
    Updates and returns the CharacterExportStatus.
    """
    fallback_reasons = []

    if _needs_face_extraction(character):
        timestamp = _find_speaker_timestamp(
            transcript_segments, character.name
        )
        face_url = await _extract_face_still(
            video_url, timestamp, export_id, character.name,
        )
        if face_url:
            character.frame_url = face_url
            status.face_extracted = True
        else:
            fallback_reasons.append("Face extraction failed — text avatar fallback")

    if _needs_voice_clone(character, default_voices):
        speaker_segs = _find_speaker_segments(
            transcript_segments, character.name
        )
        new_voice_id = await _clone_voice(
            video_url, speaker_segs, character.name,
        )
        if new_voice_id:
            character.voice_id = new_voice_id
            status.voice_cloned = True
        else:
            fallback_reasons.append("Voice cloning failed — using default voice")

    if fallback_reasons:
        status.fallback_reason = "; ".join(fallback_reasons)

    return status
