"""Request/response models for channel chat REST API."""

import re
from typing import Optional, List, Dict, Any

from fastapi import HTTPException
from pydantic import BaseModel, Field

from app.core.logging_config import get_logger

logger = get_logger(__name__)

_ID_PATTERN = re.compile(r"^[a-zA-Z0-9_-]+$")


def validate_id(value: str, field_name: str) -> None:
    """
    Validate ID format using alphanumeric, underscore, and hyphen pattern.

    Args:
        value: ID value to validate
        field_name: Name of field for error messages

    Raises:
        HTTPException: If ID format is invalid
    """
    if not _ID_PATTERN.match(value):
        logger.warning(
            f"Invalid {field_name} format",
            extra={"value": value, "field": field_name}
        )
        raise HTTPException(
            status_code=400,
            detail=f"Invalid {field_name} format. Must contain only letters, numbers, underscores, and hyphens."
        )


class ChatHistoryResponse(BaseModel):
    """Response model for chat history."""
    messages: List[Dict[str, Any]] = Field(description="List of chat messages")
    has_more: bool = Field(description="Whether more messages are available")
    next_cursor: Optional[str] = Field(None, description="Cursor for next page of results")


class TranslationResponse(BaseModel):
    """Response model for chat translation."""
    original_text: str = Field(description="Original text")
    translated_text: str = Field(description="Translated text")
    from_lang: str = Field(description="Detected or provided source language")
    to_lang: str = Field(description="Target language")
    confidence: Optional[float] = Field(None, description="Translation confidence score")


class ModerationRequest(BaseModel):
    """Request model for moderation actions."""
    reason: Optional[str] = Field(None, max_length=500, description="Reason for moderation action")


class ModerationResponse(BaseModel):
    """Response model for moderation actions."""
    success: bool = Field(description="Whether the action succeeded")
    message: str = Field(description="Status message")
    action: str = Field(description="Action performed")
    target: str = Field(description="Target of the action")
