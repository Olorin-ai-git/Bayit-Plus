"""Request/response models for catch-up summary API."""

import re
from typing import Optional, List

from fastapi import HTTPException
from pydantic import BaseModel, Field

from app.core.logging_config import get_logger

logger = get_logger(__name__)

_ID_PATTERN = re.compile(r"^[a-zA-Z0-9_-]+$")


def validate_id(value: str, field_name: str) -> None:
    """Validate ID format using alphanumeric, underscore, and hyphen pattern."""
    if not _ID_PATTERN.match(value):
        logger.warning(
            f"Invalid {field_name} format",
            extra={"value": value, "field": field_name}
        )
        raise HTTPException(
            status_code=400,
            detail=f"Invalid {field_name} format. Must contain only letters, numbers, underscores, and hyphens."
        )


class ProgramInfo(BaseModel):
    """Program information model."""
    title: Optional[str] = Field(None, description="Program title")
    description: Optional[str] = Field(None, description="Program description")
    genre: Optional[str] = Field(None, description="Program genre")
    host: Optional[str] = Field(None, description="Program host")


class CatchUpSummaryResponse(BaseModel):
    """Response model for catch-up summary."""
    summary: str = Field(description="AI-generated summary of recent chat activity")
    key_points: List[str] = Field(description="Key discussion points extracted from chat")
    program_info: Optional[ProgramInfo] = Field(None, description="Current program information")
    window_start: str = Field(description="Start of the catch-up window (ISO 8601)")
    window_end: str = Field(description="End of the catch-up window (ISO 8601)")
    cached: bool = Field(description="Whether this summary was served from cache")
    credits_used: float = Field(description="Credits consumed for this request")
    remaining_credits: int = Field(description="User's remaining beta credits")


class CatchUpAvailabilityResponse(BaseModel):
    """Response model for catch-up availability check."""
    available: bool = Field(description="Whether catch-up is available")
    is_beta_user: bool = Field(description="Whether user has Beta 500 access")
    has_credits: bool = Field(description="Whether user has credits")
    balance: int = Field(default=0, description="User's credit balance")
