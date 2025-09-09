"""
Risk Assessment Agent

Synthesizes findings from all domains and calculates final risk assessment.
"""

import time
from typing import Dict, Any

from app.service.logging import get_bridge_logger
from app.service.agent.orchestration.state_schema import (
    InvestigationState, 
    add_domain_findings,
    calculate_final_risk_score
)
from .base import DomainAgentBase, log_agent_handover_complete, complete_chain_of_thought

logger = get_bridge_logger(__name__)


async def risk_agent_node(state: InvestigationState) -> Dict[str, Any]:
    """
    Risk assessment agent.
    Synthesizes findings from all domains and calculates final risk.
    """
    start_time = time.time()
    logger.info("⚠️ Risk agent performing final assessment")
    
    # Get relevant data from state
    domain_findings = state.get("domain_findings", {})
    tools_used = state.get("tools_used", [])
    risk_indicators = state.get("risk_indicators", [])
    entity_id = state["entity_id"]
    entity_type = state["entity_type"]
    investigation_id = state.get('investigation_id', 'unknown')
    
    # Initialize logging and chain of thought
    DomainAgentBase.log_agent_start("risk", entity_type, entity_id, False)
    
    logger.debug(f"   📊 Domain findings available: {list(domain_findings.keys())}")
    logger.debug(f"   🔧 Tools used: {len(tools_used)} tools")
    logger.debug(f"   ⚠️ Risk indicators: {len(risk_indicators)} total")
    
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
    
    # Calculate composite risk score
    final_risk_score = calculate_final_risk_score(state)
    
    # Initialize risk findings
    risk_findings = {
        "domain": "risk",
        "risk_score": final_risk_score,
        "risk_indicators": [],
        "evidence": [],  # Collect synthesis evidence for LLM
        "metrics": {},  # Collect metrics without scoring
        "analysis": {
            "domains_analyzed": list(domain_findings.keys()),
            "tools_used_count": len(tools_used),
            "total_risk_indicators": len(risk_indicators)
        }
    }
    
    # Synthesize domain findings
    _synthesize_domain_findings(domain_findings, risk_findings)
    
    # Determine risk level
    _determine_risk_level(final_risk_score, risk_findings)
    
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
    
    # Finalize findings
    analysis_duration = time.time() - start_time
    DomainAgentBase.finalize_findings(
        risk_findings, {"synthesis": True}, {}, analysis_duration, "risk"
    )
    
    # Complete logging
    log_agent_handover_complete("risk", risk_findings)
    complete_chain_of_thought(process_id, risk_findings, "risk")
    
    logger.info(f"✅ Risk assessment complete - Final Risk: {final_risk_score:.2f} ({risk_findings.get('risk_level', 'UNKNOWN')})")
    
    # Update state with risk findings
    return add_domain_findings(state, "risk", risk_findings)


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


def _determine_risk_level(final_risk_score: float, risk_findings: Dict[str, Any]) -> None:
    """Determine risk level based on final risk score."""
    if final_risk_score >= 0.8:
        risk_findings["risk_indicators"].append("CRITICAL RISK - Immediate action required")
        risk_findings["risk_level"] = "CRITICAL"
        risk_findings["evidence"].append(f"CRITICAL: Risk score {final_risk_score:.2f} exceeds critical threshold (0.8)")
    elif final_risk_score >= 0.6:
        risk_findings["risk_indicators"].append("HIGH RISK - Manual review recommended")
        risk_findings["risk_level"] = "HIGH"
        risk_findings["evidence"].append(f"HIGH: Risk score {final_risk_score:.2f} requires manual review")
    elif final_risk_score >= 0.4:
        risk_findings["risk_indicators"].append("MEDIUM RISK - Monitor closely")
        risk_findings["risk_level"] = "MEDIUM"
        risk_findings["evidence"].append(f"MEDIUM: Risk score {final_risk_score:.2f} needs monitoring")
    elif final_risk_score >= 0.2:
        risk_findings["risk_indicators"].append("LOW RISK - Standard monitoring")
        risk_findings["risk_level"] = "LOW"
        risk_findings["evidence"].append(f"LOW: Risk score {final_risk_score:.2f} within acceptable range")
    else:
        risk_findings["risk_indicators"].append("MINIMAL RISK - No immediate concerns")
        risk_findings["risk_level"] = "MINIMAL"
        risk_findings["evidence"].append(f"MINIMAL: Risk score {final_risk_score:.2f} shows minimal concern")


def _analyze_cross_domain_patterns(domain_findings: Dict[str, Any], risk_findings: Dict[str, Any]) -> None:
    """Analyze patterns across multiple domains."""
    if len(domain_findings) >= 3:
        high_risk_domains = [
            d for d, f in domain_findings.items() 
            if isinstance(f, dict) and f.get("risk_score", 0) > 0.6
        ]
        
        if len(high_risk_domains) >= 2:
            risk_findings["risk_indicators"].append(f"Multiple high-risk domains: {', '.join(high_risk_domains)}")
            risk_findings["evidence"].append(f"CROSS-DOMAIN ALERT: {len(high_risk_domains)} domains show high risk")
        
        # Store cross-domain metrics
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