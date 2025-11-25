"""
Migration and Integration Components for Hybrid Intelligence System

This module provides comprehensive migration capabilities with:
- Feature flag management for safe rollouts
- Graph selection with A/B testing
- Rollback triggers and health monitoring
- Integration adapters for seamless service connectivity
"""

from .feature_flags import DeploymentMode, FeatureFlags, GraphType
from .graph_selection import GraphSelector

# Public API for backward compatibility
from .migration_manager import (
    MigrationManager,
    disable_hybrid_graph,
    enable_hybrid_graph,
    get_feature_flags,
    get_investigation_graph,
    start_ab_test,
    stop_ab_test,
)
from .rollback import RollbackTriggers

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
    "stop_ab_test",
]
