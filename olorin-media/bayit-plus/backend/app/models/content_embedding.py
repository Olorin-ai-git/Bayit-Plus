"""
Content Embedding Models for Olorin.ai Semantic Search

Vector embeddings for semantic search with timestamp deep-linking.
"""

import re
from datetime import datetime, timezone
from typing import ClassVar, List, Literal, Optional

from beanie import Document, PydanticObjectId
from pydantic import BaseModel, ConfigDict, Field, field_validator

EmbeddingType = Literal[
    "title", "description", "subtitle_segment", "dialogue", "summary"
]


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


class SemanticSearchResult(BaseModel):
    """Result from semantic search."""

    content_id: str
    title: str
    title_en: Optional[str] = None
    content_type: Optional[str] = None
    thumbnail_url: Optional[str] = None

    # Match details
    matched_text: str
    match_type: EmbeddingType
    relevance_score: float

    # Deep-linking (for subtitle/dialogue matches)
    timestamp_seconds: Optional[float] = None
    timestamp_formatted: Optional[str] = None  # "1:23:45"

    # Context
    surrounding_text: Optional[str] = None


class SearchQuery(BaseModel):
    """Semantic search query."""

    query: str = Field(..., min_length=2, max_length=500)
    language: str = Field(default="he")
    content_types: Optional[List[str]] = Field(default=None)
    genre_ids: Optional[List[str]] = Field(default=None)
    section_ids: Optional[List[str]] = Field(default=None)
    include_timestamps: bool = Field(default=True)
    limit: int = Field(default=20, ge=1, le=100)
    min_score: float = Field(default=0.7, ge=0.0, le=1.0)


class DialogueSearchQuery(BaseModel):
    """Search specifically within dialogue/subtitles."""

    query: str = Field(..., min_length=2, max_length=500)
    language: str = Field(default="he")
    content_id: Optional[str] = Field(
        default=None, description="Limit to specific content"
    )
    limit: int = Field(default=50, ge=1, le=200)
    min_score: float = Field(default=0.6, ge=0.0, le=1.0)


class SceneSearchQuery(BaseModel):
    """Search for scenes within specific content or series."""

    model_config = ConfigDict(extra="forbid")

    query: str = Field(..., min_length=2, max_length=500)
    content_id: Optional[str] = Field(
        default=None, description="Search within specific content"
    )
    series_id: Optional[str] = Field(
        default=None, description="Search across all episodes of series"
    )
    language: str = Field(default="he")
    limit: int = Field(default=20, ge=1, le=100)
    min_score: float = Field(default=0.5, ge=0.0, le=1.0)

    # NoSQL injection patterns to reject
    DANGEROUS_PATTERNS: ClassVar[List[str]] = [
        r"\$where",
        r"\$regex",
        r"\$ne",
        r"\$gt",
        r"\$lt",
        r"\$in",
        r"\$nin",
        r"\$exists",
        r"javascript:",
        r"<script",
    ]

    # Allowed languages whitelist
    ALLOWED_LANGUAGES: ClassVar[List[str]] = ["he", "en", "ar", "ru", "fr", "es"]

    @field_validator("query")
    @classmethod
    def validate_query_safe(cls, v: str) -> str:
        """Prevent NoSQL injection in query string."""
        query_lower = v.lower()
        for pattern in cls.DANGEROUS_PATTERNS:
            if re.search(pattern, query_lower, re.IGNORECASE):
                raise ValueError(
                    f"Query contains potentially dangerous pattern: {pattern}"
                )
        return v

    @field_validator("content_id")
    @classmethod
    def validate_content_id(cls, v: Optional[str]) -> Optional[str]:
        """Validate ObjectId format for content_id."""
        if v is None:
            return v
        # MongoDB ObjectId is 24 hex characters
        if not re.match(r"^[0-9a-fA-F]{24}$", v):
            raise ValueError("content_id must be a valid ObjectId (24 hex characters)")
        return v

    @field_validator("series_id")
    @classmethod
    def validate_series_id(cls, v: Optional[str]) -> Optional[str]:
        """Validate ObjectId format for series_id."""
        if v is None:
            return v
        if not re.match(r"^[0-9a-fA-F]{24}$", v):
            raise ValueError("series_id must be a valid ObjectId (24 hex characters)")
        return v

    @field_validator("language")
    @classmethod
    def validate_language(cls, v: str) -> str:
        """Validate language against whitelist."""
        if v not in cls.ALLOWED_LANGUAGES:
            raise ValueError(
                f"Language must be one of: {', '.join(cls.ALLOWED_LANGUAGES)}"
            )
        return v


class SceneSearchResult(BaseModel):
    """Scene search result with deep-linking."""

    model_config = ConfigDict(extra="forbid")

    content_id: str
    content_type: str  # "movie", "episode", "series", etc.
    title: str
    title_en: Optional[str] = None
    series_id: Optional[str] = None  # For episodes: parent series ID
    series_title: Optional[str] = None  # For episodes: parent series title
    episode_info: Optional[str] = None  # "S2E5" for series
    thumbnail_url: Optional[str] = None
    matched_text: str
    context_text: Optional[str] = None
    relevance_score: float
    timestamp_seconds: float
    timestamp_formatted: str
    deep_link: str  # "/watch/{content_id}?t={timestamp}"


class IndexContentRequest(BaseModel):
    """Request to index content for semantic search."""

    content_id: str
    force_reindex: bool = Field(
        default=False, description="Re-index even if already indexed"
    )


class IndexingStatus(BaseModel):
    """Status of content indexing."""

    content_id: str
    status: Literal["pending", "processing", "completed", "failed"]
    segments_indexed: int = 0
    total_segments: int = 0
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


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

    @field_validator("transcript_segments")
    @classmethod
    def validate_transcript_segments_limit(cls, v):
        """Validate transcript segments don't exceed MongoDB document size limits."""
        # Max segments configurable via settings, default 5000
        # MongoDB doc limit is 16MB - with typical segment size ~500 bytes,
        # 5000 segments = ~2.5MB which is safe
        from app.core.config import settings

        max_segments = settings.olorin.recap.max_transcript_segments
        if len(v) > max_segments:
            raise ValueError(
                f"Transcript segments exceed maximum of {max_segments}. "
                f"Consider creating a new session or implementing segment rotation."
            )
        return v

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


class TranscriptSegment(BaseModel):
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
