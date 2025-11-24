"""
Tool Nodes - Tool execution and metadata tracking for hybrid intelligence.

This module handles tool execution setup and metadata tracking for the 
hybrid intelligence investigation graph.
"""

from typing import Dict, Any, Optional
from datetime import datetime

from langgraph.graph import StateGraph
from langgraph.prebuilt import ToolNode

from ...hybrid_state_schema import HybridInvestigationState
<<<<<<< HEAD
=======
from app.service.agent.orchestration.enhanced_tool_executor import EnhancedToolNode
>>>>>>> 001-modify-analyzer-method

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def _is_successful_tool_execution(tool_name: str, tool_content: str) -> bool:
    """
    Determine if a tool execution was successful (not skipped/failed).
    
    Tool telemetry hygiene: Only count tools that were actually executed,
    exclude tools that were skipped, failed, or returned error messages.
    
    Args:
        tool_name: Name of the tool
        tool_content: Content returned by the tool
        
    Returns:
        True if this represents a successful tool execution, False otherwise
    """
    if not tool_content or not isinstance(tool_content, str):
        return False
        
    # Convert to lowercase for case-insensitive checking
    content_lower = tool_content.lower().strip()
    
    # Skip tools with explicit error/skip indicators
    skip_indicators = [
        "error", "failed", "skipped", "unavailable", "not available",
        "connection error", "timeout", "permission denied", "unauthorized",
        "tool not found", "service unavailable", "rate limited",
        "insufficient permissions", "access denied", "api error"
    ]
    
    for indicator in skip_indicators:
        if indicator in content_lower:
            return False
    
    # Skip tools with very short content (likely error messages or empty results)
    if len(tool_content.strip()) < 10:
        return False
    
    # Skip tools that return only JSON error structures
    if tool_content.strip().startswith('{"error"') or tool_content.strip().startswith('{"success": false'):
        return False
    
    # Special handling for specific tools
    if tool_name == "snowflake_query":
        # Snowflake should have actual query results
        if "results" not in content_lower or "empty" in content_lower:
            return False
    
    # If we got here, consider it a successful execution
    return True


class ToolNodes:
    """
    Tool execution and metadata tracking for hybrid intelligence graph.
    
    Handles tool loading, execution setup, and metadata tracking for investigation tools.
    """
    
    def __init__(self, components: Dict[str, Any]):
        """Initialize with graph foundation components."""
        self.components = components
        
<<<<<<< HEAD
    def add_tool_nodes(self, builder: StateGraph, use_enhanced_tools: bool = True) -> None:
        """Add tool nodes to the graph"""
        
        # Get available tools using the same approach as clean graph builder
        tools = self._load_investigation_tools()
        
        if use_enhanced_tools:
            # Use standard ToolNode with separate metadata tracking
            builder.add_node("tools", ToolNode(tools))
=======
    def add_tool_nodes(self, builder: StateGraph, use_enhanced_tools: bool = True, investigation_id: Optional[str] = None) -> None:
        """Add tool nodes to the graph with optional persistence support"""

        # Get available tools using the same approach as clean graph builder
        tools = self._load_investigation_tools()

        if use_enhanced_tools:
            # Use EnhancedToolNode with persistence (CRITICAL FIX for tool execution tracking)
            try:
                logger.debug(f"[Hybrid] Creating EnhancedToolNode with investigation_id={investigation_id}")
                enhanced_tool_executor = EnhancedToolNode(tools, investigation_id=investigation_id)
                builder.add_node("tools", enhanced_tool_executor)
                logger.info(f"✅ [Hybrid] Using EnhancedToolNode with {len(tools)} tools and persistence enabled")
            except Exception as e:
                logger.warning(f"[Hybrid] Failed to create EnhancedToolNode: {e}, falling back to standard ToolNode")
                builder.add_node("tools", ToolNode(tools))

            # Also add metadata tracking for additional telemetry
>>>>>>> 001-modify-analyzer-method
            builder.add_node("track_tools", self._create_metadata_tracker())
        else:
            # Use standard tool node only
            builder.add_node("tools", ToolNode(tools))
            
    def _load_investigation_tools(self) -> list:
        """Load all available investigation tools."""
        try:
            from app.service.agent.tools.tool_registry import get_tools_for_agent, initialize_tools
            from app.service.agent.tools.snowflake_tool.snowflake_tool import SnowflakeQueryTool
<<<<<<< HEAD
            
            # Initialize the tool registry
            initialize_tools()
            
=======
            from app.service.agent.tools.database_tool.database_factory import get_database_provider
            from app.service.config_loader import get_config_loader

            # Initialize the tool registry
            initialize_tools()

>>>>>>> 001-modify-analyzer-method
            # Get all tools from all categories (same as clean graph)
            tools = get_tools_for_agent(
                categories=[
                    "olorin",               # Snowflake, Splunk, SumoLogic
                    "threat_intelligence",  # AbuseIPDB, VirusTotal, Shodan
                    "database",             # Database query tools
                    "search",               # Vector search
                    "blockchain",           # Crypto analysis
                    "intelligence",         # OSINT, social media
                    "ml_ai",                # ML-powered analysis
                    "web",                  # Web search and scraping
                    "file_system",          # File operations
                    "api",                  # API tools
                    "mcp_clients",          # MCP client tools
                    "mcp_servers",          # Internal MCP servers
                    "utility"               # Utility tools
                ]
            )
<<<<<<< HEAD
            
            # Add primary Snowflake tool (same as clean graph)
            snowflake_tool = SnowflakeQueryTool()
            if snowflake_tool not in tools:
                tools.insert(0, snowflake_tool)
                logger.info("✅ Added SnowflakeQueryTool as PRIMARY tool")
            
            logger.info(f"📦 Loaded {len(tools)} tools for hybrid investigation")
            return tools
            
=======

            # CRITICAL FIX: Respect DATABASE_PROVIDER configuration
            # Use Snowflake OR PostgreSQL based on .env DATABASE_PROVIDER setting
            config_loader = get_config_loader()
            db_config = config_loader.load_database_provider_config()
            database_provider = db_config['provider']

            if database_provider == 'snowflake':
                # Use Snowflake for backward compatibility
                snowflake_tool = SnowflakeQueryTool()
                if snowflake_tool not in tools:
                    tools.insert(0, snowflake_tool)
                    logger.info(f"✅ Added SnowflakeQueryTool as PRIMARY tool (DATABASE_PROVIDER={database_provider})")
            elif database_provider == 'postgresql':
                # Use PostgreSQL provider - create DatabaseQueryTool with PostgreSQL connection
                try:
                    from app.service.agent.tools.database_tool.database_tool import DatabaseQueryTool

                    # Get PostgreSQL configuration and construct connection string
                    pg_config = db_config.get('postgresql', {})
                    host = pg_config.get('host', 'localhost')
                    port = pg_config.get('port', 5432)
                    database = pg_config.get('database', 'olorin_db')
                    user = pg_config.get('user', 'postgres')
                    password = pg_config.get('password', '')

                    # Construct PostgreSQL connection string
                    # Add gssencmode=disable to avoid GSSAPI errors on local connections
                    connection_string = f"postgresql://{user}:{password}@{host}:{port}/{database}?gssencmode=disable"

                    # Create database query tool with PostgreSQL connection
                    postgres_tool = DatabaseQueryTool(connection_string=connection_string)

                    # Add as primary tool (at beginning of list)
                    if postgres_tool not in tools:
                        tools.insert(0, postgres_tool)
                        logger.info(f"✅ Added DatabaseQueryTool with PostgreSQL provider as PRIMARY tool")
                        logger.info(f"✅ PostgreSQL connection: {host}:{port}/{database}")
                except Exception as e:
                    logger.error(f"❌ Failed to create PostgreSQL DatabaseQueryTool: {str(e)}")
                    logger.warning("⚠️ Falling back to tools from registry - data queries may fail")
                    raise
            else:
                logger.error(f"❌ Invalid DATABASE_PROVIDER: {database_provider}")
                raise ValueError(f"DATABASE_PROVIDER must be 'postgresql' or 'snowflake', got: {database_provider}")

            logger.info(f"📦 Loaded {len(tools)} tools for hybrid investigation")
            return tools

>>>>>>> 001-modify-analyzer-method
        except Exception as e:
            logger.error(f"❌ Failed to load tools: {str(e)}")
            # Fallback to minimal tool set
            from app.service.agent.tools.snowflake_tool.snowflake_tool import SnowflakeQueryTool
            tools = [SnowflakeQueryTool()]
            logger.warning(f"⚠️ Using fallback tools: {len(tools)} tools")
            return tools
    
    def _create_metadata_tracker(self):
        """Create simple metadata tracking node that runs after tools"""
        
        def track_tool_metadata(
            state: HybridInvestigationState,
            config: Optional[Dict] = None
        ) -> HybridInvestigationState:
            
            logger.info(f"📊 TRACKING: Tool metadata extraction")
            
            try:
                # Get recent messages to find new tool results
                messages = state.get("messages", [])
                tools_used = list(state.get("tools_used", []))  # Copy to avoid mutation
                tool_results = dict(state.get("tool_results", {}))  # Copy to avoid mutation
                
                # Look for new ToolMessage instances (added by standard ToolNode)
                # Only count tools that were actually executed (not skipped/failed)
                new_tools_found = 0
                for msg in reversed(messages[-10:]):  # Check last 10 messages
                    if hasattr(msg, 'name') and hasattr(msg, 'content') and hasattr(msg, 'tool_call_id'):
                        tool_name = msg.name
                        tool_content = msg.content
                        
<<<<<<< HEAD
=======
                        # CRITICAL FIX: Always store composio_webcrawl results if tool executed successfully
                        # The tool executor already verified success, so trust that for composio tools
                        if tool_name == "composio_webcrawl":
                            # Store webcrawl results regardless of content validation
                            # The tool executor already confirmed successful execution
                            if tool_name not in tools_used:
                                tools_used.append(tool_name)
                                new_tools_found += 1
                                logger.info(f"📊 Tracked successful tool execution: {tool_name}")
                            tool_results[tool_name] = tool_content
                            logger.debug(f"📊 Stored composio_webcrawl result (length: {len(str(tool_content))} chars)")
                            continue
                        
>>>>>>> 001-modify-analyzer-method
                        # Check if this is a successful tool execution (not skipped/failed)
                        is_successful_execution = _is_successful_tool_execution(tool_name, tool_content)
                        
                        if is_successful_execution:
                            # Track new tools only if they were successfully executed
                            if tool_name not in tools_used:
                                tools_used.append(tool_name)
                                new_tools_found += 1
                                logger.info(f"📊 Tracked successful tool execution: {tool_name}")
                            
                            # Always update tool results with latest content for successful tools
                            tool_results[tool_name] = tool_content
                        else:
                            logger.debug(f"📊 Skipping tool telemetry for {tool_name} (not successfully executed)")
                
                # Create metadata update
                metadata_update = {
                    "tools_used": tools_used,
                    "tool_results": tool_results,
                    "tool_execution_attempts": state.get("tool_execution_attempts", 0) + (1 if new_tools_found > 0 else 0)
                }
                
                # CRITICAL FIX: Add domain-specific data propagation (missing from original implementation)
                for msg in reversed(messages[-10:]):  # Check recent messages for domain-specific results
                    if hasattr(msg, 'name') and hasattr(msg, 'content') and hasattr(msg, 'tool_call_id'):
                        tool_name = msg.name.lower()
                        tool_content = msg.content
<<<<<<< HEAD
                        
                        # Special handling for domain-specific data extraction with type normalization
                        if "snowflake" in tool_name:
=======

                        # Special handling for domain-specific data extraction with type normalization
                        # CRITICAL FIX A0: Recognize both "database" and "snowflake" tool names
                        # CRITICAL FIX B0: Normalize ALL domain data to ensure LLM agents receive structured objects
                        if "snowflake" in tool_name or "database" in tool_name:
>>>>>>> 001-modify-analyzer-method
                            # CRITICAL FIX: Parse JSON string to object for consistent data type
                            snowflake_data = self._normalize_data_type(tool_content, "snowflake")
                            metadata_update["snowflake_data"] = snowflake_data
                            metadata_update["snowflake_completed"] = True
<<<<<<< HEAD
                            logger.info(f"📊 SNOWFLAKE DATA: Extracted from {msg.name} (type: {type(snowflake_data).__name__})")
                        elif "network" in tool_name:
                            metadata_update["network_data"] = tool_content
                            logger.info(f"📊 NETWORK DATA: Extracted from {msg.name}")
                        elif "device" in tool_name:
                            metadata_update["device_data"] = tool_content
                            logger.info(f"📊 DEVICE DATA: Extracted from {msg.name}")
                        elif "location" in tool_name:
                            metadata_update["location_data"] = tool_content
                            logger.info(f"📊 LOCATION DATA: Extracted from {msg.name}")
                        elif "logs" in tool_name or "splunk" in tool_name or "sumologic" in tool_name:
                            metadata_update["logs_data"] = tool_content
                            logger.info(f"📊 LOGS DATA: Extracted from {msg.name}")
=======
                            logger.info(f"📊 DATABASE DATA: Extracted from {msg.name} (type: {type(snowflake_data).__name__})")
                        elif "network" in tool_name:
                            # CRITICAL FIX B0: Normalize network data for LLM processing
                            network_data = self._normalize_data_type(tool_content, "network")
                            metadata_update["network_data"] = network_data
                            logger.info(f"📊 NETWORK DATA: Extracted from {msg.name} (type: {type(network_data).__name__})")
                        elif "device" in tool_name:
                            # CRITICAL FIX B0: Normalize device data for LLM processing
                            device_data = self._normalize_data_type(tool_content, "device")
                            metadata_update["device_data"] = device_data
                            logger.info(f"📊 DEVICE DATA: Extracted from {msg.name} (type: {type(device_data).__name__})")
                        elif "location" in tool_name:
                            # CRITICAL FIX B0: Normalize location data for LLM processing
                            location_data = self._normalize_data_type(tool_content, "location")
                            metadata_update["location_data"] = location_data
                            logger.info(f"📊 LOCATION DATA: Extracted from {msg.name} (type: {type(location_data).__name__})")
                        elif "logs" in tool_name or "splunk" in tool_name or "sumologic" in tool_name:
                            # CRITICAL FIX B0: Normalize logs data for LLM processing
                            logs_data = self._normalize_data_type(tool_content, "logs")
                            metadata_update["logs_data"] = logs_data
                            logger.info(f"📊 LOGS DATA: Extracted from {msg.name} (type: {type(logs_data).__name__})")
>>>>>>> 001-modify-analyzer-method
                
                # Update phase after first successful tool execution
                if len(tools_used) > 0 and state.get("current_phase") == "initialization":
                    metadata_update["current_phase"] = "tool_execution"
                    logger.info(f"📊 PHASE UPDATE: initialization → tool_execution")
                
                logger.info(f"✅ TRACKING: Updated metadata for {len(tools_used)} tools")
                return metadata_update
                
            except Exception as e:
                logger.error(f"❌ Metadata tracking failed: {str(e)}")
                # Return minimal error update
                return {
                    "errors": state.get("errors", []) + [{
                        "timestamp": datetime.now().isoformat(),
                        "error_type": "metadata_tracking_failure",
                        "message": str(e),
                        "recovery_action": "continue_without_metadata"
                    }]
                }
        
        return track_tool_metadata
    
    def get_tool_execution_stats(self, state: HybridInvestigationState) -> Dict[str, Any]:
        """Get statistics about tool execution."""
        return {
            "tools_used_count": len(state.get("tools_used", [])),
            "tools_used_list": state.get("tools_used", []),
            "tool_execution_attempts": state.get("tool_execution_attempts", 0),
            "has_tool_results": bool(state.get("tool_results", {})),
            "tool_results_count": len(state.get("tool_results", {}))
        }
    
    def _normalize_data_type(self, data, data_type: str):
        """
        Normalize data to expected type (object instead of JSON string).
        
        Args:
            data: Raw data from tool result (could be string or object)
            data_type: Type of data for logging ("snowflake", "network", etc.)
            
        Returns:
            Normalized data as object/dict
        """
        try:
            if isinstance(data, str):
                # Try to parse as JSON first
                import json
                try:
                    parsed_data = json.loads(data)
                    logger.debug(f"📊 {data_type.upper()} DATA: Parsed JSON string to {type(parsed_data).__name__}")
                    return parsed_data
                except json.JSONDecodeError:
                    # Try to evaluate as Python literal (safer than eval)
                    try:
                        import ast
                        parsed_data = ast.literal_eval(data)
                        logger.debug(f"📊 {data_type.upper()} DATA: Parsed Python literal to {type(parsed_data).__name__}")
                        return parsed_data
                    except (ValueError, SyntaxError):
                        # If all parsing fails, return as string but log warning
                        logger.warning(f"📊 {data_type.upper()} DATA: Could not parse string data, keeping as string")
                        return data
            else:
                # Already an object, return as-is
                logger.debug(f"📊 {data_type.upper()} DATA: Already {type(data).__name__}, no parsing needed")
                return data
                
        except Exception as e:
            logger.error(f"📊 {data_type.upper()} DATA: Error normalizing data type: {str(e)}")
            return data  # Return original data if normalization fails