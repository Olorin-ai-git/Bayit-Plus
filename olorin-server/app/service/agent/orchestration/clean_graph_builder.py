"""
Clean Graph Builder for LangGraph Architecture

Builds the complete investigation graph with proper tool integration,
orchestrator control, and domain agent coordination.
"""

from typing import List, Any, Dict, Union
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
    messages = state.get("messages", [])
    tools_used = state.get("tools_used", []).copy()
    tool_results = state.get("tool_results", {}).copy()
    
    # Check last message for tool results
    if messages:
        last_message = messages[-1]
        
        # Process ToolMessage results
        from langchain_core.messages import ToolMessage
        if isinstance(last_message, ToolMessage):
            tool_name = last_message.name
            logger.info(f"🔧 Processing tool result from: {tool_name}")
            
            # Add to tools used
            if tool_name not in tools_used:
                tools_used.append(tool_name)
            
            # Store tool result
            try:
                import json
                result = json.loads(last_message.content)
                tool_results[tool_name] = result
                
                # Special handling for Snowflake - ALWAYS mark as completed regardless of JSON parsing
                if "snowflake" in tool_name.lower():
                    logger.info("✅ Snowflake query completed with JSON result")
                    return {
                        "tools_used": tools_used,
                        "tool_results": tool_results,
                        "snowflake_data": result,
                        "snowflake_completed": True,
                        "current_phase": "tool_execution"  # Move to next phase
                    }
            except:
                # If not JSON, store as string
                tool_results[tool_name] = last_message.content
                
                # CRITICAL FIX: Mark Snowflake as completed even with non-JSON content
                if "snowflake" in tool_name.lower():
                    logger.info("✅ Snowflake query completed with non-JSON result")
                    return {
                        "tools_used": tools_used,
                        "tool_results": tool_results,
                        "snowflake_data": last_message.content,  # Store raw content
                        "snowflake_completed": True,
                        "current_phase": "tool_execution"  # Move to next phase regardless
                    }
            
            return {
                "tools_used": tools_used,
                "tool_results": tool_results
            }
    
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
    current_phase = state.get("current_phase", "")
    messages = state.get("messages", [])
    snowflake_completed = state.get("snowflake_completed", False)
    tools_used = state.get("tools_used", [])
    
    # ARCHITECTURE FIX: Global recursion safety check
    orchestrator_loops = state.get("orchestrator_loops", 0) + 1
    max_loops = 25  # Maximum orchestrator calls to prevent infinite recursion
    
    if orchestrator_loops >= max_loops:
        logger.warning(f"🚨 RECURSION SAFETY: {orchestrator_loops} orchestrator loops reached, forcing completion")
        return "summary"  # Force to summary to complete investigation
    
    logger.info(f"🔀 Routing from orchestrator (loop {orchestrator_loops}/{max_loops})")
    logger.info(f"   Phase: {current_phase}")
    logger.info(f"   Snowflake completed: {snowflake_completed}")
    logger.info(f"   Tools used: {len(tools_used)}")
    logger.info(f"   Messages: {len(messages)}")
    
    # Check for tool calls in last message
    if messages:
        last_message = messages[-1]
        logger.info(f"   Last message type: {type(last_message).__name__}")
        if hasattr(last_message, "tool_calls") and last_message.tool_calls:
            logger.info(f"  → Routing to tools (found {len(last_message.tool_calls)} tool calls)")
            return "tools"
    
    # Route based on phase
    if current_phase == "snowflake_analysis":
        if not snowflake_completed:
            # ADDITIONAL SAFETY: Check if any Snowflake ToolMessage already exists
            from langchain_core.messages import ToolMessage
            snowflake_tool_found = False
            for msg in messages:
                if isinstance(msg, ToolMessage) and "snowflake" in msg.name.lower():
                    snowflake_tool_found = True
                    logger.warning("🔧 Found Snowflake ToolMessage but completion flag not set - forcing completion")
                    break
            
            if snowflake_tool_found:
                logger.info("  → Forcing move to tool_execution phase (Snowflake ToolMessage found)")
                return "orchestrator"  # Orchestrator will handle phase change
            else:
                logger.info("  → Staying in orchestrator (Snowflake not complete)")
                return "orchestrator"
        else:
            logger.info("  → Moving to tool_execution phase")
            return "orchestrator"  # Go back to orchestrator to change phase
    
    elif current_phase == "tool_execution":
        # ARCHITECTURE FIX: Prevent infinite loops in tool execution phase
        tools_used = state.get("tools_used", [])
        tool_execution_attempts = state.get("tool_execution_attempts", 0)
        max_attempts = 3
        
        # If we've reached max attempts or enough tools, move to domain analysis
        if tool_execution_attempts >= max_attempts or len(tools_used) >= 10:
            logger.info(f"  → Tool execution complete, moving to domain analysis (attempts: {tool_execution_attempts}, tools: {len(tools_used)})")
            # Force phase change by returning orchestrator but orchestrator will change phase
            return "orchestrator"
        else:
            logger.info(f"  → Staying in orchestrator (tools: {len(tools_used)}, attempts: {tool_execution_attempts})")
            return "orchestrator"
    
    elif current_phase == "domain_analysis":
        domains_completed = state.get("domains_completed", [])
        
        # Use sequential execution to avoid concurrent updates
        # (parallel execution causes "domain_findings" update conflicts)
        domain_order = ["network", "device", "location", "logs", "authentication", "risk"]
        for domain in domain_order:
            if domain not in domains_completed:
                logger.info(f"  → Routing to {domain}_agent (sequential)")
                return f"{domain}_agent"
    
    elif current_phase == "summary":
        logger.info("  → Routing to summary")
        return "summary"
    
    elif current_phase == "complete":
        logger.info("  → Investigation complete")
        return END
    
    # Default: back to orchestrator
    logger.info("  → Default: back to orchestrator")
    return "orchestrator"


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
            "risk_agent": "risk_agent",
            "summary": "summary",
            END: END
        }
    )
    
    # Tools go to processor, then back to orchestrator
    builder.add_edge("tools", "process_tools")
    builder.add_edge("process_tools", "orchestrator")
    
    # All agents return to orchestrator
    for agent in ["network_agent", "device_agent", "location_agent", "logs_agent", "risk_agent"]:
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
    investigation_id: str = None
) -> Dict[str, Any]:
    """
    Run a complete investigation using the clean graph.
    
    Args:
        entity_id: Entity to investigate
        entity_type: Type of entity
        investigation_id: Optional investigation ID
        
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
        max_tools=52
    )
    
    logger.info("📊 Initial state created")
    
    # Build the graph
    graph = build_clean_investigation_graph()
    
    logger.info("🏗️ Graph built, starting execution")
    
    # Run the investigation with timeout and recursion limit
    try:
        result = await asyncio.wait_for(
            graph.ainvoke(
                initial_state,
                config={"recursion_limit": 50}  # Allow up to 50 iterations
            ),
            timeout=25.0  # 25 second timeout for the graph execution
        )
        
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
        logger.error(f"❌ Investigation timed out after 25 seconds")
        
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