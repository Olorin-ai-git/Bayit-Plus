"""
VOD Audio Generation Service

Generates AI-powered audio tracks for VOD content using ElevenLabs TTS.
Supports 4 subtitle variants: Heblish, Slang, Grammar-Flip, Engrew.

Pipeline:
1. Fetch subtitle track with variant texts
2. For each cue: Generate TTS audio + add silence padding to match timing
3. Concatenate audio chunks with FFmpeg
4. Convert to AAC format (HLS-compatible)
5. Upload to GCS storage
6. Update AudioTrackDoc status
"""

import asyncio
import hashlib
import json
import logging
import subprocess
from pathlib import Path
from typing import Dict, List, Set

from app.core.config import settings
from app.core.storage import StorageService
from app.services.elevenlabs_http_tts_service import ElevenLabsHTTPTTSService
from app.models.audio_tracks import AudioTrackDoc
from app.models.subtitles import SubtitleTrackDoc

logger = logging.getLogger(__name__)


# Variant Configuration (4 variants only - optimized for 33% cost reduction)
VARIANT_CONFIG = {
    "heblish": {
        "display_name": "Heblish Audio",
        "text_field": "text_heblish",
        "voice_type": "multilingual",  # Mixed English + Hebrew
        "language": "multilingual",
        "language_name": "English + עברית",
    },
    "slang": {
        "display_name": "Israeli Slang Audio",
        "text_field": "text_slang_synthesis",
        "voice_type": "he",
        "language": "he",
        "language_name": "עברית (סלנג)",
    },
    "grammar_flip": {
        "display_name": "Grammar-Flip Audio",
        "text_field": "text_grammar_flip",
        "voice_type": "multilingual",
        "language": "multilingual",
        "language_name": "English + עברית",
    },
    "engrew": {
        "display_name": "Engrew Audio",
        "text_field": "text_engrew",
        "voice_type": "he",
        "language": "he",
        "language_name": "עברית (אנגרית)",
    },
}


class VodAudioGenerationService:
    """Service for generating AI audio tracks for VOD content."""

    def __init__(self):
        self.tts_service = ElevenLabsHTTPTTSService()
        self.storage_service = StorageService()
        self.temp_dir = Path(settings.VOD_AUDIO_TEMP_DIR)
        self.temp_dir.mkdir(parents=True, exist_ok=True)

    async def generate_audio_track(
        self,
        audio_track: AudioTrackDoc,
        subtitle_track: SubtitleTrackDoc,
    ) -> bool:
        """
        Generate audio track from subtitle variant.

        Args:
            audio_track: AudioTrackDoc instance (status will be updated)
            subtitle_track: SubtitleTrackDoc with variant texts

        Returns:
            True if successful, False otherwise
        """
        variant_type = audio_track.variant_type
        config = VARIANT_CONFIG.get(variant_type)

        if not config:
            logger.error(
                "Invalid variant type",
                extra={"variant_type": variant_type, "audio_track_id": str(audio_track.id)},
            )
            audio_track.update_status("failed", error="Invalid variant type")
            await audio_track.save()
            return False

        # Update status to processing
        audio_track.update_status("processing", progress=0)
        await audio_track.save()

        try:
            # Create work directory for this generation
            work_dir = self.temp_dir / f"audio_{audio_track.id}"
            work_dir.mkdir(parents=True, exist_ok=True)

            # Load checkpoint if exists (resume capability)
            checkpoint_file = work_dir / "checkpoint.json"
            completed_cues: Set[int] = set()
            if checkpoint_file.exists():
                checkpoint = json.loads(checkpoint_file.read_text())
                completed_cues = set(checkpoint.get("completed_cues", []))
                logger.info(
                    "Resuming from checkpoint",
                    extra={
                        "audio_track_id": str(audio_track.id),
                        "completed_cues": len(completed_cues),
                    },
                )

            # Get voice configuration
            voice_id = self._get_voice_id(config["voice_type"])
            audio_track.elevenlabs_voice_id = voice_id
            await audio_track.save()

            # Generate audio chunks for each subtitle cue
            text_field = config["text_field"]
            total_cues = len(subtitle_track.cues)
            audio_track.subtitle_cue_count = total_cues

            # Text deduplication for cost optimization
            unique_texts: Dict[str, List[int]] = {}
            for cue in subtitle_track.cues:
                if cue.index in completed_cues:
                    continue

                text = getattr(cue, text_field, None) or cue.text
                if not text or text.strip() == "":
                    continue

                if text not in unique_texts:
                    unique_texts[text] = []
                unique_texts[text].append(cue.index)

            logger.info(
                "Text deduplication results",
                extra={
                    "audio_track_id": str(audio_track.id),
                    "total_cues": total_cues,
                    "unique_texts": len(unique_texts),
                    "deduplication_ratio": f"{(1 - len(unique_texts) / total_cues) * 100:.1f}%",
                },
            )

            # Generate TTS audio for unique texts
            text_to_audio: Dict[str, Path] = {}
            for idx, (text, cue_indices) in enumerate(unique_texts.items()):
                try:
                    audio_path = await self._generate_tts_audio(
                        text=text,
                        voice_id=voice_id,
                        work_dir=work_dir,
                        chunk_index=cue_indices[0],
                    )
                    text_to_audio[text] = audio_path

                    # Update progress
                    progress = int((idx + 1) / len(unique_texts) * 50)  # First 50% is TTS generation
                    audio_track.update_status("processing", progress=progress)
                    await audio_track.save()

                except Exception as e:
                    logger.error(
                        "Failed to generate TTS audio",
                        extra={
                            "audio_track_id": str(audio_track.id),
                            "text": text[:100],
                            "error": str(e),
                        },
                        exc_info=True,
                    )
                    # Continue with other texts, don't fail entire generation
                    continue

            # Create final audio chunks with silence padding
            final_chunks: List[Path] = []
            for cue in subtitle_track.cues:
                if cue.index in completed_cues:
                    final_chunks.append(work_dir / f"chunk_{cue.index:04d}_final.mp3")
                    continue

                text = getattr(cue, text_field, None) or cue.text
                if not text or text.strip() == "":
                    # Create silent chunk for empty text
                    silence_duration = cue.end_time - cue.start_time
                    silence_chunk = await self._create_silence_chunk(
                        duration=silence_duration,
                        work_dir=work_dir,
                        chunk_index=cue.index,
                    )
                    final_chunks.append(silence_chunk)
                    continue

                speech_audio = text_to_audio.get(text)
                if not speech_audio or not speech_audio.exists():
                    # Skip this cue if TTS failed
                    logger.warning(
                        "Skipping cue due to missing TTS audio",
                        extra={"audio_track_id": str(audio_track.id), "cue_index": cue.index},
                    )
                    continue

                # Add silence padding to match subtitle timing
                final_chunk = await self._add_silence_padding(
                    speech_audio=speech_audio,
                    target_duration=cue.end_time - cue.start_time,
                    work_dir=work_dir,
                    chunk_index=cue.index,
                )
                final_chunks.append(final_chunk)
                completed_cues.add(cue.index)

                # Save checkpoint every 50 cues
                if len(completed_cues) % 50 == 0:
                    checkpoint_file.write_text(
                        json.dumps({"completed_cues": list(completed_cues)})
                    )

            # Concatenate all audio chunks
            audio_track.update_status("processing", progress=75)
            await audio_track.save()

            final_audio = await self._concatenate_audio_chunks(
                chunks=final_chunks,
                work_dir=work_dir,
            )

            # Upload to GCS
            audio_track.update_status("processing", progress=90)
            await audio_track.save()

            remote_path = f"vod-audio/{audio_track.content_id}/{variant_type}/audio.m4a"
            audio_url = await self.storage_service.upload_file(
                local_path=str(final_audio),
                remote_path=remote_path,
            )

            # Get file metadata
            file_size = final_audio.stat().st_size
            duration = await self._get_audio_duration(final_audio)

            # Update AudioTrackDoc with success
            audio_track.audio_url = audio_url
            audio_track.file_size_bytes = file_size
            audio_track.duration_seconds = duration
            audio_track.subtitle_track_id = str(subtitle_track.id)

            # Calculate subtitle version hash for change detection
            subtitle_version_hash = hashlib.sha256(
                "".join([cue.text for cue in subtitle_track.cues]).encode()
            ).hexdigest()
            audio_track.subtitle_version_hash = subtitle_version_hash

            audio_track.update_status("completed", progress=100)
            await audio_track.save()

            # Cleanup work directory
            await self._cleanup_work_dir(work_dir)

            logger.info(
                "Audio generation completed",
                extra={
                    "audio_track_id": str(audio_track.id),
                    "content_id": audio_track.content_id,
                    "variant_type": variant_type,
                    "duration_seconds": duration,
                    "file_size_mb": file_size / 1024 / 1024,
                },
            )

            return True

        except Exception as e:
            logger.error(
                "Audio generation failed",
                extra={
                    "audio_track_id": str(audio_track.id),
                    "content_id": audio_track.content_id,
                    "variant_type": variant_type,
                    "error": str(e),
                },
                exc_info=True,
            )
            audio_track.update_status("failed", error=str(e))
            await audio_track.save()
            return False

    def _get_voice_id(self, voice_type: str) -> str:
        """Get ElevenLabs voice ID based on voice type."""
        if voice_type == "he":
            return settings.ELEVENLABS_HEBREW_VOICE_ID
        else:  # multilingual
            return settings.ELEVENLABS_DEFAULT_VOICE_ID

    async def _generate_tts_audio(
        self,
        text: str,
        voice_id: str,
        work_dir: Path,
        chunk_index: int,
    ) -> Path:
        """Generate TTS audio for text using ElevenLabs."""
        output_path = work_dir / f"speech_{chunk_index:04d}.mp3"

        # Call ElevenLabs TTS API
        audio_data = await self.tts_service.text_to_speech(
            text=text,
            voice_id=voice_id,
            stability=settings.ELEVENLABS_STABILITY,
            similarity_boost=settings.ELEVENLABS_SIMILARITY_BOOST,
        )

        # Save audio data to file
        output_path.write_bytes(audio_data)

        return output_path

    async def _create_silence_chunk(
        self,
        duration: float,
        work_dir: Path,
        chunk_index: int,
    ) -> Path:
        """Create silent audio chunk of specified duration."""
        output_path = work_dir / f"chunk_{chunk_index:04d}_final.mp3"

        cmd = [
            "ffmpeg",
            "-f", "lavfi",
            "-i", f"anullsrc=r=44100:cl=stereo:d={duration}",
            "-c:a", "libmp3lame",
            "-b:a", "128k",
            "-y",
            str(output_path),
        ]

        await self._run_ffmpeg_command(cmd, "create_silence")

        return output_path

    async def _add_silence_padding(
        self,
        speech_audio: Path,
        target_duration: float,
        work_dir: Path,
        chunk_index: int,
    ) -> Path:
        """Add silence padding after speech to match target duration."""
        output_path = work_dir / f"chunk_{chunk_index:04d}_final.mp3"

        # Get speech duration
        speech_duration = await self._get_audio_duration(speech_audio)

        # Calculate silence needed
        silence_duration = max(0, target_duration - speech_duration)

        if silence_duration < 0.01:  # Less than 10ms, no padding needed
            # Just copy the file
            output_path.write_bytes(speech_audio.read_bytes())
            return output_path

        # Create silence and concatenate
        silence_path = work_dir / f"silence_{chunk_index:04d}.mp3"
        concat_list = work_dir / f"concat_{chunk_index:04d}.txt"

        # Generate silence
        cmd = [
            "ffmpeg",
            "-f", "lavfi",
            "-i", f"anullsrc=r=44100:cl=stereo:d={silence_duration}",
            "-c:a", "libmp3lame",
            "-b:a", "128k",
            "-y",
            str(silence_path),
        ]
        await self._run_ffmpeg_command(cmd, "create_silence_padding")

        # Create concat list
        concat_list.write_text(
            f"file '{speech_audio.name}'\nfile '{silence_path.name}'\n"
        )

        # Concatenate speech + silence
        cmd = [
            "ffmpeg",
            "-f", "concat",
            "-safe", "0",
            "-i", str(concat_list),
            "-c:a", "libmp3lame",
            "-b:a", "128k",
            "-y",
            str(output_path),
        ]
        await self._run_ffmpeg_command(cmd, "concat_with_silence")

        return output_path

    async def _concatenate_audio_chunks(
        self,
        chunks: List[Path],
        work_dir: Path,
    ) -> Path:
        """Concatenate all audio chunks into final AAC file."""
        output_path = work_dir / "final_audio.m4a"
        concat_list = work_dir / "concat_final.txt"

        # Create concat list file
        concat_list.write_text(
            "\n".join([f"file '{chunk.name}'" for chunk in chunks if chunk.exists()])
        )

        # Concatenate and convert to AAC
        cmd = [
            "ffmpeg",
            "-f", "concat",
            "-safe", "0",
            "-i", str(concat_list),
            "-c:a", "aac",
            "-b:a", "128k",
            "-ar", "44100",
            "-y",
            str(output_path),
        ]

        await self._run_ffmpeg_command(cmd, "concatenate_final")

        return output_path

    async def _get_audio_duration(self, audio_path: Path) -> float:
        """Get audio file duration using FFprobe."""
        cmd = [
            "ffprobe",
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(audio_path),
        ]

        result = await self._run_ffmpeg_command(cmd, "get_duration")
        return float(result.stdout.strip())

    async def _run_ffmpeg_command(self, cmd: List[str], operation: str) -> subprocess.CompletedProcess:
        """Run FFmpeg command asynchronously."""
        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
            stdout, stderr = await process.communicate()

            if process.returncode != 0:
                raise RuntimeError(
                    f"FFmpeg {operation} failed: {stderr.decode('utf-8')}"
                )

            return subprocess.CompletedProcess(
                args=cmd,
                returncode=process.returncode,
                stdout=stdout.decode("utf-8"),
                stderr=stderr.decode("utf-8"),
            )

        except Exception as e:
            logger.error(
                f"FFmpeg {operation} command failed",
                extra={"command": " ".join(cmd), "error": str(e)},
                exc_info=True,
            )
            raise

    async def _cleanup_work_dir(self, work_dir: Path) -> None:
        """Clean up temporary work directory."""
        try:
            import shutil
            shutil.rmtree(work_dir)
            logger.debug("Cleaned up work directory", extra={"work_dir": str(work_dir)})
        except Exception as e:
            logger.warning(
                "Failed to cleanup work directory",
                extra={"work_dir": str(work_dir), "error": str(e)},
            )
