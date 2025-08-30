"""
Autonomous Domain Agents

Intelligent fraud investigation agents that use LLM-driven decision making
and autonomous tool selection instead of predetermined service calls.

This module has been refactored into smaller modules for better maintainability
while preserving all existing functionality and imports.
"""

# Import from refactored modules for backward compatibility
from .base_agents import AutonomousInvestigationAgent, autonomous_llm
from .domain_agents import (
    autonomous_network_agent,
    autonomous_device_agent,
    autonomous_location_agent,
    autonomous_logs_agent,
    autonomous_risk_agent,
)
from .agent_communication import (
    _extract_investigation_info,
    _get_or_create_autonomous_context,
    _create_error_response,
    cleanup_investigation_context,
    get_investigation_contexts,
)
from .agent_factory import (
    create_autonomous_agent,
    configure_domain_tools,
    get_default_domain_objectives,
    initialize_llm_with_tools,
)

# Re-export all functions and classes for backward compatibility
__all__ = [
    # Base classes and LLM
    'AutonomousInvestigationAgent',
    'autonomous_llm',
    
    # Domain agent functions
    'autonomous_network_agent',
    'autonomous_device_agent',
    'autonomous_location_agent',
    'autonomous_logs_agent',
    'autonomous_risk_agent',
    
    # Communication utilities (private functions but used by other modules)
    '_extract_investigation_info',
    '_get_or_create_autonomous_context',
    '_create_error_response',
    'cleanup_investigation_context',
    'get_investigation_contexts',
    
    # Factory functions
    'create_autonomous_agent',
    'configure_domain_tools',
    'get_default_domain_objectives',
    'initialize_llm_with_tools',
]

# Legacy imports for any code that might import directly
import logging
from app.service.agent.journey_tracker import LangGraphJourneyTracker, NodeType, NodeStatus

logger = logging.getLogger(__name__)
journey_tracker = LangGraphJourneyTracker()

# Additional helper functions that were in the original file
def _get_journey_tracker():
    """Get the LangGraph journey tracker instance."""
    return journey_tracker