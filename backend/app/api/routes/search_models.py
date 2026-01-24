"""
Search API Request/Response Models.

Pydantic models for search endpoints.
"""

import re
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

# ObjectId validation regex (24 hex characters)
OBJECT_ID_PATTERN = re.compile(r"^[0-9a-fA-F]{24}$")


class LLMSearchRequest(BaseModel):
    """Request model for LLM natural language search"""

    query: str = Field(..., min_length=1, description="Natural language query")
    include_user_context: bool = Field(True, description="Include user preferences")
    limit: int = Field(20, ge=1, le=50, description="Maximum results")


class ClickTrackingRequest(BaseModel):
    """Request model for tracking search result clicks"""

    search_query_id: Optional[str] = Field(
        None, description="Optional search query log ID"
    )
    content_id: str = Field(..., description="Clicked content ID")
    position: int = Field(..., ge=1, description="Position in results (1-indexed)")
    time_to_click_ms: int = Field(..., ge=0, description="Time from search to click")


class SceneSearchRequest(BaseModel):
    """Request model for scene search within content or series"""

    query: str = Field(..., min_length=2, max_length=500, description="Scene query")
    content_id: Optional[str] = Field(None, description="Search within specific content")
    series_id: Optional[str] = Field(None, description="Search across series episodes")
    language: str = Field("he", description="Content language")
    limit: int = Field(20, ge=1, le=100, description="Maximum results")
    min_score: float = Field(0.5, ge=0.0, le=1.0, description="Minimum relevance score")

    @field_validator("content_id", "series_id")
    @classmethod
    def validate_object_id(cls, v: Optional[str]) -> Optional[str]:
        """Validate that content_id and series_id are valid MongoDB ObjectIds."""
        if v is not None and not OBJECT_ID_PATTERN.match(v):
            raise ValueError(
                f"Invalid ObjectId format: '{v}'. Must be a 24-character hex string."
            )
        return v


class SceneSearchResponse(BaseModel):
    """Response model for scene search"""

    query: str
    results: List["SceneSearchResult"]  # type: ignore
    total_results: int
