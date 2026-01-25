"""
Speaker Diarization Service
Detects and segments different speakers in podcast audio using pyannote.audio.
Enables multi-speaker translation with different voices for each speaker.
"""

import asyncio
import logging
from pathlib import Path
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
            text: Transcript text for this segment (empty until aligned with transcript)
        """
        self.speaker_id = speaker_id
        self.start_time = start_time
        self.end_time = end_time
        self.text = text
        self.duration = end_time - start_time

    def __repr__(self):
        return f"SpeakerSegment({self.speaker_id}, {self.start_time:.2f}s-{self.end_time:.2f}s, {len(self.text)} chars)"


class SpeakerDiarizationService:
    """
    Detects different speakers in audio using pyannote.audio.
    Segments transcript by speaker for multi-voice translation.
    """

    def __init__(self):
        """Initialize speaker diarization service."""
        self.pipeline = None
        logger.info("SpeakerDiarizationService initialized")

    async def initialize(self):
        """
        Initialize pyannote.audio pipeline.
        Requires HuggingFace token for pretrained models.
        """
        try:
            from pyannote.audio import Pipeline
            from app.core.config import settings

            logger.info("Loading pyannote.audio speaker diarization pipeline...")

            # Load pretrained pipeline from HuggingFace
            # Requires: pip install pyannote.audio
            # And HuggingFace token with access to pyannote models
            self.pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-3.1",
                use_auth_token=settings.HUGGINGFACE_TOKEN,
            )

            logger.info("✅ Speaker diarization pipeline loaded")

        except ImportError:
            logger.error(
                "pyannote.audio not installed. Install with: pip install pyannote.audio"
            )
            raise RuntimeError(
                "Speaker diarization requires pyannote.audio package"
            )
        except Exception as e:
            logger.error(f"Failed to load diarization pipeline: {e}")
            raise

    async def diarize_audio(
        self, audio_path: str, min_speakers: int = 1, max_speakers: int = 10
    ) -> List[SpeakerSegment]:
        """
        Detect and segment speakers in audio file.

        Args:
            audio_path: Path to audio file (vocals only for best results)
            min_speakers: Minimum number of speakers to detect
            max_speakers: Maximum number of speakers to detect

        Returns:
            List of SpeakerSegment objects with timing info

        Note: For podcast translation, pass vocals_path (separated vocals)
              for more accurate speaker detection without background noise
        """
        if not self.pipeline:
            await self.initialize()

        logger.info(f"Diarizing audio: {audio_path}")
        logger.info(f"Detecting {min_speakers}-{max_speakers} speakers...")

        # Run diarization (synchronous operation)
        # Note: pyannote.audio is CPU/GPU intensive, runs in thread pool
        loop = asyncio.get_event_loop()
        diarization = await loop.run_in_executor(
            None,
            lambda: self.pipeline(
                audio_path,
                min_speakers=min_speakers,
                max_speakers=max_speakers,
            ),
        )

        # Convert pyannote diarization to SpeakerSegment objects
        segments = []
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            segment = SpeakerSegment(
                speaker_id=speaker,
                start_time=turn.start,
                end_time=turn.end,
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

    async def align_transcript_with_speakers(
        self,
        segments: List[SpeakerSegment],
        transcript: str,
        audio_path: str,
    ) -> List[SpeakerSegment]:
        """
        Align transcript text with speaker segments using Whisper word-level timestamps.

        Args:
            segments: Speaker segments with timing info from diarization
            transcript: Full transcript text
            audio_path: Path to audio file for re-transcription with timestamps

        Returns:
            Speaker segments with aligned transcript text

        Note: Uses Whisper word-level timestamps to map words to speakers
        """
        logger.info("Aligning transcript with speaker segments...")

        # Get word-level timestamps from Whisper
        from app.services.whisper_transcription_service import (
            WhisperTranscriptionService,
        )

        whisper = WhisperTranscriptionService()
        words_with_timestamps = await whisper.transcribe_with_word_timestamps(
            audio_path
        )

        # Map words to speakers based on timestamp overlap
        for segment in segments:
            # Find words that fall within this speaker's time range
            segment_words = []
            for word_data in words_with_timestamps:
                word_start = word_data["start"]
                word_end = word_data["end"]
                word_text = word_data["word"]

                # Check if word overlaps with this speaker segment
                # Use 80% overlap threshold to handle boundary cases
                overlap_start = max(segment.start_time, word_start)
                overlap_end = min(segment.end_time, word_end)
                overlap_duration = max(0, overlap_end - overlap_start)
                word_duration = word_end - word_start

                if overlap_duration >= 0.8 * word_duration:
                    segment_words.append(word_text)

            # Join words into segment text
            segment.text = " ".join(segment_words).strip()

        # Log alignment results
        aligned_segments = [s for s in segments if s.text]
        logger.info(
            f"✅ Aligned {len(aligned_segments)}/{len(segments)} segments with transcript"
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
