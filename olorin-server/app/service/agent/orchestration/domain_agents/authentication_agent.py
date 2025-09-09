"""
Authentication Domain Analysis Agent

Analyzes login patterns, failed attempts, MFA bypass, and authentication anomalies for fraud detection.
"""

import time
from typing import Dict, Any

from app.service.logging import get_bridge_logger
from app.service.agent.orchestration.state_schema import InvestigationState, add_domain_findings
from .base import DomainAgentBase, log_agent_handover_complete, complete_chain_of_thought
from .auth_utils import (
    analyze_login_attempts,
    analyze_failed_login_ratios,
    analyze_security_indicators,
    analyze_auth_threat_intelligence
)

logger = get_bridge_logger(__name__)


async def authentication_agent_node(state: InvestigationState) -> Dict[str, Any]:
    """
    Authentication analysis agent.
    Analyzes login patterns, failed attempts, MFA bypass, and authentication anomalies.
    """
    start_time = time.time()
    logger.info("🔐 Authentication agent analyzing investigation")
    
    # Get relevant data from state
    snowflake_data = state.get("snowflake_data", {})
    tool_results = state.get("tool_results", {})
    entity_id = state["entity_id"]
    entity_type = state["entity_type"]
    investigation_id = state.get('investigation_id', 'unknown')
    
    # Initialize logging and chain of thought
    DomainAgentBase.log_agent_start("authentication", entity_type, entity_id, False)
    DomainAgentBase.log_context_analysis(snowflake_data, tool_results)
    
    process_id = DomainAgentBase.start_chain_of_thought(
        investigation_id=investigation_id,
        agent_name="authentication_agent",
        domain="authentication",
        entity_type=entity_type,
        entity_id=entity_id,
        task_description="Authentication patterns are critical indicators for account takeover and "
                        "fraud attempts. Will analyze: (1) Brute force attack patterns via login attempt "
                        "counts, (2) Failed login ratios and failure patterns, (3) MFA bypass attempts "
                        "and security circumvention, (4) Impossible travel in authentication context, "
                        "(5) Credential stuffing and SIM swap indicators"
    )
    
    # Initialize authentication findings
    auth_findings = DomainAgentBase.initialize_findings("authentication")
    
    # Process Snowflake data for authentication patterns
    results = DomainAgentBase.process_snowflake_results(snowflake_data, "authentication")
    
    if results:
        # Process MODEL_SCORE
        DomainAgentBase.process_model_scores(results, auth_findings, "authentication")
        
        # Analyze authentication patterns using utilities
        analyze_login_attempts(results, auth_findings)
        analyze_failed_login_ratios(results, auth_findings)
        analyze_security_indicators(results, auth_findings)
    else:
        # Handle case where Snowflake data format is problematic
        if isinstance(snowflake_data, str):
            auth_findings["risk_indicators"].append("Snowflake data in non-structured format")
    
    # Analyze threat intelligence for authentication threats
    analyze_auth_threat_intelligence(tool_results, auth_findings)
    
    # Add evidence summary
    auth_findings["evidence_summary"] = {
        "total_evidence_points": len(auth_findings["evidence"]),
        "risk_indicators_found": len(auth_findings["risk_indicators"]),
        "metrics_collected": len(auth_findings["metrics"])
    }
    
    # Finalize findings
    analysis_duration = time.time() - start_time
    DomainAgentBase.finalize_findings(
        auth_findings, snowflake_data, tool_results, analysis_duration, "authentication"
    )
    
    # Complete logging
    log_agent_handover_complete("authentication", auth_findings)
    complete_chain_of_thought(process_id, auth_findings, "authentication")
    
    logger.info(f"✅ Authentication analysis complete - Risk: {auth_findings['risk_score']:.2f}")
    
    # Update state with findings
    return add_domain_findings(state, "authentication", auth_findings)