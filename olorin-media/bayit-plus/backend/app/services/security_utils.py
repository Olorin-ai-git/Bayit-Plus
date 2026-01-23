"""
Security utilities for input sanitization.
Provides protection against NoSQL injection, XSS, and prompt injection attacks.
"""

import html
import re
from typing import Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException


def validate_object_id(content_id: str) -> str:
    """
    Validate content_id is a valid ObjectId format.
    Prevents NoSQL injection attacks.

    Args:
        content_id: The content ID string to validate

    Returns:
        The validated content_id string

    Raises:
        HTTPException: If the content_id is not a valid ObjectId format
    """
    try:
        ObjectId(content_id)
        return content_id
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid content ID format")


def sanitize_for_prompt(text: Optional[str], max_len: int = 500) -> str:
    """
    Sanitize content fields before including in AI prompts.
    Prevents prompt injection attacks.

    Args:
        text: The text to sanitize
        max_len: Maximum length of output (default 500)

    Returns:
        Sanitized text safe for AI prompts
    """
    if not text:
        return "N/A"
    # Remove potential injection patterns
    sanitized = re.sub(r"[<>{}[\]\\`]", "", text)
    # Remove any control characters
    sanitized = re.sub(r"[\x00-\x1f\x7f-\x9f]", "", sanitized)
    # Truncate to prevent token abuse
    return sanitized[:max_len].strip()


def sanitize_ai_output(text: str) -> str:
    """
    Sanitize AI-generated text to prevent XSS.
    Applied to all AI-generated trivia facts.

    Args:
        text: The AI-generated text to sanitize

    Returns:
        Sanitized text safe for display
    """
    if not text:
        return ""
    # HTML escape to prevent XSS
    sanitized = html.escape(text)
    # Remove any HTML tags that might have slipped through
    sanitized = re.sub(r"<[^>]+>", "", sanitized)
    # Remove javascript: URLs
    sanitized = re.sub(r"javascript:", "", sanitized, flags=re.IGNORECASE)
    return sanitized.strip()
