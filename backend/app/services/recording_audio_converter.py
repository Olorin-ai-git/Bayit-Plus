"""
Recording Audio Converter
Handles PCM to AAC conversion for dubbed audio tracks.
"""

import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


async def convert_pcm_to_aac(
    pcm_path: Path, recording_id: str
) -> Optional[Path]:
    """
    Convert raw PCM file to AAC using FFmpeg.

    Args:
        pcm_path: Path to the PCM file
        recording_id: Recording ID for logging

    Returns:
        Path to the AAC file, or None if conversion fails
    """
    if not pcm_path.exists():
        return None

    aac_path = pcm_path.with_suffix(".aac")

    try:
        from app.services.ffmpeg_service import ffmpeg_service

        await ffmpeg_service.extract_audio(
            input_path=str(pcm_path),
            output_path=str(aac_path),
            audio_codec="aac",
            audio_bitrate="128k",
        )

        if aac_path.exists():
            logger.info(
                "PCM converted to AAC",
                extra={
                    "recording_id": recording_id,
                    "aac_path": str(aac_path),
                    "aac_size": aac_path.stat().st_size,
                },
            )
            pcm_path.unlink(missing_ok=True)
            return aac_path

        logger.warning(
            "AAC conversion produced no output",
            extra={"recording_id": recording_id},
        )
        return None

    except Exception as e:
        logger.error(
            "Failed to convert PCM to AAC",
            extra={"recording_id": recording_id, "error": str(e)},
        )
        return None
