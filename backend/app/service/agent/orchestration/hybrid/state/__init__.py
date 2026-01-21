"""
Hybrid State Management Components

This package provides modular components for hybrid investigation state management
while maintaining backward compatibility with existing imports.
"""

# Import AI decision models
from .ai_decision_models import (
    AIRoutingDecision,
    SafetyOverride,
    create_initial_ai_decision,
    create_safety_override,
)

# Import base state schema
from .base_state_schema import HybridInvestigationState

# Import all enums and constants
from .enums_and_constants import (
    CONFIDENCE_LEVEL_MAPPINGS,
    DEFAULT_INITIAL_CONFIDENCE,
    DEFAULT_SAFETY_CHECKS,
    HYBRID_SYSTEM_VERSION,
    PERFORMANCE_METRICS_FIELDS,
    QUALITY_GATES,
    RESOURCE_IMPACT_LEVELS,
    AIConfidenceLevel,
    InvestigationStrategy,
    SafetyConcernType,
    get_default_dynamic_limits,
)

# Import state factory functions
from .state_factory import create_hybrid_initial_state

# Import state update functions
from .state_updater import (
    add_safety_concern,
    add_safety_override,
    update_ai_confidence,
    update_investigation_strategy,
)

# Export all public interfaces for backward compatibility
__all__ = [
    # Enums
    "AIConfidenceLevel",
    "InvestigationStrategy",
    "SafetyConcernType",
    # Data Models
    "AIRoutingDecision",
    "SafetyOverride",
    "HybridInvestigationState",
    # Factory Functions
    "create_hybrid_initial_state",
    "create_initial_ai_decision",
    "create_safety_override",
    # Update Functions
    "update_ai_confidence",
    "add_safety_override",
    "update_investigation_strategy",
    "add_safety_concern",
    # Constants
    "CONFIDENCE_LEVEL_MAPPINGS",
    "get_default_dynamic_limits",
    "HYBRID_SYSTEM_VERSION",
    "DEFAULT_INITIAL_CONFIDENCE",
    "QUALITY_GATES",
    "PERFORMANCE_METRICS_FIELDS",
    "DEFAULT_SAFETY_CHECKS",
    "RESOURCE_IMPACT_LEVELS",
]
