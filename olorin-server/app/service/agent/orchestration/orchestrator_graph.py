"""
LangGraph Integration for Autonomous Investigation Orchestrator

This module integrates the AutonomousOrchestrator into LangGraph workflows,
providing master orchestration capabilities for investigation coordination.

Key Features:
- Master orchestrator node integration
- AI-driven investigation strategy selection
- Bulletproof resilience with circuit breaker patterns
- Dynamic agent coordination and handoff
- Real-time progress monitoring via WebSocket events

Phase 1.3: LangGraph Integration Implementation
"""

from typing import Dict, List, Any, Optional, Annotated
from langchain_core.messages import BaseMessage, AIMessage, ToolMessage
from langgraph.graph.message import add_messages
from langgraph.graph import START, StateGraph
from langgraph.prebuilt import ToolNode, tools_condition
from typing_extensions import TypedDict

from app.service.agent.autonomous_orchestrator import (
    AutonomousOrchestrator,
    autonomous_orchestrator_node,
    OrchestrationStrategy
)
from app.service.agent.orchestration.enhanced_tool_executor import (
    EnhancedToolNode,
    ToolHealthManager
)
from app.service.logging import get_bridge_logger
from app.service.agent.autonomous_agents import (
    autonomous_network_agent,
    autonomous_device_agent,
    autonomous_location_agent,
    autonomous_logs_agent,
    autonomous_risk_agent,
)
from app.service.agent.orchestration.investigation_coordinator import start_investigation
from app.service.agent.orchestration.assistant import assistant
from app.service.agent.nodes.raw_data_node import raw_data_node
from app.service.agent.orchestration.enhanced_routing import raw_data_or_investigation_routing

logger = get_bridge_logger(__name__)


async def create_resilient_memory():
    """
    Create a resilient memory saver with bulletproof fallback handling.
    
    Attempts to use Redis for persistence but falls back to MemorySaver if
    Redis is unavailable. This ensures investigations continue even when
    external services fail.
    
    Returns:
        Either Redis-based saver (preferred) or MemorySaver (fallback)
    """
    from app.service.config import get_settings_for_env
    from app.service.redis_client import test_redis_connection
    
    settings = get_settings_for_env()
    
    # First, try to use a proper LangGraph Redis saver if available
    try:
        # Test Redis connection first
        if test_redis_connection(settings):
            logger.info("🛡️ Redis connection successful - using Redis for persistence")
            # Use LangGraph's built-in RedisSaver if available
            from langgraph.checkpoint.redis import RedisSaver
            from app.service.redis_client import get_redis_client
            
            redis_client = get_redis_client(settings).get_client()
            memory = RedisSaver(redis_client)
            logger.info("🛡️ Using LangGraph RedisSaver with Redis Cloud")
            return memory
            
        else:
            logger.warning("🛡️ Redis connection failed - falling back to MemorySaver")
            from langgraph.checkpoint.memory import MemorySaver
            return MemorySaver()
            
    except ImportError:
        logger.info("🛡️ LangGraph RedisSaver not available - trying AsyncRedisSaver with mock")
        
        # Fallback to AsyncRedisSaver with mock IPS cache
        try:
            from app.persistence.async_ips_redis import AsyncRedisSaver
            import os
            
            # Force use of mock client to avoid non-existent ipscache-qal.api.olorin.com
            os.environ["USE_MOCK_IPS_CACHE"] = "true"
            memory = AsyncRedisSaver()
            
            logger.info("🛡️ Using AsyncRedisSaver with MockIPSCacheClient - bulletproof resilience enabled")
            return memory
            
        except Exception as e:
            logger.warning(f"🛡️ AsyncRedisSaver failed ({str(e)}) - falling back to MemorySaver")
            from langgraph.checkpoint.memory import MemorySaver
            return MemorySaver()
            
    except Exception as e:
        logger.warning(f"🛡️ Redis unavailable ({str(e)}) - falling back to MemorySaver for bulletproof operation")
        from langgraph.checkpoint.memory import MemorySaver
        return MemorySaver()


class OrchestratorState(TypedDict):
    """Extended state for orchestrator-driven investigations"""
    messages: Annotated[List[BaseMessage], add_messages]
    orchestration_decision: Optional[Dict[str, Any]]
    active_strategy: Optional[str]
    agent_coordination: Dict[str, Any]
    investigation_progress: Dict[str, Any]


async def orchestrator_conditional_routing(state: OrchestratorState) -> str:
    """
    AI-driven conditional routing based on orchestrator decisions.
    
    This function analyzes the orchestrator's AI-driven decision to determine
    the next execution path in the LangGraph workflow.
    
    Args:
        state: Current investigation state with orchestration decisions
        
    Returns:
        Next node name based on orchestration strategy
    """
    try:
        # Extract orchestration decision from state
        orchestration_decision = state.get("orchestration_decision", {})
        strategy = orchestration_decision.get("strategy", "comprehensive")
        agents_to_activate = orchestration_decision.get("agents_to_activate", [])
        
        logger.info(f"🧭 Orchestrator routing decision: strategy={strategy}, agents={agents_to_activate}")
        
        # Route based on AI orchestration strategy
        if strategy == OrchestrationStrategy.COMPREHENSIVE.value:
            # Parallel execution of all agents
            if "network" in agents_to_activate:
                return "network_agent"
            elif "device" in agents_to_activate:
                return "device_agent"
            elif "location" in agents_to_activate:
                return "location_agent"
            elif "logs" in agents_to_activate:
                return "logs_agent"
            else:
                return "risk_agent"
                
        elif strategy == OrchestrationStrategy.FOCUSED.value:
            # Single domain focus based on AI recommendation
            primary_agent = agents_to_activate[0] if agents_to_activate else "network"
            return f"{primary_agent}_agent"
            
        elif strategy == OrchestrationStrategy.SEQUENTIAL.value:
            # Sequential execution following AI-determined order
            execution_order = orchestration_decision.get("execution_order", ["network"])
            next_agent = execution_order[0]
            return f"{next_agent}_agent"
            
        elif strategy == OrchestrationStrategy.ADAPTIVE.value:
            # Dynamic routing based on current investigation context
            if state.get("investigation_progress", {}).get("network_complete"):
                return "device_agent"
            elif state.get("investigation_progress", {}).get("device_complete"):
                return "location_agent"
            else:
                return "network_agent"
                
        elif strategy == OrchestrationStrategy.CRITICAL_PATH.value:
            # Priority-based execution for time-critical investigations
            if "risk" in agents_to_activate:
                return "risk_agent"
            else:
                return "network_agent"
        
        # Fallback to comprehensive strategy
        logger.warning(f"⚠️ Unknown orchestration strategy {strategy}, falling back to network_agent")
        return "network_agent"
        
    except Exception as e:
        logger.error(f"🚨 Orchestrator routing failed: {str(e)}, routing to network_agent")
        return "network_agent"


async def orchestration_decision_node(state: OrchestratorState, config) -> OrchestratorState:
    """
    Process orchestration decision and update investigation state.
    
    This node analyzes the orchestrator's AI decision and updates the investigation
    state to reflect the chosen strategy and agent coordination plan.
    
    Args:
        state: Current investigation state
        config: LangGraph configuration
        
    Returns:
        Updated state with orchestration decision applied
    """
    try:
        # Extract orchestration results from messages
        messages = state.get("messages", [])
        orchestration_message = None
        
        for msg in reversed(messages):
            if isinstance(msg, AIMessage) and "orchestration" in msg.content.lower():
                orchestration_message = msg
                break
        
        if orchestration_message:
            import json
            try:
                # Parse orchestration decision
                orchestration_data = json.loads(orchestration_message.content)
                
                # Update state with orchestration decision
                state["orchestration_decision"] = orchestration_data.get("decision", {})
                state["active_strategy"] = orchestration_data.get("strategy", "comprehensive")
                state["agent_coordination"] = orchestration_data.get("coordination", {})
                state["investigation_progress"] = orchestration_data.get("progress", {})
                
                logger.info(f"✅ Applied orchestration decision: {state['active_strategy']}")
                
            except json.JSONDecodeError as e:
                logger.warning(f"⚠️ Failed to parse orchestration decision: {e}")
                
        return state
        
    except Exception as e:
        logger.error(f"🚨 Orchestration decision processing failed: {str(e)}")
        return state


async def create_orchestrator_driven_graph(
    use_enhanced_tools: bool = True,
    orchestration_mode: str = "ai_driven"
) -> StateGraph:
    """
    Create LangGraph with autonomous orchestrator as master coordinator.
    
    This creates a LangGraph where the AutonomousOrchestrator serves as the
    master coordinator, making AI-driven decisions about investigation strategy
    and agent coordination.
    
    Args:
        use_enhanced_tools: Whether to use EnhancedToolNode with bulletproof patterns
        orchestration_mode: Type of orchestration ("ai_driven", "rule_based", "hybrid")
        
    Returns:
        Compiled LangGraph with orchestrator integration
        
    Raises:
        Exception: If graph creation fails with detailed error information
    """
    logger.info(f"🏗️ Creating orchestrator-driven graph: tools={use_enhanced_tools}, mode={orchestration_mode}")
    
    try:
        # Initialize StateGraph with extended state
        builder = StateGraph(OrchestratorState)
        
        # Add core investigation nodes
        builder.add_node("start_investigation", start_investigation)
        builder.add_node("raw_data_node", raw_data_node)
        builder.add_node("fraud_investigation", assistant)
        
        # Add master orchestrator node (Phase 1.3 integration)
        builder.add_node("autonomous_orchestrator", autonomous_orchestrator_node)
        
        # Add orchestration decision processing node
        builder.add_node("orchestration_decision", orchestration_decision_node)
        
        # Add autonomous agent nodes
        builder.add_node("network_agent", autonomous_network_agent)
        builder.add_node("device_agent", autonomous_device_agent)
        builder.add_node("location_agent", autonomous_location_agent)
        builder.add_node("logs_agent", autonomous_logs_agent)
        builder.add_node("risk_agent", autonomous_risk_agent)
        
        # Configure tools with bulletproof patterns
        tools = _get_orchestrator_tools()
        if use_enhanced_tools:
            tool_node = await _create_orchestrator_enhanced_tools(tools)
        else:
            tool_node = ToolNode(_filter_working_tools(tools))
        
        builder.add_node("tools", tool_node)
        
        # Define orchestrator-driven workflow edges
        builder.add_edge(START, "start_investigation")
        
        # Raw data vs investigation routing
        builder.add_conditional_edges(
            "start_investigation",
            raw_data_or_investigation_routing,
            {
                "raw_data_node": "raw_data_node",
                "fraud_investigation": "fraud_investigation"
            }
        )
        
        # Raw data flows to fraud investigation
        builder.add_edge("raw_data_node", "fraud_investigation")
        
        # Initial investigation flows to master orchestrator
        builder.add_edge("fraud_investigation", "autonomous_orchestrator")
        
        # Orchestrator decision processing
        builder.add_edge("autonomous_orchestrator", "orchestration_decision")
        
        # AI-driven conditional routing from orchestrator
        builder.add_conditional_edges(
            "orchestration_decision",
            orchestrator_conditional_routing,
            {
                "network_agent": "network_agent",
                "device_agent": "device_agent", 
                "location_agent": "location_agent",
                "logs_agent": "logs_agent",
                "risk_agent": "risk_agent"
            }
        )
        
        # Agent coordination flows - all agents can flow back to orchestrator for coordination
        for agent_name in ["network_agent", "device_agent", "location_agent", "logs_agent"]:
            builder.add_edge(agent_name, "risk_agent")  # Final risk assessment
            
        # Tool integration with conditional routing
        builder.add_conditional_edges("fraud_investigation", tools_condition)
        builder.add_edge("tools", "fraud_investigation")
        
        # Compile graph with persistence and bulletproof configuration
        memory = await create_resilient_memory()
        
        # Compile with orchestrator-specific configuration
        graph = builder.compile(
            checkpointer=memory,
            interrupt_before=["tools"],
            debug=True  # Enable debug mode for orchestrator tracing
        )
        
        logger.info("✅ Orchestrator-driven graph compiled successfully with AI coordination")
        return graph
        
    except Exception as e:
        logger.error(f"🚨 Failed to create orchestrator-driven graph: {str(e)}")
        raise Exception(f"Graph creation failed: {str(e)}")


async def create_hybrid_orchestration_graph(
    parallel_execution: bool = True,
    use_enhanced_tools: bool = True
) -> StateGraph:
    """
    Create hybrid orchestration graph combining traditional and AI-driven orchestration.
    
    This graph provides both traditional rule-based orchestration and AI-driven 
    orchestration, allowing for flexible investigation strategies based on context.
    
    Args:
        parallel_execution: Whether to enable parallel agent execution
        use_enhanced_tools: Whether to use enhanced tool execution
        
    Returns:
        Compiled hybrid orchestration graph
    """
    logger.info(f"🏗️ Creating hybrid orchestration graph: parallel={parallel_execution}")
    
    try:
        builder = StateGraph(OrchestratorState)
        
        # Core nodes
        builder.add_node("start_investigation", start_investigation)
        builder.add_node("raw_data_node", raw_data_node)
        builder.add_node("fraud_investigation", assistant)
        
        # Dual orchestration nodes
        builder.add_node("autonomous_orchestrator", autonomous_orchestrator_node)
        builder.add_node("orchestration_decision", orchestration_decision_node)
        
        # Agent nodes
        builder.add_node("network_agent", autonomous_network_agent)
        builder.add_node("device_agent", autonomous_device_agent)
        builder.add_node("location_agent", autonomous_location_agent)
        builder.add_node("logs_agent", autonomous_logs_agent)
        builder.add_node("risk_agent", autonomous_risk_agent)
        
        # Tools configuration
        tools = _get_orchestrator_tools()
        tool_node = await _create_orchestrator_enhanced_tools(tools) if use_enhanced_tools else ToolNode(tools)
        builder.add_node("tools", tool_node)
        
        # Hybrid workflow definition
        builder.add_edge(START, "start_investigation")
        
        # Standard routing
        builder.add_conditional_edges(
            "start_investigation",
            raw_data_or_investigation_routing,
            {
                "raw_data_node": "raw_data_node",
                "fraud_investigation": "fraud_investigation"
            }
        )
        
        builder.add_edge("raw_data_node", "fraud_investigation")
        
        # Hybrid orchestration decision point
        builder.add_edge("fraud_investigation", "autonomous_orchestrator")
        builder.add_edge("autonomous_orchestrator", "orchestration_decision")
        
        # Dynamic routing based on orchestration mode
        builder.add_conditional_edges(
            "orchestration_decision",
            orchestrator_conditional_routing,
            {
                "network_agent": "network_agent",
                "device_agent": "device_agent",
                "location_agent": "location_agent", 
                "logs_agent": "logs_agent",
                "risk_agent": "risk_agent"
            }
        )
        
        # Agent coordination patterns
        if parallel_execution:
            # Parallel coordination
            for agent in ["network_agent", "device_agent", "location_agent", "logs_agent"]:
                builder.add_edge(agent, "risk_agent")
        else:
            # Sequential coordination
            builder.add_edge("network_agent", "device_agent")
            builder.add_edge("device_agent", "location_agent")
            builder.add_edge("location_agent", "logs_agent")
            builder.add_edge("logs_agent", "risk_agent")
        
        # Tool integration
        builder.add_conditional_edges("fraud_investigation", tools_condition)
        builder.add_edge("tools", "fraud_investigation")
        
        # Compile with enhanced configuration
        memory = await create_resilient_memory()
        
        graph = builder.compile(
            checkpointer=memory,
            interrupt_before=["tools"],
            debug=True
        )
        
        logger.info("✅ Hybrid orchestration graph compiled successfully")
        return graph
        
    except Exception as e:
        logger.error(f"🚨 Failed to create hybrid orchestration graph: {str(e)}")
        raise


def _get_orchestrator_tools():
    """Get tools optimized for orchestrator-driven investigations."""
    try:
        from app.service.agent.orchestration.graph_builder import _get_configured_tools
        return _get_configured_tools()
    except Exception as e:
        logger.error(f"Failed to get orchestrator tools: {e}")
        return []


async def _create_orchestrator_enhanced_tools(tools):
    """Create enhanced tool node optimized for orchestrator coordination."""
    try:
        from app.service.agent.orchestration.graph_builder import _create_enhanced_tool_node
        return await _create_enhanced_tool_node(tools, use_enhanced=True)
    except Exception as e:
        logger.error(f"Failed to create enhanced tools for orchestrator: {e}")
        return ToolNode(_filter_working_tools(tools))


def _filter_working_tools(tools):
    """Filter to working tools for orchestrator usage."""
    try:
        from app.service.agent.orchestration.graph_builder import _filter_working_tools as filter_tools
        return filter_tools(tools)
    except Exception as e:
        logger.error(f"Failed to filter tools: {e}")
        return []


# Orchestrator Graph Factory Functions

async def get_orchestrator_graph(
    orchestration_type: str = "ai_driven",
    execution_mode: str = "parallel",
    enhanced_tools: bool = True
) -> StateGraph:
    """
    Factory function to create appropriate orchestrator graph based on parameters.
    
    Args:
        orchestration_type: "ai_driven", "hybrid", or "traditional"
        execution_mode: "parallel" or "sequential"  
        enhanced_tools: Whether to use enhanced tool execution
        
    Returns:
        Configured orchestrator graph ready for compilation
    """
    logger.info(f"🏭 Creating orchestrator graph: type={orchestration_type}, mode={execution_mode}")
    
    if orchestration_type == "ai_driven":
        return await create_orchestrator_driven_graph(
            use_enhanced_tools=enhanced_tools,
            orchestration_mode="ai_driven"
        )
    elif orchestration_type == "hybrid":
        return await create_hybrid_orchestration_graph(
            parallel_execution=(execution_mode == "parallel"),
            use_enhanced_tools=enhanced_tools
        )
    else:
        # Fallback to traditional graph builder
        from app.service.agent.orchestration.graph_builder import create_and_get_agent_graph
        return await create_and_get_agent_graph(
            parallel=(execution_mode == "parallel"),
            use_enhanced_tools=enhanced_tools
        )