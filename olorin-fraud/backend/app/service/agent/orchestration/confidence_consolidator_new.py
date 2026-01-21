"""
Confidence Score Consolidation System

This module provides backward compatibility while delegating to modular components.
All original functionality is preserved through component imports.
"""

# Import all components from the new modular structure
from app.service.agent.orchestration.hybrid.confidence import (  # Main class (maintains original interface); Data models for advanced usage; Individual components for advanced customization; Constants
    CONFIDENCE_THRESHOLDS,
    DEFAULT_COMPONENT_WEIGHTS,
    FALLBACK_CONFIDENCE,
    FALLBACK_LEVEL,
    ConfidenceApplicator,
    ConfidenceCalculator,
    ConfidenceConsolidator,
    ConfidenceExtractor,
    ConfidenceFieldType,
    ConfidenceValidator,
    ConsolidatedConfidence,
)

# Re-export everything for backward compatibility
__all__ = [
    "ConfidenceConsolidator",
    "ConfidenceFieldType",
    "ConsolidatedConfidence",
    "ConfidenceExtractor",
    "ConfidenceValidator",
    "ConfidenceCalculator",
    "ConfidenceApplicator",
    "DEFAULT_COMPONENT_WEIGHTS",
    "CONFIDENCE_THRESHOLDS",
    "FALLBACK_CONFIDENCE",
    "FALLBACK_LEVEL",
]
