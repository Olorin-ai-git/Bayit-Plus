"""
Confidence Score Consolidation System

This module provides backward compatibility while delegating to modular components.
All original functionality is preserved through component imports.
"""

# Import all components from the new modular structure
from app.service.agent.orchestration.hybrid.confidence import (
    # Main class (maintains original interface)
    ConfidenceConsolidator,
    
    # Data models for advanced usage
    ConfidenceFieldType,
    ConsolidatedConfidence,
    
    # Individual components for advanced customization
    ConfidenceExtractor,
    ConfidenceValidator,
    ConfidenceCalculator,
    ConfidenceApplicator,
    
    # Constants
    DEFAULT_COMPONENT_WEIGHTS,
    CONFIDENCE_THRESHOLDS,
    FALLBACK_CONFIDENCE,
    FALLBACK_LEVEL
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
    "FALLBACK_LEVEL"
]