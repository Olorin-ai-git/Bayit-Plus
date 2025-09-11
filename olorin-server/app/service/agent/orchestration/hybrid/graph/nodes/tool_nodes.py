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

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class ToolNodes:
    """
    Tool execution and metadata tracking for hybrid intelligence graph.
    
    Handles tool loading, execution setup, and metadata tracking for investigation tools.
    """
    
    def __init__(self, components: Dict[str, Any]):
        """Initialize with graph foundation components."""
        self.components = components
        
    def add_tool_nodes(self, builder: StateGraph, use_enhanced_tools: bool = True) -> None:
        """Add tool nodes to the graph"""
        
        # Get available tools using the same approach as clean graph builder
        tools = self._load_investigation_tools()
        
        if use_enhanced_tools:
            # Use standard ToolNode with separate metadata tracking
            builder.add_node("tools", ToolNode(tools))
            builder.add_node("track_tools", self._create_metadata_tracker())
        else:
            # Use standard tool node only
            builder.add_node("tools", ToolNode(tools))
            
    def _load_investigation_tools(self) -> list:
        """Load all available investigation tools."""
        try:
            from app.service.agent.tools.tool_registry import get_tools_for_agent, initialize_tools
            from app.service.agent.tools.snowflake_tool.snowflake_tool import SnowflakeQueryTool
            
            # Initialize the tool registry
            initialize_tools()
            
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
            
            # Add primary Snowflake tool (same as clean graph)
            snowflake_tool = SnowflakeQueryTool()
            if snowflake_tool not in tools:
                tools.insert(0, snowflake_tool)
                logger.info("✅ Added SnowflakeQueryTool as PRIMARY tool")
            
            logger.info(f"📦 Loaded {len(tools)} tools for hybrid investigation")
            return tools
            
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
                new_tools_found = 0
                for msg in reversed(messages[-10:]):  # Check last 10 messages
                    if hasattr(msg, 'name') and hasattr(msg, 'content') and hasattr(msg, 'tool_call_id'):
                        tool_name = msg.name
                        tool_content = msg.content
                        
                        # Track new tools only
                        if tool_name not in tools_used:
                            tools_used.append(tool_name)
                            new_tools_found += 1
                            logger.info(f"📊 Tracked new tool: {tool_name}")
                        
                        # Always update tool results with latest content
                        tool_results[tool_name] = tool_content
                
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
                        
                        # Special handling for domain-specific data extraction with type normalization
                        if "snowflake" in tool_name:
                            # CRITICAL FIX: Parse JSON string to object for consistent data type
                            snowflake_data = self._normalize_data_type(tool_content, "snowflake")
                            metadata_update["snowflake_data"] = snowflake_data
                            metadata_update["snowflake_completed"] = True
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