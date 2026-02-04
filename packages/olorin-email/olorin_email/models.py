"""
Data models for email operations.

This module contains shared data structures used across the email service.
"""

from typing import Optional

from pydantic import BaseModel


class SendResult(BaseModel):
    """
    Result of an email send operation.

    Attributes:
        success: Whether the email was sent successfully
        message: Human-readable status message
        message_id: Provider's message ID (if successful)
        provider: Name of the email provider used
        error_code: Provider-specific error code (if failed)
    """
    success: bool
    message: str
    message_id: Optional[str] = None
    provider: str = "unknown"
    error_code: Optional[str] = None
