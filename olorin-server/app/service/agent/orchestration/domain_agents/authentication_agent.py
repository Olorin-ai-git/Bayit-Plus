"""
Authentication Domain Analysis Agent

Analyzes login patterns, failed attempts, MFA bypass, and authentication anomalies for fraud detection.
"""

import time
from typing import Any, Dict, Optional

from app.service.agent.orchestration.state_schema import (
    InvestigationState,
    add_domain_findings,
)
from app.service.logging import get_bridge_logger

from .auth_utils import (
    analyze_auth_threat_intelligence,
    analyze_failed_login_ratios,
    analyze_login_attempts,
    analyze_security_indicators,
)
from .base import (
    DomainAgentBase,
    complete_chain_of_thought,
    log_agent_handover_complete,
)

logger = get_bridge_logger(__name__)


async def authentication_agent_node(
    state: InvestigationState, config: Optional[Dict] = None
) -> Dict[str, Any]:
    """
    Authentication analysis agent.
    Analyzes login patterns, failed attempts, MFA bypass, and authentication anomalies.
    """
    start_time = time.time()
    logger.info("[Step 5.2.5] 🔐 Authentication agent analyzing investigation")

    # Get relevant data from state
    snowflake_data = state.get("snowflake_data", {})
    tool_results = state.get("tool_results", {})
    entity_id = state["entity_id"]
    entity_type = state["entity_type"]
    investigation_id = state.get("investigation_id", "unknown")

    # Initialize logging and chain of thought
    DomainAgentBase.log_agent_start("authentication", entity_type, entity_id, False)
    DomainAgentBase.log_context_analysis(snowflake_data, tool_results, "authentication")

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
        "(5) Credential stuffing and SIM swap indicators",
    )

    # Initialize authentication findings
    auth_findings = DomainAgentBase.initialize_findings("authentication")

    # Process Snowflake data for authentication patterns
    results = DomainAgentBase.process_snowflake_results(
        snowflake_data, "authentication"
    )

    if results:
        # Log record structure for debugging
        if results and isinstance(results[0], dict):
            logger.info(
                f"📊 Authentication agent - Sample record structure (first record):"
            )
            logger.info(f"   Record keys: {list(results[0].keys())[:20]}")
            logger.info(f"   Sample values: {dict(list(results[0].items())[:5])}")

        # Process MODEL_SCORE
        DomainAgentBase.process_model_scores(results, auth_findings, "authentication")

        # Analyze authentication patterns using utilities
        analyze_login_attempts(results, auth_findings)
        analyze_failed_login_ratios(results, auth_findings)
        analyze_security_indicators(results, auth_findings)

        # Ensure we always have some evidence - add basic transaction count if nothing else
        if len(auth_findings.get("evidence", [])) == 0:
            logger.warning(
                "⚠️ Authentication agent: No evidence collected from analysis functions, adding basic transaction count"
            )
            auth_findings["evidence"].append(
                f"Transaction data analyzed: {len(results)} records processed"
            )
            auth_findings["evidence"].append(
                "Authentication analysis completed on transaction dataset"
            )
    else:
        # Handle case where Snowflake data format is problematic
        if isinstance(snowflake_data, str):
            auth_findings["risk_indicators"].append(
                "Snowflake data in non-structured format"
            )
        elif (
            isinstance(snowflake_data, dict) and snowflake_data.get("row_count", 0) > 0
        ):
            # Data exists but wasn't extracted - log this
            logger.warning(
                f"⚠️ Authentication agent: Snowflake data has {snowflake_data.get('row_count')} rows but no results extracted"
            )
            auth_findings["evidence"].append(
                f"Snowflake data available ({snowflake_data.get('row_count')} rows) but extraction failed"
            )

    # Analyze threat intelligence for authentication threats
    analyze_auth_threat_intelligence(tool_results, auth_findings)

    # Add evidence summary
    auth_findings["evidence_summary"] = {
        "total_evidence_points": len(auth_findings["evidence"]),
        "risk_indicators_found": len(auth_findings["risk_indicators"]),
        "metrics_collected": len(auth_findings["metrics"]),
    }

    # CRITICAL: Analyze evidence with LLM to generate risk scores (with ALL tool results)
    from .base import analyze_evidence_with_llm

    auth_findings = await analyze_evidence_with_llm(
        domain="authentication",
        findings=auth_findings,
        snowflake_data=snowflake_data,
        tool_results=tool_results,
        entity_type=entity_type,
        entity_id=entity_id,
    )

    # Finalize findings
    analysis_duration = time.time() - start_time
    DomainAgentBase.finalize_findings(
        auth_findings, snowflake_data, tool_results, analysis_duration, "authentication"
    )

    # Complete logging
    log_agent_handover_complete("authentication", auth_findings)
    complete_chain_of_thought(process_id, auth_findings, "authentication")

    # CRITICAL FIX: Handle None risk_score
    risk_score = auth_findings.get("risk_score")
    if risk_score is not None:
        logger.info(
            f"[Step 5.2.5] ✅ Authentication analysis complete - Risk: {risk_score:.2f}"
        )
    else:
        logger.info(
            f"[Step 5.2.5] ✅ Authentication analysis complete - Risk: INSUFFICIENT_DATA"
        )

    # Update state with findings
    return add_domain_findings(state, "authentication", auth_findings)
