"""
Movie Interaction Models

Request/response schemas for the movie interaction hub feature.
Users can tag movies for character extraction, browse characters,
and ask predefined or custom questions.
"""

from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.vod_interaction import ContentCharacter


class MovieTagRequest(BaseModel):
    """Request to tag a movie for character extraction."""
    content_id: str = Field(..., description="Content document ID")
    profile_id: str = Field(..., description="Child profile ID")


class MovieTagStatus(BaseModel):
    """Status of a movie tagging/character extraction job."""
    content_id: str
    status: str = Field(..., description="pending, processing, ready, failed")
    characters: List[ContentCharacter] = Field(default_factory=list)
    error: Optional[str] = None


class CharacterQuestionsResponse(BaseModel):
    """Questions available for a specific character."""
    character_name: str
    specific_questions: List[str] = Field(
        default_factory=list,
        description="AI-generated character-specific questions",
    )
    generic_questions: List[str] = Field(
        default_factory=list,
        description="Template-based generic questions",
    )


class InteractableMovie(BaseModel):
    """A movie that has been tagged for character interactions."""
    content_id: str
    title: str
    poster_url: Optional[str] = None
    character_count: int = 0
    status: str = Field(
        default="ready",
        description="ready or processing",
    )
