"""
State Schema for LangGraph Clean Architecture

Defines the complete investigation state used throughout the graph.
"""

from typing import TypedDict, List, Dict, Any, Annotated, Optional
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from app.service.logging import get_bridge_logger

# Initialize logger at module level
logger = get_bridge_logger(__name__)


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
    entity_type: str  # "ip_address", "user_id", "device_id", etc.
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
    
    # Metadata
    start_time: Optional[str]  # When investigation started
    end_time: Optional[str]  # When investigation completed
    total_duration_ms: Optional[int]  # Total investigation time
    
    # Optional context from original investigation
    agent_context: Optional[Any]  # Legacy agent context if needed


def create_initial_state(
    investigation_id: str,
    entity_id: str,
    entity_type: str = "ip_address",
    parallel_execution: bool = True,
    max_tools: int = 52,
    custom_user_prompt: Optional[str] = None,
    date_range_days: int = 7,
    tool_count: str = "5-6"
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
        
        # Metadata
        "start_time": datetime.utcnow().isoformat(),
        "end_time": None,
        "total_duration_ms": None,
        
        # Optional context
        "agent_context": None
    }
    
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
    # Logger is now defined at module level
    logger.info(f"📊 Phase transition: {state.get('current_phase', 'unknown')} → {new_phase}")
    
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
        updates["snowflake_data"] = result
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
    # Check if we're in complete phase
    if state.get("current_phase") == "complete":
        return True
    
    # Check if all required phases are done
    required_phases = ["snowflake_analysis", "domain_analysis"]
    
    # Snowflake must be complete
    if not state.get("snowflake_completed", False):
        return False
    
    # At least 3 domains should be complete
    domains_completed = state.get("domains_completed", [])
    if len(domains_completed) < 3:
        return False
    
    # Should have used at least 10 tools
    tools_used = state.get("tools_used", [])
    if len(tools_used) < 10:
        return False
    
    return True