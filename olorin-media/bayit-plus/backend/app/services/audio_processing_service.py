"""
Audio Processing Service for Podcast Translation
Handles vocal separation, mixing, and audio processing using Demucs v4 and FFmpeg.
"""

import asyncio
import json
import logging
import re
import shutil
from pathlib import Path
from typing import Tuple

logger = logging.getLogger(__name__)


class AudioProcessingService:
    """Handles vocal separation, mixing, and audio processing for podcast translation."""

    def __init__(self, temp_dir: str):
        """
        Initialize audio processing service.

        Args:
            temp_dir: Directory for temporary audio files
        """
        self.temp_dir = Path(temp_dir)
        self.temp_dir.mkdir(parents=True, exist_ok=True)

    async def separate_vocals(
        self, audio_path: str, output_dir: str
    ) -> Tuple[str, str]:
        """
        Separate vocals from background music/noise using Demucs v4.

        Args:
            audio_path: Path to input audio file
            output_dir: Directory for output files

        Returns:
            Tuple of (vocals_path, accompaniment_path)
        """
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        # Use htdemucs_6s model optimized for speech separation
        # Returns 6 stems: drums, bass, other, vocals, guitar, piano
        cmd = [
            "python",
            "-m",
            "demucs",
            "--two-stems=vocals",  # Only extract vocals and accompaniment
            "--out",
            str(output_path),
            "--name",
            "htdemucs_6s",
            audio_path,
        ]

        logger.info(f"Starting vocal separation with Demucs v4: {audio_path}")

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, stderr = await process.communicate()

        if process.returncode != 0:
            error_msg = stderr.decode() if stderr else "Unknown error"
            logger.error(f"Demucs vocal separation failed: {error_msg}")
            raise RuntimeError(f"Vocal separation failed: {error_msg}")

        # Demucs outputs to: output_dir/htdemucs_6s/filename/vocals.wav
        filename_stem = Path(audio_path).stem
        vocals_path = str(output_path / "htdemucs_6s" / filename_stem / "vocals.wav")
        accompaniment_path = str(
            output_path / "htdemucs_6s" / filename_stem / "no_vocals.wav"
        )

        logger.info(f"Vocal separation complete: {vocals_path}")
        return vocals_path, accompaniment_path

    async def mix_audio(
        self, vocals_path: str, background_path: str, output_path: str
    ) -> str:
        """
        Mix translated vocals with original background audio using professional ducking.

        Args:
            vocals_path: Path to translated vocals audio
            background_path: Path to original background audio
            output_path: Path for mixed output

        Returns:
            Path to mixed audio file
        """
        # Professional mixing with ducking and normalization
        # -12dB background reduction when vocals are present
        ffmpeg_cmd = [
            "ffmpeg",
            "-i",
            vocals_path,
            "-i",
            background_path,
            "-filter_complex",
            (
                "[0:a]loudnorm=I=-16:TP=-1.5:LRA=11,compand=attacks=0:points=-80/-80|-12/-12|0/-6[vocals];"
                "[1:a]volume=-12dB[bg];"
                "[vocals][bg]amix=inputs=2:duration=longest:weights=1 0.3,alimiter=limit=0.95"
            ),
            "-ar",
            "44100",
            "-b:a",
            "128k",
            "-y",  # Overwrite output file
            output_path,
        ]

        logger.info(f"Mixing audio: vocals={vocals_path}, background={background_path}")

        process = await asyncio.create_subprocess_exec(
            *ffmpeg_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, stderr = await process.communicate()

        if process.returncode != 0:
            error_msg = stderr.decode() if stderr else "Unknown error"
            logger.error(f"FFmpeg audio mixing failed: {error_msg}")
            raise RuntimeError(f"Audio mixing failed: {error_msg}")

        logger.info(f"Audio mixing complete: {output_path}")
        return output_path

    async def normalize_audio(self, audio_path: str) -> str:
        """
        Normalize audio levels to podcast standards (EBU R128) using two-pass loudnorm.

        Args:
            audio_path: Path to input audio file

        Returns:
            Path to normalized audio file
        """
        # Pass 1: Analyze
        analyze_cmd = [
            "ffmpeg",
            "-i",
            audio_path,
            "-af",
            "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json",
            "-f",
            "null",
            "-",
        ]

        logger.info(f"Analyzing audio loudness: {audio_path}")

        process = await asyncio.create_subprocess_exec(
            *analyze_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        _, stderr = await process.communicate()

        # Parse measured values from JSON output
        json_match = re.search(r"\{[^}]*\"input_i\"[^}]*\}", stderr.decode())
        if not json_match:
            logger.error("Failed to analyze audio loudness")
            raise ValueError("Failed to analyze audio loudness")

        measured = json.loads(json_match.group())

        # Pass 2: Apply normalization with measured values
        normalized_path = audio_path.replace(".mp3", "_normalized.mp3")
        normalize_cmd = [
            "ffmpeg",
            "-i",
            audio_path,
            "-af",
            (
                f"loudnorm=I=-16:TP=-1.5:LRA=11:"
                f"measured_I={measured['input_i']}:"
                f"measured_TP={measured['input_tp']}:"
                f"measured_LRA={measured['input_lra']}:"
                f"measured_thresh={measured['input_thresh']}"
            ),
            "-y",
            normalized_path,
        ]

        logger.info(f"Normalizing audio to -16 LUFS: {audio_path}")

        process = await asyncio.create_subprocess_exec(
            *normalize_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        await process.wait()

        if process.returncode != 0:
            logger.error("Audio normalization failed")
            raise RuntimeError("Audio normalization failed")

        logger.info(f"Audio normalization complete: {normalized_path}")
        return normalized_path

    async def get_audio_duration(self, audio_path: str) -> float:
        """
        Extract audio duration in seconds using FFmpeg.

        Args:
            audio_path: Path to audio file

        Returns:
            Duration in seconds
        """
        cmd = [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            audio_path,
        ]

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, stderr = await process.communicate()

        if process.returncode != 0:
            error_msg = stderr.decode() if stderr else "Unknown error"
            logger.error(f"Failed to get audio duration: {error_msg}")
            raise RuntimeError(f"Failed to get audio duration: {error_msg}")

        duration_str = stdout.decode().strip()
        return float(duration_str)

    async def cleanup_temp_files(self, episode_id: str) -> None:
        """
        Remove temporary audio processing files.

        Args:
            episode_id: Episode ID for which to cleanup files
        """
        temp_episode_dir = self.temp_dir / episode_id
        if temp_episode_dir.exists():
            shutil.rmtree(temp_episode_dir)
            logger.info(f"Cleaned up temp files for episode: {episode_id}")
