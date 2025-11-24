"""
Graph Tools Management Module

Extracted tool management from clean_graph_builder.py
"""

from typing import List, Any
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class GraphToolsManager:
    """Manages tool configuration for investigation graph"""
    
    def __init__(self):
        self.logger = logger
    
    def get_all_tools(self) -> List[Any]:
        """
        Get all configured tools for the investigation.
        
        Returns:
            List of all tools properly configured
        """
        from app.service.agent.tools.tool_registry import get_tools_for_agent, initialize_tools
        from app.service.agent.tools.snowflake_tool.snowflake_tool import SnowflakeQueryTool
        
        try:
            # Initialize the tool registry
            initialize_tools()
            
            # Get all tools from all categories
            tools = get_tools_for_agent(
                categories=[
                    "olorin",
                    "threat_intelligence",
                    "database",
                    "search",
                    "blockchain",
                    "intelligence",
                    "ml_ai",
                    "web",
                    "file_system",
                    "api",
                    "mcp_clients",
                    "mcp_servers",
                    "utility"
                ]
            )
            
            # Check database provider configuration
            from pathlib import Path
            from dotenv import load_dotenv
            import os
            
            env_path = Path(__file__).parent.parent.parent.parent.parent / '.env'
            if env_path.exists():
                load_dotenv(env_path, override=True)
                self.logger.debug(f"Loaded .env file from {env_path}")
            
            database_provider = os.getenv('DATABASE_PROVIDER', '').lower()
            use_postgres = os.getenv('USE_POSTGRES', 'false').lower() == 'true'
            
            self.logger.debug(f"Database config: DATABASE_PROVIDER={database_provider}, USE_POSTGRES={use_postgres}")
            
            # Only create DatabaseQueryTool if DATABASE_PROVIDER is PostgreSQL
            if database_provider == 'snowflake':
                self.logger.info("✅ DATABASE_PROVIDER=snowflake - Using SnowflakeQueryTool")
            elif database_provider == 'postgresql' or use_postgres:
                from app.service.agent.tools.database_tool import DatabaseQueryTool
                
                has_database_query = any(t.name == "database_query" for t in tools)
                if not has_database_query:
                    database_connection_string = os.getenv('DATABASE_URL')
                    if database_connection_string:
                        db_tool = DatabaseQueryTool(connection_string=database_connection_string)
                        tools.append(db_tool)
                        self.logger.info("✅ Added DatabaseQueryTool for PostgreSQL")
            
            self.logger.info(f"✅ Loaded {len(tools)} tools for investigation graph")
            return tools
            
        except Exception as e:
            self.logger.error(f"❌ Failed to load tools: {e}")
            return []
    
    def process_tool_results(self, tool_results: List[Any]) -> Dict[str, Any]:
        """Process and normalize tool execution results"""
        processed = {}
        
        for result in tool_results:
            if hasattr(result, 'name'):
                tool_name = result.name
                processed[tool_name] = {
                    "status": "success",
                    "result": result
                }
        
        return processed
