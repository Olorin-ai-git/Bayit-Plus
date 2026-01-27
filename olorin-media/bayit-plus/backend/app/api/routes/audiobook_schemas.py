"""
Audiobook API Schemas - Shared Pydantic models for audiobook endpoints.

This module consolidates all request/response schemas used by audiobook
endpoints to eliminate duplication and provide a single source of truth.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# ============ REQUEST SCHEMAS ============


class AudiobookCreateRequest(BaseModel):
    """Request model for creating an audiobook."""
    title: str = Field(..., min_length=1, max_length=500)
    author: str = Field(..., min_length=1, max_length=300)
    narrator: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[str] = None
    year: Optional[int] = None
    rating: Optional[float] = None
    thumbnail: Optional[str] = None
    backdrop: Optional[str] = None
    stream_url: str = Field(..., min_length=1)
    stream_type: str = "hls"
    is_drm_protected: bool = False
    drm_key_id: Optional[str] = None
    audio_quality: Optional[str] = None
    isbn: Optional[str] = None
    book_edition: Optional[str] = None
    publisher_name: Optional[str] = None
    section_ids: List[str] = Field(default_factory=list)
    primary_section_id: Optional[str] = None
    genre_ids: List[str] = Field(default_factory=list)
    audience_id: Optional[str] = None
    topic_tags: List[str] = Field(default_factory=list)
    requires_subscription: str = "basic"
    visibility_mode: str = "public"
    is_published: bool = False


class AudiobookUpdateRequest(BaseModel):
    """Request model for updating an audiobook."""
    title: Optional[str] = None
    author: Optional[str] = None
    narrator: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[str] = None
    year: Optional[int] = None
    rating: Optional[float] = None
    thumbnail: Optional[str] = None
    backdrop: Optional[str] = None
    stream_url: Optional[str] = None
    stream_type: Optional[str] = None
    is_drm_protected: Optional[bool] = None
    audio_quality: Optional[str] = None
    isbn: Optional[str] = None
    book_edition: Optional[str] = None
    publisher_name: Optional[str] = None
    genre_ids: Optional[List[str]] = None
    audience_id: Optional[str] = None
    topic_tags: Optional[List[str]] = None
    requires_subscription: Optional[str] = None
    visibility_mode: Optional[str] = None
    section_ids: Optional[List[str]] = None
    primary_section_id: Optional[str] = None


# ============ RESPONSE SCHEMAS ============


class AudiobookResponse(BaseModel):
    """User-facing audiobook response (no stream_url)."""
    id: str
    title: str
    author: Optional[str] = None
    narrator: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[str] = None
    thumbnail: Optional[str] = None
    backdrop: Optional[str] = None
    year: Optional[int] = None
    rating: Optional[float] = None
    genre_ids: List[str] = Field(default_factory=list)
    audience_id: Optional[str] = None
    requires_subscription: str = "basic"
    content_format: str = "audiobook"
    audio_quality: Optional[str] = None
    isbn: Optional[str] = None
    book_edition: Optional[str] = None
    publisher_name: Optional[str] = None
    view_count: int = 0
    avg_rating: float = 0.0
    is_featured: bool = False
    created_at: datetime
    updated_at: datetime


class AudiobookAdminResponse(AudiobookResponse):
    """Admin audiobook response with additional fields."""
    section_ids: List[str] = Field(default_factory=list)
    primary_section_id: Optional[str] = None
    is_published: bool = False
    visibility_mode: str = "public"


class AudiobookStreamResponse(BaseModel):
    """Admin stream response with stream_url."""
    id: str
    title: str
    author: Optional[str] = None
    narrator: Optional[str] = None
    stream_url: str
    stream_type: str = "hls"
    duration: Optional[str] = None
    audio_quality: Optional[str] = None
    is_drm_protected: bool = False


class AudiobookListResponse(BaseModel):
    """Paginated audiobook list response."""
    items: List[AudiobookResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class AudiobookAdminListResponse(BaseModel):
    """Paginated admin audiobook list response."""
    items: List[AudiobookAdminResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class FeatureResponse(BaseModel):
    """Response for feature operation."""
    message: str
    audiobook_id: str
