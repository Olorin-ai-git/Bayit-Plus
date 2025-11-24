"""
Graph Builder - Creates and configures LangGraph instances for fraud investigations.

This module handles the creation of both parallel and sequential agent graphs
for different investigation workflows.
"""

import os
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
from app.service.logging import get_bridge_logger
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
    adaptive_domain_routing,
    csv_data_routing,
    raw_data_or_investigation_routing
)

# Define MessagesState since it's not available in langchain_core.messages
class MessagesState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]
    investigation_id: Optional[str]
    entity_id: Optional[str]
    entity_type: Optional[str]

# Import clean graph domain agents directly
from app.service.agent.orchestration.domain_agents.network_agent import network_agent_node
from app.service.agent.orchestration.domain_agents.device_agent import device_agent_node
from app.service.agent.orchestration.domain_agents.location_agent import location_agent_node
from app.service.agent.orchestration.domain_agents.logs_agent import logs_agent_node
from app.service.agent.orchestration.domain_agents.risk_agent import risk_agent_node
# Import wrapped versions for graph nodes
from app.service.agent.orchestration.agent_wrappers import (
    wrapped_network_agent,
    wrapped_device_agent,
    wrapped_location_agent,
    wrapped_logs_agent,
    wrapped_risk_agent,
)
from app.service.agent.recursion_guard import get_recursion_guard
from app.service.agent.investigators.domain_agents import (
    network_agent, location_agent, logs_agent, device_agent, risk_agent
)
from app.service.agent.orchestration.investigation_coordinator import start_investigation
from app.service.agent.orchestration.assistant import assistant
from app.service.agent.nodes.raw_data_node import raw_data_node

logger = get_bridge_logger(__name__)


async def create_resilient_memory():
    """
    Create a resilient memory saver with bulletproof fallback handling.

    Attempts to use Redis for persistence but falls back to MemorySaver if
    Redis is unavailable or disabled. This ensures investigations continue even when
    external services fail.

    Returns:
        Either Redis-based saver (preferred) or MemorySaver (fallback)
    """
    import os
    from app.service.config import get_settings_for_env
    from app.service.redis_client import test_redis_connection

    settings = get_settings_for_env()

    # Check if Redis is enabled in configuration
    use_redis = os.getenv('USE_REDIS', 'true').lower() == 'true'
    if not use_redis:
        logger.info("🛡️ Redis disabled in configuration - using MemorySaver")
        from langgraph.checkpoint.memory import MemorySaver
        return MemorySaver()

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
        
        # Fallback to AsyncRedisSaver (uses TEST_MODE for mock/real IPS cache)
        try:
            from app.persistence.async_ips_redis import AsyncRedisSaver
            memory = AsyncRedisSaver()
            
            logger.info("🛡️ Using AsyncRedisSaver (mock/real IPS cache determined by TEST_MODE)")
            return memory
            
        except Exception as e:
            logger.warning(f"🛡️ AsyncRedisSaver failed ({str(e)}) - falling back to MemorySaver")
            from langgraph.checkpoint.memory import MemorySaver
            return MemorySaver()
            
    except Exception as e:
        logger.warning(f"🛡️ Redis unavailable ({str(e)}) - falling back to MemorySaver for bulletproof operation")
        from langgraph.checkpoint.memory import MemorySaver
        return MemorySaver()


async def create_parallel_agent_graph(use_enhanced_tools=False):
<<<<<<< HEAD
    """Create autonomous agent graph for parallel execution with RecursionGuard protection."""
=======
    """Create structured agent graph for parallel execution with RecursionGuard protection."""
>>>>>>> 001-modify-analyzer-method
    guard = get_recursion_guard()
    logger.info("Creating parallel graph with structured agents and RecursionGuard protection")
    
    builder = StateGraph(MessagesState)

    # Define nodes
    builder.add_node("start_investigation", start_investigation)
    builder.add_node("raw_data_node", raw_data_node)
    builder.add_node("fraud_investigation", assistant)
    # Use wrapped agents that ensure proper context propagation
    builder.add_node("network_agent", wrapped_network_agent)
    builder.add_node("location_agent", wrapped_location_agent)
    builder.add_node("logs_agent", wrapped_logs_agent)
    builder.add_node("device_agent", wrapped_device_agent)
    builder.add_node("risk_agent", wrapped_risk_agent)

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
    
    # Add tool node to graph - REQUIRED for agent tool usage
    builder.add_node("tools", tool_node)
    logger.info(f"✅ Added tools node with {len(tools)} tools to graph")

    # Define edges for parallel execution
    builder.add_edge(START, "start_investigation")
    
    # Add conditional routing for raw data vs standard investigation
    builder.add_conditional_edges(
        "start_investigation",
        raw_data_or_investigation_routing,
        {
            "raw_data_node": "raw_data_node",
            "fraud_investigation": "fraud_investigation"
        }
    )
    
    # Raw data processing flows back to fraud investigation
    builder.add_edge("raw_data_node", "fraud_investigation")
    
    # Enable tool selection from assistant
    # The fraud_investigation node can call tools, which will be executed by the tools node
    # After tool execution, control returns to fraud_investigation
    # Only when fraud_investigation is done with tools does it proceed to agents
    
    # Define a routing function that checks if we should go to tools or agents
    def route_from_fraud_investigation(state):
        """Route from fraud_investigation to either tools or parallel agents."""
        messages = state.get("messages", [])
        if not messages:
            # No messages, go to agents
            return ["network_agent", "location_agent", "logs_agent", "device_agent", "risk_agent"]
        
        last_message = messages[-1]
        # Check if the last message has tool calls
        if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
            # Has tool calls, route to tools node for execution
            return "tools"
        else:
            # No tool calls, proceed to parallel agent execution
            return ["network_agent", "location_agent", "logs_agent", "device_agent", "risk_agent"]
    
    # Use conditional edges for proper routing
    builder.add_conditional_edges(
        "fraud_investigation",
        route_from_fraud_investigation,
        {
            "tools": "tools",
            "network_agent": "network_agent",
            "location_agent": "location_agent", 
            "logs_agent": "logs_agent",
            "device_agent": "device_agent",
            "risk_agent": "risk_agent"
        }
    )
    
    # Tools node returns to fraud_investigation for further processing
    builder.add_edge("tools", "fraud_investigation")
    
    # NOTE: Agents have tools bound directly to their LLMs
<<<<<<< HEAD
    # They invoke tools internally within their autonomous_investigate method
=======
    # They invoke tools internally within their structured_investigate method
>>>>>>> 001-modify-analyzer-method
    # This avoids circular reference issues with the graph-level tools node

    # Compile with memory
    memory = await create_resilient_memory()
    graph = builder.compile(checkpointer=memory)

    logger.info("✅ Parallel structured agent graph compiled successfully")
    return graph


async def create_sequential_agent_graph(use_enhanced_tools=False):
    """Create agent graph with sequential execution for controlled fraud investigations."""
    logger.info("Creating sequential graph with controlled agent execution")
    
    builder = StateGraph(MessagesState)

    # Define nodes with traditional sequential execution
    builder.add_node("start_investigation", start_investigation)
    builder.add_node("raw_data_node", raw_data_node)
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
    
    # Add tool node to graph - REQUIRED for agent tool usage
    builder.add_node("tools", tool_node)
    logger.info(f"✅ Added tools node with {len(tools)} tools to graph")

    # Sequential execution flow
    builder.add_edge(START, "start_investigation")
    
    # Add conditional routing for raw data vs standard investigation
    builder.add_conditional_edges(
        "start_investigation",
        raw_data_or_investigation_routing,
        {
            "raw_data_node": "raw_data_node",
            "fraud_investigation": "fraud_investigation"
        }
    )
    
    # Raw data processing flows back to fraud investigation
    builder.add_edge("raw_data_node", "fraud_investigation")
    
    # Enable tool selection from assistant - same routing logic as parallel
    # Define a routing function that checks if we should go to tools or first agent
    def route_from_fraud_investigation_sequential(state):
        """Route from fraud_investigation to either tools or first agent in sequence."""
        messages = state.get("messages", [])
        if not messages:
            # No messages, go to first agent
            return "network_agent"
        
        last_message = messages[-1]
        # Check if the last message has tool calls
        if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
            # Has tool calls, route to tools node for execution
            return "tools"
        else:
            # No tool calls, proceed to first agent in sequence
            return "network_agent"
    
    # Use conditional edges for proper routing
    builder.add_conditional_edges(
        "fraud_investigation",
        route_from_fraud_investigation_sequential,
        {
            "tools": "tools",
            "network_agent": "network_agent"
        }
    )
    
    # Tools node returns to fraud_investigation for further processing
    builder.add_edge("tools", "fraud_investigation")
    
    # Sequential domain execution - agents execute one after another
    builder.add_edge("network_agent", "location_agent")
    builder.add_edge("location_agent", "logs_agent")
    builder.add_edge("logs_agent", "device_agent")
    builder.add_edge("device_agent", "risk_agent")

    # Compile with memory
    memory = await create_resilient_memory()
    graph = builder.compile(checkpointer=memory)

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
    device_subgraph = DeviceAnalysisSubgraph(structured=True)
    network_subgraph = NetworkAnalysisSubgraph(structured=True)
    location_subgraph = LocationAnalysisSubgraph(structured=True)
    logs_subgraph = LogsAnalysisSubgraph(structured=True)
    
    # Add main nodes
    builder.add_node("start_investigation", start_investigation)
    builder.add_node("raw_data_node", raw_data_node)
    builder.add_node("fraud_investigation", assistant)
    builder.add_node("risk_agent", risk_agent_node)
    
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
    
    # Add conditional routing for raw data vs standard investigation
    builder.add_conditional_edges(
        "start_investigation",
        raw_data_or_investigation_routing,
        {
            "raw_data_node": "raw_data_node",
            "fraud_investigation": "fraud_investigation"
        }
    )
    
    # Raw data processing flows back to fraud investigation
    builder.add_edge("raw_data_node", "fraud_investigation")
    
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
    memory = await create_resilient_memory()
    graph = builder.compile(checkpointer=memory)
    
    logger.info("✅ Modular graph with subgraphs compiled successfully")
    return graph


async def create_and_get_agent_graph(
    parallel: bool = True, 
    use_enhanced_tools: bool = True, 
    use_subgraphs: bool = False,
    investigation_id: Optional[str] = None,
    entity_type: str = "ip"
):
    """
    Create and return the appropriate agent graph with hybrid intelligence selection.
    
    This function now integrates with the Hybrid Intelligence Graph system,
    using feature flags and confidence-based routing to select the optimal
    graph implementation for each investigation.
    
    Args:
        parallel: If True, creates parallel structured agent graph.
                 If False, creates sequential controlled agent graph.
        use_enhanced_tools: If True, use enhanced tool executor with resilience patterns.
        use_subgraphs: If True, use modular subgraph architecture (Phase 2).
        investigation_id: Optional investigation ID for hybrid graph selection.
        entity_type: Type of entity being investigated (for hybrid selection).
    
    Returns:
        Compiled LangGraph instance ready for investigation execution.
    """
    
    # If investigation_id is provided, use hybrid intelligence selection
    if investigation_id:
        try:
            from app.service.agent.orchestration.hybrid.migration_utilities import get_investigation_graph
            logger.info(f"🧠 Using Hybrid Intelligence Graph selection for investigation {investigation_id}")
            
            # Get graph via hybrid selection with feature flags and A/B testing
            return await get_investigation_graph(
                investigation_id=investigation_id,
                entity_type=entity_type
            )
            
        except ImportError:
            logger.warning("🧠 Hybrid system not available, falling back to traditional graph selection")
        except Exception as e:
            logger.error(f"🧠 Hybrid graph selection failed: {e}, falling back to traditional selection")
    
    # Traditional graph selection as fallback
    logger.info(f"Creating traditional agent graph: parallel={parallel}, enhanced_tools={use_enhanced_tools}, subgraphs={use_subgraphs}")
    
    # Use subgraph architecture if requested (Phase 2)
    if use_subgraphs:
        return await create_modular_graph_with_subgraphs(use_enhanced_tools=use_enhanced_tools)
    
    # Original graph creation
    if parallel:
        return await create_parallel_agent_graph(use_enhanced_tools=use_enhanced_tools)
    else:
        return await create_sequential_agent_graph(use_enhanced_tools=use_enhanced_tools)


def _get_configured_tools():
    """Get configured tools from tool registry including threat intelligence and MCP client tools."""
    from app.service.agent.tools.tool_registry import get_tools_for_agent, initialize_tools
    from app.service.agent.tools.splunk_tool.splunk_tool import SplunkQueryTool
    from app.service.agent.tools.sumologic_tool.sumologic_tool import SumoLogicQueryTool
    from app.service.agent.tools.snowflake_tool.snowflake_tool import SnowflakeQueryTool
<<<<<<< HEAD
=======
    from pathlib import Path
    from dotenv import load_dotenv
    import os
>>>>>>> 001-modify-analyzer-method
    
    try:
        # Initialize the tool registry if not already initialized
        initialize_tools()
        
        # Ensure .env file is loaded (in case it wasn't loaded yet)
        env_path = Path(__file__).parent.parent.parent.parent.parent / '.env'
        if env_path.exists():
            load_dotenv(env_path, override=True)
            logger.debug(f"Loaded .env file from {env_path}")
        
        # Get all essential tools including threat intelligence, MCP clients, blockchain, intelligence, ML/AI, and web tools
        # Load ALL tools from these categories (no specific tool_names filter)
        tools = get_tools_for_agent(
            categories=["olorin", "search", "database", "threat_intelligence", "mcp_clients", "mcp_servers", "blockchain", "intelligence", "ml_ai", "web"]
            # All tools from these categories will be loaded
        )
        
<<<<<<< HEAD
        # CRITICAL: Ensure Snowflake is the FIRST tool for primary data analysis
=======
        # CRITICAL: Check DATABASE_PROVIDER FIRST before creating any database tool
        database_provider = os.getenv('DATABASE_PROVIDER', '').lower()
        use_postgres = os.getenv('USE_POSTGRES', 'false').lower() == 'true'
        
        logger.debug(f"Graph builder database config: DATABASE_PROVIDER={database_provider}, USE_POSTGRES={use_postgres}")
        
        # Initialize has_database_query before conditional blocks to avoid UnboundLocalError
        has_database_query = any(t.name == "database_query" for t in tools)
        
        # Only create DatabaseQueryTool if DATABASE_PROVIDER is explicitly PostgreSQL
        # NEVER use DatabaseQueryTool when DATABASE_PROVIDER=snowflake
        if database_provider == 'snowflake':
            logger.info("✅ DATABASE_PROVIDER=snowflake - Skipping DatabaseQueryTool, will use SnowflakeQueryTool instead")
        elif database_provider == 'postgresql' or use_postgres:
            # Only create DatabaseQueryTool for PostgreSQL
            from app.service.agent.tools.database_tool import DatabaseQueryTool
            
            has_database_query = any(t.name == "database_query" for t in tools)
            if not has_database_query:
                database_connection_string = None
                
                # Build PostgreSQL connection string from config (read from .env)
                postgres_host = os.getenv('POSTGRES_HOST') or os.getenv('DB_HOST')
                postgres_port = os.getenv('POSTGRES_PORT') or os.getenv('DB_PORT', '5432')
                postgres_database = os.getenv('POSTGRES_DATABASE') or os.getenv('POSTGRES_DB') or os.getenv('DB_NAME')
                postgres_user = os.getenv('POSTGRES_USER') or os.getenv('DB_USER')
                postgres_password = os.getenv('POSTGRES_PASSWORD') or os.getenv('DB_PASSWORD')
                
                logger.debug(f"Graph builder PostgreSQL env vars: host={bool(postgres_host)}, port={postgres_port}, db={bool(postgres_database)}, user={bool(postgres_user)}, password={'***' if postgres_password else None}")
                
                if postgres_host and postgres_database and postgres_user and postgres_password:
                    # Add gssencmode=disable to avoid GSSAPI errors on local connections
                    database_connection_string = f"postgresql://{postgres_user}:{postgres_password}@{postgres_host}:{postgres_port}/{postgres_database}?gssencmode=disable"
                    logger.info(f"✅ Built PostgreSQL connection string from .env config (host={postgres_host}, db={postgres_database}, user={postgres_user})")
                else:
                    missing = []
                    if not postgres_host: missing.append('POSTGRES_HOST or DB_HOST')
                    if not postgres_database: missing.append('POSTGRES_DATABASE/POSTGRES_DB/DB_NAME')
                    if not postgres_user: missing.append('POSTGRES_USER or DB_USER')
                    if not postgres_password: missing.append('POSTGRES_PASSWORD or DB_PASSWORD')
                    logger.warning(f"⚠️ PostgreSQL config incomplete. Missing from .env: {', '.join(missing)}")
                
                # Fallback to direct PostgreSQL environment variables (NOT Snowflake)
                if not database_connection_string:
                    database_connection_string = os.getenv('DATABASE_URL') or os.getenv('POSTGRES_URL')
                    if database_connection_string:
                        logger.info("✅ Using DATABASE_URL/POSTGRES_URL from .env")
                
                if database_connection_string:
                    try:
                        database_tool = DatabaseQueryTool(connection_string=database_connection_string)
                        tools.insert(0, database_tool)  # Add as first tool
                        logger.info("✅ Added DatabaseQueryTool as PRIMARY tool (PostgreSQL only)")
                    except Exception as e:
                        logger.warning(f"Could not add DatabaseQueryTool: {e}")
                else:
                    logger.warning("⚠️ DatabaseQueryTool not available: No PostgreSQL connection string found")
        
        # CRITICAL: Ensure Snowflake is available (for backward compatibility)
>>>>>>> 001-modify-analyzer-method
        has_snowflake = any(isinstance(t, SnowflakeQueryTool) for t in tools)
        if not has_snowflake:
            try:
                snowflake_tool = SnowflakeQueryTool()
<<<<<<< HEAD
                tools.insert(0, snowflake_tool)  # Add Snowflake as FIRST tool
                logger.info("✅ Added SnowflakeQueryTool as PRIMARY tool for 30-day analysis")
            except Exception as e:
                logger.error(f"Could not add Snowflake tool: {e}")
=======
                # Add after database_query if it exists, otherwise as first
                if has_database_query:
                    tools.insert(1, snowflake_tool)
                else:
                    tools.insert(0, snowflake_tool)
                logger.info("✅ Added SnowflakeQueryTool as fallback tool")
            except Exception as e:
                logger.error(f"Could not add Snowflake tool: {e}")
        else:
            # Move Snowflake after database_query if both exist
            if has_database_query:
                snowflake_tools = [t for t in tools if isinstance(t, SnowflakeQueryTool)]
                other_tools = [t for t in tools if not isinstance(t, SnowflakeQueryTool)]
                tools = other_tools[:1] + snowflake_tools + other_tools[1:]  # Keep database_query first
        
        # Verify database tool is available (either database_query or snowflake_query_tool)
        has_database_query = any(t.name == "database_query" for t in tools)
        has_snowflake_query = any(isinstance(t, SnowflakeQueryTool) or (hasattr(t, 'name') and t.name == "snowflake_query_tool") for t in tools)
        
        # Check DATABASE_PROVIDER to determine which tool is expected
        database_provider = os.getenv("DATABASE_PROVIDER", "").lower()
        
        if not has_database_query and not has_snowflake_query:
            logger.error("❌ CRITICAL: No database tool available! LLM cannot query database!")
        elif database_provider == "snowflake" and has_snowflake_query:
            logger.info(f"✅ SnowflakeQueryTool is available (DATABASE_PROVIDER=snowflake, total {len(tools)} tools)")
        elif has_database_query:
            logger.info(f"✅ database_query tool is available (total {len(tools)} tools)")
        elif has_snowflake_query:
            logger.info(f"✅ SnowflakeQueryTool is available as fallback (total {len(tools)} tools)")
        else:
            logger.warning(f"⚠️ Database tool availability unclear: database_query={has_database_query}, snowflake={has_snowflake_query}, provider={database_provider}")
>>>>>>> 001-modify-analyzer-method
        
        # Ensure essential SIEM tools are available as fallback
        has_splunk = any(isinstance(t, SplunkQueryTool) for t in tools)
        has_sumologic = any(isinstance(t, SumoLogicQueryTool) for t in tools)
        
        if not has_splunk:
            try:
                tools.append(SplunkQueryTool())
                logger.info("Added fallback SplunkQueryTool")
            except Exception as e:
                logger.warning(f"Could not add fallback Splunk tool: {e}")
                
        if not has_sumologic:
            try:
                tools.append(SumoLogicQueryTool())
                logger.info("Added fallback SumoLogicQueryTool")
            except Exception as e:
                logger.warning(f"Could not add fallback SumoLogic tool: {e}")
        
        threat_tools_count = len([t for t in tools if 'threat' in t.name or 'virus' in t.name or 'abuse' in t.name or 'shodan' in t.name])
        mcp_tools_count = len([t for t in tools if 'mcp' in t.name])
        logger.info(f"Graph builder loaded {len(tools)} tools including {threat_tools_count} threat intelligence tools and {mcp_tools_count} MCP client tools")
        
        return tools
        
    except Exception as e:
        logger.error(f"Failed to get tools from registry, falling back to basic tools: {e}")
        # Fallback to essential tools only
        return [SplunkQueryTool(), SumoLogicQueryTool()]


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


async def _create_enhanced_tool_node(tools, use_enhanced=True, investigation_id=None):
    """
    Create tool node with optional enhanced executor.
    
    Args:
        tools: List of tools to use
        use_enhanced: If True, use EnhancedToolNode
        investigation_id: Optional investigation ID for WebSocket events
        
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
            tool_node = EnhancedToolNode(healthy_tools, investigation_id=investigation_id)
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
    builder.add_node("raw_data_node", raw_data_node)
    builder.add_node("fraud_investigation", assistant)
    
    # Add agent nodes based on execution mode
    if parallel:
        builder.add_node("network_agent", network_agent_node)
        builder.add_node("location_agent", location_agent_node)
        builder.add_node("logs_agent", logs_agent_node)
        builder.add_node("device_agent", device_agent_node)
        builder.add_node("risk_agent", risk_agent_node)
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
    
    # Add conditional routing for raw data vs standard investigation
    builder.add_conditional_edges(
        "start_investigation",
        raw_data_or_investigation_routing,
        {
            "raw_data_node": "raw_data_node",
            "fraud_investigation": "fraud_investigation"
        }
    )
    
    # Raw data processing flows back to fraud investigation
    builder.add_edge("raw_data_node", "fraud_investigation")
    
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
    memory = await create_resilient_memory()
    graph = builder.compile(checkpointer=memory)
    
    logger.info(f"✅ MCP-enhanced graph compiled with {len(all_tools)} tools")
    return graph