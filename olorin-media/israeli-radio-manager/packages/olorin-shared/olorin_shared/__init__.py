"""
Olorin Shared - Unified core services for Olorin.ai ecosystem platforms.

Provides consolidated authentication, configuration, logging, error handling,
and centralized database connections across Fraud Detection and Bayit+ Media
Streaming platforms.
"""

from olorin_shared.auth import create_access_token, verify_access_token
from olorin_shared.config import Settings
from olorin_shared.database import (MongoDBConnection, close_mongodb_connection,
                                     get_mongodb_client, get_mongodb_database,
                                     init_mongodb)
from olorin_shared.errors import (AuthenticationError, NotFoundError,
                                   OlorinException, ValidationError)
from olorin_shared.logging import get_logger

__all__ = [
    # Auth
    "create_access_token",
    "verify_access_token",
    # Config
    "Settings",
    # Database
    "MongoDBConnection",
    "init_mongodb",
    "close_mongodb_connection",
    "get_mongodb_client",
    "get_mongodb_database",
    # Errors
    "OlorinException",
    "ValidationError",
    "AuthenticationError",
    "NotFoundError",
    # Logging
    "get_logger",
]

__version__ = "0.1.0"
