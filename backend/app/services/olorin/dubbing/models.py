"""
Dubbing Data Models

Message types and metrics for dubbing pipeline communication.
"""

from dataclasses import dataclass, field
from typing import List, Literal, Optional


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

    @property
    def avg_stt_latency_ms(self) -> Optional[float]:
        if not self.stt_latencies_ms:
            return None
        return sum(self.stt_latencies_ms) / len(self.stt_latencies_ms)

    @property
    def avg_translation_latency_ms(self) -> Optional[float]:
        if not self.translation_latencies_ms:
            return None
        return sum(self.translation_latencies_ms) / len(self.translation_latencies_ms)

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
