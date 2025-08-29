"""
Application factory module for Olorin application.

This module provides the main application factory functionality including:
- OlorinApplication class for application orchestration
- FastAPI application creation and configuration
- Application lifecycle management
"""

from .olorin_factory import OlorinApplication

__all__ = [
    "OlorinApplication",
]