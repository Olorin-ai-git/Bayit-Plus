"""
Character Voice Cloner Service

Orchestrates the full voice cloning pipeline: subtitle track lookup,
dialogue-to-character mapping via Claude, FFmpeg audio extraction,
ElevenLabs IVC cloning, and ContentCharacter.voice_id update.
"""

import tempfile
from pathlib import Path
from typing import Dict, List, Optional

from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.storage import storage_service
from app.models.content import Content
from app.models.subtitles import SubtitleCueModel, SubtitleTrackDoc
from app.services.olorin.dubbing.voice_training import voice_training_service
from app.services.vod_interaction.dialogue_mapper import dialogue_mapper_service
from app.services.vod_interaction.voice_clone_audio import (
    concat_audio_files, extract_cue_audio,
)

logger = get_logger(__name__)


class VoiceCloneResult(BaseModel):
    """Result of a single character voice clone attempt."""
    character_name: str
    status: str = Field(description="cloned, skipped, or failed")
    voice_id: Optional[str] = None
    audio_duration_sec: float = 0.0
    cue_count: int = 0
    reason: Optional[str] = None


async def find_subtitle_track(content_id: str) -> Optional[SubtitleTrackDoc]:
    """Find the best subtitle track by language priority."""
    langs = [l.strip() for l in settings.VOICE_CLONE_SUBTITLE_LANG_PRIORITY.split(",")]
    for lang in langs:
        track = await SubtitleTrackDoc.find_one(
            SubtitleTrackDoc.content_id == content_id,
            SubtitleTrackDoc.language == lang,
        )
        if track and track.cues:
            return track
    return await SubtitleTrackDoc.find_one(SubtitleTrackDoc.content_id == content_id)


def _update_character(
    content: Content, name: str, voice_id: Optional[str],
    clone_status: str, audio_url: Optional[str],
) -> None:
    """Update ContentCharacter fields on the content document."""
    for char in content.interactive_characters:
        if char.name == name:
            if voice_id:
                char.voice_id = voice_id
            char.voice_clone_status = clone_status
            char.voice_clone_audio_url = audio_url
            break


class CharacterVoiceClonerService:
    """Orchestrates per-character voice cloning from movie audio."""

    async def clone_character_voices(
        self, content: Content, character_names: Optional[List[str]] = None,
    ) -> Dict[str, VoiceCloneResult]:
        """Clone voices for characters on a content item."""
        content_id = str(content.id)
        track = await find_subtitle_track(content_id)
        if not track or not track.cues:
            logger.info("No subtitles, skipping voice cloning", extra={"content_id": content_id})
            return {}
        chars = content.interactive_characters
        if not chars:
            return {}
        if character_names:
            targets = [c for c in chars if c.name in character_names]
        else:
            targets = chars[: settings.VOICE_CLONE_MAX_CHARACTERS_PER_CONTENT]

        cue_map = await dialogue_mapper_service.map_dialogue_to_characters(
            track.cues, [c.name for c in targets], content.title or content_id,
        )
        timeout = settings.VOICE_CLONE_FFMPEG_TIMEOUT
        audio_filter = settings.VOICE_CLONE_AUDIO_FILTER
        results: Dict[str, VoiceCloneResult] = {}
        with tempfile.TemporaryDirectory() as tmp:
            for char in targets:
                results[char.name] = await self._clone_single(
                    content, char, cue_map.get(char.name, []), tmp, timeout, audio_filter,
                )
        await content.save()
        logger.info(
            "Voice cloning complete",
            extra={"content_id": content_id, "results": {n: r.status for n, r in results.items()}},
        )
        return results

    async def _clone_single(
        self, content: Content, char, cues: List[SubtitleCueModel],
        tmp_dir: str, timeout: int, audio_filter: str,
    ) -> VoiceCloneResult:
        """Clone voice for a single character."""
        safe_name = char.name.replace(" ", "_").lower()
        if not cues:
            return VoiceCloneResult(
                character_name=char.name, status="skipped", reason="No dialogue cues mapped",
            )
        segments: List[str] = []
        for i, cue in enumerate(cues):
            seg = str(Path(tmp_dir) / f"{safe_name}_{i}.mp3")
            if await extract_cue_audio(content.stream_url, cue, seg, audio_filter, timeout):
                segments.append(seg)
        if not segments:
            return VoiceCloneResult(
                character_name=char.name, status="failed",
                cue_count=len(cues), reason="All audio extractions failed",
            )
        concat_path = str(Path(tmp_dir) / f"{safe_name}_sample.mp3")
        duration = await concat_audio_files(segments, concat_path, timeout)
        if duration < settings.VOICE_CLONE_MIN_AUDIO_DURATION_SEC:
            return VoiceCloneResult(
                character_name=char.name, status="skipped",
                audio_duration_sec=duration, cue_count=len(segments),
                reason=f"Audio too short ({duration:.1f}s)",
            )
        audio_data = Path(concat_path).read_bytes()
        content_id = str(content.id)
        gcs_path = f"voice-clones/{content_id}/{safe_name}_sample.mp3"
        audio_url = await storage_service.upload_bytes(audio_data, gcs_path, "audio/mpeg")
        return await self._send_to_elevenlabs(
            content, char.name, audio_data, audio_url, duration, len(segments),
        )

    async def _send_to_elevenlabs(
        self, content: Content, name: str, audio_data: bytes,
        audio_url: str, duration: float, cue_count: int,
    ) -> VoiceCloneResult:
        """Clone via ElevenLabs and update character."""
        content_id = str(content.id)
        voice_name = f"{content.title or content_id} - {name}"
        try:
            voice_id = await voice_training_service.clone_voice(audio_data, voice_name)
        except Exception:
            logger.exception(
                "ElevenLabs cloning failed", extra={"character": name, "content_id": content_id},
            )
            _update_character(content, name, None, "failed", audio_url)
            return VoiceCloneResult(
                character_name=name, status="failed", audio_duration_sec=duration,
                cue_count=cue_count, reason="ElevenLabs API error",
            )
        _update_character(content, name, voice_id, "cloned", audio_url)
        return VoiceCloneResult(
            character_name=name, status="cloned", voice_id=voice_id,
            audio_duration_sec=duration, cue_count=cue_count,
        )


character_voice_cloner_service = CharacterVoiceClonerService()
