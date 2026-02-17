"""
Creatify Avatar API Types.

Request and response models for the Creatify avatar persona endpoints.
"""

from typing import Optional

from pydantic import BaseModel, Field


class CreatifyAvatarRequest(BaseModel):
    """Request to create a Creatify persona from a child's avatar image."""

    avatar_id: str = Field(..., description="Child avatar ID")
    profile_id: str = Field(..., description="Child profile ID")
    pin: str = Field(..., min_length=4, max_length=8, description="Family PIN")


class CreatifyAvatarResponse(BaseModel):
    """API response for Creatify avatar persona status."""

    avatar_id: str
    user_id: str
    creatify_persona_id: Optional[str] = None
    status: str
    avatar_image_url: Optional[str] = None
    error_message: Optional[str] = None
    created_at: str
    updated_at: str
