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
from app.service.agent.orchestration.domain_agents import (
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
    
    # Step 4.3.1: ToolMessage detection and parsing
    logger.debug(f"[Step 4.3.1] 📥 TOOL MESSAGE DETECTION - Starting tool result processing")
    logger.debug(f"[Step 4.3.1]   Investigation context:")
    logger.debug(f"[Step 4.3.1]     Mode: {'TEST' if is_test_mode else 'LIVE'}")
    logger.debug(f"[Step 4.3.1]     Total messages in state: {len(messages)}")
    logger.debug(f"[Step 4.3.1]     Tools used before processing: {tools_used}")
    logger.debug(f"[Step 4.3.1]     Existing tool results: {list(tool_results.keys())}")
    
    # Process ALL ToolMessages in message history, not just the last one
    if messages:
        from langchain_core.messages import ToolMessage
        tool_messages = [msg for msg in messages if isinstance(msg, ToolMessage)]
        
        logger.debug(f"[Step 4.3.1]   Message analysis:")
        logger.debug(f"[Step 4.3.1]     Total messages: {len(messages)}")
        logger.debug(f"[Step 4.3.1]     ToolMessages found: {len(tool_messages)}")
        logger.debug(f"[Step 4.3.1]     Message types: {[type(msg).__name__ for msg in messages[-3:]]}")  # Show last 3 message types
        
        if tool_messages:
            logger.debug(f"[Step 4.3.1]   ✅ {len(tool_messages)} ToolMessages detected - proceeding with processing")
            
            # Process each ToolMessage to build complete tool_results
            for i, tool_message in enumerate(tool_messages):
                logger.debug(f"[Step 4.3.1]   Processing ToolMessage {i+1}/{len(tool_messages)}")
                
                # Extract tool information
                tool_name = tool_message.name
                content_raw = tool_message.content
                content_length = len(str(content_raw)) if content_raw else 0
                content_preview = str(content_raw)[:150] if content_raw else 'Empty'
                
                logger.debug(f"[Step 4.3.1]     Tool name: {tool_name}")
                logger.debug(f"[Step 4.3.1]     Content length: {content_length} characters")
                logger.debug(f"[Step 4.3.1]     Content preview: {content_preview}...")
                
                # Skip if already processed
                if tool_name in tool_results:
                    logger.debug(f"[Step 4.3.1]     ⚠️ {tool_name} already processed - skipping")
                    continue
                
                # Continue with existing processing logic for this tool...
                logger.info(f"🔧 Processing tool result from: {tool_name}")
                
                # Add to tools used tracking
                if tool_name not in tools_used:
                    tools_used.append(tool_name)
                    logger.debug(f"[Step 4.3.1]     Added {tool_name} to tools_used list (new: {len(tools_used)} total)")
                else:
                    logger.debug(f"[Step 4.3.1]     {tool_name} already in tools_used list")
                
                # Step 4.3.1 continued: Parse tool result content
                logger.debug(f"[Step 4.3.1]     🔍 Attempting to parse tool result content")
                
                # Store tool result with content parsing
                parsed_successfully = False
                parsed_result = None
                
                try:
                    import json
                    parsed_result = json.loads(content_raw)
                    tool_results[tool_name] = parsed_result
                    parsed_successfully = True
                    logger.debug(f"[Step 4.3.1]     ✅ JSON parsing successful")
                    logger.debug(f"[Step 4.3.1]     Parsed result type: {type(parsed_result)}")
                    logger.debug(f"[Step 4.3.1]     Parsed result keys: {list(parsed_result.keys()) if isinstance(parsed_result, dict) else 'not-dict'}")
                    
                except Exception as e:
                    # If not JSON, store as string
                    logger.debug(f"[Step 4.3.1]     ❌ JSON parsing failed: {str(e)}")
                    logger.debug(f"[Step 4.3.1]     Storing as raw string content")
                    tool_results[tool_name] = content_raw
                    parsed_successfully = False
                    parsed_result = content_raw
                
                # Step 4.3.2: Special Snowflake handling (inside the loop)
                if "snowflake" in tool_name.lower():
                    logger.debug(f"[Step 4.3.2] ❄️ SNOWFLAKE HANDLING - Processing Snowflake tool result")
                    logger.debug(f"[Step 4.3.2]   Snowflake tool detected: {tool_name}")
                    logger.debug(f"[Step 4.3.2]   Parsed successfully: {parsed_successfully}")
                    logger.debug(f"[Step 4.3.2]   Content type: {'JSON' if parsed_successfully else 'RAW'}")
                    
                    if parsed_successfully:
                        logger.debug(f"[Step 4.3.2]   Storing JSON result as snowflake_data")
                        logger.info("✅ Snowflake query completed with JSON result")
                    else:
                        logger.debug(f"[Step 4.3.2]   Storing raw content as snowflake_data")
                        logger.info("✅ Snowflake query completed with non-JSON result")
                else:
                    # Handle non-Snowflake tools
                    logger.debug(f"[Step 4.3.3] 🔄 REGULAR TOOL PROCESSING - Non-Snowflake tool completed")
                    logger.debug(f"[Step 4.3.3]   Tool: {tool_name}")
                    logger.debug(f"[Step 4.3.3]   State update: tools_used and tool_results updated")
            
            # After processing all ToolMessages, return consolidated results
            logger.debug(f"[Step 4.3.3] ✅ ALL TOOL RESULTS PROCESSED - Summary")
            logger.debug(f"[Step 4.3.3]   Total tools processed: {len(tool_messages)}")
            logger.debug(f"[Step 4.3.3]   Tools used: {tools_used}")
            logger.debug(f"[Step 4.3.3]   Tool results keys: {list(tool_results.keys())}")
            
            # Check if Snowflake was processed for special handling
            snowflake_tools = [name for name in tool_results.keys() if 'snowflake' in name.lower()]
            if snowflake_tools:
                snowflake_tool_name = snowflake_tools[0]  # Get first snowflake tool
                snowflake_result = tool_results[snowflake_tool_name]
                
                logger.debug(f"[Step 4.3.3] 🎯 PHASE TRANSITION - Moving to tool_execution phase")
                logger.debug(f"[Step 4.3.3]   Reason: Snowflake processing completed")
                logger.debug(f"[Step 4.3.3]   Snowflake tool: {snowflake_tool_name}")
                logger.debug(f"[Step 4.3.3]   Next steps: Orchestrator will handle additional tool selection")
                
                return {
                    "tools_used": tools_used,
                    "tool_results": tool_results,
                    "snowflake_data": snowflake_result,
                    "snowflake_completed": True,
                    "current_phase": "tool_execution"  # Move to next phase
                }
            else:
                # No Snowflake tools - return regular tool results
                logger.debug(f"[Step 4.3.3] 🔄 REGULAR TOOL PROCESSING - No Snowflake tools")
                logger.debug(f"[Step 4.3.3]   Phase transition: None (staying in current phase)")
                logger.debug(f"[Step 4.3.3]   State update: tools_used and tool_results updated")
                
                return {
                    "tools_used": tools_used,
                    "tool_results": tool_results
                }
        else:
            # No ToolMessages found
            logger.debug(f"[Step 4.3.1]   ❌ No ToolMessages found in message history")
            logger.debug(f"[Step 4.3.1]   Message types present: {[type(msg).__name__ for msg in messages]}")
            logger.debug(f"[Step 4.3.1]   Skipping tool result processing")
    else:
        logger.debug(f"[Step 4.3.1]   ❌ No messages in state")
        logger.debug(f"[Step 4.3.1]   Cannot process tool results without messages")
    
    logger.debug(f"[Step 4.3.1] 🔚 NO TOOL RESULTS TO PROCESS - Returning empty state update")
    logger.debug(f"[Step 4.3.1]   Final state: No changes made to investigation state")
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
    
    # DEBUG logging for Phase 2 Data Ingestion
    logger.debug("[Step 2.1.1] Investigation context SystemMessage creation - Starting message preparation")
    logger.debug(f"[Step 2.1.1] Entity type: {state['entity_type']}")
    logger.debug(f"[Step 2.1.1] Entity ID: {state['entity_id']}")
    logger.debug(f"[Step 2.1.1] Investigation ID: {state['investigation_id']}")
    logger.debug(f"[Step 2.1.1] Date range days: {state.get('date_range_days', 7)}")
    
    # Prepare initial investigation message
    ingestion_msg = SystemMessage(content=f"""
    Investigation initialized:
    - Type: {state['entity_type']}
    - Entity: {state['entity_id']}
    - Investigation ID: {state['investigation_id']}
    
    Next: Mandatory Snowflake {state.get('date_range_days', 7)}-day analysis
    """)
    
    logger.debug(f"[Step 2.1.1] SystemMessage created with content: {ingestion_msg.content.strip()}")
    logger.debug(f"[Step 2.1.1] SystemMessage type: {type(ingestion_msg).__name__}")
    
    # Phase transition
    logger.debug("[Step 2.1.2] Phase transition to 'initialization' - Preparing return state")
    logger.debug("[Step 2.1.2] Setting current_phase = 'initialization'")
    logger.debug("[Step 2.1.2] Adding SystemMessage to messages array")
    
    return_state = {
        "messages": [ingestion_msg],
        "current_phase": "initialization"
    }
    
    logger.debug(f"[Step 2.1.2] Data ingestion complete - returning state with {len(return_state['messages'])} message(s)")
    logger.debug(f"[Step 2.1.2] Phase transition complete: current_phase = '{return_state['current_phase']}'")
    
    return return_state


async def summary_node(state: InvestigationState) -> Dict[str, Any]:
    """
    Summary node - generates final investigation report.
    
    Args:
        state: Current investigation state
        
    Returns:
        State updates with final summary
    """
    logger.info("📊 Generating final investigation summary")
    
    # Phase 6 DEBUG logging - Summary Phase
    logger.debug("[Step 6.1.1] 🧮 Starting final risk score calculation")
    logger.debug(f"[Step 6.1.1] Investigation ID: {state.get('investigation_id', 'unknown')}")
    logger.debug(f"[Step 6.1.1] Entity type: {state.get('entity_type', 'unknown')}")
    logger.debug(f"[Step 6.1.1] Entity ID: {state.get('entity_id', 'unknown')}")
    
    from app.service.agent.orchestration.state_schema import calculate_final_risk_score
    from datetime import datetime
    
    # Step 6.1.1: Final risk score calculation
    logger.debug("[Step 6.1.1] 📊 Invoking calculate_final_risk_score function")
    logger.debug(f"[Step 6.1.1] State domains available: {list(state.get('domain_findings', {}).keys())}")
    logger.debug(f"[Step 6.1.1] Snowflake completed: {state.get('snowflake_completed', False)}")
    logger.debug(f"[Step 6.1.1] Tools used count: {len(state.get('tools_used', []))}")
    
    final_risk = calculate_final_risk_score(state)
    logger.debug(f"[Step 6.1.1] ✅ Final risk score calculated: {final_risk:.4f}")
    
    tools_used = state.get("tools_used", [])
    domains_completed = state.get("domains_completed", [])
    confidence_score = state.get('confidence_score', 0.0)
    
    logger.debug(f"[Step 6.1.1] 📋 Summary metrics collected:")
    logger.debug(f"[Step 6.1.1]   - Final risk: {final_risk:.4f}")
    logger.debug(f"[Step 6.1.1]   - Tools used: {tools_used}")
    logger.debug(f"[Step 6.1.1]   - Domains completed: {domains_completed}")
    logger.debug(f"[Step 6.1.1]   - Confidence score: {confidence_score:.4f}")
    
    # Step 6.1.2: Investigation summary generation
    logger.debug("[Step 6.1.2] 📝 Starting Markdown-formatted summary generation")
    
    # Calculate risk level
    risk_level = 'CRITICAL' if final_risk >= 0.8 else 'HIGH' if final_risk >= 0.6 else 'MEDIUM' if final_risk >= 0.4 else 'LOW'
    logger.debug(f"[Step 6.1.2] 🎯 Risk level classification: {risk_level} (score: {final_risk:.4f})")
    
    # Calculate recommendation
    recommendation = '🚨 BLOCK - High fraud risk' if final_risk >= 0.7 else '⚠️ REVIEW - Moderate risk' if final_risk >= 0.4 else '✅ APPROVE - Low risk'
    logger.debug(f"[Step 6.1.2] 💡 Recommendation generated: {recommendation}")
    
    # Generate coverage metrics
    snowflake_status = '✅ Complete' if state.get('snowflake_completed') else '❌ Incomplete'
    logger.debug(f"[Step 6.1.2] 📊 Coverage metrics:")
    logger.debug(f"[Step 6.1.2]   - Tools used count: {len(tools_used)}")
    logger.debug(f"[Step 6.1.2]   - Domains analyzed: {', '.join(domains_completed) if domains_completed else 'None'}")
    logger.debug(f"[Step 6.1.2]   - Snowflake status: {snowflake_status}")
    
    # Generate summary message
    summary_content = f"""
# Investigation Complete

**Investigation ID:** {state['investigation_id']}
**Entity:** {state['entity_type']} - {state['entity_id']}

## Final Assessment
- **Risk Score:** {final_risk:.2f} / 1.00
- **Risk Level:** {risk_level}
- **Confidence:** {confidence_score:.2f}

## Coverage
- Tools Used: {len(tools_used)}
- Domains Analyzed: {', '.join(domains_completed)}
- Snowflake Analysis: {snowflake_status}

## Recommendation
{recommendation}
"""
    
    logger.debug("[Step 6.1.2] 📄 Markdown summary content generated")
    logger.debug(f"[Step 6.1.2] Content length: {len(summary_content)} characters")
    logger.debug(f"[Step 6.1.2] Summary sections: Investigation header, Final Assessment, Coverage, Recommendation")
    
    summary_msg = SystemMessage(content=summary_content)
    logger.debug("[Step 6.1.2] ✅ SystemMessage created for summary")
    logger.debug(f"[Step 6.1.2] SystemMessage type: {type(summary_msg).__name__}")
    
    # Calculate duration
    logger.debug("[Step 6.1.2] ⏱️  Calculating investigation duration")
    if state.get("start_time"):
        start_dt = datetime.fromisoformat(state["start_time"])
        end_dt = datetime.utcnow()
        duration_ms = int((end_dt - start_dt).total_seconds() * 1000)
        logger.debug(f"[Step 6.1.2] 📅 Start time: {state.get('start_time')}")
        logger.debug(f"[Step 6.1.2] 📅 End time: {end_dt.isoformat()}")
        logger.debug(f"[Step 6.1.2] ⏱️  Total duration: {duration_ms}ms ({duration_ms/1000:.2f}s)")
    else:
        duration_ms = 0
        logger.debug("[Step 6.1.2] ⚠️  No start_time found in state, duration set to 0ms")
    
    logger.debug("[Step 6.1.2] ✅ Investigation summary generation completed successfully")
    
    # Step 6.1.3: Phase transition to "complete"
    logger.debug("[Step 6.1.3] 🔄 Phase transition to 'complete'")
    logger.debug("[Step 6.1.3] 📊 Preparing final state return")
    
    final_state = {
        "messages": [summary_msg],
        "current_phase": "complete",
        "end_time": datetime.utcnow().isoformat(),
        "total_duration_ms": duration_ms
    }
    
    logger.debug(f"[Step 6.1.3] 📋 Final state keys: {list(final_state.keys())}")
    logger.debug(f"[Step 6.1.3] 📝 Messages added: 1 SystemMessage")
    logger.debug(f"[Step 6.1.3] 🎯 Phase set to: {final_state['current_phase']}")
    logger.debug(f"[Step 6.1.3] ⏰ End time: {final_state['end_time']}")
    logger.debug(f"[Step 6.1.3] ⏱️  Duration: {final_state['total_duration_ms']}ms")
    
    logger.debug("[Step 6.1.3] ✅ Phase 6 Summary complete - returning final state")
    logger.debug("[Step 6.1.3] 🏁 Investigation orchestration will mark as complete")
    
    return final_state


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
    logger.debug(f"[Step 4.1.1] 🔍 TOOL CALL DETECTION - Starting analysis of last message")
    
    if messages:
        last_message = messages[-1]
        logger.debug(f"[Step 4.1.1]   Message analysis:")
        logger.debug(f"[Step 4.1.1]     Message type: {type(last_message).__name__}")
        logger.debug(f"[Step 4.1.1]     Has content attribute: {hasattr(last_message, 'content')}")
        logger.debug(f"[Step 4.1.1]     Content preview: {str(last_message.content)[:100] if hasattr(last_message, 'content') else 'No content'}...")
        logger.debug(f"[Step 4.1.1]     Has tool_calls attribute: {hasattr(last_message, 'tool_calls')}")
        
        if hasattr(last_message, "tool_calls"):
            tool_calls_exist = last_message.tool_calls is not None
            tool_calls_count = len(last_message.tool_calls) if tool_calls_exist and isinstance(last_message.tool_calls, list) else 0
            logger.debug(f"[Step 4.1.1]     Tool calls exist: {tool_calls_exist}")
            logger.debug(f"[Step 4.1.1]     Tool calls count: {tool_calls_count}")
            
            if last_message.tool_calls:
                # Extract tool names and details for debugging
                tool_names = []
                tool_details = []
                for i, tc in enumerate(last_message.tool_calls):
                    if isinstance(tc, dict):
                        name = tc.get('name', 'unknown')
                        tool_id = tc.get('id', 'no-id')
                        args_preview = str(tc.get('args', {}))[:50] if tc.get('args') else 'no-args'
                        tool_names.append(name)
                        tool_details.append(f"{name}(id:{tool_id}, args:{args_preview}...)")
                    else:
                        tool_names.append('unknown-format')
                        tool_details.append(f"unknown-format: {type(tc)}")
                
                logger.debug(f"[Step 4.1.1]     Tool call names: {tool_names}")
                logger.debug(f"[Step 4.1.1]     Tool call details: {tool_details}")
                logger.debug(f"[Step 4.1.1]   ✅ TOOL CALLS DETECTED - Proceeding to Step 4.1.2")
                
                # Step 4.1.2: Route to "tools" node for execution
                logger.debug(f"[Step 4.1.2] 🎯 TOOL ROUTING DECISION - Routing to 'tools' node")
                logger.debug(f"[Step 4.1.2]   Routing reason: Found {len(last_message.tool_calls)} tool calls in last message")
                logger.debug(f"[Step 4.1.2]   Target node: 'tools'")
                logger.debug(f"[Step 4.1.2]   Next execution: ToolNode will execute {len(last_message.tool_calls)} tools")
                logger.debug(f"[Step 4.1.2]   Tools to execute: {tool_names}")
                
                logger.info(f"  → Routing to tools (found {len(last_message.tool_calls)} tool calls)")
                logger.debug(f"     Tool calls: {tool_names}")
                return "tools"
            else:
                logger.debug(f"[Step 4.1.1]     Tool calls is None or empty list")
        else:
            logger.debug(f"[Step 4.1.1]     No tool_calls attribute found")
            
        logger.debug(f"[Step 4.1.1]   ❌ NO TOOL CALLS DETECTED - Continuing to phase routing")
    else:
        logger.debug(f"[Step 4.1.1]   ❌ NO MESSAGES - Cannot detect tool calls, continuing to phase routing")
    
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
        
        # Step 5.1.1: Domain execution order
        domain_order = ["network", "device", "location", "logs", "authentication", "risk"]
        logger.debug(f"[Step 5.1.1] 📋 Domain execution order defined: {domain_order}")
        logger.debug(f"[Step 5.1.1]   Sequential execution ensures proper data flow between domain agents")
        
        # Step 5.1.2: Sequential domain execution - Routes to next incomplete domain in order
        next_domain = None
        logger.debug(f"[Step 5.1.2] 🔍 Scanning for next incomplete domain in sequential order:")
        for i, domain in enumerate(domain_order):
            if domain not in domains_completed:
                next_domain = domain
                logger.debug(f"[Step 5.1.2]   Domain {i+1}/{len(domain_order)}: {domain} - ⏳ PENDING (next to execute)")
                logger.info(f"  → [Step 5.1.2] Routing to {domain}_agent (sequential execution)")
                logger.debug(f"[Step 5.1.2] ✅ Selected {domain} as next domain agent to execute")
                return f"{domain}_agent"
            else:
                logger.debug(f"[Step 5.1.2]   Domain {i+1}/{len(domain_order)}: {domain} - ✅ COMPLETED")
        
        # MORE AGGRESSIVE LIMITS for domain completion
        domain_threshold = 6 if is_test_mode else 12  # Much lower thresholds
        logger.debug(f"      Domain threshold for this mode: {domain_threshold}")
        logger.debug(f"      Predicted loops: {orchestrator_loops}")
        
        # All domains complete OR too many loops - force to summary
        total_domains = len(domain_order)  # Use all 6 domains: network, device, location, logs, authentication, risk
        should_summarize = len(domains_completed) >= total_domains or orchestrator_loops >= domain_threshold
        logger.debug(f"      Should move to summary: {should_summarize}")
        logger.debug(f"      Reasons: domains={len(domains_completed)}>={total_domains}, loops={orchestrator_loops}>={domain_threshold}")
        
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
    logger.debug("[Step 1.2.1] StateGraph creation with InvestigationState schema")
    builder = StateGraph(InvestigationState)
    logger.debug("[Step 1.2.1] StateGraph(InvestigationState) created successfully")
    
    # Get all tools for the graph
    logger.debug("[Step 1.2.2] Tool loading via get_all_tools() - Starting tool collection")
    tools = get_all_tools()
    logger.debug(f"[Step 1.2.2] get_all_tools() returned {len(tools)} tools from registry")
    
    # Create tool executor node with Phase 4 Step 4.2.1 logging wrapper
    logger.debug("[Step 1.2.2] Creating ToolNode with collected tools")
    
    # Create the actual ToolNode
    base_tool_executor = ToolNode(tools)
    logger.debug(f"[Step 1.2.2] Base ToolNode created successfully with {len(tools)} tools")
    
    # Create wrapper function for Step 4.2.1 logging
    async def tool_executor_with_logging(state: InvestigationState):
        """
        Wrapper for ToolNode to add Step 4.2.1 DEBUG logging
        """
        messages = state.get("messages", [])
        
        logger.debug(f"[Step 4.2.1] 🔧 TOOL EXECUTION - ToolNode starting execution")
        logger.debug(f"[Step 4.2.1]   Total messages in state: {len(messages)}")
        
        if messages:
            last_message = messages[-1]
            if hasattr(last_message, "tool_calls") and last_message.tool_calls:
                logger.debug(f"[Step 4.2.1]   Tools to execute: {len(last_message.tool_calls)}")
                
                # Log each tool call details
                for i, tool_call in enumerate(last_message.tool_calls):
                    if isinstance(tool_call, dict):
                        tool_name = tool_call.get('name', 'unknown')
                        tool_id = tool_call.get('id', 'no-id')
                        tool_args = tool_call.get('args', {})
                        logger.debug(f"[Step 4.2.1]   Tool {i+1}: {tool_name}")
                        logger.debug(f"[Step 4.2.1]     ID: {tool_id}")
                        logger.debug(f"[Step 4.2.1]     Args: {list(tool_args.keys()) if isinstance(tool_args, dict) else 'non-dict'}")
                        logger.debug(f"[Step 4.2.1]     Args preview: {str(tool_args)[:100] if tool_args else 'no-args'}...")
                    else:
                        logger.debug(f"[Step 4.2.1]   Tool {i+1}: unknown format ({type(tool_call)})")
                
                logger.debug(f"[Step 4.2.1]   Available tools in registry: {len(tools)}")
                logger.debug(f"[Step 4.2.1]   Tool registry preview: {[tool.name for tool in tools[:5]]}" + ("..." if len(tools) > 5 else ""))
                logger.debug(f"[Step 4.2.1]   ⚡ Executing tools via LangGraph ToolNode...")
                
                # Execute the actual ToolNode
                result = await base_tool_executor.ainvoke(state)
                
                logger.debug(f"[Step 4.2.1]   ✅ Tool execution completed")
                logger.debug(f"[Step 4.2.1]   Result type: {type(result)}")
                logger.debug(f"[Step 4.2.1]   Result keys: {list(result.keys()) if isinstance(result, dict) else 'not-dict'}")
                
                # Check for new messages (ToolMessages)
                if isinstance(result, dict) and "messages" in result:
                    new_messages = result["messages"]
                    tool_messages = [msg for msg in new_messages if msg.__class__.__name__ == "ToolMessage"]
                    logger.debug(f"[Step 4.2.1]   New messages generated: {len(new_messages)}")
                    logger.debug(f"[Step 4.2.1]   ToolMessages generated: {len(tool_messages)}")
                    
                    for i, tool_msg in enumerate(tool_messages):
                        if hasattr(tool_msg, 'name'):
                            content_preview = str(tool_msg.content)[:100] if hasattr(tool_msg, 'content') else 'no-content'
                            logger.debug(f"[Step 4.2.1]     ToolMessage {i+1}: {tool_msg.name}")
                            logger.debug(f"[Step 4.2.1]     Content preview: {content_preview}...")
                
                logger.debug(f"[Step 4.2.1]   🎯 Next: Tool results will be processed by process_tool_results node")
                return result
            else:
                logger.debug(f"[Step 4.2.1]   ❌ No tool calls found in last message - this shouldn't happen")
                return await base_tool_executor.ainvoke(state)
        else:
            logger.debug(f"[Step 4.2.1]   ❌ No messages in state - this shouldn't happen")
            return await base_tool_executor.ainvoke(state)
    
    # Use the wrapper instead of direct ToolNode
    tool_executor = tool_executor_with_logging
    logger.debug(f"[Step 1.2.2] ToolNode wrapper created successfully with {len(tools)} tools")
    logger.info(f"✅ Created ToolNode with Step 4.2.1 logging wrapper ({len(tools)} tools)")
    
    # Add all nodes to the graph
    logger.debug("[Step 1.2.3] Node registration in graph - Starting node addition")
    builder.add_node("data_ingestion", data_ingestion_node)
    logger.debug("[Step 1.2.3] Added 'data_ingestion' → data_ingestion_node")
    builder.add_node("orchestrator", orchestrator_node)
    logger.debug("[Step 1.2.3] Added 'orchestrator' → orchestrator_node")
    builder.add_node("tools", tool_executor)
    logger.debug("[Step 1.2.3] Added 'tools' → tool_executor (ToolNode)")
    builder.add_node("process_tools", process_tool_results)  # Add tool result processor
    logger.debug("[Step 1.2.3] Added 'process_tools' → process_tool_results")
    builder.add_node("network_agent", network_agent_node)
    logger.debug("[Step 1.2.3] Added 'network_agent' → network_agent_node")
    builder.add_node("device_agent", device_agent_node)
    logger.debug("[Step 1.2.3] Added 'device_agent' → device_agent_node")
    builder.add_node("location_agent", location_agent_node)
    logger.debug("[Step 1.2.3] Added 'location_agent' → location_agent_node")
    builder.add_node("logs_agent", logs_agent_node)
    logger.debug("[Step 1.2.3] Added 'logs_agent' → logs_agent_node")
    builder.add_node("authentication_agent", authentication_agent_node)
    logger.debug("[Step 1.2.3] Added 'authentication_agent' → authentication_agent_node")
    builder.add_node("risk_agent", risk_agent_node)
    logger.debug("[Step 1.2.3] Added 'risk_agent' → risk_agent_node")
    builder.add_node("summary", summary_node)
    logger.debug("[Step 1.2.3] Added 'summary' → summary_node")
    logger.debug("[Step 1.2.3] All 11 nodes registered successfully")
    
    logger.info("✅ Added all nodes to graph")
    
    # Define edges
    
    # Entry point
    logger.debug("[Step 1.3.1] Entry point: START → 'data_ingestion'")
    builder.add_edge(START, "data_ingestion")
    logger.debug("[Step 1.3.1] Edge added: START → 'data_ingestion'")
    
    # Data ingestion to orchestrator
    logger.debug("[Step 1.3.2] Linear progression: 'data_ingestion' → 'orchestrator'")
    builder.add_edge("data_ingestion", "orchestrator")
    logger.debug("[Step 1.3.2] Edge added: 'data_ingestion' → 'orchestrator'")
    
    # Orchestrator routing
    logger.debug("[Step 1.3.3] Orchestrator conditional routing - Setting up routing destinations")
    routing_destinations = {
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
    logger.debug(f"[Step 1.3.3] Routing destinations configured: {list(routing_destinations.keys())}")
    builder.add_conditional_edges(
        "orchestrator",
        route_from_orchestrator,
        routing_destinations
    )
    logger.debug("[Step 1.3.3] Conditional edges added for orchestrator with 10 routing destinations")
    
    # Tools go to processor, then back to orchestrator
    logger.debug("[Step 1.3.4] Tool processing flow: 'tools' → 'process_tools' → 'orchestrator'")
    builder.add_edge("tools", "process_tools")
    logger.debug("[Step 1.3.4] Edge added: 'tools' → 'process_tools'")
    builder.add_edge("process_tools", "orchestrator")
    logger.debug("[Step 1.3.4] Edge added: 'process_tools' → 'orchestrator'")
    
    # All agents return to orchestrator
    agents = ["network_agent", "device_agent", "location_agent", "logs_agent", "authentication_agent", "risk_agent"]
    logger.debug(f"[Step 1.3.5] Agent return flow: All {len(agents)} agents → 'orchestrator'")
    for agent in agents:
        builder.add_edge(agent, "orchestrator")
        logger.debug(f"[Step 1.3.5] Edge added: '{agent}' → 'orchestrator'")
    
    # Summary can end
    logger.debug("[Step 1.3.6] Exit: 'summary' → END")
    builder.add_edge("summary", END)
    logger.debug("[Step 1.3.6] Edge added: 'summary' → END")
    
    logger.debug("[Step 1.3.6] All edge definitions completed successfully")
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