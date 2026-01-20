"""
Olorin Shared - Unified core services for Olorin.ai ecosystem platforms.

Provides consolidated authentication, configuration, logging, and error handling
across Fraud Detection and Bayit+ Media Streaming platforms.
"""

from olorin_shared.auth import create_access_token, verify_access_token
from olorin_shared.config import Settings
from olorin_shared.errors import OlorinException, ValidationError, AuthenticationError, NotFoundError
from olorin_shared.logging import get_logger

__all__ = [
    # Auth
    "create_access_token",
    "verify_access_token",
    # Config
    "Settings",
    # Errors
    "OlorinException",
    "ValidationError",
    "AuthenticationError",
    "NotFoundError",
    # Logging
    "get_logger",
]

__version__ = "0.1.0"
