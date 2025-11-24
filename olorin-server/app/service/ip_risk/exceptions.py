"""
Custom exceptions for MaxMind minFraud API integration.
"""

from typing import Optional, Dict, Any


class MaxMindError(Exception):
    """Base exception for MaxMind-related errors."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class MaxMindAPIError(MaxMindError):
    """Raised when MaxMind API call fails."""
    pass


class MaxMindRateLimitError(MaxMindError):
    """Raised when MaxMind API rate limit is exceeded."""
    pass


class MaxMindConfigurationError(MaxMindError):
    """Raised when MaxMind configuration is invalid."""
    pass


class MaxMindInvalidIPError(MaxMindError):
    """Raised when invalid IP address is provided."""
    pass


class MaxMindConnectionError(MaxMindError):
    """Raised when MaxMind API connection fails (timeout, network error)."""
    pass


class MaxMindAuthenticationError(MaxMindError):
    """Raised when MaxMind API authentication fails."""
    pass


class MaxMindInvalidRequestError(MaxMindError):
    """Raised when MaxMind API request is invalid."""
    pass


class MaxMindServerError(MaxMindError):
    """Raised when MaxMind API server error occurs."""
    pass

