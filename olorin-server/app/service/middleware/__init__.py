"""
Middleware configuration module for Olorin application.

This module provides middleware setup and configuration including:
- Security headers configuration
- CORS middleware setup
- Rate limiting configuration
- Authentication middleware management
"""

from .middleware_config import configure_middleware

__all__ = [
    "configure_middleware",
]
