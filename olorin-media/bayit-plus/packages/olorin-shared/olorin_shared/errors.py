"""
Unified error handling for Olorin.ai ecosystem platforms.

Provides consistent exception types and HTTP response formatting
across all Olorin.ai services.
"""

from typing import Any, Dict, Optional


class OlorinException(Exception):
    """Base exception for all Olorin.ai platform errors."""

    def __init__(
        self,
        message: str,
        error_code: str = "OLORIN_ERROR",
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None,
    ):
        """
        Initialize Olorin exception.

        Args:
            message: Error message
            error_code: Machine-readable error code
            status_code: HTTP status code
            details: Additional error details
        """
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}

        super().__init__(self.message)

    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for JSON response."""
        return {
            "error": self.error_code,
            "message": self.message,
            "details": self.details,
        }

    def __str__(self) -> str:
        """String representation."""
        return f"{self.error_code}: {self.message}"


class ValidationError(OlorinException):
    """Raised when input validation fails."""

    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            status_code=400,
            details=details,
        )


class AuthenticationError(OlorinException):
    """Raised when authentication fails."""

    def __init__(
        self,
        message: str = "Authentication failed",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=message,
            error_code="AUTHENTICATION_ERROR",
            status_code=401,
            details=details,
        )


class AuthorizationError(OlorinException):
    """Raised when user lacks required permissions."""

    def __init__(
        self,
        message: str = "Insufficient permissions",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=message,
            error_code="AUTHORIZATION_ERROR",
            status_code=403,
            details=details,
        )


class NotFoundError(OlorinException):
    """Raised when requested resource is not found."""

    def __init__(
        self,
        resource_type: str,
        resource_id: str,
    ):
        message = f"{resource_type} not found: {resource_id}"
        super().__init__(
            message=message,
            error_code="NOT_FOUND",
            status_code=404,
            details={"resource_type": resource_type, "resource_id": resource_id},
        )


class ConflictError(OlorinException):
    """Raised when request conflicts with existing resource."""

    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=message,
            error_code="CONFLICT",
            status_code=409,
            details=details,
        )


class RateLimitError(OlorinException):
    """Raised when rate limit is exceeded."""

    def __init__(
        self,
        message: str = "Rate limit exceeded",
        retry_after_seconds: Optional[int] = None,
    ):
        details = {}
        if retry_after_seconds:
            details["retry_after_seconds"] = retry_after_seconds

        super().__init__(
            message=message,
            error_code="RATE_LIMIT_EXCEEDED",
            status_code=429,
            details=details,
        )


class ServiceUnavailableError(OlorinException):
    """Raised when external service is unavailable."""

    def __init__(
        self,
        service_name: str,
        message: Optional[str] = None,
    ):
        if message is None:
            message = f"{service_name} is currently unavailable"

        super().__init__(
            message=message,
            error_code="SERVICE_UNAVAILABLE",
            status_code=503,
            details={"service": service_name},
        )


class InternalError(OlorinException):
    """Raised for unexpected internal errors."""

    def __init__(
        self,
        message: str = "Internal server error",
        error_code: str = "INTERNAL_ERROR",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=500,
            details=details,
        )


def http_response_from_exception(exc: OlorinException) -> Dict[str, Any]:
    """
    Convert exception to HTTP response format.

    Args:
        exc: OlorinException instance

    Returns:
        Dictionary suitable for JSON HTTP response
    """
    return {
        "status": "error",
        "error": exc.error_code,
        "message": exc.message,
        "details": exc.details,
    }


def http_status_code_from_exception(exc: OlorinException) -> int:
    """
    Extract HTTP status code from exception.

    Args:
        exc: OlorinException instance

    Returns:
        HTTP status code
    """
    return exc.status_code
