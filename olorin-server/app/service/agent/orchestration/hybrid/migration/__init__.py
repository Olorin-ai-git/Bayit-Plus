"""
Migration and Integration Components for Hybrid Intelligence System

This module provides comprehensive migration capabilities with:
- Feature flag management for safe rollouts
- Graph selection with A/B testing
- Rollback triggers and health monitoring  
- Integration adapters for seamless service connectivity
"""

from .migration_manager import MigrationManager
from .feature_flags import (
    FeatureFlags,
    DeploymentMode,
    GraphType
)
from .graph_selection import GraphSelector
from .rollback import RollbackTriggers

# Public API for backward compatibility
from .migration_manager import (
    get_investigation_graph,
    get_feature_flags,
    enable_hybrid_graph,
    disable_hybrid_graph,
    start_ab_test,
    stop_ab_test
)

__all__ = [
    "MigrationManager",
    "FeatureFlags", 
    "DeploymentMode",
    "GraphType",
    "GraphSelector",
    "RollbackTriggers",
    "get_investigation_graph",
    "get_feature_flags",
    "enable_hybrid_graph",
    "disable_hybrid_graph",
    "start_ab_test",
    "stop_ab_test"
]