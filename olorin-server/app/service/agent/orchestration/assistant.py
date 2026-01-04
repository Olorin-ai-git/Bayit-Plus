"""
Assistant - Main LLM coordinator for fraud investigations.

This module handles the primary LLM coordination for fraud investigation workflows,
including tool invocation and message processing.
"""

import asyncio
from typing import Annotated, List

from langchain_core.messages import BaseMessage, SystemMessage
from langchain_core.runnables.config import RunnableConfig
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict

from app.service.logging import get_bridge_logger


# Define MessagesState since it's not available in langchain_core.messages
class MessagesState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]


from app.service.agent.core import get_config_value, rehydrate_agent_context
from app.service.agent.orchestration.llm_resilience import (
    LLMInvocationError,
    invoke_llm_with_resilience,
)

logger = get_bridge_logger(__name__)


def _create_investigation_context_message(state: MessagesState) -> SystemMessage:
    """
    Create investigation-context-aware system message.

    This function extracts investigation context (entity_id, entity_type, time_range, table_name)
    from the state and creates a system message that tells the LLM EXACTLY what to query.

    This solves the critical bug where LLM was making schema discovery queries instead
    of querying actual transaction data filtered by entity_id.
    """
    from app.service.config_loader import get_config_loader

    # Extract investigation context from state
    entity_id = state.get("entity_id", "UNKNOWN")
    entity_type = state.get("entity_type", "UNKNOWN")
    investigation_id = state.get("investigation_id", "UNKNOWN")

    # Get time range from state - CRITICAL FIX: Handle None values
    time_range = state.get("time_range") or {}
    if not isinstance(time_range, dict):
        time_range = {}
    start_time = time_range.get("start_time", "UNKNOWN") if time_range else "UNKNOWN"
    end_time = time_range.get("end_time", "UNKNOWN") if time_range else "UNKNOWN"

    # Get transactions table name and query limit from configuration
    try:
        config_loader = get_config_loader()
        db_config = config_loader.load_database_provider_config()
        database_provider = db_config.get("provider", "snowflake")

        # Use database provider's get_full_table_name() method
        from app.service.agent.tools.database_tool.database_factory import (
            get_database_provider,
        )

        db_provider_instance = get_database_provider()
        table_reference = db_provider_instance.get_full_table_name()

        if database_provider == "postgresql":
            pg_config = db_config.get("postgresql", {})
            max_transactions = pg_config.get("max_transactions_limit", 1000)
        elif database_provider == "snowflake":
            sf_config = db_config.get("snowflake", {})
            max_transactions = sf_config.get("max_transactions_limit", 1000)
        else:
            max_transactions = 1000
    except Exception as e:
        logger.warning(
            f"Failed to load table configuration: {e}, using database provider defaults"
        )
        # Fallback: use database provider's get_full_table_name()
        try:
            from app.service.agent.tools.database_tool.database_factory import (
                get_database_provider,
            )

            db_provider_instance = get_database_provider()
            table_reference = db_provider_instance.get_full_table_name()
            database_provider = os.getenv("DATABASE_PROVIDER", "snowflake").lower()
        except Exception as fallback_error:
            logger.error(f"Failed to get database provider: {fallback_error}")
            # Last resort: use environment variables directly
            db_provider_name = os.getenv("DATABASE_PROVIDER", "snowflake").lower()
            if db_provider_name == "snowflake":
                database = os.getenv("SNOWFLAKE_DATABASE", "DBT")
                schema = os.getenv("SNOWFLAKE_SCHEMA", "DBT_PROD")
                table = os.getenv("SNOWFLAKE_TRANSACTIONS_TABLE", "TXS")
                table_reference = f"{database}.{schema}.{table}"
            else:
                schema = os.getenv("POSTGRES_SCHEMA", "public")
                table = os.getenv(
                    "POSTGRES_TRANSACTIONS_TABLE", "transactions_enriched"
                )
                table_reference = f"{schema}.{table}"
            database_provider = db_provider_name
        max_transactions = 1000

    # Map entity_type to database column name (case-sensitive based on provider)
    # This mapping must match investigation_nodes.py for consistency
    if database_provider == "snowflake":
        # Snowflake: uppercase column names
        entity_column_map = {
            "ip": "IP",
            "email": "EMAIL",
            "device": "DEVICE_ID",
            "device_id": "DEVICE_ID",
            "phone": "PHONE_NUMBER",
            "user_id": "UNIQUE_USER_ID",
            "merchant": "MERCHANT_NAME",
            "merchant_name": "MERCHANT_NAME",
        }
        datetime_column = "TX_DATETIME"
    else:
        # PostgreSQL: lowercase column names
        entity_column_map = {
            "ip": "ip",
            "email": "email",
            "device": "device_id",
            "device_id": "device_id",
            "phone": "phone_number",
            "user_id": "unique_user_id",
            "merchant": "merchant_name",
            "merchant_name": "merchant_name",
        }
        datetime_column = "tx_datetime"

    entity_column = entity_column_map.get(
        entity_type,
        entity_type.upper() if database_provider == "snowflake" else entity_type,
    )

    # Create context-aware system message
    return SystemMessage(
        content=f"""
        You are a fraud investigation assistant conducting investigation {investigation_id}.

        INVESTIGATION CONTEXT:
        - Entity Type: {entity_type}
        - Entity ID: {entity_id}
        - Time Range: {start_time} to {end_time}
        - Database Table: {table_reference}
        - Entity Column: {entity_column}
        - Database Provider: {database_provider}

        CRITICAL INSTRUCTIONS - YOU MUST FOLLOW THESE EXACTLY:

        1. IMMEDIATELY call the database_query tool with this EXACT query pattern:
           SELECT TX_ID_KEY, EMAIL, IP, PAID_AMOUNT_VALUE_IN_CURRENCY, TX_DATETIME, 
                  PAYMENT_METHOD, CARD_BRAND, DEVICE_ID, USER_AGENT, IP_COUNTRY_CODE,
                  NSURE_LAST_DECISION, MAXMIND_RISK_SCORE, FIRST_NAME, LAST_NAME,
                  DEVICE_TYPE, ASN, ISP, BIN, LAST_FOUR, CARD_ISSUER
           FROM {table_reference}
           WHERE {entity_column} = '{entity_id}'
           AND {datetime_column} BETWEEN '{start_time}' AND '{end_time}'
           ORDER BY {datetime_column} DESC
           LIMIT {max_transactions}
           -- CRITICAL: IS_FRAUD_TX and MODEL_SCORE are EXCLUDED to prevent data leakage

        2. DO NOT query information_schema or make schema discovery queries
        3. DO NOT ask what columns exist - the table schema is already known
        4. QUERY THE TRANSACTION DATA IMMEDIATELY using the entity ID provided above

        5. After retrieving transactions, you may use other tools:
           - threat_intelligence tools for IP reputation
           - network analysis tools
           - Additional database queries for related entities

        MANDATORY: Your FIRST tool call MUST be database_query to retrieve transactions for {entity_type} = {entity_id}.

        Failure to query transaction data will result in incomplete investigation with incorrect risk assessment.
        """
    )


# Default system message (fallback when investigation context not available)
SYSTEM_MESSAGE = SystemMessage(
    content="""
    You are a fraud investigation assistant. You MUST use the available tools to gather data and evidence.

    CRITICAL: Do NOT provide analysis without first calling tools to gather real data.
    You have access to multiple investigation tools including database_query (works with Snowflake and PostgreSQL), threat intelligence, network analysis, and more.

    MANDATORY TOOL USAGE:
    1. You MUST call the database_query tool FIRST to retrieve transaction data
    2. The database_query tool is the PRIMARY tool - use it immediately
    3. Do NOT provide text responses without calling tools
    4. Tool execution is MANDATORY - investigations without tool calls are incomplete

    Always use tools to gather evidence before providing your analysis. Tool execution is mandatory for a complete investigation.
    """
)


async def assistant(state: MessagesState, config: RunnableConfig):
    """
    Main assistant function for fraud investigation coordination.

    Handles LLM invocation with tools and progress reporting.
    Uses resilient LLM wrapper with timeout and retry logic.
    """
    # Safely extract agent context and header
    agent_context = get_config_value(config, ["configurable", "agent_context"])
    if agent_context and hasattr(agent_context, "get_header"):
        olorin_header = agent_context.get_header()
    else:
        # For hybrid graphs or when agent_context is not available, use empty header
        logger.debug(
            "No agent_context available or missing get_header method, using empty header"
        )
        olorin_header = {}

    # Reduce verbosity - don't log full state with large result sets
    logger.debug(
        f"LangGraph State: investigation_id={state.get('investigation_id', 'N/A')}, messages={len(state.get('messages', []))}, phase={state.get('current_phase', 'N/A')}"
    )

    # Extract investigation_id for progress reporting (reuse agent_context from above)
    investigation_id = None
    if agent_context:
        agent_context = rehydrate_agent_context(agent_context)
        md = getattr(agent_context.metadata, "additional_metadata", {}) or {}
        investigation_id = md.get("investigationId") or md.get("investigation_id")

        # WebSocket progress updates removed per spec 005 - using polling instead

    # Prepare messages
    messages = []
    messages_from_checkpoint = state["messages"]
    messages.extend(messages_from_checkpoint)

    # Get LLM with tools
    llm_with_tools = _get_llm_with_tools()

    # B3: Validate payload before LLM invocation
    # Skip LLM with clear cause on empty/ill-formed payload
    validation_error = _validate_llm_payload(messages, investigation_id)
    if validation_error:
        logger.warning(f"⚠️ Skipping LLM invocation: {validation_error}")

        # Return error message to preserve graph flow
        from langchain_core.messages import AIMessage

        error_response = AIMessage(
            content=f"Investigation analysis skipped: {validation_error}"
        )

        return {"messages": [error_response]}

    # Check if we need to force tool usage (retry scenario)
    force_tool_usage = state.get("force_tool_usage", False)
    retry_count = state.get("fraud_investigation_retry_count", 0)

    # Check if composio tools should be forced
    entity_id = state.get("entity_id", "")
    entity_type = state.get("entity_type", "")
    tools_used = state.get("tools_used", [])
    orchestrator_loops = state.get("orchestrator_loops", 0)
    # Force composio tools after 1+ loops if not already used and we have an entity
    force_composio = (
        orchestrator_loops >= 1
        and "composio_search" not in tools_used
        and entity_id
        and len(tools_used) > 0
    )

    # Check if there's already a system message to avoid duplicates
    # This is important for hybrid graphs that may have already processed system messages
    has_system_message = any(isinstance(msg, SystemMessage) for msg in messages)

    # CRITICAL FIX: Use investigation-context-aware system message
    # This tells LLM EXACTLY what entity to query (IP, email, device, etc.)
    # instead of making generic schema discovery queries
    if force_tool_usage and retry_count > 0:
        # RETRY SCENARIO: LLM failed to call tools - use enhanced forceful message
        entity_id = state.get("entity_id", "UNKNOWN")
        entity_type = state.get("entity_type", "UNKNOWN")

        enhanced_system_message = SystemMessage(
            content=f"""
            You are a fraud investigation assistant. You MUST use the available tools to gather data and evidence.

            ⚠️ CRITICAL REMINDER (Attempt {retry_count + 1}): You have NOT called any tools yet. This is MANDATORY.

            INVESTIGATION CONTEXT:
            - Entity Type: {entity_type}
            - Entity ID: {entity_id}

            MANDATORY TOOL USAGE - YOU MUST CALL TOOLS NOW:
            1. You MUST call the database_query tool FIRST - this is the PRIMARY tool
            2. Query transactions for {entity_type} = {entity_id}
            3. Use SQL SELECT queries to retrieve transaction data from the transactions table
            4. Do NOT provide text responses - you MUST call tools
            5. Tool execution is MANDATORY - investigations without tool calls are INCOMPLETE

            FAILURE TO CALL TOOLS WILL RESULT IN AN INCOMPLETE INVESTIGATION.
            You have access to database_query, threat intelligence, network analysis, and more tools.

            CALL THE DATABASE_QUERY TOOL NOW.
            """
        )
        final_messages = [enhanced_system_message] + [
            m for m in messages if not isinstance(m, SystemMessage)
        ]
        logger.warning(
            f"⚠️ Enhanced retry message added (attempt {retry_count + 1}) for {entity_type}={entity_id}"
        )
    elif force_composio:
        # FORCE COMPOSIO TOOLS: After 2+ orchestrator loops, force web intelligence gathering
        composio_system_message = SystemMessage(
            content=f"""
            You are a fraud investigation assistant. You MUST use the available tools to gather data and evidence.

            ⚠️ MANDATORY WEB INTELLIGENCE GATHERING:
            You MUST call composio_search tool NOW to gather web intelligence about the entity.
            - Entity Type: {entity_type}
            - Entity ID: {entity_id}
            - Search Query: "{entity_id} fraud" OR "{entity_id} reputation" OR "{entity_type} {entity_id} threat intelligence"
            
            This is CRITICAL for comprehensive fraud detection. Web intelligence provides OSINT data that complements
            internal transaction analysis. You MUST call composio_search before proceeding.
            
            After calling composio_search, you may also call composio_webcrawl if you find suspicious URLs or websites
            related to the entity that need deeper investigation.
            
            You have access to multiple investigation tools including composio_search, composio_webcrawl, database_query,
            threat intelligence, network analysis, and more.
            
            CALL COMPOSIO_SEARCH TOOL NOW.
            """
        )
        final_messages = [composio_system_message] + [
            m for m in messages if not isinstance(m, SystemMessage)
        ]
        logger.warning(
            f"⚠️ MANDATORY WEB INTELLIGENCE: Forcing composio_search for {entity_type}={entity_id} (loop {orchestrator_loops})"
        )
    else:
        # NORMAL SCENARIO: Use investigation-context-aware message with exact query guidance
        context_message = _create_investigation_context_message(state)
        logger.info(
            f"✅ Created investigation-context-aware system message for {state.get('entity_type')}={state.get('entity_id')}"
        )

        if has_system_message:
            # Replace existing system message with context-aware one
            final_messages = [context_message] + [
                m for m in messages if not isinstance(m, SystemMessage)
            ]
            logger.debug(
                "Replaced existing system message with investigation-context-aware message"
            )
        else:
            # Add context-aware system message (no existing message)
            final_messages = [context_message] + messages
            logger.debug("Added investigation-context-aware system message")

    # Invoke LLM with resilience wrapper (timeout + retry)
    try:
        response = await invoke_llm_with_resilience(
            llm_with_tools=llm_with_tools,
            messages=final_messages,
            config=config,
            extra_headers=olorin_header,
            investigation_id=investigation_id,
        )

        return {"messages": [response]}
    except LLMInvocationError as e:
        # LLM invocation failed after all retries
        logger.error(f"❌ LLM invocation failed permanently: {str(e)}")

        # Return error message to preserve graph flow
        from langchain_core.messages import AIMessage

        error_response = AIMessage(
            content=f"Investigation analysis unavailable due to LLM error: {str(e)}. Please try again."
        )

        return {"messages": [error_response]}


def _validate_llm_payload(messages: list, investigation_id: str = None) -> str:
    """
    Validate LLM payload before invocation (B3 requirement).

    Checks for empty or ill-formed message payloads and returns
    clear error messages for skipping LLM invocation.

    Args:
        messages: List of messages to validate
        investigation_id: Investigation ID for logging context

    Returns:
        Error message if validation fails, None if payload is valid
    """
    log_prefix = f"[Investigation={investigation_id}]" if investigation_id else ""

    # Check if messages list is empty
    if not messages:
        logger.warning(f"{log_prefix} Empty messages list - no content to process")
        return "No messages provided for analysis"

    # Check if all messages are empty or have no content
    non_empty_messages = []
    for i, msg in enumerate(messages):
        # Check if message has content attribute
        if not hasattr(msg, "content"):
            logger.warning(f"{log_prefix} Message {i} has no content attribute")
            continue

        # Check if content is not empty
        content = msg.content
        if content and str(content).strip():
            non_empty_messages.append(msg)

    if not non_empty_messages:
        logger.warning(
            f"{log_prefix} All {len(messages)} messages are empty - no content to analyze"
        )
        return f"All {len(messages)} messages are empty - no investigation content to analyze"

    # Check if messages are malformed (missing required attributes)
    malformed_count = 0
    for i, msg in enumerate(messages):
        # Check for required attributes based on message type
        if not hasattr(msg, "type"):
            logger.warning(f"{log_prefix} Message {i} missing 'type' attribute")
            malformed_count += 1
        elif not hasattr(msg, "content"):
            logger.warning(f"{log_prefix} Message {i} missing 'content' attribute")
            malformed_count += 1

    if malformed_count == len(messages):
        logger.warning(f"{log_prefix} All {len(messages)} messages are malformed")
        return (
            f"All {len(messages)} messages are malformed - cannot process investigation"
        )

    # Check for excessive empty content (more than 80% empty)
    empty_ratio = (len(messages) - len(non_empty_messages)) / len(messages)
    if empty_ratio > 0.8:
        logger.warning(
            f"{log_prefix} {empty_ratio * 100:.0f}% of messages are empty "
            f"({len(messages) - len(non_empty_messages)}/{len(messages)})"
        )
        return (
            f"Insufficient content: {len(non_empty_messages)}/{len(messages)} messages have content "
            f"(threshold: 20% minimum)"
        )

    # Validation passed
    logger.debug(
        f"{log_prefix} Payload validation passed: "
        f"{len(non_empty_messages)}/{len(messages)} messages with content"
    )
    return None


def _get_llm_with_tools():
    """Get configured LLM with tools for graph-based tool execution."""
    from app.service.llm_manager import get_llm_manager

    # Use the LLM manager which respects SELECTED_MODEL and USE_FIREBASE_SECRETS settings
    llm_manager = get_llm_manager()
    llm = llm_manager.get_selected_model()

    # Get tools from the graph configuration - these are already configured
    from app.service.agent.orchestration.graph_builder import _get_configured_tools

    tools = _get_configured_tools()

    # Bind tools to LLM for graph-based execution
    # The graph's tools node will handle actual tool execution
    try:
        return llm.bind_tools(tools)
    except Exception as e:
        logger.error(f"Failed to bind tools to LLM: {str(e)}")
        # Filter to working tools
        from app.service.agent.orchestration.graph_builder import _filter_working_tools

        working_tools = _filter_working_tools(tools)
        return llm.bind_tools(working_tools) if working_tools else llm
