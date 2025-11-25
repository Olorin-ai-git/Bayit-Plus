"""
Clean Graph Builder for LangGraph Architecture

Builds the complete investigation graph with proper tool integration,
orchestrator control, and domain agent coordination.
"""

import os
from typing import Any, Dict, List, Optional, Union

from langchain_core.messages import SystemMessage
from langgraph.graph import END, START, StateGraph
from langgraph.prebuilt import ToolNode

from app.service.agent.orchestration.domain_agents.authentication_agent import (
    authentication_agent_node,
)
from app.service.agent.orchestration.domain_agents.device_agent import device_agent_node
from app.service.agent.orchestration.domain_agents.location_agent import (
    location_agent_node,
)
from app.service.agent.orchestration.domain_agents.logs_agent import logs_agent_node
from app.service.agent.orchestration.domain_agents.merchant_agent import (
    merchant_agent_node,
)

# Import domain agents directly to avoid circular imports via domain_agents/__init__.py
from app.service.agent.orchestration.domain_agents.network_agent import (
    network_agent_node,
)
from app.service.agent.orchestration.domain_agents.risk_agent import risk_agent_node
from app.service.agent.orchestration.domain_agents.web_agent import web_agent_node
from app.service.agent.orchestration.enhanced_tool_executor import EnhancedToolNode
from app.service.agent.orchestration.orchestrator_agent import orchestrator_node
from app.service.agent.orchestration.state_schema import (
    InvestigationState,
    _normalize_snowflake_data_type,
    add_tool_result,
    create_initial_state,
    is_investigation_complete,
    update_phase,
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def get_all_tools() -> List[Any]:
    """
    Get all configured tools for the investigation.

    Returns:
        List of all 52 tools properly configured
    """
    from app.service.agent.tools.snowflake_tool.snowflake_tool import SnowflakeQueryTool
    from app.service.agent.tools.tool_registry import (
        get_tools_for_agent,
        initialize_tools,
    )

    try:
        # Initialize the tool registry
        initialize_tools()

        # Get all tools from all categories
        tools = get_tools_for_agent(
            categories=[
                "olorin",  # Snowflake, Splunk, SumoLogic
                "threat_intelligence",  # AbuseIPDB, VirusTotal, Shodan
                "database",  # Database query tools
                "search",  # Vector search
                "blockchain",  # Crypto analysis
                "intelligence",  # OSINT, social media
                "ml_ai",  # ML-powered analysis
                "web",  # Web search and scraping
                "file_system",  # File operations
                "api",  # HTTP and JSON API tools
                "mcp_clients",  # External MCP connections
                "mcp_servers",  # Internal MCP servers (fraud database, external API, graph analysis)
                "utility",  # Utility tools
            ]
        )

        # CRITICAL: Check DATABASE_PROVIDER FIRST before creating any database tool
        import os
        from pathlib import Path

        from dotenv import load_dotenv

        # Ensure .env file is loaded (in case it wasn't loaded yet)
        env_path = Path(__file__).parent.parent.parent.parent.parent / ".env"
        if env_path.exists():
            load_dotenv(env_path, override=True)
            logger.debug(f"Loaded .env file from {env_path}")

        database_provider = os.getenv("DATABASE_PROVIDER", "").lower()
        use_postgres = os.getenv("USE_POSTGRES", "false").lower() == "true"

        logger.debug(
            f"Clean graph builder database config: DATABASE_PROVIDER={database_provider}, USE_POSTGRES={use_postgres}"
        )

        # Initialize has_database_query before conditional blocks to avoid UnboundLocalError
        has_database_query = any(t.name == "database_query" for t in tools)

        # Only create DatabaseQueryTool if DATABASE_PROVIDER is explicitly PostgreSQL
        # NEVER use DatabaseQueryTool when DATABASE_PROVIDER=snowflake
        if database_provider == "snowflake":
            logger.info(
                "✅ DATABASE_PROVIDER=snowflake - Skipping DatabaseQueryTool, will use SnowflakeQueryTool instead"
            )
        elif database_provider == "postgresql" or use_postgres:
            # Only create DatabaseQueryTool for PostgreSQL
            from app.service.agent.tools.database_tool import DatabaseQueryTool

            has_database_query = any(t.name == "database_query" for t in tools)
            if not has_database_query:
                database_connection_string = None

                # Build PostgreSQL connection string from config (read from .env)
                postgres_host = os.getenv("POSTGRES_HOST") or os.getenv("DB_HOST")
                postgres_port = os.getenv("POSTGRES_PORT") or os.getenv(
                    "DB_PORT", "5432"
                )
                postgres_database = (
                    os.getenv("POSTGRES_DATABASE")
                    or os.getenv("POSTGRES_DB")
                    or os.getenv("DB_NAME")
                )
                postgres_user = os.getenv("POSTGRES_USER") or os.getenv("DB_USER")
                postgres_password = os.getenv("POSTGRES_PASSWORD") or os.getenv(
                    "DB_PASSWORD"
                )

                logger.debug(
                    f"PostgreSQL env vars: host={bool(postgres_host)}, port={postgres_port}, db={bool(postgres_database)}, user={bool(postgres_user)}, password={'***' if postgres_password else None}"
                )

                if (
                    postgres_host
                    and postgres_database
                    and postgres_user
                    and postgres_password
                ):
                    # Add gssencmode=disable to avoid GSSAPI errors on local connections
                    database_connection_string = f"postgresql://{postgres_user}:{postgres_password}@{postgres_host}:{postgres_port}/{postgres_database}?gssencmode=disable"
                    logger.info(
                        f"✅ Built PostgreSQL connection string from .env config (host={postgres_host}, db={postgres_database}, user={postgres_user})"
                    )
                else:
                    missing = []
                    if not postgres_host:
                        missing.append("POSTGRES_HOST or DB_HOST")
                    if not postgres_database:
                        missing.append("POSTGRES_DATABASE/POSTGRES_DB/DB_NAME")
                    if not postgres_user:
                        missing.append("POSTGRES_USER or DB_USER")
                    if not postgres_password:
                        missing.append("POSTGRES_PASSWORD or DB_PASSWORD")
                    logger.warning(
                        f"⚠️ PostgreSQL config incomplete. Missing from .env: {', '.join(missing)}"
                    )

            # Fallback to direct PostgreSQL environment variables (NOT Snowflake)
            if not database_connection_string:
                database_connection_string = os.getenv("DATABASE_URL") or os.getenv(
                    "POSTGRES_URL"
                )
                if database_connection_string:
                    logger.info("✅ Using DATABASE_URL/POSTGRES_URL from .env")

            if database_connection_string:
                try:
                    database_tool = DatabaseQueryTool(
                        connection_string=database_connection_string
                    )
                    tools.insert(0, database_tool)  # Add as first tool
                    logger.info(
                        "✅ Added DatabaseQueryTool as PRIMARY tool (PostgreSQL only)"
                    )
                except Exception as e:
                    logger.warning(f"Could not add DatabaseQueryTool: {e}")
            else:
                logger.warning(
                    "⚠️ DatabaseQueryTool not available: No PostgreSQL connection string found"
                )

        # CRITICAL: Ensure Snowflake is available (for backward compatibility)
        has_snowflake = any(isinstance(t, SnowflakeQueryTool) for t in tools)
        if not has_snowflake:
            try:
                snowflake_tool = SnowflakeQueryTool()
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
                snowflake_tools = [
                    t for t in tools if isinstance(t, SnowflakeQueryTool)
                ]
                other_tools = [
                    t for t in tools if not isinstance(t, SnowflakeQueryTool)
                ]
                tools = (
                    other_tools[:1] + snowflake_tools + other_tools[1:]
                )  # Keep database_query first

        logger.info(f"📦 Loaded {len(tools)} tools for investigation")

        # Log tool names for debugging (especially database tools)
        tool_names = [t.name for t in tools]
        database_tool_names = [
            name
            for name in tool_names
            if "database" in name.lower()
            or "snowflake" in name.lower()
            or "query" in name.lower()
        ]

        logger.info(f"  🔧 Database/Query Tools Available: {database_tool_names}")

        # Log tool categories for debugging
        threat_tools = len(
            [
                t
                for t in tools
                if "threat" in t.name.lower() or "virus" in t.name.lower()
            ]
        )
        db_tools = len(
            [
                t
                for t in tools
                if "splunk" in t.name.lower()
                or "sumo" in t.name.lower()
                or "snowflake" in t.name.lower()
                or "database" in t.name.lower()
            ]
        )
        ml_tools = len(
            [t for t in tools if "ml" in t.name.lower() or "anomaly" in t.name.lower()]
        )

        logger.info(f"  - Threat Intelligence: {threat_tools} tools")
        logger.info(f"  - Database/SIEM: {db_tools} tools")
        logger.info(f"  - ML/AI: {ml_tools} tools")

        # CRITICAL: Verify database_query tool is available
        if not any(t.name == "database_query" for t in tools):
            logger.error(
                "❌ CRITICAL: database_query tool is NOT available! LLM cannot query database!"
            )
        else:
            logger.info("✅ database_query tool is available and will be bound to LLM")

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

    is_test_mode = os.environ.get("TEST_MODE") == "demo"

    messages = state.get("messages", [])
    tools_used = state.get("tools_used", []).copy()
    tool_results = state.get("tool_results", {}).copy()

    # Step 4.3.1: ToolMessage detection and parsing
    logger.debug(
        f"[Step 4.3.1] 📥 TOOL MESSAGE DETECTION - Starting tool result processing"
    )
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
        logger.debug(
            f"[Step 4.3.1]     Message types: {[type(msg).__name__ for msg in messages[-3:]]}"
        )  # Show last 3 message types

        if tool_messages:
            logger.debug(
                f"[Step 4.3.1]   ✅ {len(tool_messages)} ToolMessages detected - proceeding with processing"
            )

            # Process each ToolMessage to build complete tool_results
            for i, tool_message in enumerate(tool_messages):
                logger.debug(
                    f"[Step 4.3.1]   Processing ToolMessage {i+1}/{len(tool_messages)}"
                )

                # Extract tool information
                tool_name = tool_message.name
                content_raw = tool_message.content
                content_length = len(str(content_raw)) if content_raw else 0

                # Summarize content instead of showing raw preview (especially for SQL queries)
                if content_raw:
                    if isinstance(content_raw, str):
                        # Check if it looks like JSON with a query
                        try:
                            import json

                            parsed = json.loads(content_raw)
                            if isinstance(parsed, dict):
                                if "query" in parsed:
                                    content_summary = f"JSON with SQL query ({len(parsed.get('query', ''))} chars)"
                                elif "results" in parsed:
                                    results = parsed.get("results", [])
                                    content_summary = (
                                        f"JSON with {len(results)} results"
                                    )
                                else:
                                    content_summary = (
                                        f"JSON dict with {len(parsed)} keys"
                                    )
                            else:
                                content_summary = (
                                    f"JSON parsed ({type(parsed).__name__})"
                                )
                        except (json.JSONDecodeError, Exception):
                            # Not JSON - check if it looks like SQL
                            if (
                                "SELECT" in content_raw.upper()
                                or "FROM" in content_raw.upper()
                            ):
                                content_summary = f"SQL query ({content_length} chars)"
                            else:
                                content_summary = (
                                    f"String content ({content_length} chars)"
                                )
                    elif isinstance(content_raw, dict):
                        if "query" in content_raw:
                            content_summary = f"Dict with SQL query ({len(str(content_raw.get('query', '')))} chars)"
                        elif "results" in content_raw:
                            results = content_raw.get("results", [])
                            content_summary = f"Dict with {len(results)} results"
                        else:
                            content_summary = f"Dict with {len(content_raw)} keys"
                    else:
                        content_summary = (
                            f"{type(content_raw).__name__} ({content_length} chars)"
                        )
                else:
                    content_summary = "Empty"

                logger.debug(f"[Step 4.3.1]     Tool name: {tool_name}")
                logger.debug(
                    f"[Step 4.3.1]     Content length: {content_length} characters"
                )
                logger.debug(f"[Step 4.3.1]     Content summary: {content_summary}")

                # Skip if already processed
                if tool_name in tool_results:
                    logger.debug(
                        f"[Step 4.3.1]     ⚠️ {tool_name} already processed - skipping"
                    )
                    continue

                # Continue with existing processing logic for this tool...
                logger.info(f"🔧 Processing tool result from: {tool_name}")

                # Add to tools used tracking
                if tool_name not in tools_used:
                    tools_used.append(tool_name)
                    logger.debug(
                        f"[Step 4.3.1]     Added {tool_name} to tools_used list (new: {len(tools_used)} total)"
                    )
                else:
                    logger.debug(
                        f"[Step 4.3.1]     {tool_name} already in tools_used list"
                    )

                # Step 4.3.1 continued: Parse tool result content
                logger.debug(
                    f"[Step 4.3.1]     🔍 Attempting to parse tool result content"
                )

                # Store tool result with content parsing
                parsed_successfully = False
                parsed_result = None

                try:
                    import json

                    parsed_result = json.loads(content_raw)
                    tool_results[tool_name] = parsed_result
                    parsed_successfully = True
                    logger.debug(f"[Step 4.3.1]     ✅ JSON parsing successful")
                    logger.debug(
                        f"[Step 4.3.1]     Parsed result type: {type(parsed_result)}"
                    )
                    logger.debug(
                        f"[Step 4.3.1]     Parsed result keys: {list(parsed_result.keys()) if isinstance(parsed_result, dict) else 'not-dict'}"
                    )

                except Exception as e:
                    # If not JSON, store as string
                    logger.debug(f"[Step 4.3.1]     ❌ JSON parsing failed: {str(e)}")
                    logger.debug(f"[Step 4.3.1]     Storing as raw string content")
                    tool_results[tool_name] = content_raw
                    parsed_successfully = False
                    parsed_result = content_raw

                # Step 4.3.2: Special Snowflake handling (inside the loop)
                # Support both database_query (unified) and snowflake_query_tool (legacy)
                if (
                    "snowflake" in tool_name.lower()
                    or "database_query" in tool_name.lower()
                ):
                    logger.debug(
                        f"[Step 4.3.2] ❄️ DATABASE HANDLING - Processing database tool result"
                    )
                    logger.debug(f"[Step 4.3.2]   Database tool detected: {tool_name}")
                    logger.debug(
                        f"[Step 4.3.2]   Parsed successfully: {parsed_successfully}"
                    )
                    logger.debug(
                        f"[Step 4.3.2]   Content type: {'JSON' if parsed_successfully else 'RAW'}"
                    )

                    if parsed_successfully:
                        logger.debug(
                            f"[Step 4.3.2]   Storing JSON result as snowflake_data"
                        )
                        logger.info("✅ Snowflake query completed with JSON result")
                    else:
                        logger.debug(
                            f"[Step 4.3.2]   Storing raw content as snowflake_data"
                        )
                        logger.info("✅ Snowflake query completed with non-JSON result")
                else:
                    # Handle non-Snowflake tools
                    logger.debug(
                        f"[Step 4.3.3] 🔄 REGULAR TOOL PROCESSING - Non-Snowflake tool completed"
                    )
                    logger.debug(f"[Step 4.3.3]   Tool: {tool_name}")
                    logger.debug(
                        f"[Step 4.3.3]   State update: tools_used and tool_results updated"
                    )

            # After processing all ToolMessages, return consolidated results
            logger.debug(f"[Step 4.3.3] ✅ ALL TOOL RESULTS PROCESSED - Summary")
            logger.debug(f"[Step 4.3.3]   Total tools processed: {len(tool_messages)}")
            logger.debug(f"[Step 4.3.3]   Tools used: {tools_used}")
            logger.debug(
                f"[Step 4.3.3]   Tool results keys: {list(tool_results.keys())}"
            )

            # Check if database/Snowflake was processed for special handling
            # Support both database_query (unified) and snowflake_query_tool (legacy)
            database_tools = [
                name
                for name in tool_results.keys()
                if "snowflake" in name.lower() or "database_query" in name.lower()
            ]
            if database_tools:
                database_tool_name = database_tools[0]  # Get first database tool
                database_result = tool_results[database_tool_name]

                logger.debug(
                    f"[Step 4.3.3] 🎯 PHASE TRANSITION - Moving to tool_execution phase"
                )
                logger.debug(
                    f"[Step 4.3.3]   Reason: Database query processing completed"
                )
                logger.debug(f"[Step 4.3.3]   Database tool: {database_tool_name}")
                logger.debug(
                    f"[Step 4.3.3]   Next steps: Orchestrator will handle additional tool selection"
                )

                # CRITICAL FIX: Normalize database data type (JSON string → object)
                snowflake_data = _normalize_snowflake_data_type(database_result)

                return {
                    "tools_used": tools_used,
                    "tool_results": tool_results,
                    "snowflake_data": snowflake_data,
                    "snowflake_completed": True,
                    "current_phase": "tool_execution",  # Move to next phase
                }
            else:
                # No Snowflake tools - return regular tool results
                logger.debug(
                    f"[Step 4.3.3] 🔄 REGULAR TOOL PROCESSING - No Snowflake tools"
                )
                logger.debug(
                    f"[Step 4.3.3]   Phase transition: None (staying in current phase)"
                )
                logger.debug(
                    f"[Step 4.3.3]   State update: tools_used and tool_results updated"
                )

                return {"tools_used": tools_used, "tool_results": tool_results}
        else:
            # No ToolMessages found
            logger.debug(f"[Step 4.3.1]   ❌ No ToolMessages found in message history")
            logger.debug(
                f"[Step 4.3.1]   Message types present: {[type(msg).__name__ for msg in messages]}"
            )
            logger.debug(f"[Step 4.3.1]   Skipping tool result processing")
    else:
        logger.debug(f"[Step 4.3.1]   ❌ No messages in state")
        logger.debug(f"[Step 4.3.1]   Cannot process tool results without messages")

    logger.debug(
        f"[Step 4.3.1] 🔚 NO TOOL RESULTS TO PROCESS - Returning empty state update"
    )
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
    logger.debug(
        "[Step 2.1.1] Investigation context SystemMessage creation - Starting message preparation"
    )
    logger.debug(f"[Step 2.1.1] Entity type: {state['entity_type']}")
    logger.debug(f"[Step 2.1.1] Entity ID: {state['entity_id']}")
    logger.debug(f"[Step 2.1.1] Investigation ID: {state['investigation_id']}")
    logger.debug(f"[Step 2.1.1] Date range days: {state.get('date_range_days', 7)}")

    # Prepare initial investigation message
    ingestion_msg = SystemMessage(
        content=f"""
    Investigation initialized:
    - Type: {state['entity_type']}
    - Entity: {state['entity_id']}
    - Investigation ID: {state['investigation_id']}
    
    Next: Mandatory Snowflake {state.get('date_range_days', 7)}-day analysis
    """
    )

    logger.debug(
        f"[Step 2.1.1] SystemMessage created with content: {ingestion_msg.content.strip()}"
    )
    logger.debug(f"[Step 2.1.1] SystemMessage type: {type(ingestion_msg).__name__}")

    # Phase transition
    logger.debug(
        "[Step 2.1.2] Phase transition to 'initialization' - Preparing return state"
    )
    logger.debug("[Step 2.1.2] Setting current_phase = 'initialization'")
    logger.debug("[Step 2.1.2] Adding SystemMessage to messages array")

    return_state = {"messages": [ingestion_msg], "current_phase": "initialization"}

    logger.debug(
        f"[Step 2.1.2] Data ingestion complete - returning state with {len(return_state['messages'])} message(s)"
    )
    logger.debug(
        f"[Step 2.1.2] Phase transition complete: current_phase = '{return_state['current_phase']}'"
    )

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
    logger.debug(
        f"[Step 6.1.1] Investigation ID: {state.get('investigation_id', 'unknown')}"
    )
    logger.debug(f"[Step 6.1.1] Entity type: {state.get('entity_type', 'unknown')}")
    logger.debug(f"[Step 6.1.1] Entity ID: {state.get('entity_id', 'unknown')}")

    from datetime import datetime

    from app.service.agent.orchestration.state_schema import calculate_final_risk_score

    # Step 6.1.1: Final risk score calculation
    logger.debug("[Step 6.1.1] 📊 Invoking calculate_final_risk_score function")
    logger.debug(
        f"[Step 6.1.1] State domains available: {list(state.get('domain_findings', {}).keys())}"
    )
    logger.debug(
        f"[Step 6.1.1] Snowflake completed: {state.get('snowflake_completed', False)}"
    )
    logger.debug(f"[Step 6.1.1] Tools used count: {len(state.get('tools_used', []))}")

    final_risk = calculate_final_risk_score(state)
    logger.debug(f"[Step 6.1.1] ✅ Final risk score calculated: {final_risk:.4f}")

    tools_used = state.get("tools_used", [])
    domains_completed = state.get("domains_completed", [])
    confidence_score = state.get("confidence_score", 0.0)

    logger.debug(f"[Step 6.1.1] 📋 Summary metrics collected:")
    logger.debug(f"[Step 6.1.1]   - Final risk: {final_risk:.4f}")
    logger.debug(f"[Step 6.1.1]   - Tools used: {tools_used}")
    logger.debug(f"[Step 6.1.1]   - Domains completed: {domains_completed}")
    logger.debug(f"[Step 6.1.1]   - Confidence score: {confidence_score:.4f}")

    # Step 6.1.2: Investigation summary generation
    logger.debug("[Step 6.1.2] 📝 Starting Markdown-formatted summary generation")

    # Calculate risk level
    risk_level = (
        "CRITICAL"
        if final_risk >= 0.8
        else "HIGH" if final_risk >= 0.6 else "MEDIUM" if final_risk >= 0.4 else "LOW"
    )
    logger.debug(
        f"[Step 6.1.2] 🎯 Risk level classification: {risk_level} (score: {final_risk:.4f})"
    )

    # Calculate recommendation
    recommendation = (
        "🚨 BLOCK - High fraud risk"
        if final_risk >= 0.7
        else (
            "⚠️ REVIEW - Moderate risk" if final_risk >= 0.4 else "✅ APPROVE - Low risk"
        )
    )
    logger.debug(f"[Step 6.1.2] 💡 Recommendation generated: {recommendation}")

    # Generate coverage metrics
    snowflake_status = (
        "✅ Complete" if state.get("snowflake_completed") else "❌ Incomplete"
    )
    logger.debug(f"[Step 6.1.2] 📊 Coverage metrics:")
    logger.debug(f"[Step 6.1.2]   - Tools used count: {len(tools_used)}")
    logger.debug(
        f"[Step 6.1.2]   - Domains analyzed: {', '.join(domains_completed) if domains_completed else 'None'}"
    )
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
    logger.debug(
        f"[Step 6.1.2] Summary sections: Investigation header, Final Assessment, Coverage, Recommendation"
    )

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
        logger.debug(
            f"[Step 6.1.2] ⏱️  Total duration: {duration_ms}ms ({duration_ms/1000:.2f}s)"
        )
    else:
        duration_ms = 0
        logger.debug(
            "[Step 6.1.2] ⚠️  No start_time found in state, duration set to 0ms"
        )

    logger.debug(
        "[Step 6.1.2] ✅ Investigation summary generation completed successfully"
    )

    # Step 6.1.3: Phase transition to "complete"
    logger.debug("[Step 6.1.3] 🔄 Phase transition to 'complete'")
    logger.debug("[Step 6.1.3] 📊 Preparing final state return")

    final_state = {
        "messages": [summary_msg],
        "current_phase": "complete",
        "end_time": datetime.utcnow().isoformat(),
        "total_duration_ms": duration_ms,
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

    # DEBUG FIX: Use actual orchestrator_loops without artificial increment
    # The artificial +1 increment was causing premature recursion safety triggering
    # Let the orchestrator itself handle the increment properly
    orchestrator_loops = state.get("orchestrator_loops", 0)
    base_orchestrator_loops = orchestrator_loops  # Keep for logging consistency

    # Track routing decisions for debugging (collect them to return with result)
    routing_decisions = state.get("routing_decisions", []).copy()

    def log_routing_decision(decision: str, reason: str, state_info: dict):
        routing_decisions.append(
            {
                "timestamp": datetime.utcnow().isoformat(),
                "orchestrator_loop": orchestrator_loops,
                "phase": current_phase,
                "decision": decision,
                "reason": reason,
                "state_info": state_info,
            }
        )

    # Helper function to return routing decision with state updates
    def route_with_logging(next_node: str, reason: str, state_info: dict = None):
        state_info = state_info or {}
        log_routing_decision(next_node, reason, state_info)
        # For LangGraph conditional edges, we can't return state updates
        # The state updates would need to be handled by the target node
        return next_node

    # Step 7.1.1: Orchestrator loop limits - ALIGNED with LangGraph recursion limits
    is_test_mode = os.environ.get("TEST_MODE") == "demo"
    max_loops = (
        45 if is_test_mode else 55
    )  # ALIGNED: Well below LangGraph recursion limits (50/60)

    logger.debug(f"[Step 7.1.1] 🔄 ORCHESTRATOR LOOP LIMITS - Configuration check")
    logger.debug(
        f"[Step 7.1.1]   Environment mode: {'TEST' if is_test_mode else 'LIVE'}"
    )
    logger.debug(
        f"[Step 7.1.1]   Max loops allowed: {max_loops} ({'TEST: 45' if is_test_mode else 'LIVE: 55'})"
    )
    logger.debug(f"[Step 7.1.1]   Base orchestrator loops: {base_orchestrator_loops}")
    logger.debug(f"[Step 7.1.1]   Predicted orchestrator loops: {orchestrator_loops}")
    logger.debug(
        f"[Step 7.1.1]   Loop prevention status: {'ACTIVE' if orchestrator_loops < max_loops else 'TRIGGERED'}"
    )
    logger.debug(
        f"[Step 7.1.1]   LangGraph recursion limit: {70 if is_test_mode else 90} (safely above routing limits)"
    )

    logger.info(
        f"🔀 Routing from orchestrator (actual loop {orchestrator_loops}/{max_loops})"
    )
    logger.debug(f"🔀 ROUTING DEBUG - Loop count analysis:")
    logger.debug(f"   Actual orchestrator_loops from state: {orchestrator_loops}")
    logger.debug(f"   Max loops allowed: {max_loops}")
    logger.debug(f"   Loop safety will trigger at: {max_loops}")
    logger.debug(f"   Current phase: {current_phase}")
    logger.debug(f"   Snowflake completed: {snowflake_completed}")

    # CRITICAL: Early termination to prevent infinite loops
    if orchestrator_loops >= max_loops:
        logger.debug(
            f"[Step 7.1.1] 🚨 LOOP LIMIT EXCEEDED - Triggering recursion safety"
        )
        logger.debug(f"[Step 7.1.1]   Condition: {orchestrator_loops} >= {max_loops}")
        logger.debug(f"[Step 7.1.1]   Safety action: Force routing to 'summary' phase")
        logger.debug(f"[Step 7.1.1]   Termination reason: Recursion safety triggered")
        logger.warning(
            f"🚨 RECURSION SAFETY: {orchestrator_loops} orchestrator loops reached, forcing completion (mode: {'TEST' if is_test_mode else 'LIVE'})"
        )
        return route_with_logging(
            "summary",
            f"Recursion safety triggered - {orchestrator_loops} loops exceeded max {max_loops}",
            {
                "loops": orchestrator_loops,
                "max_loops": max_loops,
                "mode": "TEST" if is_test_mode else "LIVE",
            },
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
    logger.debug(
        f"   Entity: {state.get('entity_type', 'N/A')} - {state.get('entity_id', 'N/A')}"
    )
    logger.debug(f"   Tools used: {tools_used}")
    logger.debug(f"   Tool results keys: {list(state.get('tool_results', {}).keys())}")
    logger.debug(f"   Domains completed: {state.get('domains_completed', [])}")
    logger.debug(
        f"   Snowflake data available: {'Yes' if state.get('snowflake_data') else 'No'}"
    )
    logger.debug(f"   Risk score: {state.get('risk_score', 'N/A')}")
    logger.debug(f"   Confidence: {state.get('confidence_score', 'N/A')}")
    logger.debug(
        f"   Tool execution attempts: {state.get('tool_execution_attempts', 0)}"
    )
    logger.debug(
        f"   Message types: {[type(msg).__name__ for msg in messages[-3:]]}"
    )  # Last 3 messages

    # CRITICAL FIX: Check for tool calls in last message FIRST
    logger.debug(
        f"[Step 4.1.1] 🔍 TOOL CALL DETECTION - Starting analysis of last message"
    )

    if messages:
        last_message = messages[-1]
        logger.debug(f"[Step 4.1.1]   Message analysis:")
        logger.debug(f"[Step 4.1.1]     Message type: {type(last_message).__name__}")
        logger.debug(
            f"[Step 4.1.1]     Has content attribute: {hasattr(last_message, 'content')}"
        )
        logger.debug(
            f"[Step 4.1.1]     Content preview: {str(last_message.content)[:100] if hasattr(last_message, 'content') else 'No content'}..."
        )
        logger.debug(
            f"[Step 4.1.1]     Has tool_calls attribute: {hasattr(last_message, 'tool_calls')}"
        )

        if hasattr(last_message, "tool_calls"):
            tool_calls_exist = last_message.tool_calls is not None
            tool_calls_count = (
                len(last_message.tool_calls)
                if tool_calls_exist and isinstance(last_message.tool_calls, list)
                else 0
            )
            logger.debug(f"[Step 4.1.1]     Tool calls exist: {tool_calls_exist}")
            logger.debug(f"[Step 4.1.1]     Tool calls count: {tool_calls_count}")

            if last_message.tool_calls:
                # Extract tool names and details for debugging
                tool_names = []
                tool_details = []
                for i, tc in enumerate(last_message.tool_calls):
                    if isinstance(tc, dict):
                        name = tc.get("name", "unknown")
                        tool_id = tc.get("id", "no-id")
                        args_preview = (
                            str(tc.get("args", {}))[:50]
                            if tc.get("args")
                            else "no-args"
                        )
                        tool_names.append(name)
                        tool_details.append(
                            f"{name}(id:{tool_id}, args:{args_preview}...)"
                        )
                    else:
                        tool_names.append("unknown-format")
                        tool_details.append(f"unknown-format: {type(tc)}")

                logger.debug(f"[Step 4.1.1]     Tool call names: {tool_names}")
                logger.debug(f"[Step 4.1.1]     Tool call details: {tool_details}")
                logger.debug(
                    f"[Step 4.1.1]   ✅ TOOL CALLS DETECTED - Proceeding to Step 4.1.2"
                )

                # Step 4.1.2: Route to "tools" node for execution
                logger.debug(
                    f"[Step 4.1.2] 🎯 TOOL ROUTING DECISION - Routing to 'tools' node"
                )
                logger.debug(
                    f"[Step 4.1.2]   Routing reason: Found {len(last_message.tool_calls)} tool calls in last message"
                )
                logger.debug(f"[Step 4.1.2]   Target node: 'tools'")
                logger.debug(
                    f"[Step 4.1.2]   Next execution: ToolNode will execute {len(last_message.tool_calls)} tools"
                )
                logger.debug(f"[Step 4.1.2]   Tools to execute: {tool_names}")

                logger.info(
                    f"  → Routing to tools (found {len(last_message.tool_calls)} tool calls)"
                )
                logger.debug(f"     Tool calls: {tool_names}")
                return "tools"
            else:
                logger.debug(f"[Step 4.1.1]     Tool calls is None or empty list")
        else:
            logger.debug(f"[Step 4.1.1]     No tool_calls attribute found")

        logger.debug(
            f"[Step 4.1.1]   ❌ NO TOOL CALLS DETECTED - Continuing to phase routing"
        )
    else:
        logger.debug(
            f"[Step 4.1.1]   ❌ NO MESSAGES - Cannot detect tool calls, continuing to phase routing"
        )

    # Route based on phase with FORCED progression to prevent loops
    logger.debug(f"📍 PHASE ROUTING LOGIC:")

    if current_phase == "snowflake_analysis":
        logger.debug(f"   📊 SNOWFLAKE ANALYSIS PHASE")
        logger.debug(f"      Snowflake completed: {snowflake_completed}")

        if not snowflake_completed:
            # ADDITIONAL SAFETY: Check if any database ToolMessage already exists
            # Support both database_query (unified) and snowflake_query_tool (legacy)
            from langchain_core.messages import ToolMessage

            database_tool_found = False
            database_messages = []
            for i, msg in enumerate(messages):
                if isinstance(msg, ToolMessage) and (
                    "snowflake" in msg.name.lower()
                    or "database_query" in msg.name.lower()
                ):
                    database_tool_found = True
                    database_messages.append(f"Message {i}: {msg.name}")

            logger.debug(f"      Database ToolMessages found: {len(database_messages)}")
            if database_messages:
                logger.debug(f"      Database messages: {database_messages}")
                logger.warning(
                    "🔧 Found Database ToolMessage but completion flag not set - forcing completion"
                )

            # Step 7.1.2: Phase-specific thresholds - Snowflake: 6 loops (TEST) / 8 loops (LIVE)
            loop_threshold = (
                6 if is_test_mode else 8
            )  # Allow more loops for proper execution
            logger.debug(
                f"[Step 7.1.2] 📊 SNOWFLAKE PHASE THRESHOLDS - Threshold configuration"
            )
            logger.debug(
                f"[Step 7.1.2]   Environment mode: {'TEST' if is_test_mode else 'LIVE'}"
            )
            logger.debug(
                f"[Step 7.1.2]   Snowflake loop threshold: {loop_threshold} ({'TEST: 6' if is_test_mode else 'LIVE: 8'})"
            )
            logger.debug(
                f"[Step 7.1.2]   Current predicted loops: {orchestrator_loops}"
            )
            logger.debug(
                f"[Step 7.1.2]   Database ToolMessage detected: {database_tool_found}"
            )
            logger.debug(
                f"[Step 7.1.2]   Threshold exceeded: {orchestrator_loops >= loop_threshold}"
            )
            logger.debug(
                f"[Step 7.1.2]   Force progression condition: {database_tool_found or orchestrator_loops >= loop_threshold}"
            )

            if database_tool_found or orchestrator_loops >= loop_threshold:
                logger.debug(
                    f"[Step 7.1.2] ⚡ FORCED PROGRESSION TRIGGERED - Moving to tool_execution phase"
                )
                logger.debug(
                    f"[Step 7.1.2]   Trigger reason: {'Database ToolMessage found' if database_tool_found else 'Loop threshold exceeded'}"
                )
                logger.debug(f"[Step 7.1.2]   Target phase: tool_execution")
                logger.debug(f"[Step 7.1.2]   Routing destination: process_tools")
                logger.info(
                    f"  → FORCED move to tool_execution phase (Database ToolMessage found or loops >= {loop_threshold})"
                )
                logger.debug(
                    f"      Reason: {'Database ToolMessage found' if database_tool_found else 'Loop threshold exceeded'}"
                )
                # Force phase completion by routing to process_tools
                return "process_tools"
            else:
                # Only stay in orchestrator for first few loops
                logger.info("  → Continuing with Snowflake analysis")
                logger.debug(
                    f"      Staying in orchestrator (loops: {orchestrator_loops}/{loop_threshold})"
                )
                return "orchestrator"
        else:
            logger.info("  → Snowflake complete, moving to tool_execution phase")
            logger.debug("      Snowflake completed, orchestrator will change phase")
            return "orchestrator"  # Let orchestrator change phase

    elif current_phase == "tool_execution":
        logger.debug(f"   🔧 TOOL EXECUTION PHASE")
        logger.info(
            f"🔧 TOOL EXECUTION PHASE ENTRY - Evaluating domain analysis transition"
        )
        logger.info(f"   Orchestrator loops: {orchestrator_loops}/{max_loops}")
        logger.info(f"   Snowflake completed: {snowflake_completed}")
        logger.info(f"   Tools used count: {len(tools_used)}")

        # ARCHITECTURE FIX: Prevent infinite loops in tool execution phase
        tool_execution_attempts = state.get("tool_execution_attempts", 0)
        max_attempts = 3

        # Step 7.1.2: Phase-specific thresholds - Tool execution: 8 loops (TEST) / 10 loops (LIVE)
        loop_threshold = (
            8 if is_test_mode else 10
        )  # Allow sufficient loops for tool execution
        tool_threshold = 8 if is_test_mode else 10  # Allow more tools

        logger.debug(
            f"[Step 7.1.2] 🔧 TOOL EXECUTION PHASE THRESHOLDS - Threshold configuration"
        )
        logger.debug(
            f"[Step 7.1.2]   Environment mode: {'TEST' if is_test_mode else 'LIVE'}"
        )
        logger.debug(
            f"[Step 7.1.2]   Tool execution loop threshold: {loop_threshold} ({'TEST: 8' if is_test_mode else 'LIVE: 10'})"
        )
        logger.debug(
            f"[Step 7.1.2]   Tool usage threshold: {tool_threshold} ({'TEST: 8' if is_test_mode else 'LIVE: 10'})"
        )
        logger.debug(f"[Step 7.1.2]   Max execution attempts: {max_attempts}")
        logger.debug(
            f"[Step 7.1.2]   Current tool execution attempts: {tool_execution_attempts}/{max_attempts}"
        )
        logger.debug(
            f"[Step 7.1.2]   Current tools used: {len(tools_used)}/{tool_threshold}"
        )
        logger.debug(
            f"[Step 7.1.2]   Current orchestrator loops: {orchestrator_loops}/{loop_threshold}"
        )
        logger.debug(f"[Step 7.1.2]   Active tools: {tools_used}")

        # Step 7.1.3: Forced progression mechanisms - CRITICAL FIX: Force progression after limited attempts
        should_progress = (
            tool_execution_attempts >= max_attempts
            or len(tools_used) >= tool_threshold
            or orchestrator_loops >= loop_threshold
        )

        logger.debug(
            f"[Step 7.1.3] ⚡ FORCED PROGRESSION EVALUATION - Checking progression conditions"
        )
        logger.debug(
            f"[Step 7.1.3]   Attempts condition: {tool_execution_attempts} >= {max_attempts} = {tool_execution_attempts >= max_attempts}"
        )
        logger.debug(
            f"[Step 7.1.3]   Tools condition: {len(tools_used)} >= {tool_threshold} = {len(tools_used) >= tool_threshold}"
        )
        logger.debug(
            f"[Step 7.1.3]   Loops condition: {orchestrator_loops} >= {loop_threshold} = {orchestrator_loops >= loop_threshold}"
        )
        logger.debug(f"[Step 7.1.3]   Should progress: {should_progress}")
        logger.debug(f"[Step 7.1.3]   Next phase if progressing: domain_analysis")

        if should_progress:
            reasons = []
            if tool_execution_attempts >= max_attempts:
                reasons.append(f"max attempts ({tool_execution_attempts})")
            if len(tools_used) >= tool_threshold:
                reasons.append(f"tool threshold ({len(tools_used)})")
            if orchestrator_loops >= loop_threshold:
                reasons.append(f"loop threshold ({orchestrator_loops})")

            logger.debug(
                f"[Step 7.1.3] 🎯 FORCED PROGRESSION ACTIVATED - Moving to domain analysis"
            )
            logger.debug(f"[Step 7.1.3]   Triggered reasons: {', '.join(reasons)}")
            logger.debug(f"[Step 7.1.3]   Target phase: domain_analysis")
            logger.debug(
                f"[Step 7.1.3]   Routing action: Return to orchestrator for phase change"
            )
            logger.debug(
                f"[Step 7.1.3]   Expected next: Orchestrator will set current_phase = 'domain_analysis'"
            )

            logger.info(
                f"  → FORCED move to domain analysis (attempts: {tool_execution_attempts}, tools: {len(tools_used)}, loops: {orchestrator_loops})"
            )
            logger.info(
                f"      🎯 CRITICAL: Routing back to orchestrator to change phase to 'domain_analysis'"
            )
            logger.debug(f"      Progression reasons: {', '.join(reasons)}")
            return route_with_logging(
                "orchestrator",
                f"Force progression to domain_analysis - {', '.join(reasons)}",
                {
                    "attempts": tool_execution_attempts,
                    "tools": len(tools_used),
                    "loops": orchestrator_loops,
                },
            )
        else:
            logger.info(
                f"  → Continuing tool execution (tools: {len(tools_used)}, attempts: {tool_execution_attempts})"
            )
            logger.debug(f"      Continuing in tool execution phase")
            return route_with_logging(
                "orchestrator",
                f"Continue tool execution - below thresholds",
                {
                    "attempts": tool_execution_attempts,
                    "tools": len(tools_used),
                    "loops": orchestrator_loops,
                },
            )

    elif current_phase == "domain_analysis":
        logger.debug(f"   🎯 DOMAIN ANALYSIS PHASE")
        logger.info(
            f"🎯 DOMAIN ANALYSIS PHASE ENTRY - Sequential domain agent execution"
        )

        domains_completed = state.get("domains_completed", [])
        logger.info(f"   Domains completed so far: {domains_completed}")
        logger.info(f"   Orchestrator loops: {orchestrator_loops}/{max_loops}")
        logger.debug(
            f"      Domain analysis phase active - executing domain agents sequentially"
        )

        # Step 5.1.1: Domain execution order
        domain_order = [
            "network",
            "device",
            "location",
            "logs",
            "authentication",
            "web",
            "merchant",
            "risk",
        ]
        logger.debug(f"[Step 5.1.1] 📋 Domain execution order defined: {domain_order}")
        logger.debug(
            f"[Step 5.1.1]   Sequential execution ensures proper data flow between domain agents"
        )

        # Step 5.1.2: Sequential domain execution - Routes to next incomplete domain in order
        next_domain = None
        logger.debug(
            f"[Step 5.1.2] 🔍 Scanning for next incomplete domain in sequential order:"
        )
        for i, domain in enumerate(domain_order):
            if domain not in domains_completed:
                next_domain = domain
                logger.debug(
                    f"[Step 5.1.2]   Domain {i+1}/{len(domain_order)}: {domain} - ⏳ PENDING (next to execute)"
                )
                logger.info(
                    f"  → [Step 5.1.2] Routing to {domain}_agent (sequential execution)"
                )
                logger.debug(
                    f"[Step 5.1.2] ✅ Selected {domain} as next domain agent to execute"
                )
                return f"{domain}_agent"
            else:
                logger.debug(
                    f"[Step 5.1.2]   Domain {i+1}/{len(domain_order)}: {domain} - ✅ COMPLETED"
                )

        # Allow sufficient loops for all 7 domain agents to execute sequentially (6 domain + risk)
        domain_threshold = (
            30 if is_test_mode else 35
        )  # INCREASED: Need sufficient loops for 7 agents (6 domain + risk)
        logger.debug(f"      Domain threshold for this mode: {domain_threshold}")
        logger.debug(f"      Predicted loops: {orchestrator_loops}")

        # All domains complete OR too many loops - force to summary
        total_domains = len(
            domain_order
        )  # Use all 7 agents: network, device, location, logs, authentication, merchant, risk
        should_summarize = (
            len(domains_completed) >= total_domains
            or orchestrator_loops >= domain_threshold
        )
        logger.debug(f"      Should move to summary: {should_summarize}")
        logger.debug(
            f"      Reasons: domains={len(domains_completed)}>={total_domains}, loops={orchestrator_loops}>={domain_threshold}"
        )

        if should_summarize:
            logger.info(
                f"  → FORCED move to summary (domains: {len(domains_completed)}, loops: {orchestrator_loops})"
            )
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

    # Step 7.1.3: Fallback forced progression mechanisms - CRITICAL FIX: Prevent infinite default loops
    logger.debug(
        f"[Step 7.1.3] ❓ FALLBACK ROUTING - Safety mechanisms for unhandled cases"
    )
    final_threshold = (
        40 if is_test_mode else 50
    )  # INCREASED: Allow risk agent execution in sequence
    logger.debug(
        f"[Step 7.1.3]   Environment mode: {'TEST' if is_test_mode else 'LIVE'}"
    )
    logger.debug(
        f"[Step 7.1.3]   Final loop threshold: {final_threshold} ({'TEST: 40' if is_test_mode else 'LIVE: 50'})"
    )
    logger.debug(f"[Step 7.1.3]   Current predicted loops: {orchestrator_loops}")
    logger.debug(
        f"[Step 7.1.3]   Final threshold exceeded: {orchestrator_loops >= final_threshold}"
    )

    if orchestrator_loops >= final_threshold:
        logger.debug(f"[Step 7.1.3] 🚨 FINAL THRESHOLD EXCEEDED - Emergency completion")
        logger.debug(
            f"[Step 7.1.3]   Condition: {orchestrator_loops} >= {final_threshold}"
        )
        logger.debug(f"[Step 7.1.3]   Safety action: Direct routing to 'summary'")
        logger.debug(f"[Step 7.1.3]   Termination type: Emergency loop prevention")
        logger.warning(
            f"  → Too many orchestrator loops ({orchestrator_loops}), forcing summary (mode: {'TEST' if is_test_mode else 'LIVE'})"
        )
        logger.debug("      Exceeded final threshold, forcing completion")
        return "summary"

    # SAFER DEFAULT: Force progression more aggressively to prevent infinite loops
    logger.debug(
        f"[Step 7.1.3] 🛡️ AGGRESSIVE SAFETY MECHANISMS - Multi-tier fallback system"
    )
    logger.debug(
        f"[Step 7.1.3]   Snowflake status: {'Completed' if snowflake_completed else 'Incomplete'}"
    )
    logger.debug(f"[Step 7.1.3]   Tools used count: {len(tools_used)}")
    logger.debug(f"[Step 7.1.3]   Predicted loops: {orchestrator_loops}")
    logger.debug(f"[Step 7.1.3]   Evaluating aggressive termination conditions:")

    logger.info("  → Default: FORCING progression to prevent loops")
    logger.debug(f"      Fallback routing logic (aggressive):")
    logger.debug(f"         Snowflake completed: {snowflake_completed}")
    logger.debug(f"         Tools used: {len(tools_used)}")
    logger.debug(f"         Predicted loops: {orchestrator_loops}")

    # CRITICAL FIX: Allow sufficient loops for domain agents to execute
    # Need at least 20 loops in test mode to complete: Snowflake (5) + Tool execution (5) + Domain agents (12) = 22 loops minimum
    max_orchestrator_loops = (
        23 if is_test_mode else 32
    )  # INCREASED: Allow full domain agent execution

    if (
        orchestrator_loops >= max_orchestrator_loops
    ):  # Allow more loops for domain agents
        logger.debug(
            f"[Step 7.1.3]   Tier 1 Safety: {orchestrator_loops} >= {max_orchestrator_loops} loops - CONTROLLED TERMINATION"
        )
        logger.warning(
            f"      → CONTROLLED TERMINATION: {orchestrator_loops} loops, forcing summary"
        )
        return "summary"
    elif not snowflake_completed and orchestrator_loops >= (6 if is_test_mode else 3):
        logger.debug(
            f"[Step 7.1.3]   Tier 2 Safety: Snowflake incomplete + {orchestrator_loops} >= {'6' if is_test_mode else '3'} loops"
        )
        logger.warning(
            f"      → FORCED Snowflake completion after {orchestrator_loops} loops"
        )
        return "summary"  # Force completion if Snowflake still not done
    elif len(tools_used) < 3 and orchestrator_loops >= (8 if is_test_mode else 5):
        logger.debug(
            f"[Step 7.1.3]   Tier 3 Safety: Tools < 3 + {orchestrator_loops} >= {'8' if is_test_mode else '5'} loops"
        )
        logger.warning(
            f"      → FORCED tool completion after {orchestrator_loops} loops"
        )
        return "summary"  # Force completion if tools still not used
    elif len(state.get("domains_completed", [])) == 0 and orchestrator_loops >= (
        12 if is_test_mode else 6
    ):
        logger.debug(
            f"[Step 7.1.3]   Tier 4 Safety: No domains completed + {orchestrator_loops} >= {'12' if is_test_mode else '6'} loops"
        )
        logger.warning(
            f"      → FORCED domain completion after {orchestrator_loops} loops"
        )
        return "summary"  # Force completion if no domains completed
    else:
        # Only force summary if we've really exceeded reasonable limits
        logger.debug(
            f"[Step 7.1.3]   Normal operation: Continue processing (loops: {orchestrator_loops}/{max_orchestrator_loops})"
        )
        # Allow orchestrator to continue normal phase progression
        return "orchestrator"


def build_clean_investigation_graph(
    investigation_id: Optional[str] = None,
) -> StateGraph:
    """
    Build the complete clean investigation graph.

    Args:
        investigation_id: Optional investigation ID for tool execution persistence

    Returns:
        Compiled StateGraph ready for execution
    """
    logger.info("🏗️ Building clean investigation graph")

    # Create the graph with our state schema
    logger.debug("[Step 1.2.1] StateGraph creation with InvestigationState schema")
    builder = StateGraph(InvestigationState)
    logger.debug("[Step 1.2.1] StateGraph(InvestigationState) created successfully")

    # Get all tools for the graph
    logger.debug(
        "[Step 1.2.2] Tool loading via get_all_tools() - Starting tool collection"
    )
    tools = get_all_tools()
    logger.debug(
        f"[Step 1.2.2] get_all_tools() returned {len(tools)} tools from registry"
    )

    # Create tool executor node with tool execution persistence
    logger.debug("[Step 1.2.2] Creating EnhancedToolNode with collected tools")

    # Create the EnhancedToolNode with persistence
    try:
        base_tool_executor = EnhancedToolNode(tools, investigation_id=investigation_id)
        logger.info(
            f"✅ Created EnhancedToolNode with {len(tools)} tools and investigation_id={investigation_id}"
        )
        logger.debug(
            f"[Step 1.2.2] EnhancedToolNode created successfully with {len(tools)} tools and persistence enabled"
        )
    except Exception as e:
        logger.warning(
            f"Failed to create EnhancedToolNode: {e}, falling back to standard ToolNode"
        )
        base_tool_executor = ToolNode(tools)
        logger.debug(
            f"[Step 1.2.2] Fallback to standard ToolNode created successfully with {len(tools)} tools"
        )

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
                logger.debug(
                    f"[Step 4.2.1]   Tools to execute: {len(last_message.tool_calls)}"
                )

                # Log each tool call details
                for i, tool_call in enumerate(last_message.tool_calls):
                    if isinstance(tool_call, dict):
                        tool_name = tool_call.get("name", "unknown")
                        tool_id = tool_call.get("id", "no-id")
                        tool_args = tool_call.get("args", {})
                        logger.debug(f"[Step 4.2.1]   Tool {i+1}: {tool_name}")
                        logger.debug(f"[Step 4.2.1]     ID: {tool_id}")
                        logger.debug(
                            f"[Step 4.2.1]     Args: {list(tool_args.keys()) if isinstance(tool_args, dict) else 'non-dict'}"
                        )
                        logger.debug(
                            f"[Step 4.2.1]     Args preview: {str(tool_args)[:100] if tool_args else 'no-args'}..."
                        )
                    else:
                        logger.debug(
                            f"[Step 4.2.1]   Tool {i+1}: unknown format ({type(tool_call)})"
                        )

                logger.debug(
                    f"[Step 4.2.1]   Available tools in registry: {len(tools)}"
                )
                logger.debug(
                    f"[Step 4.2.1]   Tool registry preview: {[tool.name for tool in tools[:5]]}"
                    + ("..." if len(tools) > 5 else "")
                )
                logger.debug(
                    f"[Step 4.2.1]   ⚡ Executing tools via LangGraph ToolNode..."
                )

                # Execute the actual ToolNode
                result = await base_tool_executor.ainvoke(state)

                logger.debug(f"[Step 4.2.1]   ✅ Tool execution completed")
                logger.debug(f"[Step 4.2.1]   Result type: {type(result)}")
                logger.debug(
                    f"[Step 4.2.1]   Result keys: {list(result.keys()) if isinstance(result, dict) else 'not-dict'}"
                )

                # Check for new messages (ToolMessages)
                if isinstance(result, dict) and "messages" in result:
                    new_messages = result["messages"]
                    tool_messages = [
                        msg
                        for msg in new_messages
                        if msg.__class__.__name__ == "ToolMessage"
                    ]
                    logger.debug(
                        f"[Step 4.2.1]   New messages generated: {len(new_messages)}"
                    )
                    logger.debug(
                        f"[Step 4.2.1]   ToolMessages generated: {len(tool_messages)}"
                    )

                    for i, tool_msg in enumerate(tool_messages):
                        if hasattr(tool_msg, "name"):
                            content_preview = (
                                str(tool_msg.content)[:100]
                                if hasattr(tool_msg, "content")
                                else "no-content"
                            )
                            logger.debug(
                                f"[Step 4.2.1]     ToolMessage {i+1}: {tool_msg.name}"
                            )
                            logger.debug(
                                f"[Step 4.2.1]     Content preview: {content_preview}..."
                            )

                logger.debug(
                    f"[Step 4.2.1]   🎯 Next: Tool results will be processed by process_tool_results node"
                )
                return result
            else:
                logger.debug(
                    f"[Step 4.2.1]   ❌ No tool calls found in last message - this shouldn't happen"
                )
                return await base_tool_executor.ainvoke(state)
        else:
            logger.debug(
                f"[Step 4.2.1]   ❌ No messages in state - this shouldn't happen"
            )
            return await base_tool_executor.ainvoke(state)

    # Use the wrapper instead of direct ToolNode
    tool_executor = tool_executor_with_logging
    logger.debug(
        f"[Step 1.2.2] ToolNode wrapper created successfully with {len(tools)} tools"
    )
    logger.info(
        f"✅ Created ToolNode with Step 4.2.1 logging wrapper ({len(tools)} tools)"
    )

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
    logger.debug(
        "[Step 1.2.3] Added 'authentication_agent' → authentication_agent_node"
    )
    builder.add_node("web_agent", web_agent_node)
    logger.debug("[Step 1.2.3] Added 'web_agent' → web_agent_node")
    builder.add_node("merchant_agent", merchant_agent_node)
    logger.debug("[Step 1.2.3] Added 'merchant_agent' → merchant_agent_node")
    builder.add_node("risk_agent", risk_agent_node)
    logger.debug("[Step 1.2.3] Added 'risk_agent' → risk_agent_node")
    # Add Remediation Agent - runs after risk assessment to label entities
    from app.service.agent.orchestration.remediation_agent import remediation_agent_node

    builder.add_node("remediation_agent", remediation_agent_node)
    logger.debug("[Step 1.2.3] Added 'remediation_agent' → remediation_agent_node")
    builder.add_node("summary", summary_node)
    logger.debug("[Step 1.2.3] Added 'summary' → summary_node")
    logger.debug(
        "[Step 1.2.3] All 13 nodes registered successfully (including web_agent and remediation_agent)"
    )

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
    logger.debug(
        "[Step 1.3.3] Orchestrator conditional routing - Setting up routing destinations"
    )
    routing_destinations = {
        "orchestrator": "orchestrator",  # Loop back to self
        "tools": "tools",
        "network_agent": "network_agent",
        "device_agent": "device_agent",
        "location_agent": "location_agent",
        "logs_agent": "logs_agent",
        "authentication_agent": "authentication_agent",
        "web_agent": "web_agent",
        "merchant_agent": "merchant_agent",  # CRITICAL FIX: Add merchant_agent to routing destinations
        "risk_agent": "risk_agent",
        "remediation_agent": "remediation_agent",  # CRITICAL: Add remediation_agent to routing destinations
        "summary": "summary",
        END: END,
    }
    logger.debug(
        f"[Step 1.3.3] Routing destinations configured: {list(routing_destinations.keys())}"
    )
    builder.add_conditional_edges(
        "orchestrator", route_from_orchestrator, routing_destinations
    )
    logger.debug(
        "[Step 1.3.3] Conditional edges added for orchestrator with 12 routing destinations (including merchant_agent and remediation_agent)"
    )

    # Tools go to processor, then back to orchestrator
    logger.debug(
        "[Step 1.3.4] Tool processing flow: 'tools' → 'process_tools' → 'orchestrator'"
    )
    builder.add_edge("tools", "process_tools")
    logger.debug("[Step 1.3.4] Edge added: 'tools' → 'process_tools'")
    builder.add_edge("process_tools", "orchestrator")
    logger.debug("[Step 1.3.4] Edge added: 'process_tools' → 'orchestrator'")

    # All agents return to orchestrator (except risk_agent and remediation_agent)
    # risk_agent → remediation_agent → summary (ensures entity labeling when risk >= 0.3)
    agents = [
        "network_agent",
        "device_agent",
        "location_agent",
        "logs_agent",
        "authentication_agent",
        "web_agent",
        "merchant_agent",
    ]  # Exclude risk_agent - it goes to remediation_agent
    logger.debug(
        f"[Step 1.3.5] Agent return flow: {len(agents)} agents → 'orchestrator'"
    )
    for agent in agents:
        builder.add_edge(agent, "orchestrator")
        logger.debug(f"[Step 1.3.5] Edge added: '{agent}' → 'orchestrator'")

    # CRITICAL: risk_agent flows to remediation_agent first, then to summary
    # This ensures entities are labeled when risk >= 0.3
    logger.debug(
        "[Step 1.3.5.1] Remediation flow: 'risk_agent' → 'remediation_agent' → 'summary'"
    )
    builder.add_edge("risk_agent", "remediation_agent")
    logger.debug("[Step 1.3.5.1] Edge added: 'risk_agent' → 'remediation_agent'")
    builder.add_edge("remediation_agent", "summary")
    logger.debug("[Step 1.3.5.1] Edge added: 'remediation_agent' → 'summary'")

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
    entity_type: str = "ip",
    investigation_id: str = None,
    custom_user_prompt: Optional[str] = None,
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
    import asyncio
    from uuid import uuid4

    if not investigation_id:
        investigation_id = str(uuid4())

    logger.info(
        f"🚀 Starting investigation {investigation_id} for {entity_type}: {entity_id}"
    )

    # Create initial state
    initial_state = create_initial_state(
        investigation_id=investigation_id,
        entity_id=entity_id,
        entity_type=entity_type,
        parallel_execution=True,
        max_tools=52,
        custom_user_prompt=custom_user_prompt,
    )

    logger.info("📊 Initial state created")

    # Build the graph with investigation_id for tool execution persistence
    graph = build_clean_investigation_graph(investigation_id=investigation_id)

    logger.info(
        "🏗️ Graph built with tool execution persistence enabled, starting execution"
    )

    # Step 8.2.1: Investigation timeouts - TEST: 60 seconds, LIVE: 180 seconds
    # Check if we're in TEST_MODE or live environment
    is_test_mode = os.environ.get("TEST_MODE") == "demo"

    # CRITICAL FIX: Set recursion limits well above orchestrator limits (45/55) to prevent premature termination
    recursion_limit = (
        70 if is_test_mode else 90
    )  # Allow sufficient loops for orchestrator (45/55) + domain agents
    timeout = 60.0 if is_test_mode else 180.0  # Reasonable timeouts: 1-3 minutes max

    logger.debug(
        f"[Step 8.2.1] ⏱️ TIMEOUT MANAGEMENT - Investigation timeout configuration"
    )
    logger.debug(
        f"[Step 8.2.1]   Environment mode: {'TEST' if is_test_mode else 'LIVE'}"
    )
    logger.debug(
        f"[Step 8.2.1]   Investigation timeout: {timeout}s ({'TEST: 60s' if is_test_mode else 'LIVE: 180s'})"
    )
    logger.debug(
        f"[Step 8.2.1]   Recursion limit: {recursion_limit} ({'TEST: 70' if is_test_mode else 'LIVE: 90'})"
    )
    logger.debug(
        f"[Step 8.2.1]   Timeout rationale: {'Quick tests need short timeouts' if is_test_mode else 'Complex investigations need longer timeouts'}"
    )
    logger.debug(
        f"[Step 8.2.1]   Deadlock detection: Will warn at {timeout * 0.8}s (80% of timeout)"
    )

    logger.info(f"⚙️ Graph execution configuration:")
    logger.info(f"   Recursion limit: {recursion_limit}")
    logger.info(f"   Timeout: {timeout}s")
    logger.info(f"   Mode: {'TEST' if is_test_mode else 'LIVE'}")

    # Add a deadlock detection mechanism
    start_time = asyncio.get_event_loop().time()
    deadlock_threshold = timeout * 0.8  # Warn at 80% of timeout

    logger.debug(f"[Step 8.2.1] 🚨 DEADLOCK DETECTION - Monitoring system activated")
    logger.debug(f"[Step 8.2.1]   Start time: {start_time}")
    logger.debug(f"[Step 8.2.1]   Deadlock warning threshold: {deadlock_threshold}s")
    logger.debug(f"[Step 8.2.1]   Maximum execution time: {timeout}s")

    try:
        # Create a task for the graph execution
        graph_task = asyncio.create_task(
            graph.ainvoke(
                initial_state,
                config={"recursion_limit": recursion_limit},  # Adjusted based on mode
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
                    logger.warning(
                        f"⚠️ Potential deadlock detected: {elapsed:.1f}s elapsed (threshold: {deadlock_threshold:.1f}s)"
                    )
                    logger.warning(f"   Investigation: {investigation_id}")
                    logger.warning(
                        f"   This may indicate an infinite loop in the orchestrator"
                    )

                if elapsed >= timeout:
                    # Cancel the task and raise timeout
                    graph_task.cancel()
                    raise asyncio.TimeoutError()

                # Continue monitoring
                continue

        logger.info(
            f"✅ Investigation complete - Risk: {result.get('risk_score', 0.0):.2f}"
        )

        return {
            "success": True,
            "investigation_id": investigation_id,
            "risk_score": result.get("risk_score", 0.0),
            "confidence": result.get("confidence_score", 0.0),
            "tools_used": len(result.get("tools_used", [])),
            "domains_analyzed": result.get("domains_completed", []),
            "duration_ms": result.get("total_duration_ms", 0),
            "state": result,
        }

    except asyncio.TimeoutError:
        logger.error(
            f"❌ Investigation timed out after {timeout} seconds (mode: {'TEST' if is_test_mode else 'LIVE'})"
        )

        return {
            "success": False,
            "investigation_id": investigation_id,
            "error": "Investigation timed out",
            "risk_score": 0.5,  # Default medium risk on error
            "confidence": 0.0,
        }
    except Exception as e:
        logger.error(f"❌ Investigation failed: {str(e)}")

        return {
            "success": False,
            "investigation_id": investigation_id,
            "error": str(e),
            "risk_score": 0.5,  # Default medium risk on error
            "confidence": 0.0,
        }
