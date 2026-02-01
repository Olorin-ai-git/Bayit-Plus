"""
Transcript Event models.

Frozen dataclass for immutable, memory-efficient event sharing across queues.
"""

from dataclasses import dataclass
from typing import Literal


@dataclass(frozen=True)
class TranscriptEvent:
    """Immutable transcript event for bus distribution.

    Frozen dataclass ensures:
    - Thread-safe sharing across multiple consumer queues
    - Memory efficiency (single instance shared by all subscribers)
    - Hashable for deduplication if needed
    """

    channel_id: str
    session_id: str
    text: str
    text_translated: str | None
    source_lang: str
    target_lang: str
    timestamp: float
    is_partial: bool
    confidence: float
    event_type: Literal["transcript", "channel_start", "channel_end"] = "transcript"

    def __str__(self) -> str:
        """String representation for logging."""
        if self.event_type == "transcript":
            text_preview = self.text[:50] + "..." if len(self.text) > 50 else self.text
            return f"TranscriptEvent(channel={self.channel_id}, text='{text_preview}')"
        return f"TranscriptEvent(channel={self.channel_id}, type={self.event_type})"
