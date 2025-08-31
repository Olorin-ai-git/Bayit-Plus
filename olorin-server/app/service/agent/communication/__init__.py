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
    ICEEventSubscription,
    get_event_bus
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

# Note: coordination_patterns module not implemented yet
# from .coordination_patterns import (...)

__all__ = [
    # ICE Events
    "ICEEventType",
    "ICEEvent", 
    "ICEEventBus",
    "ICEEventHandler",
    "ICEEventSubscription",
    "get_event_bus",
    
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
    "StateValidator"
]