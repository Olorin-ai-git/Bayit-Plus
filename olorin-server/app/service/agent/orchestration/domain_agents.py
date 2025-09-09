"""
Domain Agent Import Compatibility Layer

This module imports the actual domain agents from the orchestration.domain_agents package
and re-exports them for backward compatibility with the clean graph builder.

The real domain agents are in app.service.agent.orchestration.domain_agents/
"""

from typing import Dict, Any
from app.service.agent.orchestration.state_schema import InvestigationState

# Import the real orchestration domain agents (6 agents total)
from app.service.agent.orchestration.domain_agents import (
    network_agent_node,
    device_agent_node,
    location_agent_node,
    logs_agent_node,
    authentication_agent_node,
    risk_agent_node
)

from app.service.logging import get_bridge_logger
from langchain_core.messages import SystemMessage

logger = get_bridge_logger(__name__)

# Re-export all the real domain agent functions directly
# These are the actual implementations used by the clean graph builder

# The domain agents are imported above and available for direct use:
# - network_agent_node
# - device_agent_node  
# - location_agent_node
# - logs_agent_node
# - authentication_agent_node
# - risk_agent_node

# All 6 domain agents are properly integrated and ready for use
logger.info("✅ Domain agents compatibility layer loaded - all 6 agents available")