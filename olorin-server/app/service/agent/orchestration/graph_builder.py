"""
Graph Builder - Creates and configures LangGraph instances for fraud investigations.

This module handles the creation of both parallel and sequential agent graphs
for different investigation workflows.
"""

import logging
from typing import Optional, Annotated, List

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from langgraph.graph import START, StateGraph
from langgraph.prebuilt import ToolNode, tools_condition
from typing_extensions import TypedDict

# Define MessagesState since it's not available in langchain_core.messages
class MessagesState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]

from app.service.agent.autonomous_agents import (
    autonomous_network_agent,
    autonomous_device_agent,
    autonomous_location_agent,
    autonomous_logs_agent,
    autonomous_risk_agent,
)
from app.service.agent.recursion_guard import get_recursion_guard
from app.service.agent.investigators.domain_agents import (
    network_agent, location_agent, logs_agent, device_agent, risk_agent
)
from app.service.agent.orchestration.investigation_coordinator import start_investigation
from app.service.agent.orchestration.assistant import assistant

logger = logging.getLogger(__name__)


def create_parallel_agent_graph():
    """Create autonomous agent graph for parallel execution with RecursionGuard protection."""
    guard = get_recursion_guard()
    logger.info("Creating parallel graph with autonomous agents and RecursionGuard protection")
    
    builder = StateGraph(MessagesState)

    # Define nodes
    builder.add_node("start_investigation", start_investigation)
    builder.add_node("fraud_investigation", assistant)
    builder.add_node("network_agent", autonomous_network_agent)
    builder.add_node("location_agent", autonomous_location_agent)
    builder.add_node("logs_agent", autonomous_logs_agent)
    builder.add_node("device_agent", autonomous_device_agent)
    builder.add_node("risk_agent", autonomous_risk_agent)

    # Add tools node with validation
    tools = _get_configured_tools()
    try:
        tool_node = ToolNode(tools)
        builder.add_node("tools", tool_node)
    except Exception as e:
        logger.error(f"Error creating ToolNode: {e}")
        tool_node = ToolNode(_filter_working_tools(tools))
        builder.add_node("tools", tool_node)

    # Define edges for parallel execution
    builder.add_edge(START, "start_investigation")
    builder.add_edge("start_investigation", "fraud_investigation")
    
    # Autonomous tool selection
    builder.add_conditional_edges("fraud_investigation", tools_condition)
    builder.add_edge("tools", "fraud_investigation")
    
    # Parallel domain agents
    builder.add_edge("fraud_investigation", "network_agent")
    builder.add_edge("fraud_investigation", "location_agent")
    builder.add_edge("fraud_investigation", "logs_agent")
    builder.add_edge("fraud_investigation", "device_agent")

    # All agents feed into risk assessment
    for agent in ["network_agent", "location_agent", "logs_agent", "device_agent"]:
        builder.add_edge(agent, "risk_agent")

    # Compile with memory
    from app.persistence.async_ips_redis import AsyncRedisSaver
    memory = AsyncRedisSaver()
    graph = builder.compile(checkpointer=memory, interrupt_before=["tools"])

    logger.info("✅ Parallel autonomous agent graph compiled successfully")
    return graph


def create_sequential_agent_graph():
    """Create agent graph with sequential execution for controlled fraud investigations."""
    logger.info("Creating sequential graph with controlled agent execution")
    
    builder = StateGraph(MessagesState)

    # Define nodes with traditional sequential execution
    builder.add_node("start_investigation", start_investigation)
    builder.add_node("fraud_investigation", assistant)
    builder.add_node("network_agent", network_agent)
    builder.add_node("location_agent", location_agent)
    builder.add_node("logs_agent", logs_agent)
    builder.add_node("device_agent", device_agent)
    builder.add_node("risk_agent", risk_agent)

    # Add tools
    tools = _get_configured_tools()
    try:
        tool_node = ToolNode(tools)
        builder.add_node("tools", tool_node)
    except Exception as e:
        logger.error(f"Error creating ToolNode: {e}")
        tool_node = ToolNode(_filter_working_tools(tools))
        builder.add_node("tools", tool_node)

    # Sequential execution flow
    builder.add_edge(START, "start_investigation")
    builder.add_edge("start_investigation", "fraud_investigation")
    builder.add_conditional_edges("fraud_investigation", tools_condition)
    builder.add_edge("tools", "fraud_investigation")
    
    # Sequential domain execution
    builder.add_edge("fraud_investigation", "network_agent")
    builder.add_edge("network_agent", "location_agent")
    builder.add_edge("location_agent", "logs_agent")
    builder.add_edge("logs_agent", "device_agent")
    builder.add_edge("device_agent", "risk_agent")

    # Compile with memory
    from app.persistence.async_ips_redis import AsyncRedisSaver
    memory = AsyncRedisSaver()
    graph = builder.compile(checkpointer=memory, interrupt_before=["tools"])

    logger.info("✅ Sequential agent graph compiled successfully")
    return graph


def create_and_get_agent_graph(parallel: bool = True):
    """
    Create and return the appropriate agent graph based on execution mode.
    
    Args:
        parallel: If True, creates parallel autonomous agent graph.
                 If False, creates sequential controlled agent graph.
    
    Returns:
        Compiled LangGraph instance ready for investigation execution.
    """
    logger.info(f"Creating agent graph: parallel={parallel}")
    
    if parallel:
        return create_parallel_agent_graph()
    else:
        return create_sequential_agent_graph()


def _get_configured_tools():
    """Get configured tools from settings."""
    from app.service.config import get_settings_for_env
    from app.service.agent.tools.splunk_tool.splunk_tool import SplunkQueryTool
    from app.service.agent.tools.sumologic_tool.sumologic_tool import SumoLogicQueryTool
    from app.service.agent.tools.retriever_tool.retriever_tool import QBRetrieverTool, TTRetrieverTool
    from app.utils.class_utils import create_instance
    
    settings = get_settings_for_env()
    tools = []
    
    # Define available tool classes
    available_tools = {
        'SplunkQueryTool': SplunkQueryTool,
        'SumoLogicQueryTool': SumoLogicQueryTool,
        'QBRetrieverTool': QBRetrieverTool,
        'TTRetrieverTool': TTRetrieverTool,
    }
    
    for tool_name in settings.enabled_tool_list:
        if tool_name in available_tools:
            tools.append(available_tools[tool_name]())
        else:
            logger.warning(f"Tool {tool_name} not found in available tools")

    # Ensure essential SIEM tools are available
    if not any(isinstance(t, SplunkQueryTool) for t in tools):
        tools.append(SplunkQueryTool())
        
    if not any(isinstance(t, SumoLogicQueryTool) for t in tools):
        tools.append(SumoLogicQueryTool())
    
    return tools


def _filter_working_tools(tools):
    """Filter to working tools only."""
    filtered_tools = []
    for tool in tools:
        try:
            ToolNode([tool])  # Test if tool works
            filtered_tools.append(tool)
        except Exception:
            pass
    return filtered_tools