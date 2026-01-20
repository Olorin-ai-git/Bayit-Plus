"""
Judaism Routes - Re-export from modular structure.

This file maintains backward compatibility by re-exporting the router
from the new modular judaism/ package.

For new development, import directly from app.api.routes.judaism
"""

from app.api.routes.judaism import router

__all__ = ["router"]
