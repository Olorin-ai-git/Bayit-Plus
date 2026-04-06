"""Request/response schemas for vision-grounded questions."""
from pydantic import BaseModel, Field


class VisionAskRequest(BaseModel):
    """Request body for vision-grounded question."""

    frame_b64: str = Field(
        ...,
        description="JPEG frame as base64 string from canvas capture",
    )
    tap_x: float = Field(
        ..., ge=0.0, le=1.0,
        description="Normalized horizontal tap position (0=left, 1=right)",
    )
    tap_y: float = Field(
        ..., ge=0.0, le=1.0,
        description="Normalized vertical tap position (0=top, 1=bottom)",
    )
    user_message: str = Field(
        default="",
        max_length=500,
        description="Optional question text (defaults to config default)",
    )
    voice_only: bool = Field(
        default=True,
        description="Voice-only mode (no lip-sync animation, lower cost)",
    )


class VisionAskResponse(BaseModel):
    """Response body for vision-grounded question."""

    character_name: str
    response_text: str
    audio_url: str
    animated_video_url: str
    tap_x: float
    tap_y: float
