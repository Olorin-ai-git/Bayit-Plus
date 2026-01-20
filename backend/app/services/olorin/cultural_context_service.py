"""
Cultural Context Service for Olorin.ai Platform

DEPRECATED: This module has been refactored into the context/ subpackage.
This file is kept for backward compatibility.

Import from app.services.olorin.context instead.
"""

# Re-export from new location for backward compatibility
from app.services.olorin.context import CulturalContextService, cultural_context_service

__all__ = ["CulturalContextService", "cultural_context_service"]
