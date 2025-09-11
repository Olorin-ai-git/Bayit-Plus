"""
Enhanced Investigation State Schema with AI Intelligence Tracking

This module provides backward compatibility while delegating to modular components.
All original functionality is preserved through component imports.
"""

from typing import TypedDict, List, Dict, Any, Optional, Annotated
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

from app.service.agent.orchestration.state_schema import InvestigationState

# Import all components from the new modular structure
from .state import (
    # Enums and constants
    AIConfidenceLevel,
    InvestigationStrategy,
    SafetyConcernType,
    
    # Data models
    AIRoutingDecision,
    SafetyOverride,
    HybridInvestigationState,
    
    # Factory functions
    create_hybrid_initial_state,
    
    # Update functions
    update_ai_confidence,
    add_safety_override
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
    "add_safety_override"
]