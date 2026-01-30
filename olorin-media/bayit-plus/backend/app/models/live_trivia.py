"""
Live Trivia Models

Data models for live trivia feature that detects topics from live stream
transcriptions and generates/displays trivia facts during broadcasts.
"""

from datetime import datetime
from typing import List, Optional

from beanie import Document
from pydantic import Field
from pymongo import IndexModel, ASCENDING


class LiveTriviaTopic(Document):
    """Detected topic from live stream transcription."""

    # Identification
    topic_text: str = Field(..., description="Normalized topic text (e.g., 'Vladimir Putin')")
    topic_hash: str = Field(..., description="SHA256 hash for deduplication")
    entity_type: str = Field(
        ...,
        description="Entity type: person|place|event|organization"
    )

    # Channel tracking
    channel_id: str = Field(..., description="LiveChannel ID (e.g., 'kan11')")
    detected_at: datetime = Field(default_factory=datetime.utcnow)

    # Detection metadata
    mention_count: int = Field(default=1, ge=1)
    confidence_score: float = Field(default=0.0, ge=0.0, le=1.0)
    source_transcript: str = Field(
        ...,
        max_length=500,
        description="Original transcript snippet (500 chars max)"
    )

    # Search/fact generation
    search_queries: List[str] = Field(default_factory=list)
    facts_generated: int = Field(default=0, ge=0)
    last_search_at: Optional[datetime] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "live_trivia_topics"
        indexes = [
            # Unique compound index prevents duplicate topics per channel
            IndexModel(
                [("channel_id", 1), ("topic_hash", 1)],
                unique=True
            ),
            "detected_at",
        ]


class LiveTriviaSession(Document):
    """User's live trivia viewing session."""

    # Session identification
    user_id: str = Field(..., description="User ID")
    channel_id: str = Field(..., description="Channel being watched")
    session_start: datetime = Field(default_factory=datetime.utcnow)
    session_end: Optional[datetime] = None

    # Shown content tracking (FIFO with max 100 items)
    shown_topics: List[str] = Field(
        default_factory=list,
        max_length=100,
        description="topic_hash list (max 100)"
    )
    shown_fact_ids: List[str] = Field(
        default_factory=list,
        max_length=100,
        description="fact_id list (max 100)"
    )

    # User preferences (session-specific)
    frequency: str = Field(
        default="normal",
        pattern="^(off|low|normal|high)$"
    )
    last_fact_shown_at: Optional[datetime] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "live_trivia_sessions"
        indexes = [
            "user_id",
            [("user_id", 1), ("channel_id", 1)],
            # TTL index: auto-delete sessions 24 hours after last activity
            IndexModel(
                [("updated_at", ASCENDING)],
                expireAfterSeconds=86400  # 24 hours
            ),
        ]

    def add_shown_topic(self, topic_hash: str) -> None:
        """Add topic to shown list with FIFO behavior."""
        if topic_hash not in self.shown_topics:
            self.shown_topics.append(topic_hash)
            # Enforce max 100 items (FIFO)
            if len(self.shown_topics) > 100:
                self.shown_topics = self.shown_topics[-100:]

    def add_shown_fact(self, fact_id: str) -> None:
        """Add fact ID to shown list with FIFO behavior."""
        if fact_id not in self.shown_fact_ids:
            self.shown_fact_ids.append(fact_id)
            # Enforce max 100 items (FIFO)
            if len(self.shown_fact_ids) > 100:
                self.shown_fact_ids = self.shown_fact_ids[-100:]

    def is_topic_shown_recently(self, topic_hash: str) -> bool:
        """Check if topic was shown in this session."""
        return topic_hash in self.shown_topics
