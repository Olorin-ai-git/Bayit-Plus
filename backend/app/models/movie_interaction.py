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
    interaction_count: int = Field(
        default=0,
        description="Current number of interactive moments on this content",
    )
    max_interactions: int = Field(
        default=10,
        description="Max interactive moments allowed per content",
    )
    status: str = Field(
        default="ready",
        description="ready or processing",
    )


class InteractionSelectionRequest(BaseModel):
    """Request to select questions for video generation."""
    content_id: str = Field(..., description="Content document ID")
    character_name: str = Field(..., description="Character to generate for")
    questions: List[str] = Field(
        ...,
        min_length=1,
        description="Selected question texts to generate interactions for",
    )


class InteractionMomentStatus(BaseModel):
    """Status of a single interactive moment generation."""
    character_name: str
    interaction_prompt: str
    status: str = Field(
        ...,
        description="queued, generating_audio, generating_video, complete, failed",
    )
    video_url: Optional[str] = None


class InteractionSelectionResponse(BaseModel):
    """Response after selecting questions for generation."""
    content_id: str
    created_count: int
    total_interaction_count: int
    max_interactions: int
    generation_status: str = Field(
        ...,
        description="queued, processing, complete",
    )


class InteractionStatusResponse(BaseModel):
    """Full interaction status for a content item."""
    content_id: str
    interaction_count: int
    max_interactions: int
    moments: List[InteractionMomentStatus] = Field(default_factory=list)
