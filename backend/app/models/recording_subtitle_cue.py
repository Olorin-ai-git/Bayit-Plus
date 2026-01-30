"""
Recording Subtitle Cue Model
Individual subtitle cues captured during recording sessions.
"""

from datetime import datetime

from beanie import Document
from pydantic import Field


class RecordingSubtitleCue(Document):
    """Individual subtitle cues captured during recording"""

    recording_id: str
    sequence: int

    # Timing (relative to recording start)
    start_time_seconds: float
    end_time_seconds: float

    # Content
    text: str
    original_text: str
    source_lang: str
    target_lang: str
    confidence: float

    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "recording_subtitle_cues"
        indexes = [
            [("recording_id", 1), ("sequence", 1)],
        ]
