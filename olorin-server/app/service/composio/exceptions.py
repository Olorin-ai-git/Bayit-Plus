"""
Custom exceptions for Composio API integration.
"""

from typing import Optional, Dict, Any


class ComposioError(Exception):
    """Base exception for Composio-related errors."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class ComposioConnectionError(ComposioError):
    """Raised when Composio connection fails."""
    pass


class ComposioOAuthError(ComposioError):
    """Raised when OAuth flow fails."""
    pass


class ComposioTokenExpiredError(ComposioError):
    """Raised when access token has expired."""
    pass


class ComposioActionError(ComposioError):
    """Raised when Composio action execution fails."""
    
    def __init__(self, message: str, action_name: Optional[str] = None, toolkit_name: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        self.action_name = action_name
        self.toolkit_name = toolkit_name
        super().__init__(message, details)


class ComposioRateLimitError(ComposioError):
    """Raised when Composio API rate limit is exceeded."""
    pass


class ComposioConfigurationError(ComposioError):
    """Raised when Composio configuration is invalid."""
    pass

