"""
Adaptive Voice Activity Detection (P3-5)

Calibrates silence and speech thresholds based on initial audio
from each session. Adjusts dynamically as ambient noise changes.
"""

import logging
import struct
from dataclasses import dataclass
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

# Calibration constants
CALIBRATION_DURATION_MS = 2000  # Analyze first 2 seconds
SAMPLE_RATE = 16000
CALIBRATION_SAMPLE_COUNT = SAMPLE_RATE * CALIBRATION_DURATION_MS // 1000


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
        # Multiplier above noise floor to detect speech
        self._speech_multiplier = 3.0
        # Multiplier above noise floor to detect silence
        self._silence_multiplier = 1.5

    @property
    def is_calibrated(self) -> bool:
        """Check if calibration is complete."""
        return self._calibration_complete

    @property
    def calibration(self) -> VADCalibration:
        """Get current calibration values."""
        return self._calibration

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

        self._calibration.noise_floor_rms = rms
        self._calibration.speech_threshold_rms = max(
            rms * self._speech_multiplier, 200.0
        )
        self._calibration.silence_threshold_rms = max(
            rms * self._silence_multiplier, 50.0
        )
        self._calibration.calibrated = True
        self._calibration_complete = True

        # Free calibration buffer
        self._calibration_buffer = b""

        logger.info(
            f"VAD calibrated: noise_floor={rms:.1f}, "
            f"speech_threshold={self._calibration.speech_threshold_rms:.1f}, "
            f"silence_threshold={self._calibration.silence_threshold_rms:.1f}"
        )

    def is_speech(self, audio_data: bytes) -> Optional[bool]:
        """
        Determine if an audio chunk contains speech.

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

        return rms >= self._calibration.speech_threshold_rms
