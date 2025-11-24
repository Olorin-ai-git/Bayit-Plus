"""
Orchestrator Agent for LangGraph Clean Architecture

This module now serves as a facade for the modular orchestrator system.
All functionality has been refactored into focused, maintainable modules.
"""

from typing import Dict, Any, Optional

# Import the refactored orchestrator
from .orchestrator import InvestigationOrchestrator
from app.service.agent.tools.tool_registry import get_tools_for_agent, initialize_tools


async def orchestrator_node(state: Dict[str, Any], config: Optional[Dict] = None) -> Dict[str, Any]:
    """Main orchestrator node function for backward compatibility.

    This function serves as a facade to the refactored InvestigationOrchestrator class.
    """
    # Initialize tools
    initialize_tools()
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
            "mcp_servers",     # Internal MCP servers (fraud database, external API, graph analysis)
            "utility"          # Utility tools
        ]
    )
<<<<<<< HEAD
=======
    
    # CRITICAL: Check DATABASE_PROVIDER FIRST before creating any database tool
    from pathlib import Path
    from dotenv import load_dotenv
    import os
    from app.service.logging import get_bridge_logger
    
    logger = get_bridge_logger(__name__)
    
    # Ensure .env file is loaded (in case it wasn't loaded yet)
    env_path = Path(__file__).parent.parent.parent.parent.parent / '.env'
    if env_path.exists():
        load_dotenv(env_path, override=True)
        logger.debug(f"Loaded .env file for orchestrator from {env_path}")
    
    database_provider = os.getenv('DATABASE_PROVIDER', '').lower()
    use_postgres = os.getenv('USE_POSTGRES', 'false').lower() == 'true'
    
    logger.debug(f"Orchestrator database config: DATABASE_PROVIDER={database_provider}, USE_POSTGRES={use_postgres}")
    
    # Initialize has_database_query before conditional blocks to avoid UnboundLocalError
    has_database_query = any(t.name == "database_query" for t in tools)
    
    # Only create DatabaseQueryTool if DATABASE_PROVIDER is explicitly PostgreSQL
    # NEVER use DatabaseQueryTool when DATABASE_PROVIDER=snowflake
    if database_provider == 'snowflake':
        logger.info("✅ DATABASE_PROVIDER=snowflake - Skipping DatabaseQueryTool for orchestrator, will use SnowflakeQueryTool instead")
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
            
            logger.debug(f"Orchestrator PostgreSQL env vars: host={bool(postgres_host)}, port={postgres_port}, db={bool(postgres_database)}, user={bool(postgres_user)}, password={'***' if postgres_password else None}")
            
            if postgres_host and postgres_database and postgres_user and postgres_password:
                # Add gssencmode=disable to avoid GSSAPI errors on local connections
                database_connection_string = f"postgresql://{postgres_user}:{postgres_password}@{postgres_host}:{postgres_port}/{postgres_database}?gssencmode=disable"
                logger.info(f"✅ Built PostgreSQL connection string for orchestrator from .env (host={postgres_host}, db={postgres_database}, user={postgres_user})")
            else:
                missing = []
                if not postgres_host: missing.append('POSTGRES_HOST or DB_HOST')
                if not postgres_database: missing.append('POSTGRES_DATABASE/POSTGRES_DB/DB_NAME')
                if not postgres_user: missing.append('POSTGRES_USER or DB_USER')
                if not postgres_password: missing.append('POSTGRES_PASSWORD or DB_PASSWORD')
                logger.warning(f"⚠️ PostgreSQL config incomplete for orchestrator. Missing from .env: {', '.join(missing)}")
            
            # Fallback to direct PostgreSQL environment variables (NOT Snowflake)
            if not database_connection_string:
                database_connection_string = os.getenv('DATABASE_URL') or os.getenv('POSTGRES_URL')
                if database_connection_string:
                    logger.info("✅ Using DATABASE_URL/POSTGRES_URL from .env for orchestrator")
            
            if database_connection_string:
                try:
                    database_tool = DatabaseQueryTool(connection_string=database_connection_string)
                    tools.insert(0, database_tool)  # Add as first tool
                    logger.info("✅ Added DatabaseQueryTool to orchestrator (PostgreSQL only)")
                except Exception as e:
                    logger.warning(f"Could not add DatabaseQueryTool to orchestrator: {e}")
            else:
                logger.warning("⚠️ DatabaseQueryTool not available for orchestrator: No PostgreSQL connection string found")
    
    # Verify database_query tool is available
    if not any(t.name == "database_query" for t in tools):
        logger.error("❌ CRITICAL: database_query tool is NOT available for orchestrator! LLM cannot query database!")
    else:
        logger.info(f"✅ database_query tool is available for orchestrator (total {len(tools)} tools)")
>>>>>>> 001-modify-analyzer-method

    # Create orchestrator instance
    orchestrator = InvestigationOrchestrator(tools)

    # Execute the orchestration logic
    return await orchestrator.orchestrate_investigation(state)


# Expose both the class and function for backward compatibility
__all__ = ['InvestigationOrchestrator', 'orchestrator_node']