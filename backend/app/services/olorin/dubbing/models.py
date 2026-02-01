"""
Dubbing Data Models

Message types and metrics for dubbing pipeline communication.
"""

import statistics
from dataclasses import dataclass, field
from typing import Dict, List, Literal, Optional


@dataclass
class TimestampedSegment:
    """Audio segment with video timestamp for sync-focused processing."""

    audio_data: bytes
    video_timestamp_ms: int  # When this segment plays in video timeline
    duration_ms: float  # Expected audio duration


@dataclass
class DubbedSegment:
    """Processed dubbed audio segment with timestamp for playback sync."""

    audio_data: bytes
    video_timestamp_ms: int  # When to play in video timeline
    duration_ms: float  # Audio duration for queue management
    original_text: str
    translated_text: str
    processing_time_ms: float  # Time taken to process


@dataclass
class DubbingMessage:
    """Message type for dubbing pipeline communication."""

    type: Literal[
        "transcript",
        "translation",
        "dubbed_audio",
        "session_started",
        "session_ended",
        "error",
        "latency_report",
        "buffer_status",  # New: continuous flow buffer health
    ]
    data: Optional[str] = None  # Base64 audio data
    original_text: Optional[str] = None
    translated_text: Optional[str] = None
    source_language: Optional[str] = None
    target_language: Optional[str] = None
    timestamp_ms: Optional[float] = None
    latency_ms: Optional[float] = None
    message: Optional[str] = None
    session_id: Optional[str] = None

    # Continuous flow fields
    video_timestamp_ms: Optional[int] = None  # Video timeline position
    duration_ms: Optional[float] = None  # Audio duration
    buffer_ahead_seconds: Optional[float] = None  # How far ahead processing is
    buffer_health: Optional[str] = None  # healthy/warning/critical/emergency
    processing_time_ms: Optional[float] = None  # Pipeline processing time

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        result = {"type": self.type}
        for key in [
            "data",
            "original_text",
            "translated_text",
            "source_language",
            "target_language",
            "timestamp_ms",
            "latency_ms",
            "message",
            "session_id",
            "video_timestamp_ms",
            "duration_ms",
            "buffer_ahead_seconds",
            "buffer_health",
            "processing_time_ms",
        ]:
            value = getattr(self, key)
            if value is not None:
                result[key] = value
        return result


@dataclass
class DubbingMetrics:
    """Metrics for a dubbing session."""

    segments_processed: int = 0
    total_audio_seconds: float = 0.0
    total_characters_translated: int = 0
    total_characters_synthesized: int = 0

    stt_latencies_ms: List[float] = field(default_factory=list)
    translation_latencies_ms: List[float] = field(default_factory=list)
    tts_latencies_ms: List[float] = field(default_factory=list)
    total_latencies_ms: List[float] = field(default_factory=list)

    error_count: int = 0
    reconnection_count: int = 0

    # P2-4: Translation cache stats
    translation_cache_hits: int = 0
    translation_cache_misses: int = 0

    # P2-5: Transcript compression stats
    filler_words_removed: int = 0
    characters_compressed: int = 0

    @property
    def avg_stt_latency_ms(self) -> Optional[float]:
        if not self.stt_latencies_ms:
            return None
        return sum(self.stt_latencies_ms) / len(self.stt_latencies_ms)

    @property
    def avg_translation_latency_ms(self) -> Optional[float]:
        if not self.translation_latencies_ms:
            return None
        return sum(self.translation_latencies_ms) / len(
            self.translation_latencies_ms
        )

    @property
    def avg_tts_latency_ms(self) -> Optional[float]:
        if not self.tts_latencies_ms:
            return None
        return sum(self.tts_latencies_ms) / len(self.tts_latencies_ms)

    @property
    def avg_total_latency_ms(self) -> Optional[float]:
        if not self.total_latencies_ms:
            return None
        return sum(self.total_latencies_ms) / len(self.total_latencies_ms)

    def compute_percentiles(self) -> Dict[str, Optional[float]]:
        """
        P2-2: Compute p50/p95/p99 percentiles for all latency categories.

        Returns dict of percentile values suitable for MongoDB storage.
        """
        result: Dict[str, Optional[float]] = {}
        categories = {
            "stt": self.stt_latencies_ms,
            "translation": self.translation_latencies_ms,
            "tts": self.tts_latencies_ms,
            "total": self.total_latencies_ms,
        }

        for name, latencies in categories.items():
            if len(latencies) >= 2:
                quantiles = statistics.quantiles(latencies, n=100)
                result[f"p50_{name}_latency_ms"] = quantiles[49]
                result[f"p95_{name}_latency_ms"] = quantiles[94]
                result[f"p99_{name}_latency_ms"] = quantiles[98]
            else:
                result[f"p50_{name}_latency_ms"] = None
                result[f"p95_{name}_latency_ms"] = None
                result[f"p99_{name}_latency_ms"] = None

        return result
