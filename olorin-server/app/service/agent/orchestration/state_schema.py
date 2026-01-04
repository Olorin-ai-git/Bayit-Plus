"""
State Schema for LangGraph Clean Architecture

Defines the complete investigation state used throughout the graph.
"""

import json
from typing import Annotated, Any, Dict, List, Optional, TypedDict

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

from app.service.logging import get_bridge_logger

# Initialize logger at module level
logger = get_bridge_logger(__name__)


def _summarize_snowflake_data_for_logging(
    snowflake_data: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Create a summarized version of snowflake_data for logging purposes.
    Prevents verbose logging of large result sets.

    Args:
        snowflake_data: Full snowflake_data dictionary

    Returns:
        Summarized dictionary with row count instead of full results
    """
    if not snowflake_data:
        return None

    if not isinstance(snowflake_data, dict):
        return {
            "type": type(snowflake_data).__name__,
            "preview": str(snowflake_data)[:100],
        }

    summary = {
        "success": snowflake_data.get("success"),
        "source": snowflake_data.get("source", "unknown"),
    }

    if "results" in snowflake_data:
        results = snowflake_data["results"]
        if isinstance(results, list):
            summary["row_count"] = len(results)
            # Include sample of first record keys if available
            if results and isinstance(results[0], dict):
                summary["columns"] = list(results[0].keys())[:5]  # First 5 column names
        else:
            summary["results_type"] = type(results).__name__
    else:
        summary["keys"] = list(snowflake_data.keys())[:10]  # First 10 keys

    return summary


def _summarize_tool_results_for_logging(
    tool_results: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Create a summarized version of tool_results for logging purposes.
    Prevents verbose logging of full SQL queries and large result sets.

    Args:
        tool_results: Full tool_results dictionary

    Returns:
        Summarized dictionary with query summaries instead of full queries
    """
    if not tool_results:
        return {}

    if not isinstance(tool_results, dict):
        return {"type": type(tool_results).__name__, "preview": str(tool_results)[:100]}

    summarized = {}
    for tool_name, result in tool_results.items():
        if isinstance(result, str):
            # Check if it's a JSON string with a query
            try:
                import json

                parsed = json.loads(result)
                if isinstance(parsed, dict):
                    # Summarize JSON result
                    if "query" in parsed:
                        summarized[tool_name] = {
                            "type": "json_with_query",
                            "query_preview": (
                                parsed["query"][:100] + "..."
                                if len(parsed["query"]) > 100
                                else parsed["query"]
                            ),
                            "has_results": "results" in parsed or "data" in parsed,
                            "result_count": (
                                len(parsed.get("results", []))
                                if isinstance(parsed.get("results"), list)
                                else 0
                            ),
                        }
                    elif "results" in parsed:
                        results = parsed["results"]
                        summarized[tool_name] = {
                            "type": "json_results",
                            "result_count": (
                                len(results) if isinstance(results, list) else 0
                            ),
                            "columns": (
                                list(results[0].keys())[:5]
                                if results
                                and isinstance(results, list)
                                and results
                                and isinstance(results[0], dict)
                                else []
                            ),
                        }
                    elif "row_count" in parsed:
                        # Handle database query results with row_count (like snowflake_query_tool)
                        row_count = parsed.get("row_count", 0)
                        columns = parsed.get("columns", [])
                        summarized[tool_name] = {
                            "type": "json_with_row_count",
                            "row_count": row_count,
                            "column_count": (
                                len(columns) if isinstance(columns, list) else 0
                            ),
                            "columns": (
                                columns[:5]
                                if isinstance(columns, list) and len(columns) > 0
                                else []
                            ),
                        }
                    else:
                        summarized[tool_name] = {
                            "type": "json",
                            "keys": list(parsed.keys())[:5],
                        }
                else:
                    # Non-dict JSON - summarize by type
                    summarized[tool_name] = {
                        "type": "json_parsed",
                        "parsed_type": type(parsed).__name__,
                        "length": len(str(parsed)),
                    }
            except (json.JSONDecodeError, Exception):
                # Not JSON, check if it looks like a SQL query
                if (
                    "SELECT" in result.upper()
                    or "FROM" in result.upper()
                    or "WHERE" in result.upper()
                ):
                    summarized[tool_name] = {"type": "sql_query", "length": len(result)}
                else:
                    summarized[tool_name] = {"type": "string", "length": len(result)}
        elif isinstance(result, dict):
            # Summarize dict result
            if "query" in result:
                summarized[tool_name] = {
                    "type": "dict_with_query",
                    "query_preview": (
                        result["query"][:100] + "..."
                        if len(str(result["query"])) > 100
                        else str(result["query"])
                    ),
                    "has_results": "results" in result or "data" in result,
                    "result_count": (
                        len(result.get("results", []))
                        if isinstance(result.get("results"), list)
                        else 0
                    ),
                }
            elif "results" in result:
                results = result["results"]
                summarized[tool_name] = {
                    "type": "dict_results",
                    "result_count": len(results) if isinstance(results, list) else 0,
                    "columns": (
                        list(results[0].keys())[:5]
                        if results
                        and isinstance(results, list)
                        and results
                        and isinstance(results[0], dict)
                        else []
                    ),
                }
            else:
                summarized[tool_name] = {
                    "type": "dict",
                    "keys": list(result.keys())[:5],
                }
        else:
            # For other types, summarize instead of showing preview
            if isinstance(result, str):
                # Check if it looks like SQL
                if (
                    "SELECT" in result.upper()
                    or "FROM" in result.upper()
                    or "WHERE" in result.upper()
                ):
                    summarized[tool_name] = {"type": "sql_query", "length": len(result)}
                else:
                    summarized[tool_name] = {"type": "string", "length": len(result)}
            else:
                summarized[tool_name] = {
                    "type": type(result).__name__,
                    "length": len(str(result)),
                }

    return summarized


def _normalize_snowflake_data_type(data):
    """
    Normalize snowflake data to expected type (object instead of JSON string).

    Args:
        data: Raw data from tool result (could be string or object)

    Returns:
        Normalized data as object/dict
    """
    try:
        if isinstance(data, str):
            # Try to parse as JSON first
            try:
                parsed_data = json.loads(data)
                logger.debug(
                    f"📊 SNOWFLAKE DATA: Parsed JSON string to {type(parsed_data).__name__}"
                )
                return parsed_data
            except json.JSONDecodeError:
                # Try to evaluate as Python literal (safer than eval)
                try:
                    import ast

                    parsed_data = ast.literal_eval(data)
                    logger.debug(
                        f"📊 SNOWFLAKE DATA: Parsed Python literal to {type(parsed_data).__name__}"
                    )
                    return parsed_data
                except (ValueError, SyntaxError):
                    # If all parsing fails, return as string but log warning
                    logger.warning(
                        f"📊 SNOWFLAKE DATA: Could not parse string data, keeping as string"
                    )
                    return data
        else:
            # Already an object, return as-is
            logger.debug(
                f"📊 SNOWFLAKE DATA: Already {type(data).__name__}, no parsing needed"
            )
            return data

    except Exception as e:
        logger.error(f"📊 SNOWFLAKE DATA: Error normalizing data type: {str(e)}")
        return data  # Return original data if normalization fails


class InvestigationState(TypedDict):
    """
    Complete investigation state for fraud detection.

    This state flows through all nodes in the graph and maintains
    the complete context of the investigation.
    """

    # Core message flow
    messages: Annotated[List[BaseMessage], add_messages]

    # Investigation identifiers
    investigation_id: str
    entity_id: str
    entity_type: str  # "ip", "user_id", "device_id", etc.
    custom_user_prompt: Optional[str]  # Custom user prompt with highest priority

    # Phase management
    current_phase: str  # "initialization", "snowflake_analysis", "tool_execution", "domain_analysis", "summary", "complete"

    # Configuration parameters
    date_range_days: int  # Number of days for Snowflake analysis (default 7)
    time_range: Optional[
        Dict[str, str]
    ]  # Optional explicit time range with start_time and end_time (ISO 8601)
    tool_count: str  # Number of tools to select (default "5-6")

    # Snowflake data (configurable day analysis)
    snowflake_data: Optional[Dict[str, Any]]
    snowflake_completed: bool

    # Tool management
    tools_used: List[str]  # Track which tools have been used
    tool_requests: List[Dict[str, Any]]  # Pending tool requests from agents
    tool_results: Dict[str, Any]  # Results from tool executions

    # Domain findings
    domain_findings: Dict[str, Any]  # Findings from each domain agent
    domains_completed: List[str]  # Which domains have been analyzed

    # Risk assessment
    risk_score: float  # Overall risk score (0.0 - 1.0)
    risk_indicators: List[str]  # Specific risk indicators found
    confidence_score: float  # Confidence in the assessment (0.0 - 1.0)

    # Execution control
    parallel_execution: bool  # Whether to run agents in parallel
    max_tools: int  # Maximum number of tools to use

    # Error handling
    errors: List[Dict[str, Any]]  # Any errors encountered
    retry_count: int  # Number of retries attempted

    # Loop prevention and debugging
    orchestrator_loops: int  # Track orchestrator executions
    tool_execution_attempts: int  # Track tool execution attempts
    phase_changes: List[Dict[str, Any]]  # Track phase transitions
    routing_decisions: List[Dict[str, Any]]  # Track routing decisions for debugging

    # Hybrid compatibility fields
    decision_audit_trail: List[
        Dict[str, Any]
    ]  # Complete decision history (hybrid compatibility)

    # Metadata
    start_time: Optional[str]  # When investigation started
    end_time: Optional[str]  # When investigation completed
    total_duration_ms: Optional[int]  # Total investigation time

    # Optional context from original investigation
    agent_context: Optional[Any]  # Legacy agent context if needed


def create_initial_state(
    investigation_id: str,
    entity_id: str,
    entity_type: str = "ip",
    parallel_execution: bool = True,
    max_tools: int = 52,
    custom_user_prompt: Optional[str] = None,
    date_range_days: int = 7,
    time_range: Optional[Dict[str, str]] = None,
    tool_count: int = 5,
) -> InvestigationState:
    """
    Create the initial state for a new investigation.

    Args:
        investigation_id: Unique investigation identifier
        entity_id: The entity to investigate (IP, user ID, etc.)
        entity_type: Type of entity being investigated
        parallel_execution: Whether to run agents in parallel
        max_tools: Maximum number of tools to use
        custom_user_prompt: Optional custom user prompt with highest priority
        date_range_days: Number of days for Snowflake lookback (default 7)
        tool_count: Number of tools to select (default "5-6")

    Returns:
        Initial InvestigationState
    """
    from datetime import datetime

    # Step 9.1: InvestigationState Fields - Complete state schema initialization
    logger.debug(
        f"[Step 9.1] 🗃️ INVESTIGATION STATE SCHEMA - Creating initial state with all required fields"
    )
    logger.debug(f"[Step 9.1]   Core identifiers:")
    logger.debug(f"[Step 9.1]     investigation_id: {investigation_id}")
    logger.debug(f"[Step 9.1]     entity_id: {entity_id}")
    logger.debug(f"[Step 9.1]     entity_type: {entity_type}")
    logger.debug(f"[Step 9.1]   Phase management:")
    logger.debug(f"[Step 9.1]     current_phase: 'initialization' (starting phase)")
    logger.debug(
        f"[Step 9.1]     date_range_days: {date_range_days} (Snowflake lookback)"
    )
    logger.debug(f"[Step 9.1]     tool_count: {tool_count} (tool selection range)")
    logger.debug(f"[Step 9.1]   Data initialization:")
    logger.debug(f"[Step 9.1]     snowflake_data: None (will be populated)")
    logger.debug(f"[Step 9.1]     snowflake_completed: False (pending)")
    logger.debug(f"[Step 9.1]     tool_results: {{}} (empty dict)")
    logger.debug(f"[Step 9.1]     domain_findings: {{}} (empty dict)")
    logger.debug(f"[Step 9.1]   Safety counters:")
    logger.debug(f"[Step 9.1]     orchestrator_loops: 0 (initial)")
    logger.debug(f"[Step 9.1]     tool_execution_attempts: 0 (initial)")
    logger.debug(f"[Step 9.1]   Configuration:")
    logger.debug(f"[Step 9.1]     max_tools: {max_tools}")
    logger.debug(f"[Step 9.1]     parallel_execution: {parallel_execution}")
    logger.debug(
        f"[Step 9.1]     custom_user_prompt: {'Set' if custom_user_prompt else 'None'}"
    )

    # DEBUG logging for state initialization
    logger.debug(f"[Step 1.4.1] InvestigationState creation with required fields:")
    logger.debug(f"[Step 1.4.1]   investigation_id: {investigation_id}")
    logger.debug(f"[Step 1.4.1]   entity_id: {entity_id}")
    logger.debug(f"[Step 1.4.1]   entity_type: {entity_type}")
    logger.debug(f"[Step 1.4.1]   date_range_days: {date_range_days} (default: 7)")
    logger.debug(f"[Step 1.4.1]   max_tools: {max_tools} (passed from runner)")
    logger.debug(f"[Step 1.4.1]   parallel_execution: {parallel_execution}")
    logger.debug(f"[Step 1.4.1]   custom_user_prompt: {custom_user_prompt}")
    logger.debug(f"[Step 1.4.1]   tool_count: {tool_count}")

    initial_state = {
        # Core message flow
        "messages": [],
        # Investigation identifiers
        "investigation_id": investigation_id,
        "entity_id": entity_id,
        "entity_type": entity_type,
        "custom_user_prompt": custom_user_prompt,
        # Phase management
        "current_phase": "initialization",
        # Configuration parameters
        "date_range_days": date_range_days,
        "time_range": time_range,
        "tool_count": tool_count,
        # Snowflake data
        "snowflake_data": None,
        "snowflake_completed": False,
        # Tool management
        "tools_used": [],
        "tool_requests": [],
        "tool_results": {},
        # Domain findings
        "domain_findings": {},
        "domains_completed": [],
        # Risk assessment
        "risk_score": 0.0,
        "risk_indicators": [],
        "confidence_score": 0.0,
        # Execution control
        "parallel_execution": parallel_execution,
        "max_tools": max_tools,
        # Error handling
        "errors": [],
        "retry_count": 0,
        # Loop prevention and debugging
        "orchestrator_loops": 0,
        "tool_execution_attempts": 0,
        "phase_changes": [],
        "routing_decisions": [],
        # Hybrid compatibility fields
        "decision_audit_trail": [
            {
                "timestamp": datetime.utcnow().isoformat(),
                "decision_type": "initial_state_creation",
                "details": {
                    "entity_id": entity_id,
                    "entity_type": entity_type,
                    "investigation_strategy": "clean_graph",
                    "parallel_execution": parallel_execution,
                },
            }
        ],
        # Metadata
        "start_time": datetime.utcnow().isoformat(),
        "end_time": None,
        "total_duration_ms": None,
        # Performance metrics (for hybrid graph compatibility)
        "performance_metrics": {},
        # Optional context
        "agent_context": None,
    }

    # Step 9.1: Complete verification of all initialized state fields
    logger.debug(
        f"[Step 9.1] ✅ STATE SCHEMA VERIFICATION - Complete field initialization check"
    )
    logger.debug(f"[Step 9.1]   Core fields verified:")
    logger.debug(
        f"[Step 9.1]     messages: {len(initial_state['messages'])} (empty list)"
    )
    logger.debug(
        f"[Step 9.1]     investigation_id: '{initial_state['investigation_id']}'"
    )
    logger.debug(f"[Step 9.1]     entity_id: '{initial_state['entity_id']}'")
    logger.debug(f"[Step 9.1]     entity_type: '{initial_state['entity_type']}'")
    logger.debug(f"[Step 9.1]   Phase fields verified:")
    logger.debug(f"[Step 9.1]     current_phase: '{initial_state['current_phase']}'")
    logger.debug(f"[Step 9.1]     date_range_days: {initial_state['date_range_days']}")
    logger.debug(f"[Step 9.1]     tool_count: '{initial_state['tool_count']}'")
    logger.debug(f"[Step 9.1]   Data fields verified:")
    # Reduce verbosity for large result sets - always use summary
    snowflake_data = initial_state.get("snowflake_data")
    snowflake_summary = _summarize_snowflake_data_for_logging(snowflake_data)
    logger.debug(f"[Step 9.1]     snowflake_data: {snowflake_summary}")
    logger.debug(
        f"[Step 9.1]     snowflake_completed: {initial_state['snowflake_completed']}"
    )
    logger.debug(
        f"[Step 9.1]     tool_results: {len(initial_state['tool_results'])} entries"
    )
    logger.debug(
        f"[Step 9.1]     domain_findings: {len(initial_state['domain_findings'])} domains"
    )
    logger.debug(f"[Step 9.1]   Safety fields verified:")
    logger.debug(
        f"[Step 9.1]     orchestrator_loops: {initial_state['orchestrator_loops']}"
    )
    logger.debug(
        f"[Step 9.1]     tool_execution_attempts: {initial_state['tool_execution_attempts']}"
    )
    logger.debug(f"[Step 9.1]     errors: {len(initial_state['errors'])} errors")
    logger.debug(
        f"[Step 9.1]     phase_changes: {len(initial_state['phase_changes'])} changes"
    )
    logger.debug(
        f"[Step 9.1]     routing_decisions: {len(initial_state['routing_decisions'])} decisions"
    )
    logger.debug(f"[Step 9.1]   Hybrid compatibility fields verified:")
    logger.debug(
        f"[Step 9.1]     decision_audit_trail: {len(initial_state['decision_audit_trail'])} entries"
    )
    logger.debug(f"[Step 9.1]   Total state fields: {len(initial_state)}")
    logger.debug(f"[Step 9.1]   State initialization: COMPLETE ✅")

    logger.debug(
        f"[Step 1.4.1] InvestigationState initialized with current_phase='initialization'"
    )
    logger.debug(f"[Step 1.4.1] State creation completed - returning initialized state")

    return initial_state


def update_phase(state: InvestigationState, new_phase: str) -> Dict[str, Any]:
    """
    Update the investigation phase.

    Args:
        state: Current investigation state
        new_phase: New phase to transition to

    Returns:
        State updates
    """
    current_phase = state.get("current_phase", "unknown")
    orchestrator_loops = state.get("orchestrator_loops", 0)
    domains_completed = state.get("domains_completed", [])
    tools_used = state.get("tools_used", [])

    # Logger is now defined at module level
    logger.debug(f"[PHASE-TRANSITION] 🔄 PHASE TRANSITION ANALYSIS")
    logger.debug(f"[PHASE-TRANSITION]   From phase: {current_phase}")
    logger.debug(f"[PHASE-TRANSITION]   To phase: {new_phase}")
    logger.debug(f"[PHASE-TRANSITION]   Orchestrator loops: {orchestrator_loops}")
    logger.debug(
        f"[PHASE-TRANSITION]   Domains completed: {len(domains_completed)} - {domains_completed}"
    )
    logger.debug(f"[PHASE-TRANSITION]   Tools used: {len(tools_used)} - {tools_used}")
    logger.debug(
        f"[PHASE-TRANSITION]   Is completion transition: {new_phase == 'complete' or new_phase == 'summary'}"
    )

    if new_phase in ["complete", "summary"]:
        if new_phase == "summary":
            logger.debug(
                f"[PHASE-TRANSITION]   🎯 SUMMARY PHASE: Investigation ready for final assessment"
            )
        else:
            logger.debug(
                f"[PHASE-TRANSITION]   🏁 COMPLETE PHASE: Investigation terminating"
            )

        # Log which safety limits may have triggered this completion
        completion_triggers = []
        if len(domains_completed) >= 3:
            completion_triggers.append(
                f"sufficient_domains({len(domains_completed)}>=3)"
            )
        if orchestrator_loops >= 6:
            completion_triggers.append(f"orchestrator_loops({orchestrator_loops}>=6)")
        if len(tools_used) >= 6:
            completion_triggers.append(f"tools_used({len(tools_used)}>=6)")

        if completion_triggers:
            logger.debug(
                f"[PHASE-TRANSITION]   🔒 Completion triggers active: {', '.join(completion_triggers)}"
            )
        else:
            logger.debug(
                f"[PHASE-TRANSITION]   ✅ Natural completion - no safety limits triggered"
            )

    logger.info(f"📊 Phase transition: {current_phase} → {new_phase}")

    return {"current_phase": new_phase}


def add_tool_result(
    state: InvestigationState, tool_name: str, result: Any
) -> Dict[str, Any]:
    """
    Add a tool execution result to the state.

    Args:
        state: Current investigation state
        tool_name: Name of the tool that was executed
        result: Result from the tool execution

    Returns:
        State updates
    """
    tools_used = state.get("tools_used", []).copy()
    if tool_name not in tools_used:
        tools_used.append(tool_name)

    tool_results = state.get("tool_results", {}).copy()
    tool_results[tool_name] = result

    # Special handling for Snowflake
    updates = {"tools_used": tools_used, "tool_results": tool_results}

    # CRITICAL FIX A0: Recognize both "database" and "snowflake" tool names
    # PostgreSQL uses "database_query" tool, legacy Snowflake used "snowflake" tools
    if "snowflake" in tool_name.lower() or "database" in tool_name.lower():
        # CRITICAL FIX: Normalize snowflake data type (JSON string → object)
        snowflake_data = _normalize_snowflake_data_type(result)
        updates["snowflake_data"] = snowflake_data
        updates["snowflake_completed"] = True

    return updates


def add_domain_findings(
    state: InvestigationState, domain: str, findings: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Add findings from a domain agent and persist to database.

    Args:
        state: Current investigation state
        domain: Domain name (network, device, location, logs, risk)
        findings: Findings from the domain analysis

    Returns:
        State updates
    """
    domain_findings = state.get("domain_findings", {}).copy()
    domain_findings[domain] = findings

    domains_completed = state.get("domains_completed", []).copy()
    if domain not in domains_completed:
        domains_completed.append(domain)

    # Extract risk indicators if present
    risk_indicators = state.get("risk_indicators", []).copy()
    if "risk_indicators" in findings:
        risk_indicators.extend(findings["risk_indicators"])

    # Build updates
    updates = {
        "domain_findings": domain_findings,
        "domains_completed": domains_completed,
        "risk_indicators": risk_indicators,
    }

    # Handle both old risk_score format and new evidence-based format
    # CRITICAL: No fallback scores - only update if findings has a valid risk_score
    if "risk_score" in findings and findings["risk_score"] is not None:
        # Legacy format - still update for compatibility
        state_risk_score = state.get("risk_score")
        if state_risk_score is not None:
            # Both are not None - take the maximum
            updates["risk_score"] = max(state_risk_score, findings["risk_score"])
        else:
            # State has None, findings has a value - use findings value
            updates["risk_score"] = findings["risk_score"]
    elif "metrics" in findings and "avg_model_score" in findings["metrics"]:
        # New evidence-based format - use MODEL_SCORE as temporary risk indicator
        # The actual risk score will be determined by LLM in the summary phase
        model_score = findings["metrics"]["avg_model_score"]
        if model_score is not None:
            state_risk_score = state.get("risk_score")
            if state_risk_score is not None:
                # Both are not None - take the maximum
                updates["risk_score"] = max(state_risk_score, model_score)
            else:
                # State has None, model_score has a value - use model_score value
                updates["risk_score"] = model_score

    # CRITICAL: Persist domain findings to database (including LLM analysis)
    investigation_id = state.get("investigation_id")
    if investigation_id:
        try:
            from app.persistence.database import get_db_session
            from app.service.domain_findings_service import DomainFindingsService

            # Use a separate session to avoid conflicts with graph execution
            with get_db_session() as db:
                service = DomainFindingsService(db)
                # Get current version for optimistic locking
                from app.models.investigation_state import (
                    InvestigationState as InvestigationStateModel,
                )

                db_state = (
                    db.query(InvestigationStateModel)
                    .filter(
                        InvestigationStateModel.investigation_id == investigation_id
                    )
                    .first()
                )
                current_version = db_state.version if db_state else None

                success = service.persist_domain_findings(
                    investigation_id=investigation_id,
                    domain=domain,
                    findings=findings,
                    from_version=current_version,
                )
                if success:
                    logger.debug(
                        f"✅ Persisted {domain} domain findings to database for {investigation_id}"
                    )

                    # If this is the risk domain and transaction_scores exist in state, persist them too
                    if domain == "risk" and "transaction_scores" in state:
                        transaction_scores = state.get("transaction_scores", {})
                        if transaction_scores:
                            try:
                                # Get updated state to ensure we have latest progress_json
                                db_state = (
                                    db.query(InvestigationStateModel)
                                    .filter(
                                        InvestigationStateModel.investigation_id
                                        == investigation_id
                                    )
                                    .first()
                                )
                                if db_state:
                                    progress_data = (
                                        json.loads(db_state.progress_json)
                                        if db_state.progress_json
                                        else {}
                                    )
                                    # Validate all scores are in [0.0, 1.0] range
                                    validated_scores = {}
                                    invalid_count = 0
                                    for tx_id, score in transaction_scores.items():
                                        try:
                                            score_float = float(score)
                                            if 0.0 <= score_float <= 1.0:
                                                validated_scores[str(tx_id)] = (
                                                    score_float
                                                )
                                            else:
                                                invalid_count += 1
                                                logger.warning(
                                                    f"⚠️ Invalid transaction score {score_float} for {tx_id}, excluding"
                                                )
                                        except (ValueError, TypeError):
                                            invalid_count += 1
                                            logger.warning(
                                                f"⚠️ Invalid transaction score type for {tx_id}, excluding"
                                            )

                                    if validated_scores:
                                        progress_data["transaction_scores"] = (
                                            validated_scores
                                        )
                                        db_state.progress_json = json.dumps(
                                            progress_data
                                        )
                                        db_state.version += 1
                                        db.commit()
                                        logger.info(
                                            f"✅ Persisted {len(validated_scores)} transaction scores for {investigation_id}"
                                        )
                                        if invalid_count > 0:
                                            logger.warning(
                                                f"⚠️ Excluded {invalid_count} invalid transaction scores"
                                            )
                            except Exception as tx_error:
                                logger.warning(
                                    f"⚠️ Failed to persist transaction_scores: {tx_error}",
                                    exc_info=True,
                                )
                else:
                    logger.warning(
                        f"⚠️ Failed to persist {domain} domain findings to database for {investigation_id}"
                    )
        except Exception as e:
            # Don't fail the investigation if persistence fails - log and continue
            logger.warning(
                f"Failed to persist domain findings to database: {str(e)}",
                exc_info=True,
            )

    return updates


def calculate_final_risk_score(state: InvestigationState) -> float:
    """
    Calculate the final risk score based on all findings.
    NOTE: This function is deprecated - use risk agent calculation instead.
    This is kept for backward compatibility only.

    Args:
        state: Current investigation state

    Returns:
        Final risk score (0.0 - 1.0)
    """
    # Use risk agent calculation method
    domain_findings = state.get("domain_findings", {})

    if not domain_findings:
        raise ValueError(
            "CRITICAL: No domain findings available - cannot calculate risk score without REAL data"
        )

    # Use risk agent's calculation method
    from app.service.agent.orchestration.domain_agents.risk_agent import (
        _calculate_real_risk_score,
    )

    facts = state.get("facts", {})
    return _calculate_real_risk_score(domain_findings, facts)


def is_investigation_complete(state: InvestigationState) -> bool:
    """
    Check if the investigation is complete.

    Args:
        state: Current investigation state

    Returns:
        True if investigation is complete
    """
    current_phase = state.get("current_phase", "unknown")
    snowflake_completed = state.get("snowflake_completed", False)
    domains_completed = state.get("domains_completed", [])
    tools_used = state.get("tools_used", [])

    min_domains_required = 3
    min_tools_required = 10

    logger.debug(f"[COMPLETION-CHECK] 🔒 INVESTIGATION COMPLETION CRITERIA CHECK")
    logger.debug(f"[COMPLETION-CHECK]   Current phase: {current_phase}")
    logger.debug(f"[COMPLETION-CHECK]   Snowflake completed: {snowflake_completed}")
    logger.debug(
        f"[COMPLETION-CHECK]   Domains completed: {domains_completed} (count: {len(domains_completed)})"
    )
    logger.debug(
        f"[COMPLETION-CHECK]   Tools used: {tools_used} (count: {len(tools_used)})"
    )
    logger.debug(
        f"[COMPLETION-CHECK]   Minimum domains required: {min_domains_required}"
    )
    logger.debug(f"[COMPLETION-CHECK]   Minimum tools required: {min_tools_required}")

    # Check if we're in complete phase
    if current_phase == "complete":
        logger.debug(f"[COMPLETION-CHECK]   ✅ COMPLETE: Already in complete phase")
        return True

    # Check if all required phases are done
    required_phases = ["snowflake_analysis", "domain_analysis"]
    logger.debug(f"[COMPLETION-CHECK]   Required phases: {required_phases}")

    # Snowflake must be complete
    if not snowflake_completed:
        logger.debug(
            f"[COMPLETION-CHECK]   ❌ INCOMPLETE: Snowflake analysis not completed"
        )
        return False

    # At least 3 domains should be complete
    if len(domains_completed) < min_domains_required:
        logger.debug(
            f"[COMPLETION-CHECK]   ❌ INCOMPLETE: Not enough domains completed ({len(domains_completed)} < {min_domains_required})"
        )
        return False

    # Should have used at least 10 tools
    if len(tools_used) < min_tools_required:
        logger.debug(
            f"[COMPLETION-CHECK]   ❌ INCOMPLETE: Not enough tools used ({len(tools_used)} < {min_tools_required})"
        )
        return False

    logger.debug(f"[COMPLETION-CHECK]   ✅ COMPLETE: All completion criteria met")
    return True
