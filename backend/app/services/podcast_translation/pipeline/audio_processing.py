"""Audio processing: separation, mixing, trimming."""
import asyncio
import logging

from app.services.audio_processing_service import AudioProcessingService

logger = logging.getLogger(__name__)


class AudioProcessor:
    """Handles audio processing operations."""

    def __init__(self, audio_processor: AudioProcessingService):
        """Initialize with audio processing service."""
        self.audio_processor = audio_processor

    async def separate_vocals(self, audio_path: str, output_dir: str):
        """
        Separate vocals from background using Demucs.

        Args:
            audio_path: Path to input audio file
            output_dir: Directory for output files

        Returns:
            Tuple of (vocals_path, background_path)
        """
        logger.info(f"Separating vocals from background: {audio_path}")
        vocals_path, background_path = await self.audio_processor.separate_vocals(
            audio_path=audio_path, output_dir=output_dir
        )
        logger.info(f"✅ Vocals separated: vocals={vocals_path}, background={background_path}")
        return vocals_path, background_path

    async def mix_audio(self, vocals_path: str, background_path: str, output_path: str):
        """
        Mix translated vocals with original background.

        Args:
            vocals_path: Path to translated vocals audio
            background_path: Path to original background audio
            output_path: Path for mixed output

        Returns:
            Path to mixed audio file
        """
        logger.info(f"Mixing vocals with background: {vocals_path} + {background_path}")
        mixed_path = await self.audio_processor.mix_audio(
            vocals_path=vocals_path,
            background_path=background_path,
            output_path=output_path,
        )
        logger.info(f"✅ Audio mixed: {mixed_path}")
        return mixed_path

    async def trim_audio(
        self, input_path: str, output_path: str, duration_seconds: int
    ):
        """
        Trim audio file to specified duration using FFmpeg.

        Args:
            input_path: Path to input audio file
            output_path: Path to save trimmed audio
            duration_seconds: Duration to trim to in seconds
        """
        logger.info(f"Trimming audio to {duration_seconds} seconds: {input_path}")

        # Use FFmpeg to trim audio
        cmd = [
            "ffmpeg",
            "-i",
            input_path,
            "-t",
            str(duration_seconds),
            "-c",
            "copy",  # Copy codec (fast, no re-encoding)
            "-y",  # Overwrite output file
            output_path,
        ]

        process = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )

        stdout, stderr = await process.communicate()

        if process.returncode != 0:
            error_msg = stderr.decode() if stderr else "Unknown error"
            raise RuntimeError(f"FFmpeg trim failed: {error_msg}")

        logger.info(f"✅ Audio trimmed successfully: {output_path}")

    async def get_audio_duration(self, audio_path: str):
        """Get audio file duration in seconds."""
        return await self.audio_processor.get_audio_duration(audio_path)
