"""
Tool Models - Pydantic validation models for wizard tools
"""

from typing import List, Optional
from pydantic import BaseModel, Field, validator


class SearchContentInput(BaseModel):
    """Input validation for search_content tool."""
    query: str = Field(..., max_length=500)
    content_type: Optional[str] = Field("vod", pattern=r'^(vod|live|radio|podcast)$')
    genres: Optional[List[str]] = Field(None, max_items=10)
    year_min: Optional[int] = Field(None, ge=1900, le=2100)
    year_max: Optional[int] = Field(None, ge=1900, le=2100)
    is_kids_content: Optional[bool] = None
    limit: int = Field(5, ge=1, le=10)

    @validator('query')
    def validate_query(cls, v):
        if len(v.strip()) == 0:
            raise ValueError("Query cannot be empty")
        return v.strip()


class GetRecommendationsInput(BaseModel):
    """Input validation for get_recommendations tool."""
    content_type: str = Field("vod", pattern=r'^(vod|live|radio|podcast)$')
    based_on: Optional[str] = Field(None, max_length=100)
    limit: int = Field(10, ge=1, le=10)


class GetLiveChannelsInput(BaseModel):
    """Input validation for get_live_channels tool."""
    category: Optional[str] = Field(None, pattern=r'^(news|sports|entertainment|kids)$')


class GetKidsContentInput(BaseModel):
    """Input validation for get_kids_content tool."""
    age_group: str = Field(..., pattern=r'^(toddler|preschool|elementary|preteen)$')
    category: Optional[str] = Field(None, pattern=r'^(cartoons|educational|music|hebrew|stories|jewish)$')
    limit: int = Field(10, ge=1, le=10)


class LookupUserGuideInput(BaseModel):
    """Input validation for lookup_user_guide tool."""
    query: str = Field(..., max_length=500)

    @validator('query')
    def validate_query(cls, v):
        if len(v.strip()) == 0:
            raise ValueError("Query cannot be empty")
        return v.strip()


class PlayContentInput(BaseModel):
    """Input validation for play_content tool."""
    content_id: str = Field(..., max_length=100)
    content_type: str = Field(..., pattern=r'^(vod|live|radio|podcast|audiobook)$')
    timestamp: Optional[float] = Field(None, ge=0)


class SelectSubtitlesInput(BaseModel):
    """Input validation for select_subtitles tool."""
    language: Optional[str] = Field(None, max_length=10)
    enabled: bool = Field(True)


class NavigateToPageInput(BaseModel):
    """Input validation for navigate_to_page tool."""
    page: str = Field(..., max_length=100)

    @validator('page')
    def validate_page(cls, v):
        if len(v.strip()) == 0:
            raise ValueError("Page cannot be empty")
        return v.strip()


class ControlPlaybackInput(BaseModel):
    """Input validation for control_playback tool."""
    command: str = Field(
        ...,
        pattern=r'^(play|pause|resume|stop|seek|mute|unmute)$'
    )
    value: Optional[float] = None
