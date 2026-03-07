"""
BYOC Normalization Pydantic Models

Request/response models for the manifest-based normalization pipeline.
"""

from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class BYOCManifestEntry(BaseModel):
    """A single channel/content entry from the client manifest."""

    name: str = Field(..., min_length=1, max_length=512)
    group: Optional[str] = Field(None, max_length=256)
    logo_url: Optional[str] = None
    epg_id: Optional[str] = None
    content_type: str = Field(
        ..., description="live_channel, movie, series, episode, video"
    )
    year: Optional[int] = None
    duration_seconds: Optional[int] = None
    language_hint: Optional[str] = None
    resolution_tag: Optional[str] = None
    source_type: str = Field(
        ..., description="iptv, xtream, plex, youtube"
    )


class HealthSampleResult(BaseModel):
    """Client-side health probe results."""

    tested: int = 0
    alive: int = 0
    dead_indices: List[int] = Field(default_factory=list)


class BYOCManifest(BaseModel):
    """Full manifest submitted for normalization."""

    entries: List[BYOCManifestEntry] = Field(..., max_length=20000)
    health_sample: Optional[HealthSampleResult] = None
    source_type: str


class MatchedChannel(BaseModel):
    """A channel matched against the global channel index."""

    index: int
    original_name: str
    canonical_name: str
    logo_url: Optional[str] = None
    epg_id: Optional[str] = None
    category: str = ""
    language: str = ""
    country: str = ""
    confidence: float = 0.0


class MatchedVOD(BaseModel):
    """A VOD item matched against TMDB/TVDb."""

    index: int
    original_name: str
    tmdb_id: Optional[int] = None
    imdb_id: Optional[str] = None
    poster_url: Optional[str] = None
    backdrop_url: Optional[str] = None
    overview: Optional[str] = None
    genres: List[str] = Field(default_factory=list)
    year: Optional[int] = None
    confidence: float = 1.0


class DuplicateGroup(BaseModel):
    """A group of channels identified as duplicates."""

    canonical_name: str
    primary_index: int
    alternate_indices: List[int]
    primary_resolution: Optional[str] = None


class UnresolvedEntry(BaseModel):
    """An entry the pipeline could not confidently classify."""

    index: int
    name: str
    group: Optional[str] = None
    ai_suggestion: Optional[str] = None
    ai_category: Optional[str] = None
    ai_confidence: float = 0.0


class NormalizationStats(BaseModel):
    """Summary statistics for the normalization result."""

    total: int
    matched_channels: int
    matched_vod: int
    duplicates_found: int
    unresolved: int


class NormalizationPlan(BaseModel):
    """Complete normalization result returned to the client."""

    job_id: str
    status: str = "completed"
    matched_channels: List[MatchedChannel] = Field(default_factory=list)
    matched_vod: List[MatchedVOD] = Field(default_factory=list)
    duplicates: List[DuplicateGroup] = Field(default_factory=list)
    unresolved: List[UnresolvedEntry] = Field(default_factory=list)
    detected_languages: List[str] = Field(default_factory=list)
    suggested_categories: List[str] = Field(default_factory=list)
    health_sample: Optional[HealthSampleResult] = None
    stats: NormalizationStats
    progress: float = 1.0
    stage: str = "completed"


class NormalizationJobStatus(BaseModel):
    """Status of an in-progress normalization job."""

    job_id: str
    status: str
    progress: float = 0.0
    stage: str = "queued"
    plan: Optional[NormalizationPlan] = None


class NormalizationApplyRequest(BaseModel):
    """User selections from the onboarding wizard."""

    job_id: str
    accepted_duplicate_primaries: Dict[str, int] = Field(
        default_factory=dict,
        description="canonical_name -> chosen primary index",
    )
    dismissed_indices: List[int] = Field(
        default_factory=list,
        description="Indices the user chose to hide",
    )
    category_overrides: Dict[int, str] = Field(
        default_factory=dict,
        description="index -> user-assigned category",
    )


class NormalizationApplyResponse(BaseModel):
    """Result of applying user selections."""

    applied: bool = True
    channels_kept: int = 0
    channels_hidden: int = 0
    categories_updated: int = 0


class BYOCProviderResponse(BaseModel):
    """A known IPTV provider for the provider picker."""

    name: str
    slug: str
    logo_url: Optional[str] = None
    connection_types: List[str]
    server_url: Optional[str] = None
    m3u_url_template: Optional[str] = None
    setup_instructions_key: Optional[str] = None
