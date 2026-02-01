"""
Transcript Event Bus - Server-side broadcast of live transcripts.

Publishes transcripts from STT to multiple consumer services:
- Trivia (topic detection and fact extraction)
- Highlights (moment detection)
- Catchup (transcript accumulation)
- Search Index (full-text search)
"""

from app.services.transcript_bus.event_bus import TranscriptEventBus
from app.services.transcript_bus.models import TranscriptEvent

_transcript_bus: TranscriptEventBus | None = None


def get_transcript_bus() -> TranscriptEventBus:
    """Get singleton TranscriptEventBus instance.

    Returns:
        Global transcript event bus
    """
    global _transcript_bus
    if _transcript_bus is None:
        _transcript_bus = TranscriptEventBus()
    return _transcript_bus


__all__ = ["TranscriptEvent", "TranscriptEventBus", "get_transcript_bus"]
