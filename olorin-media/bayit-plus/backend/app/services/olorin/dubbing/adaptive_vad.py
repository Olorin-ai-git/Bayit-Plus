"""
Adaptive Voice Activity Detection (P3-5)

Calibrates silence and speech thresholds based on initial audio
from each session. Adjusts dynamically as ambient noise changes.

Includes:
- Security #7: Upper bounds on calibration thresholds
- Voice Tech #14: speech_multiplier=2.0 with hysteresis
"""

import logging
import struct
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)

# Calibration constants
CALIBRATION_DURATION_MS = 2000  # Analyze first 2 seconds
SAMPLE_RATE = 16000
CALIBRATION_SAMPLE_COUNT = SAMPLE_RATE * CALIBRATION_DURATION_MS // 1000

# Security #7: Upper bounds on calibration thresholds
# Prevents malicious audio from setting unreachable thresholds
MAX_SPEECH_THRESHOLD_RMS = 10000.0
MAX_SILENCE_THRESHOLD_RMS = 5000.0
MAX_NOISE_FLOOR_RMS = 5000.0

# Voice Tech #14: Hysteresis for speech/silence transitions
HANGOVER_FRAMES = 3  # Keep detecting speech for N frames after drop


@dataclass
class VADCalibration:
    """Calibration result from initial audio analysis."""

    noise_floor_rms: float = 0.0
    speech_threshold_rms: float = 500.0
    silence_threshold_rms: float = 100.0
    calibrated: bool = False


class AdaptiveVAD:
    """
    Adaptive Voice Activity Detection.

    Performs a calibration phase during session start by analyzing
    the first ~2 seconds of audio to determine ambient noise levels.
    Adjusts speech/silence thresholds accordingly.
    """

    def __init__(self):
        self._calibration = VADCalibration()
        self._calibration_buffer: bytes = b""
        self._calibration_complete = False
        self._samples_collected = 0
        # Voice Tech #14: Reduced from 3.0 to 2.0 for less aggressive detection
        self._speech_multiplier = 2.0
        # Multiplier above noise floor to detect silence
        self._silence_multiplier = 1.5
        # Voice Tech #14: Hangover counter to prevent speech truncation
        self._hangover_count = 0

    @property
    def is_calibrated(self) -> bool:
        """Check if calibration is complete."""
        return self._calibration_complete

    @property
    def calibration(self) -> VADCalibration:
        """Get current calibration values."""
        return self._calibration

    def process_chunk(self, audio_data: bytes) -> Optional[bool]:
        """
        Process an audio chunk through VAD.

        Handles both calibration and speech detection in a single method.
        Code Review #5: Single entry point instead of exposing internal state.

        Args:
            audio_data: Raw 16-bit PCM audio bytes

        Returns:
            True if speech detected, False if silence, None during calibration
        """
        if not self._calibration_complete:
            self.process_calibration_chunk(audio_data)
            return None  # During calibration, caller should forward all audio
        return self.is_speech(audio_data)

    def process_calibration_chunk(
        self, audio_data: bytes
    ) -> bool:
        """
        Feed audio data for calibration.

        Args:
            audio_data: Raw 16-bit PCM audio bytes

        Returns:
            True when calibration is complete
        """
        if self._calibration_complete:
            return True

        self._calibration_buffer += audio_data
        self._samples_collected += len(audio_data) // 2

        if self._samples_collected >= CALIBRATION_SAMPLE_COUNT:
            self._perform_calibration()
            return True

        return False

    def _perform_calibration(self) -> None:
        """Analyze buffered audio to determine noise floor."""
        sample_count = len(self._calibration_buffer) // 2
        if sample_count == 0:
            self._calibration_complete = True
            return

        fmt = f"<{sample_count}h"
        try:
            samples = struct.unpack(fmt, self._calibration_buffer[:sample_count * 2])
        except struct.error:
            logger.warning("VAD calibration: failed to unpack audio")
            self._calibration_complete = True
            return

        # Compute RMS of calibration audio (likely ambient noise)
        sum_sq = sum(float(s) * float(s) for s in samples)
        rms = (sum_sq / sample_count) ** 0.5

        # Security #7: Clamp noise floor to prevent extreme thresholds
        clamped_rms = min(rms, MAX_NOISE_FLOOR_RMS)

        self._calibration.noise_floor_rms = clamped_rms

        # Security #7: Apply upper bounds on computed thresholds
        self._calibration.speech_threshold_rms = min(
            max(clamped_rms * self._speech_multiplier, 200.0),
            MAX_SPEECH_THRESHOLD_RMS,
        )
        self._calibration.silence_threshold_rms = min(
            max(clamped_rms * self._silence_multiplier, 50.0),
            MAX_SILENCE_THRESHOLD_RMS,
        )
        self._calibration.calibrated = True
        self._calibration_complete = True

        # Free calibration buffer
        self._calibration_buffer = b""

        logger.info(
            f"VAD calibrated: noise_floor={clamped_rms:.1f}, "
            f"speech_threshold={self._calibration.speech_threshold_rms:.1f}, "
            f"silence_threshold={self._calibration.silence_threshold_rms:.1f}"
        )

    def is_speech(self, audio_data: bytes) -> Optional[bool]:
        """
        Determine if an audio chunk contains speech.

        Uses hysteresis (hangover period) to prevent premature
        speech-to-silence transitions (Voice Tech #14).

        Args:
            audio_data: Raw 16-bit PCM audio bytes

        Returns:
            True if speech detected, False if silence, None if not calibrated
        """
        if not self._calibration_complete:
            return None

        sample_count = len(audio_data) // 2
        if sample_count == 0:
            return False

        fmt = f"<{sample_count}h"
        try:
            samples = struct.unpack(fmt, audio_data)
        except struct.error:
            return None

        sum_sq = sum(float(s) * float(s) for s in samples)
        rms = (sum_sq / sample_count) ** 0.5

        if rms >= self._calibration.speech_threshold_rms:
            # Speech detected - reset hangover counter
            self._hangover_count = HANGOVER_FRAMES
            return True

        # Voice Tech #14: Hangover - keep returning True for a few frames
        # after speech drops below threshold to prevent truncation
        if self._hangover_count > 0:
            self._hangover_count -= 1
            return True

        return False
