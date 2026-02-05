"""
Comprehension API Request/Response Schemas.

Pydantic models for API endpoints.
"""

from typing import Optional

from pydantic import BaseModel, Field


class SceneMarkerResponse(BaseModel):
    """API response for scene marker."""

    start_time: float
    end_time: float
    cue_count: int


class SceneListResponse(BaseModel):
    """API response for scene list."""

    scenes: list[SceneMarkerResponse]


class ComprehensionSubmitRequest(BaseModel):
    """Request to submit comprehension answer."""

    selected_option: int = Field(..., ge=0, le=3)
    time_taken_ms: int = Field(..., ge=0)


class ComprehensionSubmitResponse(BaseModel):
    """Response after submitting answer."""

    is_correct: bool
    explanation: Optional[str] = None
    explanation_en: Optional[str] = None
    points_earned: int
    credits_deducted: int
