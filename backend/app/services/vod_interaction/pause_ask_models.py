"""
Pause & Ask Models

Data models for the Dynamic Pause & Ask pipeline results.
"""

from pydantic import BaseModel, Field


class PauseAskResult(BaseModel):
    """Complete result of a Pause & Ask exchange."""

    user_polished_text: str = Field(..., description="Polished user question")
    user_audio_url: str = Field(..., description="User avatar TTS audio URL")
    user_animated_video_url: str = Field(
        ..., description="User avatar lip-sync video URL",
    )
    user_video_duration: float = Field(
        ..., description="User video duration in seconds",
    )
    character_name: str = Field(..., description="Character who responded")
    character_response_text: str = Field(
        ..., description="Character AI response text",
    )
    character_audio_url: str = Field(
        ..., description="Character TTS audio URL",
    )
    character_animated_video_url: str = Field(
        ..., description="Character lip-sync video URL",
    )
    character_video_duration: float = Field(
        ..., description="Character video duration in seconds",
    )
