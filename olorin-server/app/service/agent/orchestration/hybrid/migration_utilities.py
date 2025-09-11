"""
Migration Utilities with Feature Flags for Hybrid Intelligence System

This module provides safe migration capabilities between different graph implementations
with feature flags, A/B testing, and rollback mechanisms.

BACKWARD COMPATIBILITY LAYER: This module now imports from the refactored
migration system while maintaining the exact same API for existing code.
"""

from typing import Dict, Any, Optional
from langgraph.graph import StateGraph

# Import all classes and enums from the new migration system
from .migration import (
    # Core classes for backward compatibility
    FeatureFlags,
    GraphType,
    DeploymentMode,
    GraphSelector,
    RollbackTriggers,
    
    # Public API functions
    get_investigation_graph,
    get_feature_flags,
    enable_hybrid_graph,
    disable_hybrid_graph,
    start_ab_test,
    stop_ab_test
)

from app.service.logging import get_bridge_logger

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