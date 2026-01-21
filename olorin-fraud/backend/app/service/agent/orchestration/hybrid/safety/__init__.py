"""
Safety Package for Hybrid Intelligence Graph

This package provides comprehensive safety management for hybrid intelligence
investigations, including dynamic limits, resource monitoring, and AI control authorization.

The package is organized into:
- models: Core data structures and configuration
- assessors: Safety assessment components
- limiters: Resource limits and authorization
- recommendations: Action recommendations and reasoning
- safety_manager: Main orchestrator

For backward compatibility, the original AdvancedSafetyManager interface
is preserved while using the new modular architecture.
"""

# Import component factories (for advanced usage)
from .assessors import (
    get_concern_detector,
    get_resource_pressure_calculator,
    get_safety_level_detector,
    get_termination_checker,
)
from .limiters import (
    get_ai_control_authorizer,
    get_dynamic_limits_calculator,
    get_resource_tracker,
)

# Import core safety models
from .models import (
    SafetyConcern,
    SafetyLevel,
    SafetyLimits,
    SafetyStatus,
    SafetyThresholdConfig,
    get_safety_threshold_config,
)
from .recommendations import get_action_recommender, get_override_reasoner

# Import main safety manager (new modular architecture)
from .safety_manager import AdvancedSafetyManager, SafetyManager, get_safety_manager

# Backward compatibility exports
# These maintain the original import paths that existing code expects
__all__ = [
    # Core safety models (original interface)
    "SafetyLevel",
    "SafetyLimits",
    "SafetyStatus",
    "SafetyConcern",
    # Main safety manager (backward compatible)
    "AdvancedSafetyManager",  # Original class name
    "SafetyManager",  # New class name
    # Configuration
    "SafetyThresholdConfig",
    "get_safety_threshold_config",
    # Factory functions for components (advanced usage)
    "get_safety_manager",
    "get_safety_level_detector",
    "get_resource_pressure_calculator",
    "get_concern_detector",
    "get_termination_checker",
    "get_dynamic_limits_calculator",
    "get_resource_tracker",
    "get_ai_control_authorizer",
    "get_action_recommender",
    "get_override_reasoner",
]

# For backward compatibility, create module-level instances
# This allows existing code like "from safety import advanced_safety_manager" to work
_default_safety_manager = None


def _get_default_manager():
    """Get the default safety manager instance"""
    global _default_safety_manager
    if _default_safety_manager is None:
        _default_safety_manager = AdvancedSafetyManager()
    return _default_safety_manager


# Module-level convenience instance (for backward compatibility)
advanced_safety_manager = _get_default_manager()

# Version information
__version__ = "2.0.0"
__architecture__ = "modular"
__compatibility__ = "backward_compatible"


def get_package_info():
    """Get information about the safety package"""
    return {
        "version": __version__,
        "architecture": __architecture__,
        "compatibility": __compatibility__,
        "components": {
            "models": 3,  # safety_models, safety_concern, threshold_config
            "assessors": 4,  # safety_level_detector, resource_pressure_calculator, concern_detector, termination_checker
            "limiters": 3,  # dynamic_limits_calculator, resource_tracker, ai_control_authorizer
            "recommendations": 2,  # action_recommender, override_reasoner
        },
        "total_components": 12,
        "original_file_lines": 585,
        "modular_max_lines": 150,
        "reduction_factor": 3.9,
    }
