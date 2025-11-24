"""
Agent Module - Main API for refactored fraud investigation system.

This module imports from specialized modules and maintains backward compatibility.
All major functionality has been moved to:
- orchestration/: Graph building and coordination
- investigators/: Domain-specific investigation agents  
- core/: Shared utilities and helpers
"""

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
from app.service.logging import get_bridge_logger
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

# Import tools for structured agents
from app.service.agent.tools.tool_registry import get_tools_for_agent
from app.models.upi_response import Interaction, InteractionsResponse

logger = get_bridge_logger(__name__)

# Initialize tools for structured agents
try:
    import os
    # Initialize the tool registry first
    from app.service.agent.tools.tool_registry import initialize_tools

    # CRITICAL: Only create PostgreSQL connection string if DATABASE_PROVIDER is PostgreSQL
    # When DATABASE_PROVIDER=snowflake, do NOT create DatabaseQueryTool (use SnowflakeQueryTool instead)
    database_provider = os.getenv('DATABASE_PROVIDER', 'snowflake').lower()
    database_connection_string = None
    
<<<<<<< HEAD
=======
    if database_provider == 'postgresql':
        # Build PostgreSQL connection string from environment variables
        postgres_user = os.getenv('POSTGRES_USER', 'gklainert')
        postgres_password = os.getenv('POSTGRES_PASSWORD', 'olorin_dev_2025')
        postgres_host = os.getenv('POSTGRES_HOST', 'localhost')
        postgres_port = os.getenv('POSTGRES_PORT', '5432')
        postgres_database = os.getenv('POSTGRES_DATABASE', 'olorin_db')

        # Build connection string for PostgreSQL
        # Add gssencmode=disable to avoid GSSAPI errors on local connections
        database_connection_string = f"postgresql://{postgres_user}:{postgres_password}@{postgres_host}:{postgres_port}/{postgres_database}?gssencmode=disable"

        logger.debug(f"Initializing tools with PostgreSQL database: {postgres_host}:{postgres_port}/{postgres_database}")
    else:
        logger.debug(f"Initializing tools without DatabaseQueryTool (DATABASE_PROVIDER={database_provider}, will use SnowflakeQueryTool)")

    # Initialize tools with database connection (None for Snowflake)
    initialize_tools(database_connection_string=database_connection_string)

>>>>>>> 001-modify-analyzer-method
    # Get ALL available tools for comprehensive fraud investigation
    # Load all categories to ensure agents have access to the full suite of 45+ tools
    tools = get_tools_for_agent(
        categories=[
            "olorin",           # Snowflake, Splunk, SumoLogic
            "threat_intelligence",  # AbuseIPDB, VirusTotal, Shodan
            "database",         # Database query and schema tools
            "search",           # Vector search
            "blockchain",       # Crypto and blockchain analysis
            "intelligence",     # OSINT, social media, dark web
            "ml_ai",           # ML-powered analysis tools
            "web",             # Web search and scraping
            "file_system",     # File operations
            "api",             # HTTP and JSON API tools
            "mcp_clients",     # External MCP server connections
            "utility"          # Utility tools
        ]
        # Loading ALL categories ensures agents have access to all 45+ enabled tools
    )
    threat_count = len([t for t in tools if 'threat' in t.name or 'virus' in t.name or 'abuse' in t.name])
    db_tool_count = len([t for t in tools if 'database' in t.name or 'query' in t.name])
    logger.info(f"Initialized {len(tools)} tools for structured agents (including {threat_count} threat intelligence tools, {db_tool_count} database tools)")
except Exception as e:
    logger.warning(f"Could not initialize tools: {e}")
    import traceback
    logger.warning(f"Tool initialization error: {traceback.format_exc()}")
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
    parallel: bool = True,
    investigation_id: Optional[str] = None,
    entity_type: str = "ip"
):
    """Execute pattern-based investigation using hybrid intelligence graph selection."""
    logger.info(f"Starting investigation: pattern_type={pattern_type}, investigation_id={investigation_id}")
    
    # Use hybrid graph selection if investigation_id is available
    graph = await create_and_get_agent_graph(
        parallel=parallel,
        investigation_id=investigation_id,
        entity_type=entity_type
    )
    
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
    """Enhanced investigation with pattern-based agents (WebSocket streaming removed per spec 005)."""
    from uuid import uuid4

    if not investigation_id:
        investigation_id = str(uuid4())

    logger.info(f"Enhanced investigation: {investigation_type} for {entity_type} {entity_id}")

    try:
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

        agent = create_agent(agent_type=agent_type, context=context)

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

        return investigation_result

    except Exception as e:
<<<<<<< HEAD
        logger.error(f"❌ Enhanced investigation failed")
        logger.error(f"   Error: {e}")
        await ws_streaming.send_error(str(e), {"entity_id": entity_id})
=======
        logger.error(f"❌ Enhanced investigation failed: {e}")
>>>>>>> 001-modify-analyzer-method
        return {
            "investigation_id": investigation_id,
            "entity_id": entity_id,
            "success": False,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


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