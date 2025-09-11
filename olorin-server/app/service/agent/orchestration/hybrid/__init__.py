"""
Hybrid Intelligence Graph System

This package implements the unified hybrid system that combines:
1. AI-driven intelligent routing from orchestrator_graph.py
2. Comprehensive safety mechanisms from clean_graph_builder.py

The hybrid approach uses confidence-based routing to determine when to trust
AI decisions vs. fall back to safety-first sequential execution.

Key Components:
- HybridInvestigationState: Enhanced state with AI confidence tracking
- AIConfidenceEngine: Multi-factor confidence calculation
- AdvancedSafetyManager: Dynamic safety limits based on context
- HybridGraphBuilder: Unified graph builder combining both approaches
- IntelligentRouter: Confidence-based routing decisions
"""

from .hybrid_state_schema import (
    HybridInvestigationState,
    AIRoutingDecision,
    AIConfidenceLevel,
    create_hybrid_initial_state
)

from .ai_confidence_engine import AIConfidenceEngine

from .safety import (
    AdvancedSafetyManager,
    SafetyStatus,
    SafetyConcern
)

from .hybrid_graph_builder import HybridGraphBuilder

from .intelligent_router import IntelligentRouter

from .migration_utilities import (
    GraphSelector,
    FeatureFlags,
    get_investigation_graph
)

__all__ = [
    "HybridInvestigationState",
    "AIRoutingDecision", 
    "AIConfidenceLevel",
    "create_hybrid_initial_state",
    "AIConfidenceEngine",
    "AdvancedSafetyManager",
    "SafetyStatus",
    "SafetyConcern",
    "HybridGraphBuilder",
    "IntelligentRouter",
    "GraphSelector",
    "FeatureFlags",
    "get_investigation_graph"
]

__version__ = "1.0.0"
__author__ = "Gil Klainert"
__description__ = "Hybrid Intelligence Graph System for Olorin Fraud Detection"