"""
Domain Agents - Specialized investigation agents for different analysis domains.

This module contains the individual agent execution functions for network, 
location, device, logs, and risk analysis.
"""

import json
from datetime import datetime
from typing import Annotated, List

from langchain_core.messages import AIMessage, BaseMessage
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict
from app.service.logging import get_bridge_logger

# Define MessagesState since it's not available in langchain_core.messages
class MessagesState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]

# Import the working orchestration domain agents instead of missing analysis services
from app.service.agent.orchestration.domain_agents.network_agent import network_agent_node
from app.service.agent.orchestration.domain_agents.device_agent import device_agent_node
from app.service.agent.orchestration.domain_agents.location_agent import location_agent_node
from app.service.agent.orchestration.domain_agents.logs_agent import logs_agent_node
from app.service.agent.orchestration.domain_agents.authentication_agent import authentication_agent_node
from app.service.agent.orchestration.domain_agents.risk_agent import risk_agent_node
# Remove unused imports since we're delegating to orchestration agents
from app.service.agent.core import log_agent_execution

logger = get_bridge_logger(__name__)


async def network_agent(state: MessagesState, config) -> dict:
    """Execute network analysis for fraud investigation using orchestration agent."""
    log_agent_execution("network_agent", "hybrid", "network", "start")

    # Delegate to the orchestration network agent
    result = await network_agent_node(state, config)

    log_agent_execution("network_agent", "hybrid", "network", "complete")
    return result


async def location_agent(state: MessagesState, config) -> dict:
    """Execute location analysis for fraud investigation using orchestration agent."""
    log_agent_execution("location_agent", "hybrid", "location", "start")

    # Delegate to the orchestration location agent
    result = await location_agent_node(state, config)

    log_agent_execution("location_agent", "hybrid", "location", "complete")
    return result


async def logs_agent(state: MessagesState, config) -> dict:
    """Execute logs analysis for fraud investigation using orchestration agent."""
    log_agent_execution("logs_agent", "hybrid", "logs", "start")

    # Delegate to the orchestration logs agent
    result = await logs_agent_node(state, config)

    log_agent_execution("logs_agent", "hybrid", "logs", "complete")
    return result


async def device_agent(state: MessagesState, config) -> dict:
    """Execute device analysis for fraud investigation using orchestration agent."""
    log_agent_execution("device_agent", "hybrid", "device", "start")

    # Delegate to the orchestration device agent
    result = await device_agent_node(state, config)

    log_agent_execution("device_agent", "hybrid", "device", "complete")
    return result


async def risk_agent(state: MessagesState, config) -> dict:
    """Execute final risk assessment for fraud investigation using orchestration agent."""
    log_agent_execution("risk_agent", "hybrid", "risk", "start")

    # Delegate to the orchestration risk agent
    result = await risk_agent_node(state, config)

    log_agent_execution("risk_agent", "hybrid", "risk", "complete")
    return result


async def authentication_agent(state: MessagesState, config) -> dict:
    """Execute authentication analysis for fraud investigation using orchestration agent."""
    log_agent_execution("authentication_agent", "hybrid", "authentication", "start")

    # Delegate to the orchestration authentication agent
    result = await authentication_agent_node(state, config)

    log_agent_execution("authentication_agent", "hybrid", "authentication", "complete")
    return result