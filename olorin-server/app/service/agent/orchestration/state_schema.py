"""
State Schema for LangGraph Clean Architecture

Defines the complete investigation state used throughout the graph.
"""

from typing import TypedDict, List, Dict, Any, Annotated, Optional
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


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
    
    # Phase management
    current_phase: str  # "initialization", "snowflake_analysis", "tool_execution", "domain_analysis", "summary", "complete"
    
    # Snowflake data (30-day analysis)
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
    max_tools: int = 52
) -> InvestigationState:
    """
    Create the initial state for a new investigation.
    
    Args:
        investigation_id: Unique investigation identifier
        entity_id: The entity to investigate (IP, user ID, etc.)
        entity_type: Type of entity being investigated
        parallel_execution: Whether to run agents in parallel
        max_tools: Maximum number of tools to use
        
    Returns:
        Initial InvestigationState
    """
    from datetime import datetime
    
    return {
        # Core message flow
        "messages": [],
        
        # Investigation identifiers
        "investigation_id": investigation_id,
        "entity_id": entity_id,
        "entity_type": entity_type,
        
        # Phase management
        "current_phase": "initialization",
        
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
        
        # Metadata
        "start_time": datetime.utcnow().isoformat(),
        "end_time": None,
        "total_duration_ms": None,
        
        # Optional context
        "agent_context": None
    }


def update_phase(state: InvestigationState, new_phase: str) -> Dict[str, Any]:
    """
    Update the investigation phase.
    
    Args:
        state: Current investigation state
        new_phase: New phase to transition to
        
    Returns:
        State updates
    """
    from app.service.logging import get_bridge_logger
    
    logger = get_bridge_logger(__name__)
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
    
    # Update risk score if provided
    updates = {
        "domain_findings": domain_findings,
        "domains_completed": domains_completed,
        "risk_indicators": risk_indicators
    }
    
    if "risk_score" in findings:
        updates["risk_score"] = max(state.get("risk_score", 0.0), findings["risk_score"])
    
    return updates


def calculate_final_risk_score(state: InvestigationState) -> float:
    """
    Calculate the final risk score based on all findings.
    
    Args:
        state: Current investigation state
        
    Returns:
        Final risk score (0.0 - 1.0)
    """
    domain_findings = state.get("domain_findings", {})
    
    if not domain_findings:
        return 0.5  # Default medium risk if no findings
    
    # Collect all risk scores from domains
    risk_scores = []
    for domain, findings in domain_findings.items():
        if isinstance(findings, dict) and "risk_score" in findings:
            risk_scores.append(findings["risk_score"])
    
    if not risk_scores:
        # Fall back to counting risk indicators
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
    
    # Weight different domains
    domain_weights = {
        "network": 0.25,
        "device": 0.25,
        "location": 0.15,
        "logs": 0.15,
        "risk": 0.20
    }
    
    weighted_score = 0.0
    total_weight = 0.0
    
    for domain, findings in domain_findings.items():
        if isinstance(findings, dict) and "risk_score" in findings:
            weight = domain_weights.get(domain, 0.1)
            weighted_score += findings["risk_score"] * weight
            total_weight += weight
    
    if total_weight > 0:
        return min(1.0, weighted_score / total_weight)
    
    # Fallback to average
    return min(1.0, sum(risk_scores) / len(risk_scores))


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