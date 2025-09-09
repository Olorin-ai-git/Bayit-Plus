"""
Clean Graph Builder for LangGraph Architecture

Builds the complete investigation graph with proper tool integration,
orchestrator control, and domain agent coordination.
"""

import os
from typing import List, Any, Dict, Union, Optional
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode
from langchain_core.messages import SystemMessage

from app.service.logging import get_bridge_logger
from app.service.agent.orchestration.state_schema import (
    InvestigationState,
    create_initial_state,
    update_phase,
    add_tool_result,
    is_investigation_complete
)
from app.service.agent.orchestration.orchestrator_agent import orchestrator_node
from app.service.agent.orchestration.domain_agents_clean import (
    network_agent_node,
    device_agent_node,
    location_agent_node,
    logs_agent_node,
    authentication_agent_node,
    risk_agent_node
)

logger = get_bridge_logger(__name__)


def get_all_tools() -> List[Any]:
    """
    Get all configured tools for the investigation.
    
    Returns:
        List of all 52 tools properly configured
    """
    from app.service.agent.tools.tool_registry import get_tools_for_agent, initialize_tools
    from app.service.agent.tools.snowflake_tool.snowflake_tool import SnowflakeQueryTool
    
    try:
        # Initialize the tool registry
        initialize_tools()
        
        # Get all tools from all categories
        tools = get_tools_for_agent(
            categories=[
                "olorin",           # Snowflake, Splunk, SumoLogic
                "threat_intelligence",  # AbuseIPDB, VirusTotal, Shodan
                "database",         # Database query tools
                "search",           # Vector search
                "blockchain",       # Crypto analysis
                "intelligence",     # OSINT, social media
                "ml_ai",           # ML-powered analysis
                "web",             # Web search and scraping
                "file_system",     # File operations
                "api",             # HTTP and JSON API tools
                "mcp_clients",     # External MCP connections
                "utility"          # Utility tools
            ]
        )
        
        # CRITICAL: Ensure Snowflake is the FIRST tool
        has_snowflake = any(isinstance(t, SnowflakeQueryTool) for t in tools)
        if not has_snowflake:
            try:
                snowflake_tool = SnowflakeQueryTool()
                tools.insert(0, snowflake_tool)
                logger.info("✅ Added SnowflakeQueryTool as PRIMARY tool")
            except Exception as e:
                logger.error(f"Could not add Snowflake tool: {e}")
        else:
            # Move Snowflake to first position if not already
            snowflake_tools = [t for t in tools if isinstance(t, SnowflakeQueryTool)]
            other_tools = [t for t in tools if not isinstance(t, SnowflakeQueryTool)]
            tools = snowflake_tools + other_tools
        
        logger.info(f"📦 Loaded {len(tools)} tools for investigation")
        
        # Log tool categories for debugging
        threat_tools = len([t for t in tools if 'threat' in t.name.lower() or 'virus' in t.name.lower()])
        db_tools = len([t for t in tools if 'splunk' in t.name.lower() or 'sumo' in t.name.lower() or 'snowflake' in t.name.lower()])
        ml_tools = len([t for t in tools if 'ml' in t.name.lower() or 'anomaly' in t.name.lower()])
        
        logger.info(f"  - Threat Intelligence: {threat_tools} tools")
        logger.info(f"  - Database/SIEM: {db_tools} tools")
        logger.info(f"  - ML/AI: {ml_tools} tools")
        
        return tools
        
    except Exception as e:
        logger.error(f"Failed to load tools: {e}")
        # Return at least Snowflake as fallback
        try:
            return [SnowflakeQueryTool()]
        except:
            return []


async def process_tool_results(state: InvestigationState) -> Dict[str, Any]:
    """
    Process tool results and update state accordingly.
    
    Args:
        state: Current investigation state
        
    Returns:
        State updates based on tool execution
    """
    import os
    is_test_mode = os.environ.get("TEST_MODE") == "mock"
    
    messages = state.get("messages", [])
    tools_used = state.get("tools_used", []).copy()
    tool_results = state.get("tool_results", {}).copy()
    
    logger.debug(f"🔧 PROCESS TOOL RESULTS DEBUG:")
    logger.debug(f"   Mode: {'TEST' if is_test_mode else 'LIVE'}")
    logger.debug(f"   Messages to process: {len(messages)}")
    logger.debug(f"   Tools used before: {tools_used}")
    logger.debug(f"   Tool results keys before: {list(tool_results.keys())}")
    
    # Check last message for tool results
    if messages:
        last_message = messages[-1]
        logger.debug(f"   Last message type: {type(last_message).__name__}")
        
        # Process ToolMessage results
        from langchain_core.messages import ToolMessage
        if isinstance(last_message, ToolMessage):
            tool_name = last_message.name
            logger.info(f"🔧 Processing tool result from: {tool_name}")
            logger.debug(f"   Tool name: {tool_name}")
            logger.debug(f"   Content length: {len(str(last_message.content)) if last_message.content else 0}")
            logger.debug(f"   Content preview: {str(last_message.content)[:150] if last_message.content else 'Empty'}...")
            
            # Add to tools used
            if tool_name not in tools_used:
                tools_used.append(tool_name)
                logger.debug(f"   Added {tool_name} to tools_used list")
            else:
                logger.debug(f"   {tool_name} already in tools_used list")
            
            # Store tool result
            try:
                import json
                result = json.loads(last_message.content)
                tool_results[tool_name] = result
                logger.debug(f"   Successfully parsed JSON result")
                
                # Special handling for Snowflake - ALWAYS mark as completed regardless of JSON parsing
                if "snowflake" in tool_name.lower():
                    logger.info("✅ Snowflake query completed with JSON result")
                    logger.debug("   Snowflake completed with JSON, moving to tool_execution phase")
                    return {
                        "tools_used": tools_used,
                        "tool_results": tool_results,
                        "snowflake_data": result,
                        "snowflake_completed": True,
                        "current_phase": "tool_execution"  # Move to next phase
                    }
            except Exception as e:
                # If not JSON, store as string
                logger.debug(f"   Failed to parse JSON: {e}")
                tool_results[tool_name] = last_message.content
                
                # CRITICAL FIX: Mark Snowflake as completed even with non-JSON content
                if "snowflake" in tool_name.lower():
                    logger.info("✅ Snowflake query completed with non-JSON result")
                    logger.debug("   Snowflake completed with non-JSON, moving to tool_execution phase")
                    return {
                        "tools_used": tools_used,
                        "tool_results": tool_results,
                        "snowflake_data": last_message.content,  # Store raw content
                        "snowflake_completed": True,
                        "current_phase": "tool_execution"  # Move to next phase regardless
                    }
            
            logger.debug(f"   Regular tool result processed, returning state update")
            return {
                "tools_used": tools_used,
                "tool_results": tool_results
            }
    else:
        logger.debug(f"   No messages to process")
    
    logger.debug(f"   No tool results to process, returning empty update")
    return {}


async def data_ingestion_node(state: InvestigationState) -> Dict[str, Any]:
    """
    Data ingestion node - prepares investigation data.
    
    Args:
        state: Current investigation state
        
    Returns:
        State updates
    """
    logger.info(f"📥 Data ingestion for {state['entity_type']}: {state['entity_id']}")
    
    # Prepare initial investigation message
    ingestion_msg = SystemMessage(content=f"""
    Investigation initialized:
    - Type: {state['entity_type']}
    - Entity: {state['entity_id']}
    - Investigation ID: {state['investigation_id']}
    
    Next: Mandatory Snowflake 30-day analysis
    """)
    
    return {
        "messages": [ingestion_msg],
        "current_phase": "initialization"
    }


async def summary_node(state: InvestigationState) -> Dict[str, Any]:
    """
    Summary node - generates final investigation report.
    
    Args:
        state: Current investigation state
        
    Returns:
        State updates with final summary
    """
    logger.info("📊 Generating final investigation summary")
    
    from app.service.agent.orchestration.state_schema import calculate_final_risk_score
    from datetime import datetime
    
    # Calculate final metrics
    final_risk = calculate_final_risk_score(state)
    tools_used = state.get("tools_used", [])
    domains_completed = state.get("domains_completed", [])
    
    # Generate summary message
    summary_content = f"""
# Investigation Complete

**Investigation ID:** {state['investigation_id']}
**Entity:** {state['entity_type']} - {state['entity_id']}

## Final Assessment
- **Risk Score:** {final_risk:.2f} / 1.00
- **Risk Level:** {'CRITICAL' if final_risk >= 0.8 else 'HIGH' if final_risk >= 0.6 else 'MEDIUM' if final_risk >= 0.4 else 'LOW'}
- **Confidence:** {state.get('confidence_score', 0.0):.2f}

## Coverage
- Tools Used: {len(tools_used)}
- Domains Analyzed: {', '.join(domains_completed)}
- Snowflake Analysis: {'✅ Complete' if state.get('snowflake_completed') else '❌ Incomplete'}

## Recommendation
{'🚨 BLOCK - High fraud risk' if final_risk >= 0.7 else '⚠️ REVIEW - Moderate risk' if final_risk >= 0.4 else '✅ APPROVE - Low risk'}
"""
    
    summary_msg = SystemMessage(content=summary_content)
    
    # Calculate duration
    if state.get("start_time"):
        start_dt = datetime.fromisoformat(state["start_time"])
        end_dt = datetime.utcnow()
        duration_ms = int((end_dt - start_dt).total_seconds() * 1000)
    else:
        duration_ms = 0
    
    return {
        "messages": [summary_msg],
        "current_phase": "complete",
        "end_time": datetime.utcnow().isoformat(),
        "total_duration_ms": duration_ms
    }


def route_from_orchestrator(state: InvestigationState) -> Union[str, List[str]]:
    """
    Routing function from orchestrator to next nodes.
    
    Args:
        state: Current investigation state
        
    Returns:
        Next node(s) to execute
    """
    from datetime import datetime
    
    current_phase = state.get("current_phase", "")
    messages = state.get("messages", [])
    snowflake_completed = state.get("snowflake_completed", False)
    tools_used = state.get("tools_used", [])
    
    # CRITICAL FIX: Increment orchestrator_loops FIRST to prevent infinite recursion
    # The orchestrator_agent.py increments this counter, but routing happens before that increment is saved
    # So we need to predict the next loop count for proper routing decisions
    base_orchestrator_loops = state.get("orchestrator_loops", 0)
    # Since routing happens AFTER orchestrator execution, we should use the incremented value
    # The orchestrator increments by 1, so we use the incremented value for routing decisions
    orchestrator_loops = base_orchestrator_loops + 1
    
    # Track routing decisions for debugging (collect them to return with result)
    routing_decisions = state.get("routing_decisions", []).copy()
    
    def log_routing_decision(decision: str, reason: str, state_info: dict):
        routing_decisions.append({
            "timestamp": datetime.utcnow().isoformat(),
            "orchestrator_loop": orchestrator_loops,
            "phase": current_phase,
            "decision": decision,
            "reason": reason,
            "state_info": state_info
        })
        
    # Helper function to return routing decision with state updates
    def route_with_logging(next_node: str, reason: str, state_info: dict = None):
        state_info = state_info or {}
        log_routing_decision(next_node, reason, state_info)
        # For LangGraph conditional edges, we can't return state updates
        # The state updates would need to be handled by the target node
        return next_node
    
    # Check if we're in TEST_MODE or live environment
    is_test_mode = os.environ.get("TEST_MODE") == "mock"
    max_loops = 12 if is_test_mode else 25  # Reduced limits to prevent long waits
    
    logger.info(f"🔀 Routing from orchestrator (predicted loop {orchestrator_loops}/{max_loops}, base: {base_orchestrator_loops})")
    
    # CRITICAL: Early termination to prevent infinite loops
    if orchestrator_loops >= max_loops:
        logger.warning(f"🚨 RECURSION SAFETY: {orchestrator_loops} orchestrator loops reached, forcing completion (mode: {'TEST' if is_test_mode else 'LIVE'})")
        return route_with_logging(
            "summary", 
            f"Recursion safety triggered - {orchestrator_loops} loops exceeded max {max_loops}",
            {"loops": orchestrator_loops, "max_loops": max_loops, "mode": "TEST" if is_test_mode else "LIVE"}
        )
    
    logger.info(f"   Phase: {current_phase}")
    logger.info(f"   Snowflake completed: {snowflake_completed}")
    logger.info(f"   Tools used: {len(tools_used)}")
    logger.info(f"   Messages: {len(messages)}")
    
    # DEBUG: Detailed state inspection
    logger.debug(f"🔍 DEBUG STATE INSPECTION:")
    logger.debug(f"   Mode: {'TEST' if is_test_mode else 'LIVE'}")
    logger.debug(f"   Max loops allowed: {max_loops}")
    logger.debug(f"   Base orchestrator loops: {base_orchestrator_loops}")
    logger.debug(f"   Predicted loop count: {orchestrator_loops}")
    logger.debug(f"   Phase: {current_phase}")
    logger.debug(f"   Investigation ID: {state.get('investigation_id', 'N/A')}")
    logger.debug(f"   Entity: {state.get('entity_type', 'N/A')} - {state.get('entity_id', 'N/A')}")
    logger.debug(f"   Tools used: {tools_used}")
    logger.debug(f"   Tool results keys: {list(state.get('tool_results', {}).keys())}")
    logger.debug(f"   Domains completed: {state.get('domains_completed', [])}")
    logger.debug(f"   Snowflake data available: {'Yes' if state.get('snowflake_data') else 'No'}")
    logger.debug(f"   Risk score: {state.get('risk_score', 'N/A')}")
    logger.debug(f"   Confidence: {state.get('confidence_score', 'N/A')}")
    logger.debug(f"   Tool execution attempts: {state.get('tool_execution_attempts', 0)}")
    logger.debug(f"   Message types: {[type(msg).__name__ for msg in messages[-3:]]}")  # Last 3 messages
    
    # CRITICAL FIX: Check for tool calls in last message FIRST
    if messages:
        last_message = messages[-1]
        logger.info(f"   Last message type: {type(last_message).__name__}")
        logger.debug(f"   Last message content preview: {str(last_message.content)[:100] if hasattr(last_message, 'content') else 'No content'}...")
        
        if hasattr(last_message, "tool_calls") and last_message.tool_calls:
            tool_names = [tc.get('name', 'unknown') for tc in last_message.tool_calls] if isinstance(last_message.tool_calls, list) else ['unknown']
            logger.info(f"  → Routing to tools (found {len(last_message.tool_calls)} tool calls)")
            logger.debug(f"     Tool calls: {tool_names}")
            return "tools"
    
    # Route based on phase with FORCED progression to prevent loops
    logger.debug(f"📍 PHASE ROUTING LOGIC:")
    
    if current_phase == "snowflake_analysis":
        logger.debug(f"   📊 SNOWFLAKE ANALYSIS PHASE")
        logger.debug(f"      Snowflake completed: {snowflake_completed}")
        
        if not snowflake_completed:
            # ADDITIONAL SAFETY: Check if any Snowflake ToolMessage already exists
            from langchain_core.messages import ToolMessage
            snowflake_tool_found = False
            snowflake_messages = []
            for i, msg in enumerate(messages):
                if isinstance(msg, ToolMessage) and "snowflake" in msg.name.lower():
                    snowflake_tool_found = True
                    snowflake_messages.append(f"Message {i}: {msg.name}")
            
            logger.debug(f"      Snowflake ToolMessages found: {len(snowflake_messages)}")
            if snowflake_messages:
                logger.debug(f"      Snowflake messages: {snowflake_messages}")
                logger.warning("🔧 Found Snowflake ToolMessage but completion flag not set - forcing completion")
            
            # Adjust thresholds based on mode - MORE AGGRESSIVE to prevent infinite loops
            loop_threshold = 3 if is_test_mode else 6  # Much lower thresholds
            logger.debug(f"      Loop threshold for this mode: {loop_threshold}")
            logger.debug(f"      Predicted loops: {orchestrator_loops}")
            
            if snowflake_tool_found or orchestrator_loops >= loop_threshold:
                logger.info(f"  → FORCED move to tool_execution phase (Snowflake ToolMessage found or loops >= {loop_threshold})")
                logger.debug(f"      Reason: {'Snowflake ToolMessage found' if snowflake_tool_found else 'Loop threshold exceeded'}")
                # Force phase completion by routing to process_tools
                return "process_tools"
            else:
                # Only stay in orchestrator for first few loops
                logger.info("  → Continuing with Snowflake analysis")
                logger.debug(f"      Staying in orchestrator (loops: {orchestrator_loops}/{loop_threshold})")
                return "orchestrator"
        else:
            logger.info("  → Snowflake complete, moving to tool_execution phase")
            logger.debug("      Snowflake completed, orchestrator will change phase")
            return "orchestrator"  # Let orchestrator change phase
    
    elif current_phase == "tool_execution":
        logger.debug(f"   🔧 TOOL EXECUTION PHASE")
        
        # ARCHITECTURE FIX: Prevent infinite loops in tool execution phase
        tool_execution_attempts = state.get("tool_execution_attempts", 0)
        max_attempts = 3
        
        # MORE AGGRESSIVE LIMITS to prevent infinite loops
        loop_threshold = 5 if is_test_mode else 8  # Much lower thresholds
        tool_threshold = 5 if is_test_mode else 8   # Reduced tool limits
        
        logger.debug(f"      Tool execution attempts: {tool_execution_attempts}/{max_attempts}")
        logger.debug(f"      Tools used: {len(tools_used)}/{tool_threshold}")
        logger.debug(f"      Loop threshold: {orchestrator_loops}/{loop_threshold}")
        logger.debug(f"      Current tools: {tools_used}")
        
        # CRITICAL FIX: Force progression after limited attempts
        should_progress = (
            tool_execution_attempts >= max_attempts or 
            len(tools_used) >= tool_threshold or 
            orchestrator_loops >= loop_threshold
        )
        
        if should_progress:
            reasons = []
            if tool_execution_attempts >= max_attempts:
                reasons.append(f"max attempts ({tool_execution_attempts})")
            if len(tools_used) >= tool_threshold:
                reasons.append(f"tool threshold ({len(tools_used)})")
            if orchestrator_loops >= loop_threshold:
                reasons.append(f"loop threshold ({orchestrator_loops})")
            
            logger.info(f"  → FORCED move to domain analysis (attempts: {tool_execution_attempts}, tools: {len(tools_used)}, loops: {orchestrator_loops})")
            logger.debug(f"      Progression reasons: {', '.join(reasons)}")
            return "orchestrator"  # Orchestrator will change phase to domain_analysis
        else:
            logger.info(f"  → Continuing tool execution (tools: {len(tools_used)}, attempts: {tool_execution_attempts})")
            logger.debug(f"      Continuing in tool execution phase")
            return "orchestrator"
    
    elif current_phase == "domain_analysis":
        logger.debug(f"   🎯 DOMAIN ANALYSIS PHASE")
        
        domains_completed = state.get("domains_completed", [])
        logger.debug(f"      Domains completed: {domains_completed}")
        
        # CRITICAL FIX: Use sequential execution with forced progression
        domain_order = ["network", "device", "location", "logs", "authentication", "risk"]
        logger.debug(f"      Domain execution order: {domain_order}")
        
        next_domain = None
        for domain in domain_order:
            if domain not in domains_completed:
                next_domain = domain
                logger.info(f"  → Routing to {domain}_agent (sequential)")
                logger.debug(f"      Next domain to execute: {domain}")
                return f"{domain}_agent"
        
        # MORE AGGRESSIVE LIMITS for domain completion
        domain_threshold = 6 if is_test_mode else 12  # Much lower thresholds
        logger.debug(f"      Domain threshold for this mode: {domain_threshold}")
        logger.debug(f"      Predicted loops: {orchestrator_loops}")
        
        # All domains complete OR too many loops - force to summary
        should_summarize = len(domains_completed) >= 3 or orchestrator_loops >= domain_threshold
        logger.debug(f"      Should move to summary: {should_summarize}")
        logger.debug(f"      Reasons: domains={len(domains_completed)}>=3, loops={orchestrator_loops}>={domain_threshold}")
        
        if should_summarize:
            logger.info(f"  → FORCED move to summary (domains: {len(domains_completed)}, loops: {orchestrator_loops})")
            return "summary"
    
    elif current_phase == "summary":
        logger.debug(f"   📋 SUMMARY PHASE")
        logger.info("  → Routing to summary")
        logger.debug("      Moving to summary generation")
        return "summary"
    
    elif current_phase == "complete":
        logger.debug(f"   ✅ COMPLETE PHASE")
        logger.info("  → Investigation complete")
        logger.debug("      Investigation completed, ending graph execution")
        return END
    
    # CRITICAL FIX: Prevent infinite default loops - MUCH MORE AGGRESSIVE
    logger.debug(f"   ❓ FALLBACK ROUTING")
    final_threshold = 6 if is_test_mode else 10  # Much lower thresholds
    logger.debug(f"      Final threshold for this mode: {final_threshold}")
    logger.debug(f"      Predicted loops: {orchestrator_loops}")
    
    if orchestrator_loops >= final_threshold:
        logger.warning(f"  → Too many orchestrator loops ({orchestrator_loops}), forcing summary (mode: {'TEST' if is_test_mode else 'LIVE'})")
        logger.debug("      Exceeded final threshold, forcing completion")
        return "summary"
    
    # SAFER DEFAULT: Force progression more aggressively to prevent infinite loops
    logger.info("  → Default: FORCING progression to prevent loops")
    logger.debug(f"      Fallback routing logic (aggressive):")
    logger.debug(f"         Snowflake completed: {snowflake_completed}")
    logger.debug(f"         Tools used: {len(tools_used)}")
    logger.debug(f"         Predicted loops: {orchestrator_loops}")
    
    # CRITICAL: Be much more aggressive about forcing completion
    if orchestrator_loops >= 4:  # After 4 loops, force summary regardless of state
        logger.warning(f"      → AGGRESSIVE TERMINATION: {orchestrator_loops} loops, forcing summary")
        return "summary"
    elif not snowflake_completed and orchestrator_loops >= 2:
        logger.warning(f"      → FORCED Snowflake completion after {orchestrator_loops} loops")
        return "summary"  # Force completion if Snowflake still not done
    elif len(tools_used) < 3 and orchestrator_loops >= 3:
        logger.warning(f"      → FORCED tool completion after {orchestrator_loops} loops")
        return "summary"  # Force completion if tools still not used
    else:
        logger.debug("      → Safe default to summary")
        return "summary"  # Default to summary to prevent further loops


def build_clean_investigation_graph() -> StateGraph:
    """
    Build the complete clean investigation graph.
    
    Returns:
        Compiled StateGraph ready for execution
    """
    logger.info("🏗️ Building clean investigation graph")
    
    # Create the graph with our state schema
    builder = StateGraph(InvestigationState)
    
    # Get all tools for the graph
    tools = get_all_tools()
    
    # Create tool executor node
    tool_executor = ToolNode(tools)
    logger.info(f"✅ Created ToolNode with {len(tools)} tools")
    
    # Add all nodes to the graph
    builder.add_node("data_ingestion", data_ingestion_node)
    builder.add_node("orchestrator", orchestrator_node)
    builder.add_node("tools", tool_executor)
    builder.add_node("process_tools", process_tool_results)  # Add tool result processor
    builder.add_node("network_agent", network_agent_node)
    builder.add_node("device_agent", device_agent_node)
    builder.add_node("location_agent", location_agent_node)
    builder.add_node("logs_agent", logs_agent_node)
    builder.add_node("authentication_agent", authentication_agent_node)
    builder.add_node("risk_agent", risk_agent_node)
    builder.add_node("summary", summary_node)
    
    logger.info("✅ Added all nodes to graph")
    
    # Define edges
    
    # Entry point
    builder.add_edge(START, "data_ingestion")
    
    # Data ingestion to orchestrator
    builder.add_edge("data_ingestion", "orchestrator")
    
    # Orchestrator routing
    builder.add_conditional_edges(
        "orchestrator",
        route_from_orchestrator,
        {
            "orchestrator": "orchestrator",  # Loop back to self
            "tools": "tools",
            "network_agent": "network_agent",
            "device_agent": "device_agent",
            "location_agent": "location_agent",
            "logs_agent": "logs_agent",
            "authentication_agent": "authentication_agent",
            "risk_agent": "risk_agent",
            "summary": "summary",
            END: END
        }
    )
    
    # Tools go to processor, then back to orchestrator
    builder.add_edge("tools", "process_tools")
    builder.add_edge("process_tools", "orchestrator")
    
    # All agents return to orchestrator
    for agent in ["network_agent", "device_agent", "location_agent", "logs_agent", "authentication_agent", "risk_agent"]:
        builder.add_edge(agent, "orchestrator")
    
    # Summary can end
    builder.add_edge("summary", END)
    
    logger.info("✅ Defined all edges and routing")
    
    # Compile the graph
    graph = builder.compile()
    
    logger.info("✅ Graph compiled successfully")
    
    return graph


async def run_investigation(
    entity_id: str,
    entity_type: str = "ip_address",
    investigation_id: str = None,
    custom_user_prompt: Optional[str] = None
) -> Dict[str, Any]:
    """
    Run a complete investigation using the clean graph.
    
    Args:
        entity_id: Entity to investigate
        entity_type: Type of entity
        investigation_id: Optional investigation ID
        custom_user_prompt: Optional custom user prompt with highest priority
        
    Returns:
        Investigation results
    """
    from uuid import uuid4
    import asyncio
    
    if not investigation_id:
        investigation_id = str(uuid4())
    
    logger.info(f"🚀 Starting investigation {investigation_id} for {entity_type}: {entity_id}")
    
    # Create initial state
    initial_state = create_initial_state(
        investigation_id=investigation_id,
        entity_id=entity_id,
        entity_type=entity_type,
        parallel_execution=True,
        max_tools=52,
        custom_user_prompt=custom_user_prompt
    )
    
    logger.info("📊 Initial state created")
    
    # Build the graph
    graph = build_clean_investigation_graph()
    
    logger.info("🏗️ Graph built, starting execution")
    
    # Run the investigation with timeout and recursion limit
    # Check if we're in TEST_MODE or live environment
    is_test_mode = os.environ.get("TEST_MODE") == "mock"
    
    # CRITICAL FIX: Much more aggressive limits to prevent infinite loops
    recursion_limit = 20 if is_test_mode else 35  # Lower recursion limits
    timeout = 60.0 if is_test_mode else 180.0  # Reasonable timeouts: 1-3 minutes max
    
    logger.info(f"⚙️ Graph execution configuration:")
    logger.info(f"   Recursion limit: {recursion_limit}")
    logger.info(f"   Timeout: {timeout}s")
    logger.info(f"   Mode: {'TEST' if is_test_mode else 'LIVE'}")
    
    # Add a deadlock detection mechanism
    start_time = asyncio.get_event_loop().time()
    deadlock_threshold = timeout * 0.8  # Warn at 80% of timeout
    
    try:
        # Create a task for the graph execution
        graph_task = asyncio.create_task(
            graph.ainvoke(
                initial_state,
                config={"recursion_limit": recursion_limit}  # Adjusted based on mode
            )
        )
        
        # Monitor progress with intermediate checks
        result = None
        check_interval = 15.0  # Check every 15 seconds
        last_check = start_time
        
        while True:
            try:
                # Wait for either completion or next check interval
                result = await asyncio.wait_for(graph_task, timeout=check_interval)
                break  # Task completed successfully
                
            except asyncio.TimeoutError:
                # Check if we've hit our deadlock threshold
                current_time = asyncio.get_event_loop().time()
                elapsed = current_time - start_time
                
                if elapsed >= deadlock_threshold:
                    logger.warning(f"⚠️ Potential deadlock detected: {elapsed:.1f}s elapsed (threshold: {deadlock_threshold:.1f}s)")
                    logger.warning(f"   Investigation: {investigation_id}")
                    logger.warning(f"   This may indicate an infinite loop in the orchestrator")
                
                if elapsed >= timeout:
                    # Cancel the task and raise timeout
                    graph_task.cancel()
                    raise asyncio.TimeoutError()
                
                # Continue monitoring
                continue
        
        logger.info(f"✅ Investigation complete - Risk: {result.get('risk_score', 0.0):.2f}")
        
        return {
            "success": True,
            "investigation_id": investigation_id,
            "risk_score": result.get("risk_score", 0.0),
            "confidence": result.get("confidence_score", 0.0),
            "tools_used": len(result.get("tools_used", [])),
            "domains_analyzed": result.get("domains_completed", []),
            "duration_ms": result.get("total_duration_ms", 0),
            "state": result
        }
        
    except asyncio.TimeoutError:
        logger.error(f"❌ Investigation timed out after {timeout} seconds (mode: {'TEST' if is_test_mode else 'LIVE'})")
        
        return {
            "success": False,
            "investigation_id": investigation_id,
            "error": "Investigation timed out",
            "risk_score": 0.5,  # Default medium risk on error
            "confidence": 0.0
        }
    except Exception as e:
        logger.error(f"❌ Investigation failed: {str(e)}")
        
        return {
            "success": False,
            "investigation_id": investigation_id,
            "error": str(e),
            "risk_score": 0.5,  # Default medium risk on error
            "confidence": 0.0
        }