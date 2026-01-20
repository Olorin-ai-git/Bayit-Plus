"""
Cultural Context Service Package

Detects and explains Israeli/Jewish cultural references in text.
"""

from app.services.olorin.context.service import (
    CulturalContextService,
    cultural_context_service,
)

__all__ = ["CulturalContextService", "cultural_context_service"]
