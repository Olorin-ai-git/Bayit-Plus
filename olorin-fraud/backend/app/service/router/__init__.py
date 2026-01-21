"""
Router configuration module for Olorin application.

This module provides router setup and endpoint configuration including:
- Router inclusion and registration
- Health check endpoints
- Utility endpoints
- API route management
"""

from .router_config import configure_routes

__all__ = [
    "configure_routes",
]
