
# Disable LangSmith to prevent authentication errors
import os
os.environ['LANGCHAIN_TRACING_V2'] = 'false'
os.environ.pop('LANGCHAIN_API_KEY', None)
os.environ.pop('LANGSMITH_API_KEY', None)

"""
Structured Domain Agents

Intelligent fraud investigation agents that use LLM-driven decision making
and structured tool selection instead of predetermined service calls.

This module has been refactored into smaller modules for better maintainability
while preserving all existing functionality and imports.
"""

# Import from refactored modules for backward compatibility
from .base_agents import StructuredInvestigationAgent, structured_llm
from .domain_agents import (
    structured_network_agent,
    structured_device_agent,
    structured_location_agent,
    structured_logs_agent,
    structured_risk_agent,
)
from app.service.logging import get_bridge_logger
from .agent_communication import (
    _extract_investigation_info,
    _get_or_create_structured_context,
    _create_error_response,
    cleanup_investigation_context,
    get_investigation_contexts,
)
from .agent_factory import (
    create_structured_agent,
    configure_domain_tools,
    get_default_domain_objectives,
    initialize_llm_with_tools,
)

# Re-export all functions and classes for backward compatibility
__all__ = [
    # Base classes and LLM
    'StructuredInvestigationAgent',
    'structured_llm',
    
    # Domain agent functions
    'structured_network_agent',
    'structured_device_agent',
    'structured_location_agent',
    'structured_logs_agent',
    'structured_risk_agent',
    
    # Communication utilities (private functions but used by other modules)
    '_extract_investigation_info',
    '_get_or_create_structured_context',
    '_create_error_response',
    'cleanup_investigation_context',
    'get_investigation_contexts',
    
    # Factory functions
    'create_structured_agent',
    'configure_domain_tools',
    'get_default_domain_objectives',
    'initialize_llm_with_tools',
]

# Legacy imports for any code that might import directly
from app.service.agent.journey_tracker import LangGraphJourneyTracker, NodeType, NodeStatus

logger = get_bridge_logger(__name__)
journey_tracker = LangGraphJourneyTracker()

# Additional helper functions that were in the original file
def _get_journey_tracker():
    """Get the LangGraph journey tracker instance."""
    return journey_tracker