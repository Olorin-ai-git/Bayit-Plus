"""
Olorin.ai Content Embedding Models

Vector embeddings for semantic search with timestamp deep-linking.
"""

from datetime import datetime, timezone
from typing import List, Literal, Optional

from beanie import Document
from pydantic import BaseModel, Field

# Type definitions
EmbeddingType = Literal[
    "title", "description", "subtitle_segment", "dialogue", "summary"
]


class EmbeddingMetadata(BaseModel):
    """Metadata about an embedding vector."""

    model: str = Field(..., description="Model used for embedding")
    dimensions: int = Field(default=1536, description="Vector dimensions")
    vector_id: str = Field(..., description="Vector ID in vector store")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ContentEmbedding(Document):
    """Vector embeddings for semantic search."""

    # Content reference
    content_id: str = Field(..., description="Reference to content document")
    content_type: Optional[str] = Field(
        default=None, description="movie, series, episode, etc."
    )

    # Embedding type and metadata
    embedding_type: EmbeddingType = Field(..., description="Type of content embedded")
    segment_index: Optional[int] = Field(
        default=None, description="Index for subtitle segments"
    )
    segment_start_time: Optional[float] = Field(
        default=None, description="Start time in seconds"
    )
    segment_end_time: Optional[float] = Field(
        default=None, description="End time in seconds"
    )
    segment_text: Optional[str] = Field(
        default=None, description="Original text that was embedded"
    )

    # Embedding info
    embedding_model: str = Field(..., description="Model used for embedding")
    embedding_dimensions: int = Field(default=1536)
    pinecone_vector_id: str = Field(..., description="Vector ID in Pinecone")

    # Content metadata for filtering
    language: str = Field(default="he")
    genre_ids: List[str] = Field(default_factory=list)
    section_ids: List[str] = Field(default_factory=list)
    audience_ids: List[str] = Field(default_factory=list)

    # Partner filtering (if content is partner-specific)
    partner_id: Optional[str] = Field(default=None)

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "content_embeddings"
        indexes = [
            "content_id",
            "embedding_type",
            "pinecone_vector_id",
            "language",
            "partner_id",
            [("content_id", 1), ("embedding_type", 1)],
            [("content_id", 1), ("segment_index", 1)],
        ]


class RecapSegment(BaseModel):
    """A segment of transcript for recap."""

    text: str
    timestamp: float  # seconds from start
    speaker: Optional[str] = None
    language: str = "he"
    confidence: Optional[float] = None


class RecapEntry(BaseModel):
    """A generated recap summary."""

    summary: str
    key_points: List[str]
    window_start_seconds: float
    window_end_seconds: float
    generated_at: datetime
    tokens_used: int


class RecapSession(Document):
    """Session for live broadcast recap generation."""

    # Session identification
    session_id: str = Field(..., description="Unique session identifier")
    partner_id: Optional[str] = Field(default=None)
    channel_id: Optional[str] = Field(
        default=None, description="Live channel being watched"
    )
    stream_url: Optional[str] = Field(default=None)

    # Transcript accumulation
    transcript_segments: List[dict] = Field(
        default_factory=list,
        description="List of {text, timestamp, speaker, language}",
    )
    total_duration_seconds: float = Field(default=0.0)

    # Generated recaps (at different time points)
    recaps: List[dict] = Field(
        default_factory=list,
        description="List of {summary, key_points, timestamp, window_minutes}",
    )

    # Status
    status: Literal["active", "paused", "ended"] = Field(default="active")

    # Timestamps
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ended_at: Optional[datetime] = Field(default=None)
    last_updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    # Configuration (externalized from validator)
    max_transcript_segments: int = Field(
        default=5000,
        description="Maximum transcript segments before rotation needed",
    )

    class Settings:
        name = "recap_sessions"
        indexes = [
            "session_id",
            "partner_id",
            "channel_id",
            "status",
            "started_at",
            [("partner_id", 1), ("status", 1)],
        ]
