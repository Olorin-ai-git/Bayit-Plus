"""
Agent Module - Main API for refactored fraud investigation system.

This module imports from specialized modules and maintains backward compatibility.
All major functionality has been moved to:
- orchestration/: Graph building and coordination
- investigators/: Domain-specific investigation agents  
- core/: Shared utilities and helpers
"""

import logging
from datetime import datetime
from typing import List, Optional

from langchain_core.messages import AIMessage, HumanMessage

# Import core functionality from refactored modules
from app.service.agent.orchestration import (
    create_parallel_agent_graph,
    create_sequential_agent_graph,
    create_and_get_agent_graph,
    start_investigation,
    assistant
)
from app.service.agent.investigators import (
    network_agent,
    location_agent,
    logs_agent,
    device_agent,
    risk_agent
)
from app.service.agent.core import (
    get_config_value as _get_config_value,
    rehydrate_agent_context as _rehydrate_agent_context
)

# Pattern system and legacy compatibility
from app.service.agent.agent_factory import get_agent_factory, create_agent, execute_agent
from app.service.agent.patterns import PatternType, PatternConfig
from app.service.agent.websocket_streaming_service import WebSocketStreamingService

# Import tools for autonomous agents
from app.service.agent.tools.tool_registry import get_tools_for_agent
from app.models.upi_response import Interaction, InteractionsResponse
from app.service.websocket_manager import websocket_manager

logger = logging.getLogger(__name__)

# Initialize tools for autonomous agents
try:
    # Initialize the tool registry first
    from app.service.agent.tools.tool_registry import initialize_tools
    initialize_tools()
    
    # Get essential tools for fraud investigation including threat intelligence
    # Categories will load ALL tools from those categories
    # tool_names will additionally ensure these specific tools are included
    tools = get_tools_for_agent(
        categories=["olorin", "search", "database", "threat_intelligence"]
        # Note: Removed tool_names parameter to load ALL tools from the categories
        # This ensures all threat intelligence tools are loaded, not just the 3 named ones
    )
    threat_count = len([t for t in tools if 'threat' in t.name or 'virus' in t.name or 'abuse' in t.name])
    logger.info(f"Initialized {len(tools)} tools for autonomous agents (including {threat_count} threat intelligence tools)")
except Exception as e:
    logger.warning(f"Could not initialize tools: {e}")
    tools = []


def convert_interaction_to_langgraph_messages(
    interactions: List[Optional[Interaction]], interaction_group_id: Optional[str]
):
    """Convert UPI interactions to LangGraph message format."""
    messages = []
    for interaction in interactions:
        if not interaction:
            continue
        history_interaction_group_id = interaction.metadata.interaction_group_id
        if history_interaction_group_id != interaction_group_id:
            agent_input = interaction.agent_input
            if agent_input:
                for content in agent_input.content:
                    messages.append(HumanMessage(content=content.text))
            agent_output = interaction.agent_output
            if agent_output:
                for output in agent_output.outputs:
                    messages.append(AIMessage(content=output.content))
    return messages


async def investigate_with_patterns(
    user_message: str,
    pattern_type: Optional[str] = None,
    agent_context=None,
    request=None,
    thread_id: Optional[str] = None,
    parallel: bool = True
):
    """Execute pattern-based investigation using configured agent graph."""
    logger.info(f"Starting investigation: pattern_type={pattern_type}")
    
    graph = create_and_get_agent_graph(parallel=parallel)
    config = {
        "configurable": {
            "thread_id": thread_id or "default",
            "agent_context": agent_context,
            "request": request,
        }
    }
    
    try:
        result = await graph.ainvoke(
            {"messages": [HumanMessage(content=user_message)]},
            config=config
        )
        logger.info("✅ Investigation completed successfully")
        return result
    except Exception as e:
        logger.error(f"❌ Investigation failed: {e}")
        raise


async def investigate_with_enhanced_patterns(
    entity_id: str,
    entity_type: str,
    investigation_type: str = "ato_investigation",
    use_pattern: str = "auto",
    investigation_id: Optional[str] = None,
    agent_context=None,
    request=None
) -> dict:
    """Enhanced investigation with WebSocket streaming and pattern-based agents."""
    from uuid import uuid4
    
    if not investigation_id:
        investigation_id = str(uuid4())
    
    logger.info(f"Enhanced investigation: {investigation_type} for {entity_type} {entity_id}")
    
    # Create streaming service
    ws_streaming = WebSocketStreamingService(
        investigation_id=investigation_id,
        websocket_manager=websocket_manager,
        entity_context={
            "entity_id": entity_id,
            "entity_type": entity_type,
            "investigation_type": investigation_type
        }
    )
    
    try:
        await ws_streaming.send_investigation_start(
            investigation_type=investigation_type,
            entity_details={"entity_id": entity_id, "entity_type": entity_type}
        )
        
        # Pattern mapping
        agent_type = {
            "auto": "routing",
            "comprehensive": "comprehensive", 
            "parallel": "parallel_analysis",
            "orchestration": "orchestration",
            "chaining": investigation_type
        }.get(use_pattern, use_pattern)
        
        # Create context and agent
        context = {
            "entity_id": entity_id,
            "entity_type": entity_type,
            "investigation_id": investigation_id,
            "investigation_type": investigation_type,
            "agent_context": agent_context,
            "request": request,
            "time_range": "24h"
        }
        
        agent = create_agent(agent_type=agent_type, context=context, ws_streaming=ws_streaming)
        
        # Execute investigation
        message = HumanMessage(content=f"Investigate {entity_type} {entity_id} for fraud")
        result = await execute_agent(agent=agent, messages=[message], context=context)
        
        # Format result
        success = hasattr(result, 'success') and result.success
        investigation_result = {
            "investigation_id": investigation_id,
            "entity_id": entity_id,
            "entity_type": entity_type,
            "success": success,
            "pattern_used": use_pattern,
            "agent_type": agent_type,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if success:
            investigation_result.update({
                "results": result.result,
                "confidence": getattr(result, 'confidence_score', 0.0)
            })
        else:
            investigation_result["error"] = getattr(result, 'error_message', 'Investigation failed')
        
        await ws_streaming.send_investigation_complete(
            success=success,
            results=investigation_result,
            execution_summary={"pattern": use_pattern, "agent_type": agent_type}
        )
        
        return investigation_result
        
    except Exception as e:
        logger.error(f"Enhanced investigation failed: {e}", exc_info=True)
        await ws_streaming.send_error(str(e), {"entity_id": entity_id})
        return {
            "investigation_id": investigation_id,
            "entity_id": entity_id,
            "success": False,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }
    finally:
        await ws_streaming.close()


def get_agent_factory_stats() -> dict:
    """Get factory statistics."""
    return get_agent_factory().get_factory_stats()


# Public API exports
__all__ = [
    "create_parallel_agent_graph", "create_sequential_agent_graph", "create_and_get_agent_graph",
    "start_investigation", "network_agent", "location_agent", "logs_agent", "device_agent", 
    "risk_agent", "assistant", "investigate_with_patterns", "investigate_with_enhanced_patterns",
    "convert_interaction_to_langgraph_messages", "get_agent_factory_stats",
    "_get_config_value", "_rehydrate_agent_context"
]