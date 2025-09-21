"""
State Schema for LangGraph Clean Architecture

Defines the complete investigation state used throughout the graph.
"""

import json
from typing import TypedDict, List, Dict, Any, Annotated, Optional
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from app.service.logging import get_bridge_logger

# Initialize logger at module level
logger = get_bridge_logger(__name__)


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
                logger.debug(f"📊 SNOWFLAKE DATA: Parsed JSON string to {type(parsed_data).__name__}")
                return parsed_data
            except json.JSONDecodeError:
                # Try to evaluate as Python literal (safer than eval)
                try:
                    import ast
                    parsed_data = ast.literal_eval(data)
                    logger.debug(f"📊 SNOWFLAKE DATA: Parsed Python literal to {type(parsed_data).__name__}")
                    return parsed_data
                except (ValueError, SyntaxError):
                    # If all parsing fails, return as string but log warning
                    logger.warning(f"📊 SNOWFLAKE DATA: Could not parse string data, keeping as string")
                    return data
        else:
            # Already an object, return as-is
            logger.debug(f"📊 SNOWFLAKE DATA: Already {type(data).__name__}, no parsing needed")
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
    decision_audit_trail: List[Dict[str, Any]]  # Complete decision history (hybrid compatibility)
    
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
    tool_count: int = 5
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
    logger.debug(f"[Step 9.1] 🗃️ INVESTIGATION STATE SCHEMA - Creating initial state with all required fields")
    logger.debug(f"[Step 9.1]   Core identifiers:")
    logger.debug(f"[Step 9.1]     investigation_id: {investigation_id}")
    logger.debug(f"[Step 9.1]     entity_id: {entity_id}")
    logger.debug(f"[Step 9.1]     entity_type: {entity_type}")
    logger.debug(f"[Step 9.1]   Phase management:")
    logger.debug(f"[Step 9.1]     current_phase: 'initialization' (starting phase)")
    logger.debug(f"[Step 9.1]     date_range_days: {date_range_days} (Snowflake lookback)")
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
    logger.debug(f"[Step 9.1]     custom_user_prompt: {'Set' if custom_user_prompt else 'None'}")
    
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
        "decision_audit_trail": [{
            "timestamp": datetime.utcnow().isoformat(),
            "decision_type": "initial_state_creation",
            "details": {
                "entity_id": entity_id,
                "entity_type": entity_type,
                "investigation_strategy": "clean_graph",
                "parallel_execution": parallel_execution
            }
        }],
        
        # Metadata
        "start_time": datetime.utcnow().isoformat(),
        "end_time": None,
        "total_duration_ms": None,
        
        # Optional context
        "agent_context": None
    }
    
    # Step 9.1: Complete verification of all initialized state fields
    logger.debug(f"[Step 9.1] ✅ STATE SCHEMA VERIFICATION - Complete field initialization check")
    logger.debug(f"[Step 9.1]   Core fields verified:")
    logger.debug(f"[Step 9.1]     messages: {len(initial_state['messages'])} (empty list)")
    logger.debug(f"[Step 9.1]     investigation_id: '{initial_state['investigation_id']}'")
    logger.debug(f"[Step 9.1]     entity_id: '{initial_state['entity_id']}'")
    logger.debug(f"[Step 9.1]     entity_type: '{initial_state['entity_type']}'")
    logger.debug(f"[Step 9.1]   Phase fields verified:")
    logger.debug(f"[Step 9.1]     current_phase: '{initial_state['current_phase']}'")
    logger.debug(f"[Step 9.1]     date_range_days: {initial_state['date_range_days']}")
    logger.debug(f"[Step 9.1]     tool_count: '{initial_state['tool_count']}'")
    logger.debug(f"[Step 9.1]   Data fields verified:")
    logger.debug(f"[Step 9.1]     snowflake_data: {initial_state['snowflake_data']}")
    logger.debug(f"[Step 9.1]     snowflake_completed: {initial_state['snowflake_completed']}")
    logger.debug(f"[Step 9.1]     tool_results: {len(initial_state['tool_results'])} entries")
    logger.debug(f"[Step 9.1]     domain_findings: {len(initial_state['domain_findings'])} domains")
    logger.debug(f"[Step 9.1]   Safety fields verified:")
    logger.debug(f"[Step 9.1]     orchestrator_loops: {initial_state['orchestrator_loops']}")
    logger.debug(f"[Step 9.1]     tool_execution_attempts: {initial_state['tool_execution_attempts']}")
    logger.debug(f"[Step 9.1]     errors: {len(initial_state['errors'])} errors")
    logger.debug(f"[Step 9.1]     phase_changes: {len(initial_state['phase_changes'])} changes")
    logger.debug(f"[Step 9.1]     routing_decisions: {len(initial_state['routing_decisions'])} decisions")
    logger.debug(f"[Step 9.1]   Hybrid compatibility fields verified:")
    logger.debug(f"[Step 9.1]     decision_audit_trail: {len(initial_state['decision_audit_trail'])} entries")
    logger.debug(f"[Step 9.1]   Total state fields: {len(initial_state)}")
    logger.debug(f"[Step 9.1]   State initialization: COMPLETE ✅")
    
    logger.debug(f"[Step 1.4.1] InvestigationState initialized with current_phase='initialization'")
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
    current_phase = state.get('current_phase', 'unknown')
    orchestrator_loops = state.get("orchestrator_loops", 0)
    domains_completed = state.get("domains_completed", [])
    tools_used = state.get("tools_used", [])
    
    # Logger is now defined at module level
    logger.debug(f"[PHASE-TRANSITION] 🔄 PHASE TRANSITION ANALYSIS")
    logger.debug(f"[PHASE-TRANSITION]   From phase: {current_phase}")
    logger.debug(f"[PHASE-TRANSITION]   To phase: {new_phase}")
    logger.debug(f"[PHASE-TRANSITION]   Orchestrator loops: {orchestrator_loops}")
    logger.debug(f"[PHASE-TRANSITION]   Domains completed: {len(domains_completed)} - {domains_completed}")
    logger.debug(f"[PHASE-TRANSITION]   Tools used: {len(tools_used)} - {tools_used}")
    logger.debug(f"[PHASE-TRANSITION]   Is completion transition: {new_phase == 'complete' or new_phase == 'summary'}")
    
    if new_phase in ['complete', 'summary']:
        if new_phase == 'summary':
            logger.debug(f"[PHASE-TRANSITION]   🎯 SUMMARY PHASE: Investigation ready for final assessment")
        else:
            logger.debug(f"[PHASE-TRANSITION]   🏁 COMPLETE PHASE: Investigation terminating")
            
        # Log which safety limits may have triggered this completion
        completion_triggers = []
        if len(domains_completed) >= 3:
            completion_triggers.append(f"sufficient_domains({len(domains_completed)}>=3)")
        if orchestrator_loops >= 6:
            completion_triggers.append(f"orchestrator_loops({orchestrator_loops}>=6)")
        if len(tools_used) >= 6:
            completion_triggers.append(f"tools_used({len(tools_used)}>=6)")
            
        if completion_triggers:
            logger.debug(f"[PHASE-TRANSITION]   🔒 Completion triggers active: {', '.join(completion_triggers)}")
        else:
            logger.debug(f"[PHASE-TRANSITION]   ✅ Natural completion - no safety limits triggered")
    
    logger.info(f"📊 Phase transition: {current_phase} → {new_phase}")
    
    return {"current_phase": new_phase}


def add_tool_result(state: InvestigationState, tool_name: str, result: Any) -> Dict[str, Any]:
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
    updates = {
        "tools_used": tools_used,
        "tool_results": tool_results
    }
    
    if "snowflake" in tool_name.lower():
        # CRITICAL FIX: Normalize snowflake data type (JSON string → object)
        snowflake_data = _normalize_snowflake_data_type(result)
        updates["snowflake_data"] = snowflake_data
        updates["snowflake_completed"] = True
    
    return updates


def add_domain_findings(state: InvestigationState, domain: str, findings: Dict[str, Any]) -> Dict[str, Any]:
    """
    Add findings from a domain agent.
    
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
        "risk_indicators": risk_indicators
    }
    
    # Handle both old risk_score format and new evidence-based format
    if "risk_score" in findings:
        # Legacy format - still update for compatibility
        updates["risk_score"] = max(state.get("risk_score", 0.0), findings["risk_score"])
    elif "metrics" in findings and "avg_model_score" in findings["metrics"]:
        # New evidence-based format - use MODEL_SCORE as temporary risk indicator
        # The actual risk score will be determined by LLM in the summary phase
        model_score = findings["metrics"]["avg_model_score"]
        updates["risk_score"] = max(state.get("risk_score", 0.0), model_score)
    
    return updates


def calculate_final_risk_score(state: InvestigationState) -> float:
    """
    Calculate the final risk score based on all findings.
    NOTE: This is now a fallback - the actual risk score should come from LLM analysis.
    
    Args:
        state: Current investigation state
        
    Returns:
        Final risk score (0.0 - 1.0)
    """
    # First check if we have an LLM-determined risk score
    if state.get("llm_risk_score") is not None:
        return state["llm_risk_score"]
    
    domain_findings = state.get("domain_findings", {})
    
    if not domain_findings:
        return 0.5  # Default medium risk if no findings
    
    # Collect MODEL_SCORES from new evidence-based format
    model_scores = []
    for domain, findings in domain_findings.items():
        if isinstance(findings, dict):
            # Check for legacy risk_score
            if "risk_score" in findings:
                model_scores.append(findings["risk_score"])
            # Check for new metrics format
            elif "metrics" in findings and "avg_model_score" in findings["metrics"]:
                model_scores.append(findings["metrics"]["avg_model_score"])
    
    if model_scores:
        # Use average of MODEL_SCORES as fallback
        return min(1.0, sum(model_scores) / len(model_scores))
    
    # Final fallback to risk indicators
    risk_indicators = state.get("risk_indicators", [])
    if len(risk_indicators) > 10:
        return 0.9
    elif len(risk_indicators) > 5:
        return 0.7
    elif len(risk_indicators) > 2:
        return 0.5
    elif len(risk_indicators) > 0:
        return 0.3
    else:
        return 0.1


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
    logger.debug(f"[COMPLETION-CHECK]   Domains completed: {domains_completed} (count: {len(domains_completed)})")
    logger.debug(f"[COMPLETION-CHECK]   Tools used: {tools_used} (count: {len(tools_used)})")
    logger.debug(f"[COMPLETION-CHECK]   Minimum domains required: {min_domains_required}")
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
        logger.debug(f"[COMPLETION-CHECK]   ❌ INCOMPLETE: Snowflake analysis not completed")
        return False
    
    # At least 3 domains should be complete
    if len(domains_completed) < min_domains_required:
        logger.debug(f"[COMPLETION-CHECK]   ❌ INCOMPLETE: Not enough domains completed ({len(domains_completed)} < {min_domains_required})")
        return False
    
    # Should have used at least 10 tools
    if len(tools_used) < min_tools_required:
        logger.debug(f"[COMPLETION-CHECK]   ❌ INCOMPLETE: Not enough tools used ({len(tools_used)} < {min_tools_required})")
        return False
    
    logger.debug(f"[COMPLETION-CHECK]   ✅ COMPLETE: All completion criteria met")
    return True