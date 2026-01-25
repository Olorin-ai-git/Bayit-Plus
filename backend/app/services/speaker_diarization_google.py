"""
Speaker Diarization Service (Google Cloud Version)
Detects and segments different speakers using Google Cloud Speech-to-Text.
No HuggingFace or external dependencies required.
"""

import logging
from typing import Dict, List, Tuple

logger = logging.getLogger(__name__)


class SpeakerSegment:
    """Represents a segment of speech from a single speaker."""

    def __init__(
        self,
        speaker_id: str,
        start_time: float,
        end_time: float,
        text: str = "",
    ):
        """
        Initialize speaker segment.

        Args:
            speaker_id: Unique identifier for speaker (e.g., "SPEAKER_00", "SPEAKER_01")
            start_time: Start time in seconds
            end_time: End time in seconds
            text: Transcript text for this segment
        """
        self.speaker_id = speaker_id
        self.start_time = start_time
        self.end_time = end_time
        self.text = text
        self.duration = end_time - start_time

    def __repr__(self):
        return f"SpeakerSegment({self.speaker_id}, {self.start_time:.2f}s-{self.end_time:.2f}s, {len(self.text)} chars)"


class GoogleSpeakerDiarizationService:
    """
    Detects different speakers in audio using Google Cloud Speech-to-Text.
    No external dependencies - uses existing Google Cloud infrastructure.
    """

    def __init__(self):
        """Initialize speaker diarization service."""
        from app.services.google_speech_service import GoogleSpeechService

        self.google_speech = GoogleSpeechService()
        logger.info("GoogleSpeakerDiarizationService initialized")

    async def diarize_audio(
        self,
        audio_path: str,
        language: str = "en-US",
        min_speakers: int = 1,
        max_speakers: int = 6,
    ) -> List[SpeakerSegment]:
        """
        Detect and segment speakers in audio file using Google Cloud.

        Args:
            audio_path: Path to audio file (vocals only for best results)
            language: Language code (e.g., "en-US", "he-IL")
            min_speakers: Minimum number of speakers to detect
            max_speakers: Maximum number of speakers to detect

        Returns:
            List of SpeakerSegment objects with timing info and text

        Note: For podcast translation, pass vocals_path (separated vocals)
              for more accurate speaker detection without background noise
        """
        logger.info(f"Diarizing audio with Google Cloud: {audio_path}")
        logger.info(f"Detecting {min_speakers}-{max_speakers} speakers...")

        # Use Google Cloud Speech-to-Text with speaker diarization
        result = await self.google_speech.transcribe_with_speaker_diarization(
            audio_path=audio_path,
            language=language,
            min_speakers=min_speakers,
            max_speakers=max_speakers,
        )

        # Convert to SpeakerSegment objects
        segments = []
        for speaker_data in result["speakers"]:
            segment = SpeakerSegment(
                speaker_id=speaker_data["speaker_id"],
                start_time=speaker_data["start_time"],
                end_time=speaker_data["end_time"],
                text=speaker_data["text"],
            )
            segments.append(segment)

        # Log speaker statistics
        speakers = set(seg.speaker_id for seg in segments)
        logger.info(f"✅ Detected {len(speakers)} speaker(s): {sorted(speakers)}")
        for speaker in sorted(speakers):
            speaker_segments = [s for s in segments if s.speaker_id == speaker]
            total_time = sum(s.duration for s in speaker_segments)
            logger.info(
                f"  {speaker}: {len(speaker_segments)} segments, {total_time:.1f}s total"
            )

        return segments

    def get_speaker_voice_mapping(
        self,
        segments: List[SpeakerSegment],
        language: str,
        default_gender: str = "male",
    ) -> Dict[str, Tuple[str, str]]:
        """
        Assign different voices to each speaker for translation.

        Args:
            segments: Speaker segments (to count speakers)
            language: Target language code
            default_gender: Default gender for first speaker

        Returns:
            Dict mapping speaker_id to (voice_id, gender) tuple

        Strategy:
        - First speaker: use default gender
        - Subsequent speakers: alternate genders
        - If more than 2 speakers: use different voice styles
        """
        from app.core.config import settings

        speakers = sorted(set(seg.speaker_id for seg in segments))
        voice_mapping = {}

        for i, speaker in enumerate(speakers):
            # Alternate genders for different speakers
            if i == 0:
                gender = default_gender
            else:
                gender = "female" if i % 2 == 1 else "male"

            # Get voice ID for language and gender
            if language == "he":
                # Hebrew uses Google TTS
                if gender == "male":
                    voice_id = "he-IL-Wavenet-B"
                else:
                    voice_id = "he-IL-Wavenet-A"
            else:
                # English uses ElevenLabs
                if gender == "male":
                    voice_id = settings.ELEVENLABS_ENGLISH_MALE_VOICE_ID
                else:
                    voice_id = settings.ELEVENLABS_ENGLISH_VOICE_ID

            voice_mapping[speaker] = (voice_id, gender)
            logger.info(f"Assigned voice to {speaker}: {gender} ({voice_id})")

        return voice_mapping

    async def translate_segments_by_speaker(
        self,
        segments: List[SpeakerSegment],
        source_lang: str,
        target_lang: str,
    ) -> List[SpeakerSegment]:
        """
        Translate each speaker's segments to target language.

        Args:
            segments: Speaker segments with original text
            source_lang: Source language code (e.g., "en")
            target_lang: Target language code (e.g., "he")

        Returns:
            Speaker segments with translated text
        """
        from app.services.olorin.dubbing.translation import TranslationProvider

        logger.info(f"Translating {len(segments)} segments from {source_lang} to {target_lang}")

        # Initialize translation provider
        translation_provider = TranslationProvider(target_language=target_lang)
        await translation_provider.initialize()

        # Translate each segment
        translated_segments = []
        for segment in segments:
            if segment.text.strip():
                # Translate segment text
                translated_text = await translation_provider.translate(
                    text=segment.text,
                    source_lang=source_lang,
                )

                # Create new segment with translated text
                translated_segment = SpeakerSegment(
                    speaker_id=segment.speaker_id,
                    start_time=segment.start_time,
                    end_time=segment.end_time,
                    text=translated_text,
                )
                translated_segments.append(translated_segment)

        logger.info(f"✅ Translated {len(translated_segments)} speaker segments")

        return translated_segments
