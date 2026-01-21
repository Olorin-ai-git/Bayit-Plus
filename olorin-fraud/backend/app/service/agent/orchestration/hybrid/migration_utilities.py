"""
Migration Utilities with Feature Flags for Hybrid Intelligence System

This module provides safe migration capabilities between different graph implementations
with feature flags, A/B testing, and rollback mechanisms.

BACKWARD COMPATIBILITY LAYER: This module now imports from the refactored
migration system while maintaining the exact same API for existing code.
"""

from typing import Any, Dict, Optional

from langgraph.graph import StateGraph

from app.service.logging import get_bridge_logger

# Import all classes and enums from the new migration system
from .migration import (  # Core classes for backward compatibility; Public API functions
    DeploymentMode,
    FeatureFlags,
    GraphSelector,
    GraphType,
    RollbackTriggers,
    disable_hybrid_graph,
    enable_hybrid_graph,
    get_feature_flags,
    get_investigation_graph,
    start_ab_test,
    stop_ab_test,
)

logger = get_bridge_logger(__name__)


# All the original classes and functions are now imported from the new migration system
# This ensures 100% backward compatibility while using the new modular architecture

# Note: The original classes like FeatureFlags, GraphSelector, RollbackTriggers
# are now available through the imports at the top of this file.
# The global functions like get_investigation_graph, enable_hybrid_graph, etc.
# are also available through the imports.

logger.info("✅ Migration utilities loaded - backward compatibility maintained")
logger.info("   All original functionality preserved through new modular system")
logger.info("   Components: Feature flags, graph selection, rollback, integration")
