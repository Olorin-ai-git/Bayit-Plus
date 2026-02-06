"""
Voice Error Codes
Structured error codes for consistent voice API error responses.
Each code maps to an HTTP status and localized user-facing message key.
"""

from enum import Enum
from typing import NamedTuple


class ErrorDetail(NamedTuple):
    """Structured error detail with HTTP status and message key."""

    http_status: int
    message_key: str
    description: str


class VoiceErrorCode(str, Enum):
    """Enumeration of all voice system error codes."""

    # Authentication errors (401)
    AUTH_MISSING_TOKEN = "AUTH_MISSING_TOKEN"
    AUTH_INVALID_TOKEN = "AUTH_INVALID_TOKEN"
    AUTH_EXPIRED_TOKEN = "AUTH_EXPIRED_TOKEN"

    # Validation errors (400)
    VALIDATION_TRANSCRIPT_EMPTY = "VALIDATION_TRANSCRIPT_EMPTY"
    VALIDATION_TRANSCRIPT_TOO_LONG = "VALIDATION_TRANSCRIPT_TOO_LONG"
    VALIDATION_INVALID_LANGUAGE = "VALIDATION_INVALID_LANGUAGE"
    VALIDATION_INVALID_PLATFORM = "VALIDATION_INVALID_PLATFORM"

    # Rate limiting (429)
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"

    # Intent processing errors (500)
    INTENT_CLASSIFICATION_FAILED = "INTENT_CLASSIFICATION_FAILED"
    INTENT_HANDLER_FAILED = "INTENT_HANDLER_FAILED"

    # Service errors (502/503)
    SERVICE_STT_UNAVAILABLE = "SERVICE_STT_UNAVAILABLE"
    SERVICE_TTS_UNAVAILABLE = "SERVICE_TTS_UNAVAILABLE"
    SERVICE_SEARCH_UNAVAILABLE = "SERVICE_SEARCH_UNAVAILABLE"
    SERVICE_AI_UNAVAILABLE = "SERVICE_AI_UNAVAILABLE"

    # Content errors (404)
    CONTENT_NOT_FOUND = "CONTENT_NOT_FOUND"
    CHANNEL_NOT_FOUND = "CHANNEL_NOT_FOUND"
    EPISODE_NOT_FOUND = "EPISODE_NOT_FOUND"

    # Generic errors
    INTERNAL_ERROR = "INTERNAL_ERROR"
    TIMEOUT = "TIMEOUT"


ERROR_DETAILS: dict[VoiceErrorCode, ErrorDetail] = {
    VoiceErrorCode.AUTH_MISSING_TOKEN: ErrorDetail(
        401, "unauthorized", "Authentication token is missing"
    ),
    VoiceErrorCode.AUTH_INVALID_TOKEN: ErrorDetail(
        401, "unauthorized", "Authentication token is invalid"
    ),
    VoiceErrorCode.AUTH_EXPIRED_TOKEN: ErrorDetail(
        401, "unauthorized", "Authentication token has expired"
    ),
    VoiceErrorCode.VALIDATION_TRANSCRIPT_EMPTY: ErrorDetail(
        400, "unknown_error", "Transcript cannot be empty"
    ),
    VoiceErrorCode.VALIDATION_TRANSCRIPT_TOO_LONG: ErrorDetail(
        400, "unknown_error", "Transcript exceeds maximum length"
    ),
    VoiceErrorCode.VALIDATION_INVALID_LANGUAGE: ErrorDetail(
        400, "unknown_error", "Invalid language code"
    ),
    VoiceErrorCode.VALIDATION_INVALID_PLATFORM: ErrorDetail(
        400, "unknown_error", "Invalid platform identifier"
    ),
    VoiceErrorCode.RATE_LIMIT_EXCEEDED: ErrorDetail(
        429, "rate_limit", "Rate limit exceeded for voice requests"
    ),
    VoiceErrorCode.INTENT_CLASSIFICATION_FAILED: ErrorDetail(
        500, "unknown_error", "Failed to classify voice intent"
    ),
    VoiceErrorCode.INTENT_HANDLER_FAILED: ErrorDetail(
        500, "unknown_error", "Intent handler encountered an error"
    ),
    VoiceErrorCode.SERVICE_STT_UNAVAILABLE: ErrorDetail(
        503, "service_unavailable", "Speech-to-text service unavailable"
    ),
    VoiceErrorCode.SERVICE_TTS_UNAVAILABLE: ErrorDetail(
        503, "service_unavailable", "Text-to-speech service unavailable"
    ),
    VoiceErrorCode.SERVICE_SEARCH_UNAVAILABLE: ErrorDetail(
        503, "search_failure", "Search service unavailable"
    ),
    VoiceErrorCode.SERVICE_AI_UNAVAILABLE: ErrorDetail(
        503, "claude_api_failure", "AI service unavailable"
    ),
    VoiceErrorCode.CONTENT_NOT_FOUND: ErrorDetail(
        404, "no_results", "Requested content not found"
    ),
    VoiceErrorCode.CHANNEL_NOT_FOUND: ErrorDetail(
        404, "no_results", "Requested channel not found"
    ),
    VoiceErrorCode.EPISODE_NOT_FOUND: ErrorDetail(
        404, "no_results", "Requested episode not found"
    ),
    VoiceErrorCode.INTERNAL_ERROR: ErrorDetail(
        500, "unknown_error", "Internal server error"
    ),
    VoiceErrorCode.TIMEOUT: ErrorDetail(
        504, "timeout", "Request timed out"
    ),
}


def get_error_detail(code: VoiceErrorCode) -> ErrorDetail:
    """
    Get structured error detail for a voice error code.

    Args:
        code: VoiceErrorCode enum value

    Returns:
        ErrorDetail with http_status, message_key, and description
    """
    return ERROR_DETAILS.get(
        code,
        ErrorDetail(500, "unknown_error", "Unknown error"),
    )
