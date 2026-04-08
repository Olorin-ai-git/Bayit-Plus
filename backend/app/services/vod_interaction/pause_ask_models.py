"""
Pause & Ask Models

Data models for the Dynamic Pause & Ask pipeline results.
"""

from typing import Optional

from pydantic import BaseModel, Field


class MemoryReference(BaseModel):
    """Server-authored indicator that the character's response referenced a
    prior user turn in the same session.

    Replaces the client-side 3-word n-gram heuristic in useMemoryInference.ts.
    The client renders a yellow MEMORY badge on the referenced turn and
    highlights the phrase within the character's response.
    """

    referenced_turn_index: int = Field(
        ...,
        ge=0,
        description=(
            "0-based index of the prior user turn being referenced. "
            "Aligns with the client's state.exchanges[] ordering."
        ),
    )
    highlighted_phrase: str = Field(
        ...,
        min_length=1,
        description=(
            "Exact substring of character_response_text to highlight. "
            "Always 3+ words after whitespace normalization."
        ),
    )


class PauseAskServiceError(Exception):
    """Raised when an external service fails during the Pause & Ask pipeline.

    Attributes:
        failed_service: Identifier of the service that failed
                        ("anthropic", "fal_ai", "elevenlabs").
        detail: Human-readable error description.
    """

    def __init__(self, failed_service: str, detail: str) -> None:
        self.failed_service = failed_service
        self.detail = detail
        super().__init__(f"{failed_service}: {detail}")


class PauseAskResult(BaseModel):
    """Complete result of a Pause & Ask exchange."""

    user_polished_text: str = Field(..., description="Polished user question")
    character_name: str = Field(..., description="Character who responded")
    character_response_text: str = Field(
        ..., description="Character AI response text",
    )
    character_audio_url: str = Field(
        ..., description="Character TTS audio URL",
    )
    character_animated_video_url: str = Field(
        default="", description="Character lip-sync video URL (empty if voice-only)",
    )
    character_frame_url: str = Field(
        default="", description="Character still image URL (for voice-only fallback)",
    )
    character_video_duration: float = Field(
        ..., description="Character audio/video duration in seconds",
    )
    voice_only_fallback: bool = Field(
        default=False,
        description="True if lip-sync failed and fell back to voice-only",
    )
    memory_metadata: Optional[MemoryReference] = Field(
        default=None,
        description=(
            "Server-authored memory reference indicator. Populated when the "
            "character's response echoes a phrase from a prior user turn in "
            "this session. None when no reference was detected."
        ),
    )
