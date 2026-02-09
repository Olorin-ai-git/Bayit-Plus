"""
Internal Pydantic models for the search pipeline.

Defines data contracts between pipeline stages.
"""

from enum import Enum
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator


class SearchIntent(str, Enum):
    """Query intent classification driving field boosting strategy."""

    TITLE_LOOKUP = "title_lookup"
    PERSON_SEARCH = "person_search"
    CONCEPT_SEARCH = "concept_search"
    BROWSE = "browse"


class DetectedLanguage(str, Enum):
    """Detected query language."""

    HEBREW = "he"
    ENGLISH = "en"
    SPANISH = "es"
    MIXED = "mixed"


class SortField(str, Enum):
    """Available sort fields for search results."""

    RELEVANCE = "relevance"
    DATE = "date"
    RATING = "rating"
    POPULARITY = "popularity"
    TITLE = "title"
    YEAR = "year"


class SortOrder(str, Enum):
    """Sort direction."""

    ASC = "asc"
    DESC = "desc"


class QueryAnalysis(BaseModel):
    """Output of Stage 1: Query Analyzer."""

    original_query: str
    normalized_query: str
    language: DetectedLanguage
    intent: SearchIntent
    fuzzy_distance: int = Field(ge=0, le=2)
    meaningful_terms: List[str] = Field(default_factory=list)
    is_empty: bool = False


class ScoredResult(BaseModel):
    """A single search result with scoring metadata."""

    content_id: str
    content_dict: Dict[str, Any]
    atlas_score: float = 0.0
    atlas_rank: int = 0
    pinecone_score: float = 0.0
    pinecone_rank: int = 0
    rrf_score: float = 0.0
    final_score: float = 0.0
    source: str = "atlas"


_VALID_CONTENT_TYPES = {"vod", "live", "radio", "podcast"}
_VALID_TIERS = {"basic", "premium", "family"}


class SearchFilters(BaseModel):
    """Search filters passed through the pipeline."""

    content_types: List[str] = Field(default=["vod"])
    genres: Optional[List[str]] = None
    year_min: Optional[int] = None
    year_max: Optional[int] = None
    rating_min: Optional[float] = None
    subtitle_languages: Optional[List[str]] = None
    subscription_tier: Optional[str] = None
    is_kids_content: Optional[bool] = None
    search_in_subtitles: bool = False
    user_subscription_tier: Optional[str] = None
    is_beta_user: Optional[bool] = None

    @field_validator("content_types")
    @classmethod
    def validate_content_types(cls, v: List[str]) -> List[str]:
        return [ct for ct in v if ct in _VALID_CONTENT_TYPES] or ["vod"]

    @field_validator("subscription_tier")
    @classmethod
    def validate_subscription_tier(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in _VALID_TIERS:
            return None
        return v


class SearchResults(BaseModel):
    """Final search response matching the existing API contract."""

    results: List[Dict[str, Any]]
    total: int
    page: int
    page_size: int
    has_more: bool
    execution_time_ms: int
    cache_hit: bool = False
