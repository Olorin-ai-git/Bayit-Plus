"""
Family Controls Pydantic Schemas.

Request and response models for family controls API endpoints.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class FamilyControlsResponse(BaseModel):
    """API response model for family controls."""

    user_id: str
    kids_age_limit: int
    youngsters_age_limit: int
    kids_enabled: bool
    youngsters_enabled: bool
    max_content_rating: str
    viewing_hours_enabled: bool
    viewing_start_hour: int
    viewing_end_hour: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FamilyControlsUpdate(BaseModel):
    """Request model for updating family controls."""

    new_pin: Optional[str] = None
    kids_age_limit: Optional[int] = Field(None, ge=0, le=12)
    youngsters_age_limit: Optional[int] = Field(None, ge=12, le=17)
    kids_enabled: Optional[bool] = None
    youngsters_enabled: Optional[bool] = None
    max_content_rating: Optional[str] = None
    viewing_hours_enabled: Optional[bool] = None
    viewing_start_hour: Optional[int] = Field(None, ge=0, le=23)
    viewing_end_hour: Optional[int] = Field(None, ge=0, le=23)
