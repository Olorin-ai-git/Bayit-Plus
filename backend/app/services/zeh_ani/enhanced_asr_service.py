"""
Enhanced ASR Service.

Wraps the existing Whisper transcription service with child-speech
optimizations and Hebrew-English code-switch detection.
"""

from typing import List, Optional

from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class CodeSwitchEvent:
    """Detected language switch within a transcription segment."""

    def __init__(
        self, start_time: float, end_time: float,
        from_lang: str, to_lang: str, text: str,
    ):
        self.start_time = start_time
        self.end_time = end_time
        self.from_lang = from_lang
        self.to_lang = to_lang
        self.text = text


class TranscriptionResult:
    """Enhanced transcription result with code-switch metadata."""

    def __init__(
        self, text: str, language: str,
        segments: Optional[list] = None,
        code_switches: Optional[List[CodeSwitchEvent]] = None,
    ):
        self.text = text
        self.language = language
        self.segments = segments or []
        self.code_switches = code_switches or []

    def to_dict(self) -> dict:
        return {
            "text": self.text,
            "language": self.language,
            "segments": self.segments,
            "code_switches": [
                {
                    "start_time": cs.start_time,
                    "end_time": cs.end_time,
                    "from_lang": cs.from_lang,
                    "to_lang": cs.to_lang,
                    "text": cs.text,
                }
                for cs in self.code_switches
            ],
        }


class EnhancedASRService:
    """Whisper ASR with child-speech optimizations."""

    async def transcribe_child_speech(
        self,
        audio_data: bytes,
        language_hints: Optional[List[str]] = None,
    ) -> dict:
        """
        Transcribe child speech with enhanced parameters.

        Uses the child-optimized Whisper model and optional
        language hints for bilingual code-switch detection.
        """
        from app.services.whisper_transcription_service import (
            WhisperTranscriptionService,
        )

        hints = language_hints or settings.WHISPER_LANGUAGE_HINTS.split(",")
        primary_lang = hints[0] if hints else "he"

        whisper_service = WhisperTranscriptionService()
        transcript = await whisper_service.transcribe_audio_chunk(
            audio_data, source_lang=primary_lang,
        )

        if not transcript:
            return TranscriptionResult(
                text="", language=primary_lang,
            ).to_dict()

        code_switches = []
        if settings.WHISPER_CODE_SWITCH_ENABLED and len(hints) > 1:
            code_switches = self._detect_code_switches(
                transcript, hints,
            )

        result = TranscriptionResult(
            text=transcript,
            language=primary_lang,
            code_switches=code_switches,
        )

        logger.info(
            "Child speech transcribed",
            extra={
                "language": primary_lang,
                "text_length": len(transcript),
                "code_switches": len(code_switches),
            },
        )

        return result.to_dict()

    def _detect_code_switches(
        self, text: str, language_hints: List[str],
    ) -> List[CodeSwitchEvent]:
        """
        Detect language switches in transcribed text.

        Simple heuristic: Hebrew characters vs Latin characters.
        """
        switches = []
        current_lang = language_hints[0]
        words = text.split()
        position = 0.0

        for word in words:
            is_hebrew = any("\u0590" <= ch <= "\u05FF" for ch in word)
            detected_lang = "he" if is_hebrew else "en"

            if detected_lang != current_lang:
                switches.append(CodeSwitchEvent(
                    start_time=position,
                    end_time=position + 0.5,
                    from_lang=current_lang,
                    to_lang=detected_lang,
                    text=word,
                ))
                current_lang = detected_lang

            position += 0.5

        return switches


enhanced_asr_service = EnhancedASRService()
