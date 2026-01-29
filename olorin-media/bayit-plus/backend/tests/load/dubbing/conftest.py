"""
Load Test Fixtures for Dubbing (P2-7)

Provides test data and configuration for locust load tests.
"""

import os
import struct
from typing import List


def generate_pcm_audio(
    duration_ms: int = 100,
    sample_rate: int = 16000,
    frequency_hz: int = 440,
) -> bytes:
    """
    Generate synthetic PCM audio for load testing.

    Args:
        duration_ms: Duration in milliseconds
        sample_rate: Sample rate in Hz
        frequency_hz: Tone frequency in Hz

    Returns:
        Raw 16-bit signed PCM bytes
    """
    import math

    num_samples = int(sample_rate * duration_ms / 1000)
    samples = []

    for i in range(num_samples):
        t = i / sample_rate
        # Generate sine wave at specified frequency
        value = int(16000 * math.sin(2 * math.pi * frequency_hz * t))
        samples.append(value)

    return struct.pack(f"<{num_samples}h", *samples)


def get_test_audio_chunks(
    total_duration_s: int = 60,
    chunk_duration_ms: int = 100,
) -> List[bytes]:
    """
    Generate a list of audio chunks for streaming simulation.

    Args:
        total_duration_s: Total audio duration in seconds
        chunk_duration_ms: Size of each chunk in milliseconds

    Returns:
        List of PCM audio byte chunks
    """
    num_chunks = (total_duration_s * 1000) // chunk_duration_ms
    return [
        generate_pcm_audio(duration_ms=chunk_duration_ms)
        for _ in range(num_chunks)
    ]


# Load test configuration from environment
LOAD_TEST_CONFIG = {
    "base_url": os.getenv(
        "LOAD_TEST_BASE_URL", "http://localhost:8090"
    ),
    "ws_url": os.getenv(
        "LOAD_TEST_WS_URL", "ws://localhost:8090"
    ),
    "api_key": os.getenv("LOAD_TEST_API_KEY", ""),
    "source_language": os.getenv("LOAD_TEST_SOURCE_LANG", "he"),
    "target_language": os.getenv("LOAD_TEST_TARGET_LANG", "en"),
}
