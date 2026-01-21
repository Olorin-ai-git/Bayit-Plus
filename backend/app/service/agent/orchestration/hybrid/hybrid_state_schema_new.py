"""
Enhanced Investigation State Schema with AI Intelligence Tracking

This module provides backward compatibility while delegating to modular components.
All original functionality is preserved through component imports.
"""

from typing import Annotated, Any, Dict, List, Optional, TypedDict

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

from app.service.agent.orchestration.state_schema import InvestigationState

# Import all components from the new modular structure
from .state import (  # Enums and constants; Data models; Factory functions; Update functions
    AIConfidenceLevel,
    AIRoutingDecision,
    HybridInvestigationState,
    InvestigationStrategy,
    SafetyConcernType,
    SafetyOverride,
    add_safety_override,
    create_hybrid_initial_state,
    update_ai_confidence,
)

# Re-export everything for backward compatibility
__all__ = [
    "AIConfidenceLevel",
    "InvestigationStrategy",
    "SafetyConcernType",
    "AIRoutingDecision",
    "SafetyOverride",
    "HybridInvestigationState",
    "create_hybrid_initial_state",
    "update_ai_confidence",
    "add_safety_override",
]
