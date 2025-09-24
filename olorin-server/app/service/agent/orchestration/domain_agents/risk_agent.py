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
        
        # Determine fraud floor status for narrative (handle both boolean and integer)
        is_fraud_tx = facts.get("IS_FRAUD_TX")
        fraud_floor = bool(
            (is_fraud_tx is True or is_fraud_tx == 1) or
            facts.get("chargeback_confirmed") or
            facts.get("manual_case_outcome") == "fraud"
        )
        
        # Calculate REAL risk score from domain findings
        try:
            real_risk_score = _calculate_real_risk_score(domain_findings, facts)
        except ValueError as e:
            logger.error(f"❌ Risk score calculation failed: {e}")
            # Investigation cannot continue with numeric scoring - return error state
            error_risk_findings = {
                "domain": "risk",
                "name": "risk",
                "score": None,  # No score available
                "risk_score": None,  # No valid risk score
                "status": "INSUFFICIENT_DATA",
                "signals": [],
                "confidence": None,  # No confidence available
                "narrative": f"Risk calculation failed due to insufficient REAL data: {str(e)}",
                "provenance": ["risk_agent:insufficient_data"],
                "risk_indicators": [f"Insufficient data: {str(e)}"],
                "evidence": ["Investigation cannot produce valid numeric risk score due to insufficient REAL data"],
                "metrics": {},
                "analysis": {
                    "error_type": "insufficient_real_data",
                    "error_message": str(e)
                }
            }
            return add_domain_findings(state, "risk", error_risk_findings)

        # Calculate REAL confidence from domain analysis quality
        try:
            real_confidence = _calculate_real_confidence(domain_findings, tools_used, state)
        except ValueError as e:
            logger.error(f"❌ Confidence calculation failed: {e}")
            # Investigation cannot continue with confidence scoring - return error state
            error_risk_findings = {
                "domain": "risk",
                "name": "risk",
                "score": real_risk_score,  # Keep risk score if available
                "risk_score": real_risk_score,
                "status": "INSUFFICIENT_CONFIDENCE_DATA",
                "signals": [],
                "confidence": None,  # No confidence available
                "narrative": f"Confidence calculation failed due to insufficient REAL data: {str(e)}",
                "provenance": ["risk_agent:insufficient_confidence_data"],
                "risk_indicators": [f"Insufficient confidence data: {str(e)}"],
                "evidence": ["Investigation cannot produce valid confidence score due to insufficient REAL data"],
                "metrics": {},
                "analysis": {
                    "error_type": "insufficient_real_confidence_data",
                    "error_message": str(e)
                }
            }
            return add_domain_findings(state, "risk", error_risk_findings)

        # Initialize risk findings with REAL calculated values
        risk_findings = {
            "domain": "risk",
            "name": "risk",  # Compatibility with domain normalization
            "score": real_risk_score,   # REAL score calculated from domain data
            "risk_score": real_risk_score,  # REAL risk score from domain analysis
            "status": "OK" if real_confidence > 0.3 else "LOW_CONFIDENCE",
            "signals": [],   # No numeric signals for narrative domain
            "confidence": real_confidence,  # REAL confidence from domain quality
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
            "confidence_level": risk_findings["confidence"]  # Use REAL calculated confidence
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
    
    # Check for hard evidence that triggers fraud floor (handle both boolean and integer)
    hard_evidence = []
    is_fraud_tx = facts.get("IS_FRAUD_TX")
    if is_fraud_tx is True or is_fraud_tx == 1:
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


def _calculate_real_risk_score(domain_findings: Dict[str, Any], facts: Dict[str, Any]) -> float:
    """Calculate REAL risk score based on actual domain analysis results with volume weighting."""
    # Check for confirmed fraud indicators (handle both boolean True and integer 1)
    is_fraud_tx = facts.get("IS_FRAUD_TX")
    if is_fraud_tx is True or is_fraud_tx == 1:
        return 1.0
    if facts.get("chargeback_confirmed") is True:
        return 0.95
    if facts.get("manual_case_outcome") == "fraud":
        return 0.9

    # Extract transaction-level data for volume weighting
    transaction_data = []
    total_amount = 0.0

    if isinstance(facts, dict) and "results" in facts:
        for result in facts["results"]:
            if isinstance(result, dict):
                # Get transaction amount and risk score
                amount = result.get("PAID_AMOUNT_VALUE_IN_CURRENCY", 0.0) or 0.0
                model_score = result.get("MODEL_SCORE")
                is_blocked = result.get("NSURE_LAST_DECISION") == "BLOCK"

                # Use model score or infer risk from decision
                if model_score is not None:
                    tx_risk = model_score
                elif is_blocked:
                    tx_risk = 0.8  # High risk for blocked transactions
                else:
                    tx_risk = 0.3  # Default moderate risk for approved

                transaction_data.append({
                    "amount": amount,
                    "risk": tx_risk,
                    "blocked": is_blocked
                })
                total_amount += amount

    # Collect REAL risk scores from domain analyses
    domain_scores = []
    weighted_scores = []

    for domain, findings in domain_findings.items():
        if isinstance(findings, dict) and "risk_score" in findings:
            score = findings["risk_score"]
            if score is not None:
                domain_scores.append(score)

                # Weight domains based on their analysis quality
                confidence = findings.get("confidence", 0.0)
                evidence_count = len(findings.get("evidence", []))

                # Higher weight for high-confidence domains with more evidence
                weight = confidence * (1.0 + min(evidence_count / 10.0, 1.0))
                weighted_scores.append((score, weight))

    # Add device presence penalty if device data is missing/NULL
    device_penalty = 0.0
    device_findings = domain_findings.get("device", {})
    if isinstance(device_findings, dict):
        device_evidence = device_findings.get("evidence", [])
        # Check if device data is missing or NULL
        if any("NULL" in str(ev) or "not available" in str(ev).lower() or
               "missing" in str(ev).lower() for ev in device_evidence):
            device_penalty = 0.15  # 15% risk increase for missing device data
            logger.info(f"🚨 Device data missing - adding {device_penalty:.3f} risk penalty")

    if not weighted_scores:
        # No valid domain scores - use transaction data as fallback
        if transaction_data and total_amount > 0:
            # Volume-weighted transaction risk
            volume_weighted_risk = sum(tx["risk"] * tx["amount"] for tx in transaction_data) / total_amount
            volume_weighted_risk = min(1.0, max(0.0, volume_weighted_risk + device_penalty))
            logger.warning(f"⚠️ No domain scores available, using volume-weighted transaction risk: {volume_weighted_risk:.3f}")
            return volume_weighted_risk
        else:
            # Fallback to simple model scores
            model_scores = []
            for result in facts.get("results", []):
                if isinstance(result, dict) and "MODEL_SCORE" in result:
                    model_score = result["MODEL_SCORE"]
                    if model_score is not None:
                        model_scores.append(model_score)

            if model_scores:
                avg_model_score = sum(model_scores) / len(model_scores)
                avg_model_score = min(1.0, max(0.0, avg_model_score + device_penalty))
                logger.warning(f"⚠️ No domain scores available, using model score fallback: {avg_model_score:.3f}")
                return avg_model_score
            else:
                # No valid data available - investigation should not continue with numeric scoring
                raise ValueError("CRITICAL: Insufficient REAL data for risk calculation - investigation cannot produce valid numeric risk score")

    # Calculate confidence-weighted mean of domain scores
    total_weight = sum(weight for _, weight in weighted_scores)
    if total_weight > 0:
        weighted_avg = sum(score * weight for score, weight in weighted_scores) / total_weight
    else:
        weighted_avg = sum(domain_scores) / len(domain_scores)

    # Apply volume weighting if transaction data is available
    if transaction_data and total_amount > 0:
        # Calculate volume-weighted transaction risk
        volume_weighted_tx_risk = sum(tx["risk"] * tx["amount"] for tx in transaction_data) / total_amount

        # Blend domain-based risk with volume-weighted transaction risk (70:30 ratio)
        blended_risk = (0.7 * weighted_avg) + (0.3 * volume_weighted_tx_risk)
        logger.info(f"📊 Volume weighting: domain_risk={weighted_avg:.3f}, tx_risk={volume_weighted_tx_risk:.3f}, blended={blended_risk:.3f}")
        weighted_avg = blended_risk

    # Add device penalty and ensure bounds
    final_risk = min(1.0, max(0.0, weighted_avg + device_penalty))

    return final_risk


def _calculate_real_confidence(domain_findings: Dict[str, Any], tools_used: List[str], state: Dict[str, Any]) -> float:
    """Calculate REAL confidence based on actual analysis quality and data availability."""
    confidence_factors = []

    # Factor 1: Domain analysis quality
    domain_confidences = []
    domain_evidence_counts = []

    for domain, findings in domain_findings.items():
        if isinstance(findings, dict):
            # Use LLM confidence if available (higher priority)
            llm_analysis = findings.get("llm_analysis", {})
            confidence_value = None

            if "confidence" in llm_analysis and llm_analysis["confidence"] is not None:
                confidence_value = llm_analysis["confidence"]
            elif "confidence" in findings and findings["confidence"] is not None:
                confidence_value = findings["confidence"]

            # Only add non-None confidence values
            if confidence_value is not None:
                domain_confidences.append(confidence_value)

            # Count evidence points
            evidence_count = len(findings.get("evidence", []))
            domain_evidence_counts.append(evidence_count)

    if domain_confidences:
        avg_domain_confidence = sum(domain_confidences) / len(domain_confidences)
        confidence_factors.append(avg_domain_confidence)

    # Factor 2: Data completeness
    snowflake_data = state.get("snowflake_data", {})
    if isinstance(snowflake_data, dict) and "results" in snowflake_data:
        results = snowflake_data["results"]
        if isinstance(results, list) and len(results) > 0:
            # More transactions = higher confidence
            transaction_confidence = min(1.0, len(results) / 10.0)
            confidence_factors.append(transaction_confidence)

            # Check data quality (non-null fields)
            total_fields = 0
            null_fields = 0
            for result in results:
                if isinstance(result, dict):
                    for key, value in result.items():
                        total_fields += 1
                        if value is None:
                            null_fields += 1

            if total_fields > 0:
                data_quality = 1.0 - (null_fields / total_fields)
                confidence_factors.append(data_quality)

    # Factor 3: Tool execution success
    if tools_used:
        tool_confidence = min(1.0, len(tools_used) / 5.0)  # Optimal around 5 tools
        confidence_factors.append(tool_confidence)

    # Factor 4: Evidence volume
    total_evidence = sum(domain_evidence_counts) if domain_evidence_counts else 0
    if total_evidence > 0:
        evidence_confidence = min(1.0, total_evidence / 20.0)  # Good confidence at 20+ evidence points
        confidence_factors.append(evidence_confidence)

    if not confidence_factors:
        raise ValueError("CRITICAL: No REAL confidence factors available - investigation cannot produce valid confidence score")

    # Calculate weighted average with emphasis on domain quality
    if len(confidence_factors) >= 2:
        # Weight domain confidence higher than other factors
        weighted_confidence = (confidence_factors[0] * 0.5 +
                             sum(confidence_factors[1:]) * 0.5 / (len(confidence_factors) - 1))
    else:
        weighted_confidence = confidence_factors[0]

    return min(1.0, max(0.0, weighted_confidence))