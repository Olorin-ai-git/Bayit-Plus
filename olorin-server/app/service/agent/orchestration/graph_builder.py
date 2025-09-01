"""
Graph Builder - Creates and configures LangGraph instances for fraud investigations.

This module handles the creation of both parallel and sequential agent graphs
for different investigation workflows.
"""

import logging
from typing import Optional, Annotated, List, Dict

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from langgraph.graph import START, StateGraph
from langgraph.prebuilt import ToolNode, tools_condition
from typing_extensions import TypedDict

from app.service.agent.orchestration.enhanced_tool_executor import (
    EnhancedToolNode,
    ToolHealthManager
)
from app.service.agent.orchestration.subgraphs import (
    SubgraphOrchestrator,
    DeviceAnalysisSubgraph,
    NetworkAnalysisSubgraph,
    LocationAnalysisSubgraph,
    LogsAnalysisSubgraph
)
from app.service.agent.orchestration.enhanced_routing import (
    enhanced_fraud_routing,
    complexity_based_routing,
    adaptive_domain_routing
)

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


async def create_parallel_agent_graph(use_enhanced_tools=True):
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

    # Add tools node with enhanced executor
    tools = _get_configured_tools()
    
    # Create enhanced or standard tool node
    if use_enhanced_tools:
        tool_node = await _create_enhanced_tool_node(tools, use_enhanced=True)
    else:
        try:
            tool_node = ToolNode(tools)
        except Exception as e:
            logger.error(f"Error creating ToolNode: {e}")
            tool_node = ToolNode(_filter_working_tools(tools))
    
    # Add tool node to graph
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


async def create_sequential_agent_graph(use_enhanced_tools=True):
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

    # Add tools node with enhanced executor
    tools = _get_configured_tools()
    
    # Create enhanced or standard tool node
    if use_enhanced_tools:
        tool_node = await _create_enhanced_tool_node(tools, use_enhanced=True)
    else:
        try:
            tool_node = ToolNode(tools)
        except Exception as e:
            logger.error(f"Error creating ToolNode: {e}")
            tool_node = ToolNode(_filter_working_tools(tools))
    
    # Add tool node to graph
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


async def create_modular_graph_with_subgraphs(use_enhanced_tools: bool = True):
    """
    Create a modular graph with domain-specific subgraphs.
    Phase 2 enhancement: Subgraph pattern implementation.
    
    Args:
        use_enhanced_tools: If True, use enhanced tool executor
        
    Returns:
        Compiled graph with subgraph architecture
    """
    logger.info("Creating modular graph with domain subgraphs")
    
    builder = StateGraph(MessagesState)
    
    # Initialize subgraphs
    device_subgraph = DeviceAnalysisSubgraph(autonomous=True)
    network_subgraph = NetworkAnalysisSubgraph(autonomous=True)
    location_subgraph = LocationAnalysisSubgraph(autonomous=True)
    logs_subgraph = LogsAnalysisSubgraph(autonomous=True)
    
    # Add main nodes
    builder.add_node("start_investigation", start_investigation)
    builder.add_node("fraud_investigation", assistant)
    builder.add_node("risk_agent", autonomous_risk_agent)
    
    # Add subgraphs as nodes
    builder.add_node("device_subgraph", device_subgraph.compile().ainvoke)
    builder.add_node("network_subgraph", network_subgraph.compile().ainvoke)
    builder.add_node("location_subgraph", location_subgraph.compile().ainvoke)
    builder.add_node("logs_subgraph", logs_subgraph.compile().ainvoke)
    
    # Add enhanced tools node
    tools = _get_configured_tools()
    if use_enhanced_tools:
        tool_node = await _create_enhanced_tool_node(tools, use_enhanced=True)
    else:
        tool_node = ToolNode(_filter_working_tools(tools))
    
    builder.add_node("tools", tool_node)
    
    # Define routing with enhanced conditional routing
    builder.add_edge(START, "start_investigation")
    builder.add_edge("start_investigation", "fraud_investigation")
    
    # Use enhanced routing for domain selection
    builder.add_conditional_edges(
        "fraud_investigation",
        adaptive_domain_routing,
        {
            "device_agent": "device_subgraph",
            "network_agent": "network_subgraph",
            "location_agent": "location_subgraph",
            "logs_agent": "logs_subgraph",
            "risk_agent": "risk_agent"
        }
    )
    
    # Tool routing
    builder.add_conditional_edges("fraud_investigation", tools_condition)
    builder.add_edge("tools", "fraud_investigation")
    
    # Subgraphs feed back to investigation
    for subgraph_name in ["device_subgraph", "network_subgraph", "location_subgraph", "logs_subgraph"]:
        builder.add_edge(subgraph_name, "fraud_investigation")
    
    # Compile with persistence
    from app.persistence.async_ips_redis import AsyncRedisSaver
    memory = AsyncRedisSaver()
    graph = builder.compile(checkpointer=memory, interrupt_before=["tools"])
    
    logger.info("✅ Modular graph with subgraphs compiled successfully")
    return graph


async def create_and_get_agent_graph(parallel: bool = True, use_enhanced_tools: bool = True, use_subgraphs: bool = False):
    """
    Create and return the appropriate agent graph based on execution mode.
    
    Args:
        parallel: If True, creates parallel autonomous agent graph.
                 If False, creates sequential controlled agent graph.
        use_enhanced_tools: If True, use enhanced tool executor with resilience patterns.
        use_subgraphs: If True, use modular subgraph architecture (Phase 2).
    
    Returns:
        Compiled LangGraph instance ready for investigation execution.
    """
    logger.info(f"Creating agent graph: parallel={parallel}, enhanced_tools={use_enhanced_tools}, subgraphs={use_subgraphs}")
    
    # Use subgraph architecture if requested (Phase 2)
    if use_subgraphs:
        return await create_modular_graph_with_subgraphs(use_enhanced_tools=use_enhanced_tools)
    
    # Original graph creation
    if parallel:
        return await create_parallel_agent_graph(use_enhanced_tools=use_enhanced_tools)
    else:
        return await create_sequential_agent_graph(use_enhanced_tools=use_enhanced_tools)


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


async def _create_enhanced_tool_node(tools, use_enhanced=True):
    """
    Create tool node with optional enhanced executor.
    
    Args:
        tools: List of tools to use
        use_enhanced: If True, use EnhancedToolNode
        
    Returns:
        ToolNode or EnhancedToolNode instance
    """
    if use_enhanced:
        try:
            # Validate tools with health manager
            health_manager = ToolHealthManager()
            healthy_tools = await health_manager.validate_tool_ecosystem(tools)
            
            if not healthy_tools:
                logger.warning("No healthy tools found, falling back to all tools")
                healthy_tools = tools
            
            # Create enhanced tool node
            tool_node = EnhancedToolNode(healthy_tools)
            logger.info(f"✅ Created enhanced tool node with {len(healthy_tools)} healthy tools")
            return tool_node
            
        except Exception as e:
            logger.error(f"Failed to create enhanced tool node: {e}, falling back to standard ToolNode")
            return ToolNode(_filter_working_tools(tools))
    else:
        return ToolNode(_filter_working_tools(tools))


async def create_mcp_enhanced_graph(
    parallel: bool = True,
    use_enhanced_tools: bool = True,
    use_mcp: bool = True,
    mcp_servers: Optional[Dict] = None
):
    """
    Create a graph enhanced with MCP server tools.
    
    This function creates a LangGraph that integrates both traditional tools
    and MCP server tools for comprehensive fraud investigation capabilities.
    
    Args:
        parallel: If True, creates parallel execution graph
        use_enhanced_tools: If True, uses EnhancedToolNode with resilience
        use_mcp: If True, integrates MCP server tools
        mcp_servers: Optional dictionary of MCP server configurations
        
    Returns:
        Compiled LangGraph with MCP integration
    """
    logger.info(f"Creating MCP-enhanced graph: parallel={parallel}, enhanced={use_enhanced_tools}, mcp={use_mcp}")
    
    # Get traditional tools
    traditional_tools = _get_configured_tools()
    all_tools = traditional_tools.copy()
    
    # Add MCP tools if enabled
    if use_mcp:
        try:
            from app.service.agent.orchestration.mcp_client_manager import (
                MCPClientManager,
                get_fraud_detection_mcp_configs
            )
            
            # Use provided configs or defaults
            configs = mcp_servers or get_fraud_detection_mcp_configs()
            
            # Create and initialize MCP client
            mcp_client = MCPClientManager(configs)
            await mcp_client.initialize()
            
            # Get MCP tools
            mcp_tools = await mcp_client.get_healthy_tools()
            logger.info(f"Discovered {len(mcp_tools)} MCP tools")
            
            # Combine tools
            all_tools.extend(mcp_tools)
            
        except ImportError:
            logger.warning("MCP adapters not available, proceeding without MCP tools")
        except Exception as e:
            logger.error(f"Failed to initialize MCP tools: {e}")
    
    # Create base graph structure
    builder = StateGraph(MessagesState)
    
    # Add investigation nodes
    builder.add_node("start_investigation", start_investigation)
    builder.add_node("fraud_investigation", assistant)
    
    # Add agent nodes based on execution mode
    if parallel:
        builder.add_node("network_agent", autonomous_network_agent)
        builder.add_node("location_agent", autonomous_location_agent)
        builder.add_node("logs_agent", autonomous_logs_agent)
        builder.add_node("device_agent", autonomous_device_agent)
        builder.add_node("risk_agent", autonomous_risk_agent)
    else:
        builder.add_node("network_agent", network_agent)
        builder.add_node("location_agent", location_agent)
        builder.add_node("logs_agent", logs_agent)
        builder.add_node("device_agent", device_agent)
        builder.add_node("risk_agent", risk_agent)
    
    # Create tool node with all tools
    if use_enhanced_tools:
        tool_node = await _create_enhanced_tool_node(all_tools, use_enhanced=True)
    else:
        tool_node = ToolNode(_filter_working_tools(all_tools))
    
    builder.add_node("tools", tool_node)
    
    # Define edges
    builder.add_edge(START, "start_investigation")
    builder.add_edge("start_investigation", "fraud_investigation")
    
    # Tool routing
    builder.add_conditional_edges("fraud_investigation", tools_condition)
    builder.add_edge("tools", "fraud_investigation")
    
    # Agent routing based on execution mode
    if parallel:
        # Parallel execution
        builder.add_edge("fraud_investigation", "network_agent")
        builder.add_edge("fraud_investigation", "location_agent")
        builder.add_edge("fraud_investigation", "logs_agent")
        builder.add_edge("fraud_investigation", "device_agent")
        
        # All agents feed into risk assessment
        for agent in ["network_agent", "location_agent", "logs_agent", "device_agent"]:
            builder.add_edge(agent, "risk_agent")
    else:
        # Sequential execution
        builder.add_edge("fraud_investigation", "network_agent")
        builder.add_edge("network_agent", "location_agent")
        builder.add_edge("location_agent", "logs_agent")
        builder.add_edge("logs_agent", "device_agent")
        builder.add_edge("device_agent", "risk_agent")
    
    # Compile with memory
    from app.persistence.async_ips_redis import AsyncRedisSaver
    memory = AsyncRedisSaver()
    graph = builder.compile(checkpointer=memory, interrupt_before=["tools"])
    
    logger.info(f"✅ MCP-enhanced graph compiled with {len(all_tools)} tools")
    return graph