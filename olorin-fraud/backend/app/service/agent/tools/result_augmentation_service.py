"""
Tool Result Augmentation Service

Enhances tool results with contextual knowledge and insights from the RAG system.
Provides result interpretation, historical context, pattern analysis, and
knowledge-based recommendations for next steps.
"""

# Re-export all components from refactored modules
from .result_augmentation_core import (
    AugmentedToolResult,
    ConfidenceScore,
    HistoricalPattern,
    NextStepRecommendation,
    ResultAugmentationConfig,
    ResultInsights,
    ThreatCorrelation,
)
from .result_augmentation_factory import (
    clear_global_instances,
    create_result_augmentation_service,
    get_result_augmentation_service,
)
from .result_augmentation_main import ToolResultAugmentationService

# Re-export all components
__all__ = [
    # Core data structures
    "ResultInsights",
    "HistoricalPattern",
    "NextStepRecommendation",
    "ConfidenceScore",
    "ThreatCorrelation",
    "AugmentedToolResult",
    "ResultAugmentationConfig",
    # Main service
    "ToolResultAugmentationService",
    # Factory functions
    "create_result_augmentation_service",
    "get_result_augmentation_service",
    "clear_global_instances",
]
