"""
Risk Assessment Agent

Synthesizes findings from all domains and calculates final risk assessment.
"""

import time
from typing import Dict, Any, Optional, List

from app.service.logging import get_bridge_logger
from app.service.agent.orchestration.state_schema import (
    InvestigationState, 
    add_domain_findings,
    calculate_final_risk_score
)
from .base import DomainAgentBase, log_agent_handover_complete, complete_chain_of_thought

logger = get_bridge_logger(__name__)


async def risk_agent_node(state: InvestigationState, config: Optional[Dict] = None) -> Dict[str, Any]:
    """
    Risk assessment agent.
    Synthesizes findings from all domains and calculates final risk.
    """
    try:
        start_time = time.time()
        logger.info("[Step 5.2.6] ⚠️ Risk agent performing final assessment")
        
        # Get relevant data from state
        domain_findings = state.get("domain_findings", {})
        tools_used = state.get("tools_used", [])
        risk_indicators = state.get("risk_indicators", [])
        entity_id = state["entity_id"]
        entity_type = state["entity_type"]
        investigation_id = state.get('investigation_id', 'unknown')
        
        # Initialize logging and chain of thought
        DomainAgentBase.log_agent_start("risk", entity_type, entity_id, False)
    
        logger.debug(f"[Step 5.2.6]   📊 Domain findings available: {list(domain_findings.keys())}")
        logger.debug(f"[Step 5.2.6]   🔧 Tools used: {len(tools_used)} tools")
        logger.debug(f"[Step 5.2.6]   ⚠️ Risk indicators: {len(risk_indicators)} total")
    
        process_id = DomainAgentBase.start_chain_of_thought(
            investigation_id=investigation_id,
            agent_name="risk_agent",
            domain="risk",
            entity_type=entity_type,
            entity_id=entity_id,
            task_description="Risk synthesis combines insights from all domain agents to produce unified "
                            "fraud assessment. Will synthesize: (1) Network analysis results and IP reputation "
                            "risks, (2) Device fingerprinting and spoofing indicators, (3) Location analysis "
                            "and impossible travel patterns, (4) Logs analysis and behavioral anomalies, "
                            "(5) Authentication security findings and breach indicators. Final risk score will "
                            "weight each domain appropriately."
        )
    
            # NARRATIVE-ONLY: Risk domain provides synthesis narrative but includes compatibility keys
        snowflake_data = state.get("snowflake_data", {})
        facts = snowflake_data if isinstance(snowflake_data, dict) else {}
        
        # Get other domains for aggregation narrative
        other_domains = [d for d in domain_findings.values() if isinstance(d, dict)]
        
        # Generate aggregation narrative
        aggregation_narrative = _generate_aggregation_narrative(facts, domain_findings)
        
        # Determine fraud floor status for narrative
        fraud_floor = bool(
            facts.get("IS_FRAUD_TX") or 
            facts.get("chargeback_confirmed") or 
            facts.get("manual_case_outcome") == "fraud"
        )
        
        # Initialize risk findings with numeric score for infrastructure compatibility
        risk_findings = {
            "domain": "risk",
            "name": "risk",  # Compatibility with domain normalization
            "score": 0.5,   # Default score for narrative synthesis
            "risk_score": 0.5,  # Infrastructure expects numeric value
            "status": "OK",  # Always OK for narrative synthesis
            "signals": [],   # No numeric signals for narrative domain
            "confidence": 0.5,  # Moderate confidence in narrative synthesis
            "narrative": _build_risk_narrative(aggregation_narrative, fraud_floor, other_domains),
            "provenance": ["aggregator:v1"],  # Track source of narrative
            "risk_indicators": [],
            "evidence": [],  # Collect synthesis evidence for narrative
            "metrics": {},  # Collect metrics for narrative context
            "analysis": {
                "domains_analyzed": list(domain_findings.keys()),
                "tools_used_count": len(tools_used),
                "total_risk_indicators": len(risk_indicators),
                "aggregation_narrative": aggregation_narrative,
                "fraud_floor_applied": fraud_floor
            }
        }
        
        # Synthesize domain findings
        _synthesize_domain_findings(domain_findings, risk_findings)
        
        # Generate narrative about risk assessment process (no numeric scoring)
        _generate_risk_narrative(facts, domain_findings, risk_findings)
        
        # Analyze cross-domain patterns
        _analyze_cross_domain_patterns(domain_findings, risk_findings)
        
        # Calculate investigation confidence
        _calculate_investigation_confidence(state, risk_findings)
        
        # Add synthesis evidence summary
        risk_findings["evidence_summary"] = {
            "domains_synthesized": len(domain_findings),
            "total_risk_indicators": len(risk_indicators),
            "confidence_level": risk_findings.get("confidence", 0.5)
        }
        
        # NARRATIVE-ONLY: Generate synthesis narrative (no LLM scoring)
        # Risk domain provides narrative context without numeric score emission
        
        # Finalize findings
        analysis_duration = time.time() - start_time
        DomainAgentBase.finalize_findings(
            risk_findings, {"synthesis": True}, {}, analysis_duration, "risk"
        )
        
        # Complete logging
        log_agent_handover_complete("risk", risk_findings)
        complete_chain_of_thought(process_id, risk_findings, "risk")
        
        logger.info(f"[Step 5.2.6] ✅ Risk synthesis complete - Narrative-only domain with {len(risk_findings.get('evidence', []))} synthesis points")
        
        # Update state with risk findings
        return add_domain_findings(state, "risk", risk_findings)
    
    except Exception as e:
        logger.error(f"❌ Risk agent failed: {str(e)}")
        
        # Record failure with circuit breaker
        from app.service.agent.orchestration.circuit_breaker import record_node_failure
        record_node_failure(state, "risk_agent", e)
        
        # Return compatible error result with numeric scores for infrastructure
        error_risk_findings = {
            "domain": "risk",
            "name": "risk",
            "score": 0.0,
            "risk_score": 0.0,  # Infrastructure expects numeric value
            "status": "ERROR",
            "signals": [],
            "confidence": 0.0,
            "narrative": f"Risk synthesis failed: {str(e)}",
            "provenance": ["risk_agent:error"],
            "risk_indicators": [f"Risk agent error: {str(e)}"],
            "evidence": [],
            "metrics": {},
            "analysis": {
                "error_type": "risk_agent_failure",
                "error_message": str(e)
            }
        }
        
        return add_domain_findings(state, "risk", error_risk_findings)


def _synthesize_domain_findings(domain_findings: Dict[str, Any], risk_findings: Dict[str, Any]) -> None:
    """Synthesize findings from all domain agents."""
    domain_risk_scores = {}
    
    for domain, findings in domain_findings.items():
        if isinstance(findings, dict):
            domain_risk = findings.get("risk_score", 0)
            domain_risk_scores[domain] = domain_risk
            
            # Extract key evidence from each domain
            domain_evidence = findings.get("evidence", [])
            domain_indicators = findings.get("risk_indicators", [])
            
            if domain_evidence:
                risk_findings["evidence"].append(f"{domain.title()} domain evidence: {len(domain_evidence)} points collected")
            
            if domain_indicators:
                risk_findings["evidence"].append(f"{domain.title()} risk indicators: {', '.join(domain_indicators[:3])}")
                if len(domain_indicators) > 3:
                    risk_findings["evidence"].append(f"... and {len(domain_indicators) - 3} more {domain} indicators")
    
    # Store domain risk breakdown
    risk_findings["metrics"]["domain_risk_scores"] = domain_risk_scores
    risk_findings["analysis"]["domain_risk_breakdown"] = domain_risk_scores


def _build_risk_narrative(aggregation_narrative: str, fraud_floor: bool, other_domains: List[Dict[str, Any]]) -> str:
    """Build the main narrative for the risk synthesis domain."""
    # Get counts of active vs blocked domains
    active_domains = [d for d in other_domains if d.get("risk_score") is not None]
    blocked_domains = [d for d in other_domains if d.get("risk_score") is None]
    
    narrative_parts = [
        f"Risk synthesis: {aggregation_narrative}",
        f"Active scoring domains: {len(active_domains)}, insufficient evidence: {len(blocked_domains)}"
    ]
    
    if fraud_floor:
        narrative_parts.append("Fraud floor (≥0.60) applied due to confirmed fraud indicators")
    
    return "; ".join(narrative_parts)


def _generate_aggregation_narrative(facts: Dict[str, Any], domain_findings: Dict[str, Any]) -> str:
    """Generate narrative explaining aggregation decisions."""
    narrative_parts = []
    
    # Check for hard evidence that triggers fraud floor
    hard_evidence = []
    if facts.get("IS_FRAUD_TX") is True:
        hard_evidence.append("confirmed fraud transaction")
    if facts.get("chargeback_confirmed") is True:
        hard_evidence.append("confirmed chargeback")
    if facts.get("manual_case_outcome") == "fraud":
        hard_evidence.append("manual fraud determination")
    
    if hard_evidence:
        narrative_parts.append(f"Fraud floor (≥0.60) applied due to: {', '.join(hard_evidence)}")
    
    # Summarize domain spread
    domain_scores = []
    for domain, findings in domain_findings.items():
        if isinstance(findings, dict) and "risk_score" in findings:
            score = findings["risk_score"]
            if score is not None:
                domain_scores.append(f"{domain}={score:.3f}")
    
    if domain_scores:
        narrative_parts.append(f"Domain scores: {', '.join(domain_scores)}")
    
    # Evidence gating status
    numeric_domains = sum(1 for d, f in domain_findings.items() 
                         if isinstance(f, dict) and f.get("risk_score") is not None)
    total_signals = sum(len(f.get("signals", [])) for f in domain_findings.values() 
                       if isinstance(f, dict))
    
    if numeric_domains >= 2 or (numeric_domains >= 1 and total_signals >= 2):
        narrative_parts.append("Evidence gating: PASS (sufficient corroboration)")
    else:
        narrative_parts.append("Evidence gating: BLOCK (insufficient corroboration)")
    
    return "; ".join(narrative_parts)


def _generate_risk_narrative(facts: Dict[str, Any], domain_findings: Dict[str, Any], risk_findings: Dict[str, Any]) -> None:
    """Generate narrative about risk assessment process."""
    # Describe aggregation process
    aggregation_story = risk_findings["analysis"]["aggregation_narrative"]
    risk_findings["evidence"].append(f"Aggregation: {aggregation_story}")
    
    # Summarize domain contributions
    active_domains = [d for d, f in domain_findings.items() 
                     if isinstance(f, dict) and f.get("risk_score") is not None]
    blocked_domains = [d for d, f in domain_findings.items() 
                      if isinstance(f, dict) and f.get("risk_score") is None]
    
    if active_domains:
        risk_findings["evidence"].append(f"Active scoring domains: {', '.join(active_domains)}")
    if blocked_domains:
        risk_findings["evidence"].append(f"Insufficient evidence domains: {', '.join(blocked_domains)}")
    
    # No risk level assignment - narrative only
    risk_findings["risk_indicators"].append("Risk domain provides synthesis narrative only (no numeric score)")


def _analyze_cross_domain_patterns(domain_findings: Dict[str, Any], risk_findings: Dict[str, Any]) -> None:
    """Analyze patterns across multiple domains (narrative only)."""
    if len(domain_findings) >= 3:
        high_risk_domains = [
            d for d, f in domain_findings.items() 
            if isinstance(f, dict) and f.get("risk_score", 0) is not None and f.get("risk_score", 0) > 0.6
        ]
        
        if len(high_risk_domains) >= 2:
            risk_findings["evidence"].append(f"Cross-domain pattern: {len(high_risk_domains)} domains ({', '.join(high_risk_domains)}) show elevated risk")
        
        # Store cross-domain metrics for narrative context
        risk_findings["metrics"]["high_risk_domains_count"] = len(high_risk_domains)
        risk_findings["analysis"]["high_risk_domains"] = high_risk_domains


def _calculate_investigation_confidence(state: InvestigationState, risk_findings: Dict[str, Any]) -> None:
    """Calculate confidence based on investigation completeness."""
    tools_used = state.get("tools_used", [])
    domain_findings = state.get("domain_findings", {})
    
    confidence_factors = [
        1.0 if state.get("snowflake_completed") else 0.0,
        min(1.0, len(tools_used) / 20.0),
        min(1.0, len(domain_findings) / 6.0)  # Account for 6 possible domains
    ]
    
    risk_findings["confidence"] = sum(confidence_factors) / len(confidence_factors)
    risk_findings["metrics"]["confidence_factors"] = {
        "snowflake_complete": confidence_factors[0],
        "tools_factor": confidence_factors[1],
        "domains_factor": confidence_factors[2]
    }
    
    risk_findings["evidence"].append(
        f"Investigation confidence: {risk_findings['confidence']:.2f} based on "
        f"{len(tools_used)} tools and {len(domain_findings)} domains"
    )