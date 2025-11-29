"""
Investigation Nodes - Start investigation and raw data processing nodes.

This module contains the enhanced investigation nodes that handle
investigation initialization and raw data processing with hybrid intelligence tracking.
"""

from datetime import datetime
from typing import Any, Dict, Optional

from app.service.agent.nodes.raw_data_node import raw_data_node
from app.service.agent.orchestration.investigation_coordinator import (
    start_investigation,
)
from app.service.logging import get_bridge_logger

from ...hybrid_state_schema import HybridInvestigationState

logger = get_bridge_logger(__name__)


class InvestigationNodes:
    """
    Enhanced investigation nodes with hybrid intelligence tracking.

    Handles investigation start and raw data processing with enhanced state management.
    """

    def __init__(self, components: Dict[str, Any]):
        """Initialize with graph foundation components."""
        self.components = components
        self.intelligence_mode = components.get("intelligence_mode", "adaptive")

    async def enhanced_start_investigation(
        self, state: HybridInvestigationState, config: Optional[Dict] = None
    ) -> HybridInvestigationState:
        """Enhanced start investigation with hybrid intelligence tracking"""

        logger.debug(f"🚀 Starting Hybrid Intelligence Graph investigation")
        logger.debug(f"   Investigation ID: {state.get('investigation_id')}")
        logger.debug(
            f"   Entity: {state.get('entity_type')} - {state.get('entity_id')}"
        )
        logger.debug(f"   Intelligence mode: {self.intelligence_mode}")
        logger.debug(
            f"   System: Hybrid Intelligence v{state.get('hybrid_system_version', '1.0.0')}"
        )

        # Initialize enhanced tool execution logger for this investigation
        investigation_id = state.get("investigation_id")
        if investigation_id:
            from app.service.agent.orchestration.enhanced_tool_execution_logger import (
                get_tool_execution_logger,
            )

            tool_execution_logger = get_tool_execution_logger(investigation_id)
            logger.info(
                f"🔧 Enhanced Tool Execution Logger initialized for investigation: {investigation_id}"
            )

        # Call original start_investigation
        base_result = await start_investigation(state, config)

        # Production safety: Validate base_result before merging
        if not isinstance(base_result, dict):
            logger.error(
                f"CRITICAL: start_investigation returned invalid type: {type(base_result)}"
            )
            raise ValueError(
                f"start_investigation must return dict, got {type(base_result)}"
            )

        # Critical hybrid fields that must not be overwritten
        PROTECTED_HYBRID_FIELDS = {
            "decision_audit_trail",
            "ai_confidence",
            "ai_confidence_level",
            "investigation_strategy",
            "safety_overrides",
            "dynamic_limits",
            "performance_metrics",
            "hybrid_system_version",
        }

        # Check for dangerous overwrites in base_result
        dangerous_overwrites = set(base_result.keys()) & PROTECTED_HYBRID_FIELDS
        if dangerous_overwrites:
            logger.warning(
                f"start_investigation attempting to overwrite protected fields: {dangerous_overwrites}"
            )
            # Remove dangerous keys from base_result to protect hybrid state
            safe_base_result = {
                k: v for k, v in base_result.items() if k not in PROTECTED_HYBRID_FIELDS
            }
        else:
            safe_base_result = base_result

        # Safely merge state with validation
        enhanced_state = {
            **state,  # Start with the full hybrid state
            **safe_base_result,  # Merge in safe results only
            "hybrid_system_version": "1.0.0",
            "graph_selection_reason": "Hybrid intelligence system selected",
            "start_time": datetime.now().isoformat(),
        }

        # Production safety: Validate critical hybrid fields are preserved
        required_fields = [
            "investigation_id",
            "entity_id",
            "entity_type",
            "decision_audit_trail",
        ]
        missing_fields = [
            field for field in required_fields if field not in enhanced_state
        ]
        if missing_fields:
            logger.error(
                f"CRITICAL: State merge lost required fields: {missing_fields}"
            )
            raise ValueError(
                f"State merge validation failed - missing fields: {missing_fields}"
            )

        # Ensure decision_audit_trail is properly typed
        if not isinstance(enhanced_state["decision_audit_trail"], list):
            logger.error(
                f"CRITICAL: decision_audit_trail corrupted: {type(enhanced_state['decision_audit_trail'])}"
            )
            enhanced_state["decision_audit_trail"] = []

        # Add initial audit trail entry
        enhanced_state["decision_audit_trail"].append(
            {
                "timestamp": datetime.now().isoformat(),
                "decision_type": "investigation_start",
                "details": {
                    "system": "hybrid_intelligence_graph",
                    "version": "1.0.0",
                    "intelligence_mode": self.intelligence_mode,
                },
            }
        )

        logger.info(f"✅ Hybrid investigation started: {state.get('investigation_id')}")

        return enhanced_state

    async def enhanced_raw_data_node(
        self, state: HybridInvestigationState, config: Optional[Dict] = None
    ) -> HybridInvestigationState:
        """Enhanced raw data processing with confidence tracking"""

        logger.debug(f"📥 Processing raw data with Hybrid Intelligence Graph")
        logger.debug(f"   Enhanced data quality assessment enabled")
        logger.debug(f"   Confidence tracking: Real-time data completeness analysis")

        # Call original raw data node
        base_result = await raw_data_node(state, config)

        # Update confidence based on raw data quality
        if base_result.get("messages"):
            # Simple heuristic for data quality based on message content
            last_message = base_result["messages"][-1]
            data_quality = (
                min(1.0, len(str(last_message.content)) / 500.0)
                if hasattr(last_message, "content")
                else 0.0
            )

            # Update confidence factors
            # CRITICAL FIX: Ensure confidence_factors exists before accessing
            if "confidence_factors" not in base_result:
                base_result["confidence_factors"] = {
                    "data_completeness": 0.0,
                    "evidence_quality": 0.0,
                    "pattern_recognition": 0.0,
                    "risk_indicators": 0.0,
                }
            base_result["confidence_factors"]["data_completeness"] = data_quality

        logger.debug(f"✅ Raw data processed")

        return base_result

    async def enhanced_fraud_investigation(
        self, state: HybridInvestigationState, config: Optional[Dict] = None
    ) -> HybridInvestigationState:
        """Enhanced fraud investigation with AI confidence integration"""

        # Check if this is a retry by counting consecutive AI messages without tool calls
        messages = state.get("messages", [])
        consecutive_ai_without_tools = 0
        for msg in reversed(messages[-10:]):
            from langchain_core.messages import AIMessage

            if isinstance(msg, AIMessage):
                if hasattr(msg, "tool_calls") and msg.tool_calls:
                    break  # Found tool calls, not a retry
                consecutive_ai_without_tools += 1

        if consecutive_ai_without_tools > 0:
            # This is a retry - set flag for stronger prompts
            state["force_tool_usage"] = True
            logger.debug(
                f"🕵️ Hybrid Intelligence fraud investigation starting (retry {consecutive_ai_without_tools})"
            )
        else:
            logger.debug(f"🕵️ Hybrid Intelligence fraud investigation starting")

        logger.debug(f"   AI-powered investigation velocity tracking")
        logger.debug(f"   Performance metrics: Real-time optimization")

        # Use hybrid-aware assistant that respects AI recommendations
        from ..assistant.hybrid_assistant import HybridAssistant

        hybrid_assistant = HybridAssistant(self.components)

        # BULLETPROOF FIX: Use perf counter timer for accurate timing
        from app.service.agent.orchestration.timing import run_timer

        with run_timer(state):
            enhanced_state = await hybrid_assistant.hybrid_aware_assistant(
                state, config
            )

            # CRITICAL FIX: Ensure performance_metrics exists before accessing
            if "performance_metrics" not in enhanced_state:
                enhanced_state["performance_metrics"] = {}

            # Update performance metrics in the hybrid state
            enhanced_state["performance_metrics"]["investigation_velocity"] = (
                enhanced_state["performance_metrics"].get("investigation_velocity", 0)
                + 0.1
            )

            logger.debug(f"✅ Fraud investigation enhanced")

            # Copy timing from state to enhanced_state (now guaranteed to be set by run_timer)
            enhanced_state["start_time"] = state.get("start_time")
            enhanced_state["end_time"] = state.get("end_time")
            enhanced_state["total_duration_ms"] = state.get("total_duration_ms")

            # Preserve retry tracking in enhanced state
            enhanced_state["fraud_investigation_retry_count"] = state.get(
                "fraud_investigation_retry_count", 0
            )
            enhanced_state["force_tool_usage"] = state.get("force_tool_usage", False)

        return enhanced_state

    async def fetch_database_data(
        self, state: HybridInvestigationState, config: Optional[Dict] = None
    ) -> HybridInvestigationState:
        """
        Fetch database data using the same PostgreSQL connection as risky entity retrieval.

        CRITICAL FIX A0.2: Uses PostgreSQLProvider to query transaction data directly,
        following the same pattern used for retrieving top 10% risky entities.
        """

        logger.info(f"📊 DATABASE FETCH: Starting data retrieval")

        # Extract entity from state root
        entity_id = state.get("entity_id")
        entity_type = state.get("entity_type")

        if not entity_id:
            logger.warning(f"⚠️ DATABASE FETCH: No entity_id in state")
            return state

        logger.info(f"📊 DATABASE FETCH: Entity={entity_id} (type: {entity_type})")

        try:
            # Use database provider factory to respect DATABASE_PROVIDER configuration
            from app.service.agent.tools.database_tool.database_factory import (
                get_database_provider,
            )

            # Create provider based on DATABASE_PROVIDER environment variable
            db_provider = get_database_provider()
            provider_type = type(db_provider).__name__
            logger.info(f"📊 DATABASE FETCH: {provider_type} provider initialized")

            # Get full table name (schema.table)
            table_name = db_provider.get_full_table_name()

            # Build query using database provider-appropriate syntax
            # Detect database provider to use correct column names and syntax
            import os

            db_provider_name = os.getenv("DATABASE_PROVIDER", "snowflake").lower()
            
            # Get max transactions limit from environment (default: 2000)
            # Can be increased for shorter time windows or decreased for performance
            max_transactions = int(os.getenv("INVESTIGATION_MAX_TRANSACTIONS", "2000"))

            # Map entity_type to database column name dynamically
            entity_type_lower = (entity_type or "ip").lower()
            if db_provider_name == "snowflake":
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

            # Get the appropriate column name for the entity type
            entity_column = entity_column_map.get(
                entity_type_lower,
                (
                    entity_type_lower.upper()
                    if db_provider_name == "snowflake"
                    else entity_type_lower
                ),
            )

            # Get investigation window dates from state
            window_start = state.get("from_date")
            window_end = state.get("to_date")
            
            if db_provider_name == "snowflake":
                # Snowflake: uppercase column names, no parameterized queries
                # TXS schema uses PAID_AMOUNT_CURRENCY (not PAID_CURRENCY_CODE)
                # CRITICAL: Exclude MODEL_SCORE and IS_FRAUD_TX from investigation queries
                # CRITICAL FIX: Add TX_DATETIME filter to respect investigation window
                datetime_filter = ""
                if window_start and window_end:
                    datetime_filter = f"""
                        AND TX_DATETIME >= '{window_start.isoformat()}'
                        AND TX_DATETIME < '{window_end.isoformat()}'
                    """
                    logger.info(f"📅 Filtering transactions to investigation window: {window_start.date()} to {window_end.date()}")
                
                sql_query = f"""
                    SELECT
                        TX_ID_KEY,
                        EMAIL,
                        IP,
                        PAID_AMOUNT_VALUE_IN_CURRENCY,
                        PAID_AMOUNT_CURRENCY,
                        TX_DATETIME,
                        PAYMENT_METHOD,
                        CARD_BRAND,
                        DEVICE_ID,
                        USER_AGENT,
                        IP_COUNTRY_CODE,
                        NSURE_LAST_DECISION as MODEL_DECISION
                    FROM {table_name}
                    WHERE {entity_column} = '{entity_id}'
                    {datetime_filter}
                    ORDER BY TX_DATETIME DESC
                    LIMIT {max_transactions}
                """
            else:
                # PostgreSQL: lowercase column names, parameterized queries
                # CRITICAL: Exclude MODEL_SCORE and IS_FRAUD_TX from investigation queries
                # CRITICAL FIX: Add tx_datetime filter to respect investigation window
                datetime_filter = ""
                if window_start and window_end:
                    datetime_filter = f"""
                        AND tx_datetime >= '{window_start.isoformat()}'
                        AND tx_datetime < '{window_end.isoformat()}'
                    """
                    logger.info(f"📅 Filtering transactions to investigation window: {window_start.date()} to {window_end.date()}")
                
                sql_query = f"""
                    SELECT
                        tx_id_key,
                        email,
                        ip,
                        paid_amount_value_in_currency,
                        paid_amount_currency,
                        tx_datetime,
                        payment_method,
                        card_brand,
                        device_id,
                        user_agent,
                        ip_country_code,
                        nSure_last_decision as model_decision
                    FROM {table_name}
                    WHERE {entity_column} = $1
                    {datetime_filter}
                    ORDER BY tx_datetime DESC
                    LIMIT {max_transactions}
                """

            # Execute query using provider's async execute_query_async method
            logger.info(
                f"📊 DATABASE FETCH: Executing query for {entity_type}={entity_id} (column: {entity_column})"
            )
            try:
                if db_provider_name == "snowflake":
                    # Snowflake execute_query_async doesn't support params dict
                    results = await db_provider.execute_query_async(sql_query)
                else:
                    # PostgreSQL supports parameterized queries
                    param_name = (
                        entity_type_lower
                        if entity_type_lower
                        in ["ip", "email", "device", "device_id", "phone", "user_id"]
                        else "entity_id"
                    )
                    results = await db_provider.execute_query_async(
                        sql_query, params={param_name: entity_id}
                    )

                # Validate results - ensure it's a list, not an error dict
                if not isinstance(results, list):
                    raise ValueError(
                        f"Query returned unexpected type: {type(results).__name__}, expected list. Response: {results}"
                    )

                logger.info(
                    f"✅ DATABASE FETCH: Retrieved {len(results)} transactions "
                    f"(query limit: {max_transactions}, matched: {len(results)} for {entity_type}={entity_id})"
                )
            except Exception as query_error:
                # Re-raise to be caught by outer exception handler
                logger.error(
                    f"❌ DATABASE FETCH: Query execution failed: {str(query_error)}"
                )
                raise

            # D2 FIX: Emit no_data event if database returned 0 results
            if len(results) == 0:
                logger.warning(
                    f"📭 D2 FIX: DATABASE returned 0 results for {entity_id}"
                )
                db_provider_name = os.getenv("DATABASE_PROVIDER", "snowflake").lower()
                _emit_no_data_event(
                    state,
                    "database",
                    db_provider_name,
                    reason=f"Query executed successfully but returned 0 transactions for {entity_id}",
                )

            # Track database query as tool usage
            tools_used = list(state.get("tools_used", []))
            tools_used.append(
                {
                    "tool_name": f"{db_provider_name}_direct_query",
                    "description": f"Direct {db_provider_name.upper()} database query for transaction data",
                    "entity_id": entity_id,
                    "query_type": "transactions",
                    "results_count": len(results),
                }
            )
            logger.info(
                f"📊 DATABASE FETCH: Tracked as tool usage (total tools: {len(tools_used)})"
            )

            # Store in snowflake_data format for agents (name kept for backward compatibility)
            return {
                **state,
                "snowflake_data": {
                    "success": True,
                    "row_count": len(results),
                    "results": results,
                    "source": db_provider_name,
                },
                "snowflake_completed": True,
                "tools_used": tools_used,
            }

        except Exception as e:
            logger.error(f"❌ DATABASE FETCH: Failed: {str(e)}")

            # D2 FIX: Emit no_data event for query failure
            import os

            db_provider_name = os.getenv("DATABASE_PROVIDER", "snowflake").lower()
            _emit_no_data_event(
                state, "database", db_provider_name, reason=f"Query failed: {str(e)}"
            )

            # Continue without data - store error information for debugging
            return {
                **state,
                "snowflake_data": {
                    "success": False,
                    "error": str(e),
                    "query": (
                        sql_query if "sql_query" in locals() else "Query not available"
                    ),
                    "row_count": 0,
                    "results": [],
                },
                "snowflake_completed": False,
                "errors": state.get("errors", [])
                + [
                    {
                        "timestamp": datetime.now().isoformat(),
                        "error_type": "database_fetch_failure",
                        "message": str(e),
                    }
                ],
            }


def _emit_no_data_event(
    state: HybridInvestigationState, source_type: str, source_name: str, reason: str
) -> None:
    """
    D2 FIX: Emit explicit no_data event when a data source returns no results.

    This provides transparency about which data sources failed to provide data,
    allowing domain agents and aggregation to make informed decisions about
    evidence sufficiency.

    Args:
        state: Investigation state to update with no_data event
        source_type: Type of data source (e.g., "database", "api", "external_tool")
        source_name: Specific source name (e.g., "postgresql", "splunk", "abuseipdb")
        reason: Human-readable explanation for missing data
    """
    logger.info(f"📭 D2 FIX: Emitting no_data event")
    logger.info(f"   Source: {source_type}/{source_name}")
    logger.info(f"   Reason: {reason}")

    # Initialize no_data_events list if not present
    if "no_data_events" not in state:
        state["no_data_events"] = []

    # Create no_data event record
    no_data_event = {
        "timestamp": datetime.now().isoformat(),
        "source_type": source_type,
        "source_name": source_name,
        "reason": reason,
        "event_type": "NO_DATA",
    }

    # Append to state
    state["no_data_events"].append(no_data_event)

    logger.debug(
        f"✅ D2 FIX: no_data event recorded (total: {len(state['no_data_events'])} events)"
    )
