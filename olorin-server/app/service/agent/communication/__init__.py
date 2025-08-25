"""
Advanced Communication Package

Investigation Communication Events (ICE) system for real-time agent communication,
multi-agent coordination, and investigation state management.
"""

from .ice_events import (
    ICEEventType,
    ICEEvent,
    ICEEventBus,
    ICEEventHandler,
    ICEEventSubscription
)

from .agent_communication import (
    AgentCommunicationHub,
    CommunicationChannel,
    MessageType,
    AgentMessage,
    CommunicationProtocol
)

from .investigation_state import (
    InvestigationStateManager,
    InvestigationState,
    StateTransition,
    StateValidator
)

from .coordination_patterns import (
    CoordinationPatternType,
    CoordinationPattern,
    CoordinationManager,
    TaskCoordination,
    ResourceCoordination
)

__all__ = [
    # ICE Events
    "ICEEventType",
    "ICEEvent", 
    "ICEEventBus",
    "ICEEventHandler",
    "ICEEventSubscription",
    
    # Agent Communication
    "AgentCommunicationHub",
    "CommunicationChannel",
    "MessageType",
    "AgentMessage",
    "CommunicationProtocol",
    
    # Investigation State
    "InvestigationStateManager",
    "InvestigationState",
    "StateTransition",
    "StateValidator",
    
    # Coordination Patterns
    "CoordinationPatternType",
    "CoordinationPattern",
    "CoordinationManager",
    "TaskCoordination",
    "ResourceCoordination"
]