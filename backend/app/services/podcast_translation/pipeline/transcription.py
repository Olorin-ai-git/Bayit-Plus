"""Audio transcription using Whisper."""
import logging
from typing import Tuple

from app.services.whisper_transcription_service import \
    WhisperTranscriptionService

logger = logging.getLogger(__name__)


async def transcribe_audio(
    audio_path: str, stt_service: WhisperTranscriptionService
) -> Tuple[str, str]:
    """
    Transcribe audio using OpenAI Whisper with automatic language detection.

    Args:
        audio_path: Path to audio file
        stt_service: Whisper transcription service

    Returns:
        Tuple of (transcript text, detected language code)

    Note:
        Whisper is more accurate than Google Speech for podcast transcription
    """
    logger.info(f"Transcribing audio using OpenAI Whisper: {audio_path}")
    text, language = await stt_service.transcribe_audio_file(audio_path)
    logger.info(
        f"Transcription complete: {len(text)} characters, language: {language}"
    )
    return text, language
