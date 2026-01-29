"""
Audio Quality Verification (P2-6)

Lightweight PCM audio quality checks using struct (no numpy dependency).
Detects clipping, silence, and basic amplitude issues.
"""

import logging
import struct
from dataclasses import dataclass, field
from typing import List

from app.core.config import settings

logger = logging.getLogger(__name__)

# 16-bit signed PCM range
INT16_MAX = 32767
INT16_MIN = -32768


@dataclass
class AudioQualityResult:
    """Result of audio quality analysis."""

    is_valid: bool = True
    warnings: List[str] = field(default_factory=list)
    sample_count: int = 0
    clipping_ratio: float = 0.0
    silence_ratio: float = 0.0
    peak_amplitude: int = 0
    rms_estimate: float = 0.0


def validate_audio_quality(audio_data: bytes) -> AudioQualityResult:
    """
    Validate PCM audio quality.

    Performs lightweight checks on 16-bit signed PCM audio:
    - Clipping detection (samples at INT16_MAX/MIN)
    - Silence ratio estimation
    - Peak amplitude analysis

    Args:
        audio_data: Raw PCM audio bytes (16-bit signed, little-endian)

    Returns:
        AudioQualityResult with metrics and warnings
    """
    if not settings.olorin.dubbing.audio_quality_check_enabled:
        return AudioQualityResult()

    if not audio_data or len(audio_data) < 2:
        return AudioQualityResult(is_valid=False, warnings=["Empty audio"])

    if len(audio_data) % 2 != 0:
        return AudioQualityResult(
            is_valid=False,
            warnings=["Invalid PCM: odd byte count"],
        )

    sample_count = len(audio_data) // 2
    result = AudioQualityResult(sample_count=sample_count)

    # Unpack samples
    fmt = f"<{sample_count}h"  # little-endian signed shorts
    try:
        samples = struct.unpack(fmt, audio_data)
    except struct.error as e:
        return AudioQualityResult(
            is_valid=False,
            warnings=[f"Failed to unpack PCM data: {e}"],
        )

    # Analyze samples
    clipping_count = 0
    silence_count = 0
    peak = 0
    sum_sq = 0.0
    silence_threshold = 100  # ~-50dB for 16-bit

    for sample in samples:
        abs_sample = abs(sample)

        # Peak tracking
        if abs_sample > peak:
            peak = abs_sample

        # Clipping detection
        if sample == INT16_MAX or sample == INT16_MIN:
            clipping_count += 1

        # Silence detection
        if abs_sample < silence_threshold:
            silence_count += 1

        # RMS accumulation (use float to avoid overflow)
        sum_sq += float(sample) * float(sample)

    result.peak_amplitude = peak
    result.clipping_ratio = clipping_count / sample_count
    result.silence_ratio = silence_count / sample_count
    result.rms_estimate = (sum_sq / sample_count) ** 0.5

    # Generate warnings
    clipping_threshold = settings.olorin.dubbing.audio_clipping_threshold
    silence_threshold_ratio = settings.olorin.dubbing.audio_silence_threshold

    if result.clipping_ratio > clipping_threshold:
        result.warnings.append(
            f"Audio clipping detected: {result.clipping_ratio:.1%} "
            f"of samples at max amplitude"
        )

    if result.silence_ratio > silence_threshold_ratio:
        result.warnings.append(
            f"Mostly silent audio: {result.silence_ratio:.1%} "
            f"of samples below threshold"
        )

    if peak == 0:
        result.warnings.append("All-zero audio (digital silence)")

    # Log warnings
    for warning in result.warnings:
        logger.warning(f"Audio quality: {warning}")

    return result
