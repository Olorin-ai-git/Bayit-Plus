"""
Risk Assessment Agent

Synthesizes findings from all domains and calculates final risk assessment.
"""

import time
from typing import Any, Dict, List, Optional

from app.service.agent.orchestration.state_schema import (
    InvestigationState,
    add_domain_findings,
    calculate_final_risk_score,
)
from app.service.logging import get_bridge_logger

from .base import (
    DomainAgentBase,
    complete_chain_of_thought,
    log_agent_handover_complete,
)

logger = get_bridge_logger(__name__)


async def risk_agent_node(
    state: InvestigationState, config: Optional[Dict] = None
) -> Dict[str, Any]:
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
        investigation_id = state.get("investigation_id", "unknown")

        # Initialize logging and chain of thought
        DomainAgentBase.log_agent_start("risk", entity_type, entity_id, False)

        logger.debug(
            f"[Step 5.2.6]   📊 Domain findings available: {list(domain_findings.keys())}"
        )
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
            "weight each domain appropriately.",
        )

        # NARRATIVE-ONLY: Risk domain provides synthesis narrative but includes compatibility keys
        snowflake_data = state.get("snowflake_data", {})
        facts = snowflake_data if isinstance(snowflake_data, dict) else {}
        
        # CRITICAL DEBUG: Log transaction count received from snowflake_data
        if isinstance(facts, dict) and "results" in facts:
            results_count = len(facts.get("results", []))
            logger.info(f"🔍 CRITICAL DEBUG: snowflake_data contains {results_count} transactions")
            
            # Also write to debug file
            debug_file = "/tmp/risk_agent_debug.txt"
            with open(debug_file, "a") as f:
                f.write(f"\n{'='*80}\n")
                f.write(f"SNOWFLAKE_DATA EXTRACTION DEBUG\n")
                f.write(f"Time: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(f"Investigation ID: {investigation_id}\n")
                f.write(f"Snowflake data contains {results_count} transactions\n")
                f.write(f"{'='*80}\n")
        else:
            logger.warning("⚠️ CRITICAL DEBUG: snowflake_data has no 'results' key or is not a dict")

        # Get other domains for aggregation narrative
        other_domains = [d for d in domain_findings.values() if isinstance(d, dict)]

        # Generate aggregation narrative
        aggregation_narrative = _generate_aggregation_narrative(facts, domain_findings)

        # Determine fraud floor status for narrative
        # CRITICAL: IS_FRAUD_TX removed - must not use ground truth labels during investigation
        fraud_floor = bool(
            facts.get("chargeback_confirmed")
            or facts.get("manual_case_outcome") == "fraud"
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
                "evidence": [
                    "Investigation cannot produce valid numeric risk score due to insufficient REAL data"
                ],
                "metrics": {},
                "analysis": {
                    "error_type": "insufficient_real_data",
                    "error_message": str(e),
                },
            }
            return add_domain_findings(state, "risk", error_risk_findings)

        # Calculate REAL confidence from domain analysis quality
        try:
            real_confidence = _calculate_real_confidence(
                domain_findings, tools_used, state
            )
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
                "evidence": [
                    "Investigation cannot produce valid confidence score due to insufficient REAL data"
                ],
                "metrics": {},
                "analysis": {
                    "error_type": "insufficient_real_confidence_data",
                    "error_message": str(e),
                },
            }
            return add_domain_findings(state, "risk", error_risk_findings)

        # Initialize risk findings with REAL calculated values
        risk_findings = {
            "domain": "risk",
            "name": "risk",  # Compatibility with domain normalization
            "score": real_risk_score,  # REAL score calculated from domain data
            "risk_score": real_risk_score,  # REAL risk score from domain analysis
            "status": "OK" if real_confidence > 0.3 else "LOW_CONFIDENCE",
            "signals": [],  # No numeric signals for narrative domain
            "confidence": real_confidence,  # REAL confidence from domain quality
            "narrative": _build_risk_narrative(
                aggregation_narrative, fraud_floor, other_domains
            ),
            "provenance": ["aggregator:v1"],  # Track source of narrative
            "risk_indicators": [],
            "evidence": [],  # Collect synthesis evidence for narrative
            "metrics": {},  # Collect metrics for narrative context
            "analysis": {
                "domains_analyzed": list(domain_findings.keys()),
                "tools_used_count": len(tools_used),
                "total_risk_indicators": len(risk_indicators),
                "aggregation_narrative": aggregation_narrative,
                "fraud_floor_applied": fraud_floor,
            },
        }

        # Synthesize domain findings (basic aggregation)
        _synthesize_domain_findings(domain_findings, risk_findings)

        # CRITICAL: Use LLM to synthesize all domain findings with accumulated LLM thoughts
        try:
            llm_synthesis = await _synthesize_with_llm(
                domain_findings=domain_findings,
                snowflake_data=snowflake_data,
                tool_results=state.get("tool_results", {}),
                entity_type=entity_type,
                entity_id=entity_id,
                computed_risk_score=real_risk_score,
            )

            # Store LLM synthesis results
            risk_findings["llm_analysis"] = llm_synthesis
            risk_findings["narrative"] = llm_synthesis.get(
                "reasoning", risk_findings.get("narrative", "")
            )
            risk_findings["recommendations"] = llm_synthesis.get("recommendations", "")
            risk_findings["risk_factors"] = llm_synthesis.get("risk_factors", "")

            logger.info(
                f"[Step 5.2.6] ✅ LLM synthesis complete - Cross-domain patterns identified"
            )
        except Exception as e:
            logger.warning(
                f"[Step 5.2.6] ⚠️ LLM synthesis failed: {e}, using algorithmic synthesis"
            )
            # Fallback to algorithmic synthesis
            _generate_risk_narrative(facts, domain_findings, risk_findings)
            _analyze_cross_domain_patterns(domain_findings, risk_findings)

        # Calculate investigation confidence
        _calculate_investigation_confidence(state, risk_findings)

        # Add synthesis evidence summary
        risk_findings["evidence_summary"] = {
            "domains_synthesized": len(domain_findings),
            "total_risk_indicators": len(risk_indicators),
            "confidence_level": risk_findings[
                "confidence"
            ],  # Use REAL calculated confidence
            "llm_synthesis_used": "llm_analysis" in risk_findings,
        }

        # Finalize findings
        analysis_duration = time.time() - start_time
        DomainAgentBase.finalize_findings(
            risk_findings, {"synthesis": True}, {}, analysis_duration, "risk"
        )

        # Complete logging
        log_agent_handover_complete("risk", risk_findings)
        complete_chain_of_thought(process_id, risk_findings, "risk")

        logger.info(
            f"[Step 5.2.6] ✅ Risk synthesis complete - Narrative-only domain with {len(risk_findings.get('evidence', []))} synthesis points"
        )

        # Calculate per-transaction risk scores
        try:
            # Extract entity info for advanced features
            entity_type = state.get("entity_type")
            entity_value = state.get("entity_id")
            investigation_id = state.get("investigation_id")
            transaction_scores = _calculate_per_transaction_scores(
                facts,
                domain_findings,
                entity_type=entity_type,
                entity_value=entity_value,
                investigation_id=investigation_id,
            )
            if transaction_scores:
                # NON-STREAMING MODE: Store scores in state (legacy behavior for <10K transactions)
                state["transaction_scores"] = transaction_scores
                logger.info(
                    f"[Step 5.2.6] ✅ Per-transaction scores calculated: {len(transaction_scores)} transactions"
                )
                
                # Also save to dedicated transaction_scores table for consistency
                try:
                    from app.service.transaction_score_service import TransactionScoreService
                    
                    TransactionScoreService.save_transaction_scores(
                        investigation_id=investigation_id,
                        transaction_scores=transaction_scores
                    )
                    logger.info(
                        f"[Step 5.2.6] 💾 Saved {len(transaction_scores)} transaction scores to database table"
                    )
                except Exception as save_error:
                    logger.error(
                        f"[Step 5.2.6] ⚠️ Failed to save transaction scores to database table: {save_error}",
                        exc_info=True
                    )
                    # Continue - scores are still in state
            else:
                # STREAMING MODE: Scores already saved to database during processing
                # Check database for score count
                try:
                    from app.service.transaction_score_service import TransactionScoreService
                    db_count = TransactionScoreService.get_score_count(investigation_id)
                    if db_count > 0:
                        logger.info(
                            f"[Step 5.2.6] ✅ STREAMING MODE: {db_count} transaction scores saved to database"
                        )
                        logger.info(f"[Step 5.2.6]    (Scores streamed to DB to avoid memory limits)")
                    else:
                        logger.warning(f"[Step 5.2.6] ⚠️ No per-transaction scores calculated")
                except Exception as check_error:
                    logger.warning(f"[Step 5.2.6] ⚠️ Could not verify database scores: {check_error}")
        except Exception as e:
            logger.error(
                f"[Step 5.2.6] ❌ Per-transaction score calculation failed: {e}",
                exc_info=True,
            )
            # Continue with investigation even if per-transaction scoring fails
            state["transaction_scores"] = {}

        # Update state with risk findings
        return add_domain_findings(state, "risk", risk_findings)

    except Exception as e:
        logger.error(f"❌ Risk agent failed: {str(e)}", exc_info=True)

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
            "analysis": {"error_type": "risk_agent_failure", "error_message": str(e)},
        }

        return add_domain_findings(state, "risk", error_risk_findings)


def _synthesize_domain_findings(
    domain_findings: Dict[str, Any], risk_findings: Dict[str, Any]
) -> None:
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
                risk_findings["evidence"].append(
                    f"{domain.title()} domain evidence: {len(domain_evidence)} points collected"
                )

            if domain_indicators:
                risk_findings["evidence"].append(
                    f"{domain.title()} risk indicators: {', '.join(domain_indicators[:3])}"
                )
                if len(domain_indicators) > 3:
                    risk_findings["evidence"].append(
                        f"... and {len(domain_indicators) - 3} more {domain} indicators"
                    )

    # Store domain risk breakdown
    risk_findings["metrics"]["domain_risk_scores"] = domain_risk_scores
    risk_findings["analysis"]["domain_risk_breakdown"] = domain_risk_scores


def _build_risk_narrative(
    aggregation_narrative: str, fraud_floor: bool, other_domains: List[Dict[str, Any]]
) -> str:
    """Build the main narrative for the risk synthesis domain."""
    # Get counts of active vs blocked domains
    active_domains = [d for d in other_domains if d.get("risk_score") is not None]
    blocked_domains = [d for d in other_domains if d.get("risk_score") is None]

    narrative_parts = [
        f"Risk synthesis: {aggregation_narrative}",
        f"Active scoring domains: {len(active_domains)}, insufficient evidence: {len(blocked_domains)}",
    ]

    if fraud_floor:
        narrative_parts.append(
            "Fraud floor (≥0.60) applied due to confirmed fraud indicators"
        )

    return "; ".join(narrative_parts)


def _generate_aggregation_narrative(
    facts: Dict[str, Any], domain_findings: Dict[str, Any]
) -> str:
    """Generate narrative explaining aggregation decisions."""
    narrative_parts = []

    # Check for hard evidence that triggers fraud floor
    # CRITICAL: No fraud indicators can be used during investigation to prevent data leakage
    # All fraud indicator columns (IS_FRAUD_TX, COUNT_DISPUTES, COUNT_FRAUD_ALERTS, etc.) are excluded
    # Only manual case outcomes can be used (if provided externally, not from Snowflake)
    hard_evidence = []
    if facts.get("manual_case_outcome") == "fraud":
        hard_evidence.append("manual fraud determination")

    if hard_evidence:
        narrative_parts.append(
            f"Fraud floor (≥0.60) applied due to: {', '.join(hard_evidence)}"
        )

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
    numeric_domains = sum(
        1
        for d, f in domain_findings.items()
        if isinstance(f, dict) and f.get("risk_score") is not None
    )
    total_signals = sum(
        len(f.get("signals", []))
        for f in domain_findings.values()
        if isinstance(f, dict)
    )

    if numeric_domains >= 2 or (numeric_domains >= 1 and total_signals >= 2):
        narrative_parts.append("Evidence gating: PASS (sufficient corroboration)")
    else:
        narrative_parts.append("Evidence gating: BLOCK (insufficient corroboration)")

    return "; ".join(narrative_parts)


def _generate_risk_narrative(
    facts: Dict[str, Any],
    domain_findings: Dict[str, Any],
    risk_findings: Dict[str, Any],
) -> None:
    """Generate narrative about risk assessment process."""
    # Describe aggregation process
    aggregation_story = risk_findings["analysis"]["aggregation_narrative"]
    risk_findings["evidence"].append(f"Aggregation: {aggregation_story}")

    # Summarize domain contributions
    active_domains = [
        d
        for d, f in domain_findings.items()
        if isinstance(f, dict) and f.get("risk_score") is not None
    ]
    blocked_domains = [
        d
        for d, f in domain_findings.items()
        if isinstance(f, dict) and f.get("risk_score") is None
    ]

    if active_domains:
        risk_findings["evidence"].append(
            f"Active scoring domains: {', '.join(active_domains)}"
        )
    if blocked_domains:
        risk_findings["evidence"].append(
            f"Insufficient evidence domains: {', '.join(blocked_domains)}"
        )

    # No risk level assignment - narrative only
    risk_findings["risk_indicators"].append(
        "Risk domain provides synthesis narrative only (no numeric score)"
    )


def _analyze_cross_domain_patterns(
    domain_findings: Dict[str, Any], risk_findings: Dict[str, Any]
) -> None:
    """Analyze patterns across multiple domains (narrative only)."""
    if len(domain_findings) >= 3:
        high_risk_domains = []
        for d, f in domain_findings.items():
            if isinstance(f, dict):
                risk_score = f.get("risk_score")
                if risk_score is not None and risk_score > 0.6:
                    high_risk_domains.append(d)

        if len(high_risk_domains) >= 2:
            risk_findings["evidence"].append(
                f"Cross-domain pattern: {len(high_risk_domains)} domains ({', '.join(high_risk_domains)}) show elevated risk"
            )

        # Store cross-domain metrics for narrative context
        risk_findings["metrics"]["high_risk_domains_count"] = len(high_risk_domains)
        risk_findings["analysis"]["high_risk_domains"] = high_risk_domains


def _calculate_investigation_confidence(
    state: InvestigationState, risk_findings: Dict[str, Any]
) -> None:
    """Calculate confidence based on investigation completeness."""
    tools_used = state.get("tools_used", [])
    domain_findings = state.get("domain_findings", {})

    confidence_factors = [
        1.0 if state.get("snowflake_completed") else 0.0,
        min(1.0, len(tools_used) / 20.0),
        min(1.0, len(domain_findings) / 6.0),  # Account for 6 possible domains
    ]

    risk_findings["confidence"] = sum(confidence_factors) / len(confidence_factors)
    risk_findings["metrics"]["confidence_factors"] = {
        "snowflake_complete": confidence_factors[0],
        "tools_factor": confidence_factors[1],
        "domains_factor": confidence_factors[2],
    }

    risk_findings["evidence"].append(
        f"Investigation confidence: {risk_findings['confidence']:.2f} based on "
        f"{len(tools_used)} tools and {len(domain_findings)} domains"
    )


def _calculate_real_risk_score(
    domain_findings: Dict[str, Any], facts: Dict[str, Any]
) -> float:
    """Calculate REAL risk score based on actual domain analysis results with volume weighting."""
    # CRITICAL: No fraud indicators can be used during investigation to prevent data leakage
    # All fraud indicator columns (IS_FRAUD_TX, COUNT_DISPUTES, COUNT_FRAUD_ALERTS, etc.) are excluded
    # Only manual case outcomes can be used (if provided externally, not from Snowflake)
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

                transaction_data.append(
                    {"amount": amount, "risk": tx_risk, "blocked": is_blocked}
                )
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
        if any(
            "NULL" in str(ev)
            or "not available" in str(ev).lower()
            or "missing" in str(ev).lower()
            for ev in device_evidence
        ):
            device_penalty = 0.15  # 15% risk increase for missing device data
            logger.info(
                f"🚨 Device data missing - adding {device_penalty:.3f} risk penalty"
            )

    if not weighted_scores:
        # No valid domain scores - use transaction data as fallback
        if transaction_data and total_amount > 0:
            # Volume-weighted transaction risk
            volume_weighted_risk = (
                sum(tx["risk"] * tx["amount"] for tx in transaction_data) / total_amount
            )
            volume_weighted_risk = min(
                1.0, max(0.0, volume_weighted_risk + device_penalty)
            )
            logger.warning(
                f"⚠️ No domain scores available, using volume-weighted transaction risk: {volume_weighted_risk:.3f}"
            )
            return volume_weighted_risk
        else:
            # No valid data available - investigation should not continue with numeric scoring
            raise ValueError(
                "CRITICAL: Insufficient REAL data for risk calculation - investigation cannot produce valid numeric risk score"
            )

    # Calculate confidence-weighted mean of domain scores
    total_weight = sum(weight for _, weight in weighted_scores)
    if total_weight > 0:
        weighted_avg = (
            sum(score * weight for score, weight in weighted_scores) / total_weight
        )
    else:
        weighted_avg = sum(domain_scores) / len(domain_scores)

    # Apply volume weighting if transaction data is available
    if transaction_data and total_amount > 0:
        # Calculate volume-weighted transaction risk
        volume_weighted_tx_risk = (
            sum(tx["risk"] * tx["amount"] for tx in transaction_data) / total_amount
        )

        # Blend domain-based risk with volume-weighted transaction risk (70:30 ratio)
        blended_risk = (0.7 * weighted_avg) + (0.3 * volume_weighted_tx_risk)
        logger.info(
            f"📊 Volume weighting: domain_risk={weighted_avg:.3f}, tx_risk={volume_weighted_tx_risk:.3f}, blended={blended_risk:.3f}"
        )
        weighted_avg = blended_risk

    # Add device penalty and ensure bounds
    final_risk = min(1.0, max(0.0, weighted_avg + device_penalty))

    return final_risk


def _calculate_real_confidence(
    domain_findings: Dict[str, Any], tools_used: List[str], state: Dict[str, Any]
) -> float:
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
        evidence_confidence = min(
            1.0, total_evidence / 20.0
        )  # Good confidence at 20+ evidence points
        confidence_factors.append(evidence_confidence)

    if not confidence_factors:
        raise ValueError(
            "CRITICAL: No REAL confidence factors available - investigation cannot produce valid confidence score"
        )

    # Calculate weighted average with emphasis on domain quality
    if len(confidence_factors) >= 2:
        # Weight domain confidence higher than other factors
        weighted_confidence = confidence_factors[0] * 0.5 + sum(
            confidence_factors[1:]
        ) * 0.5 / (len(confidence_factors) - 1)
    else:
        weighted_confidence = confidence_factors[0]

    return min(1.0, max(0.0, weighted_confidence))


async def _synthesize_with_llm(
    domain_findings: Dict[str, Any],
    snowflake_data: Dict[str, Any],
    tool_results: Dict[str, Any],
    entity_type: str,
    entity_id: str,
    computed_risk_score: float,
) -> Dict[str, Any]:
    """
    Synthesize all domain findings using LLM to generate comprehensive cross-domain analysis.

    This function:
    1. Collects all domain LLM analyses and risk scores
    2. Detects cross-domain patterns (contradictions, correlations)
    3. Identifies velocity bursts and amount clustering
    4. Extracts specific values (IPs, devices, emails) for recommendations
    5. Provides prioritized, actionable recommendations
    """
    from app.service.agent.evidence_analyzer import get_evidence_analyzer

    logger.info("[Step 5.2.6] 🧠 Starting LLM synthesis of all domain findings")

    # Collect domain LLM analyses and risk scores
    domain_llm_analyses = {}
    domain_risk_scores = {}

    for domain_name, findings in domain_findings.items():
        if isinstance(findings, dict):
            # Extract LLM analysis if available
            llm_analysis = findings.get("llm_analysis", {})
            if llm_analysis:
                domain_llm_analyses[domain_name] = {
                    "risk_score": findings.get("risk_score"),
                    "confidence": llm_analysis.get("confidence"),
                    "risk_factors": llm_analysis.get("risk_factors", ""),
                    "reasoning": llm_analysis.get("reasoning", ""),
                    "recommendations": llm_analysis.get("recommendations", ""),
                    "llm_response": llm_analysis.get("llm_response", ""),
                }
            else:
                # Fallback: use basic findings
                domain_llm_analyses[domain_name] = {
                    "risk_score": findings.get("risk_score"),
                    "confidence": findings.get("confidence"),
                    "evidence": findings.get("evidence", []),
                    "risk_indicators": findings.get("risk_indicators", []),
                }

            domain_risk_scores[domain_name] = findings.get("risk_score")

    # Format domain analyses for LLM
    domain_analyses_text = _format_domain_analyses_for_synthesis(domain_llm_analyses)

    # Detect patterns in Snowflake data
    patterns_text = _detect_patterns_in_data(snowflake_data)

    # Format tool results
    tool_results_text = _format_tool_results_for_synthesis(tool_results)

    # Create synthesis prompt
    synthesis_prompt = f"""Synthesize findings from all domain analyses to provide comprehensive fraud risk assessment.

## Entity Information
- Type: {entity_type}
- ID: {entity_id}
- Overall Risk Score: {computed_risk_score:.3f}

## Domain Analyses
{domain_analyses_text}

## Transaction Patterns Detected
{patterns_text}

## Tool Execution Results
{tool_results_text}

## Synthesis Requirements

CRITICAL TASKS:
1. **Cross-Domain Pattern Detection:**
   - Identify contradictions (e.g., device consistency + IP rotation)
   - Detect correlations across domains
   - Explain why patterns are suspicious or legitimate

2. **Velocity & Amount Pattern Analysis:**
   - Identify velocity bursts (multiple transactions in short time)
   - Detect identical amounts in rapid succession
   - Correlate timing patterns with IP/device changes
   - Flag templated/batch processing patterns

3. **Extract Specific Values:**
   - Extract exact IP addresses mentioned in analyses
   - Extract device fingerprints
   - Extract email addresses
   - Extract transaction amounts and timing patterns

4. **Data Gap Analysis:**
   - List specific missing data sources
   - Explain impact on assessment confidence
   - Prioritize which gaps are most critical

5. **Prioritized Recommendations:**
   - Provide specific, actionable recommendations with exact values
   - Prioritize by criticality (CRITICAL, HIGH, MEDIUM, LOW)
   - Include exact IPs, devices, emails to check
   - Format as actionable checklists

## Output Format

Provide comprehensive synthesis with:

1. **RISK FACTORS:**
   - List key risk factors identified across domains
   - Highlight cross-domain patterns and contradictions
   - Include velocity bursts and amount clustering patterns

2. **REASONING:**
   - Comprehensive multi-paragraph explanation
   - Synthesize domain findings (don't just list them)
   - Explain cross-domain patterns
   - Reference specific evidence and anomalies

3. **RECOMMENDATIONS:**
   - Prioritized list with exact values to check
   - Format: [PRIORITY] Action: specific_value
   - Include IPs, devices, emails extracted from analysis
   - Provide specific verification steps

4. **DATA GAPS:**
   - List missing data sources
   - Explain impact on confidence
   - Prioritize critical gaps

Focus on actionable insights and specific values for investigation."""

    # Use evidence analyzer for synthesis (reuse existing LLM infrastructure)
    evidence_analyzer = get_evidence_analyzer()

    # Create system prompt for synthesis
    system_prompt = """You are a fraud risk synthesis expert specializing in cross-domain pattern analysis and comprehensive risk assessment.

Your task is to synthesize findings from multiple domain analyses (network, device, location, logs, authentication) to provide:
1. Cross-domain pattern detection and explanation
2. Velocity burst and amount clustering identification
3. Specific value extraction for actionable recommendations
4. Data gap analysis with impact assessment
5. Prioritized, specific recommendations with exact values

CRITICAL: Extract specific values (IPs, devices, emails) from domain analyses and include them in recommendations.
CRITICAL: Identify contradictions and correlations across domains.
CRITICAL: Detect velocity bursts and identical amount patterns."""

    try:
        # Call LLM for synthesis
        from langchain_core.messages import HumanMessage, SystemMessage

        system_msg = SystemMessage(content=system_prompt)
        human_msg = HumanMessage(content=synthesis_prompt)

        logger.info("[Step 5.2.6] 🤖 Invoking LLM for cross-domain synthesis...")
        response = await evidence_analyzer.llm.ainvoke([system_msg, human_msg])

        # Parse response
        response_content = (
            response.content if hasattr(response, "content") else response
        )
        if isinstance(response_content, dict):
            response_content = response_content.get("content", str(response_content))

        # Parse synthesis result
        synthesis_result = _parse_synthesis_response(
            response_content, computed_risk_score
        )

        logger.info("[Step 5.2.6] ✅ LLM synthesis complete")
        return synthesis_result

    except Exception as e:
        logger.error(f"❌ LLM synthesis failed: {e}")
        # Return fallback synthesis
        return {
            "risk_factors": "Synthesis failed - using algorithmic aggregation",
            "reasoning": f"LLM synthesis unavailable: {str(e)}",
            "recommendations": "Manual review recommended",
            "llm_response": (
                str(response_content) if "response_content" in locals() else ""
            ),
        }


def _format_domain_analyses_for_synthesis(domain_llm_analyses: Dict[str, Any]) -> str:
    """Format domain LLM analyses for synthesis prompt."""
    formatted = []

    for domain_name, analysis in domain_llm_analyses.items():
        formatted.append(f"\n### {domain_name.upper()} Domain:")
        formatted.append(f"- Risk Score: {analysis.get('risk_score', 'N/A')}")
        formatted.append(f"- Confidence: {analysis.get('confidence', 'N/A')}")

        if analysis.get("risk_factors"):
            formatted.append(f"- Risk Factors:\n{analysis['risk_factors']}")

        if analysis.get("reasoning"):
            formatted.append(f"- Reasoning:\n{analysis['reasoning']}")

        if analysis.get("recommendations"):
            formatted.append(f"- Recommendations:\n{analysis['recommendations']}")

    return "\n".join(formatted)


def _detect_patterns_in_data(snowflake_data: Dict[str, Any]) -> str:
    """Detect velocity bursts and amount clustering patterns in transaction data."""
    if not isinstance(snowflake_data, dict) or "results" not in snowflake_data:
        return "No transaction data available for pattern detection"

    results = snowflake_data["results"]
    if not isinstance(results, list) or len(results) < 2:
        return "Insufficient transaction data for pattern detection"

    # Extract transaction data
    transactions = []
    for result in results:
        if isinstance(result, dict):
            tx_id = result.get("TX_ID_KEY") or result.get("tx_id_key", "")
            datetime_str = result.get("TX_DATETIME") or result.get("tx_datetime", "")
            amount = result.get("PAID_AMOUNT_VALUE_IN_CURRENCY") or result.get(
                "paid_amount_value_in_currency", 0
            )
            ip = result.get("IP") or result.get("ip", "")
            device = result.get("DEVICE_ID") or result.get("device_id", "")

            try:
                from datetime import datetime

                tx_datetime = datetime.fromisoformat(
                    str(datetime_str).replace("Z", "+00:00")
                )
                transactions.append(
                    {
                        "id": tx_id,
                        "datetime": tx_datetime,
                        "amount": float(amount) if amount else 0,
                        "ip": ip,
                        "device": device,
                    }
                )
            except:
                continue

    if len(transactions) < 2:
        return "Insufficient valid transaction data for pattern detection"

    # Sort by datetime
    transactions.sort(key=lambda x: x["datetime"])

    patterns = []

    # Detect velocity bursts (multiple transactions within short time)
    for i in range(len(transactions) - 1):
        time_diff = (
            transactions[i + 1]["datetime"] - transactions[i]["datetime"]
        ).total_seconds() / 60  # minutes
        if time_diff <= 5:  # Within 5 minutes
            patterns.append(
                f"Velocity burst detected: Transaction {i+1} and {i+2} within {time_diff:.1f} minutes"
            )

    # Detect identical amounts
    amount_groups = {}
    for tx in transactions:
        amount = tx["amount"]
        if amount not in amount_groups:
            amount_groups[amount] = []
        amount_groups[amount].append(tx)

    for amount, tx_list in amount_groups.items():
        if len(tx_list) >= 2:
            patterns.append(
                f"Identical amount pattern: ${amount:,.2f} appears {len(tx_list)} times"
            )
            # Check if they're close in time
            if len(tx_list) >= 2:
                time_diffs = []
                for i in range(len(tx_list) - 1):
                    diff = (
                        tx_list[i + 1]["datetime"] - tx_list[i]["datetime"]
                    ).total_seconds() / 60
                    time_diffs.append(diff)
                if any(diff <= 5 for diff in time_diffs):
                    patterns.append(
                        f"  → Burst pattern: ${amount:,.2f} transactions within 5 minutes"
                    )

    # Detect IP rotation with same device
    device_ip_map = {}
    for tx in transactions:
        device = tx["device"]
        ip = tx["ip"]
        if device not in device_ip_map:
            device_ip_map[device] = set()
        device_ip_map[device].add(ip)

    for device, ips in device_ip_map.items():
        if len(ips) > 1:
            patterns.append(
                f"IP rotation detected: Device {device[:30]}... used {len(ips)} different IPs: {', '.join(list(ips)[:3])}"
            )

    if patterns:
        return "\n".join(patterns)
    else:
        return "No significant patterns detected in transaction data"


def _format_tool_results_for_synthesis(tool_results: Dict[str, Any]) -> str:
    """Format tool results for synthesis prompt."""
    if not tool_results:
        return "No tool execution results available - CRITICAL DATA GAP"

    formatted = ["Tool Execution Results:"]
    for tool_name, tool_content in tool_results.items():
        formatted.append(f"\n- {tool_name}: {str(tool_content)[:200]}...")

    return "\n".join(formatted)


def _parse_synthesis_response(
    response_content: str, computed_risk_score: float
) -> Dict[str, Any]:
    """Parse LLM synthesis response."""
    import re

    # Extract sections
    risk_factors = _extract_section(response_content, "risk factors")
    reasoning = _extract_section(response_content, "reasoning")
    recommendations = _extract_section(response_content, "recommendations")
    data_gaps = _extract_section(response_content, "data gaps")

    return {
        "risk_score": computed_risk_score,
        "risk_factors": risk_factors or "Risk factors not clearly identified",
        "reasoning": reasoning
        or response_content[:1000],  # Fallback to first 1000 chars
        "recommendations": recommendations or "Recommendations not clearly identified",
        "data_gaps": data_gaps or "",
        "llm_response": response_content,
    }


def _extract_section(text: str, section_name: str) -> str:
    """Extract a specific section from LLM response."""
    import re

    patterns = [
        rf"(?:^|\n)\s*\*\*{section_name}[:\s]*\*\*[:\s]*([\s\S]*?)(?=\n\s*\*\*|\n\s*##|\n\s*$|$)",
        rf"(?:^|\n)\s*#{1,3}\s*{section_name}[:\s]*([\s\S]*?)(?=\n\s*#|\n\s*$|$)",
        rf"(?:^|\n)\s*\d+\.\s*\*\*{section_name}[:\s]*\*\*[:\s]*([\s\S]*?)(?=\n\s*\d+\.|\n\s*$|$)",
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()

    return ""


# ============================================================================
# Per-Transaction Risk Scoring Functions
# ============================================================================


def _validate_transaction_score(score: float) -> bool:
    """
    Validate that a transaction risk score is in valid range [0.0, 1.0].

    Args:
        score: Risk score to validate

    Returns:
        True if score is in valid range [0.0, 1.0], False otherwise
    """
    if not isinstance(score, (int, float)):
        return False
    return 0.0 <= score <= 1.0


def _extract_transaction_features(tx: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract and normalize transaction features for per-transaction scoring.

    CRITICAL: Must NOT access MODEL_SCORE or NSURE_LAST_DECISION per FR-005.

    Args:
        tx: Transaction dictionary from facts["results"]

    Returns:
        Dictionary with extracted features:
        - amount: float (PAID_AMOUNT_VALUE_IN_CURRENCY)
        - merchant: str (MERCHANT_NAME)
        - device: str (DEVICE_ID)
        - location: str (IP_COUNTRY_CODE)
    """
    features = {
        "amount": tx.get("PAID_AMOUNT_VALUE_IN_CURRENCY") or 0.0,
        "merchant": tx.get("MERCHANT_NAME") or None,
        "device": tx.get("DEVICE_ID") or None,
        "location": tx.get("IP_COUNTRY_CODE") or None,
    }

    # Ensure amount is float
    try:
        features["amount"] = (
            float(features["amount"]) if features["amount"] is not None else 0.0
        )
    except (ValueError, TypeError):
        features["amount"] = 0.0

    return features


def _count_critical_features(features: Dict[str, Any]) -> int:
    """
    Count available critical features (amount, merchant, device, location).

    Args:
        features: Dictionary from _extract_transaction_features()

    Returns:
        Number of critical features available (0-4)
    """
    count = 0

    # Amount is considered available if > 0
    if features.get("amount", 0.0) > 0.0:
        count += 1

    # Merchant, device, location are considered available if not None and not empty
    if features.get("merchant"):
        count += 1
    if features.get("device"):
        count += 1
    if features.get("location"):
        count += 1

    return count


def _normalize_amount_feature(amount: float, max_amount: float) -> float:
    """
    Normalize transaction amount to [0,1] range based on max amount in investigation.

    Args:
        amount: Transaction amount
        max_amount: Maximum amount in investigation (for normalization)

    Returns:
        Normalized amount in [0,1] range
    """
    if max_amount <= 0:
        return 0.0

    normalized = amount / max_amount
    return min(1.0, max(0.0, normalized))


def _normalize_merchant_feature(
    merchant_name: Optional[str], domain_findings: Dict[str, Any]
) -> float:
    """
    Extract merchant risk from domain findings.

    Checks merchant_risks dict first, falls back to aggregate merchant.risk_score.

    Args:
        merchant_name: Merchant identifier from transaction
        domain_findings: Domain findings dictionary

    Returns:
        Merchant risk score in [0,1] range, or 0.5 if not found
    """
    if not merchant_name:
        return 0.5  # Default moderate risk for missing merchant

    merchant_domain = domain_findings.get("merchant", {})
    if not isinstance(merchant_domain, dict):
        return 0.5

    # Check for entity-specific mapping first
    merchant_risks = merchant_domain.get("merchant_risks", {})
    if isinstance(merchant_risks, dict) and merchant_name in merchant_risks:
        risk_score = merchant_risks[merchant_name]
        if isinstance(risk_score, (int, float)) and 0 <= risk_score <= 1.0:
            return float(risk_score)

    # Fallback to aggregate merchant risk score
    aggregate_score = merchant_domain.get("risk_score")
    if aggregate_score is not None:
        try:
            score_float = float(aggregate_score)
            if 0 <= score_float <= 1.0:
                return score_float
        except (ValueError, TypeError):
            pass

    return 0.5  # Default moderate risk


def _normalize_device_feature(
    device_id: Optional[str], domain_findings: Dict[str, Any]
) -> float:
    """
    Extract device risk from domain findings.

    Checks device_risks dict first, falls back to aggregate device.risk_score.

    Args:
        device_id: Device identifier from transaction
        domain_findings: Domain findings dictionary

    Returns:
        Device risk score in [0,1] range, or 0.5 if not found
    """
    if not device_id:
        return 0.5  # Default moderate risk for missing device

    device_domain = domain_findings.get("device", {})
    if not isinstance(device_domain, dict):
        return 0.5

    # Check for entity-specific mapping first
    device_risks = device_domain.get("device_risks", {})
    if isinstance(device_risks, dict) and device_id in device_risks:
        risk_score = device_risks[device_id]
        if isinstance(risk_score, (int, float)) and 0 <= risk_score <= 1.0:
            return float(risk_score)

    # Fallback to aggregate device risk score
    aggregate_score = device_domain.get("risk_score")
    if aggregate_score is not None:
        try:
            score_float = float(aggregate_score)
            if 0 <= score_float <= 1.0:
                return score_float
        except (ValueError, TypeError):
            pass

    return 0.5  # Default moderate risk


def _normalize_location_feature(
    location_code: Optional[str], domain_findings: Dict[str, Any]
) -> float:
    """
    Extract location risk from domain findings.

    Checks location/network domain findings, falls back to aggregate risk_score.

    Args:
        location_code: IP country code from transaction
        domain_findings: Domain findings dictionary

    Returns:
        Location risk score in [0,1] range, or 0.5 if not found
    """
    if not location_code:
        return 0.5  # Default moderate risk for missing location

    # Check location domain first
    location_domain = domain_findings.get("location", {})
    if isinstance(location_domain, dict):
        aggregate_score = location_domain.get("risk_score")
        if aggregate_score is not None:
            try:
                score_float = float(aggregate_score)
                if 0 <= score_float <= 1.0:
                    return score_float
            except (ValueError, TypeError):
                pass

    # Fallback to network domain
    network_domain = domain_findings.get("network", {})
    if isinstance(network_domain, dict):
        aggregate_score = network_domain.get("risk_score")
        if aggregate_score is not None:
            try:
                score_float = float(aggregate_score)
                if 0 <= score_float <= 1.0:
                    return score_float
            except (ValueError, TypeError):
                pass

    return 0.5  # Default moderate risk


def _calculate_feature_score(
    normalized_amount: float,
    normalized_merchant: float,
    normalized_device: float,
    normalized_location: float,
    advanced_features: Optional[Dict[str, Any]] = None,
) -> float:
    """
    Calculate feature_score using normalized weighted average with advanced features.

    Base formula: (normalized_amount + normalized_merchant + normalized_device + normalized_location) / 4
    Enhanced with: velocity, geovelocity, amount patterns, device stability, merchant consistency

    Args:
        normalized_amount: Normalized amount feature [0,1]
        normalized_merchant: Normalized merchant feature [0,1]
        normalized_device: Normalized device feature [0,1]
        normalized_location: Normalized location feature [0,1]
        advanced_features: Optional advanced features dictionary

    Returns:
        Enhanced feature score in [0,1] range
    """
    # Base feature score (60% weight)
    base_score = (
        normalized_amount
        + normalized_merchant
        + normalized_device
        + normalized_location
    ) / 4.0

    # Advanced features score (40% weight)
    advanced_score = 0.0
    if advanced_features:
        # Velocity features (25% of advanced score)
        velocity_score = min(
            1.0,
            (
                (advanced_features.get("tx_per_5min_by_email", 0) / 10.0) * 0.33
                + (advanced_features.get("tx_per_5min_by_device", 0) / 10.0) * 0.33
                + (advanced_features.get("tx_per_5min_by_ip", 0) / 10.0) * 0.34
            ),
        )

        # Geovelocity features (25% of advanced score)
        geovelocity_score = advanced_features.get("distance_anomaly_score", 0)

        # Amount patterns (20% of advanced score)
        amount_score = advanced_features.get("amount_clustering_score", 0)

        # Device stability (15% of advanced score)
        device_score = advanced_features.get("device_instability_score", 0)

        # Merchant consistency (15% of advanced score)
        merchant_score = 1.0 - advanced_features.get(
            "merchant_diversity_score", 0.5
        )  # Low diversity = higher risk

        # Weighted average of advanced features
        advanced_score = (
            velocity_score * 0.25
            + geovelocity_score * 0.25
            + amount_score * 0.20
            + device_score * 0.15
            + merchant_score * 0.15
        )

    # Combine base and advanced scores
    feature_score = (base_score * 0.6) + (advanced_score * 0.4)
    return min(1.0, max(0.0, feature_score))


def _calculate_domain_score(
    tx: Dict[str, Any], domain_findings: Dict[str, Any]
) -> float:
    """
    Calculate confidence-weighted average of matched domain findings for a transaction.

    Properly matches transaction features to entity-specific mappings in domain findings:
    - merchant → merchant_risks dict (entity-specific) or aggregate merchant.risk_score
    - device → device_risks dict (entity-specific) or aggregate device.risk_score
    - location → location/network domain findings

    Weights each domain by its confidence score, defaults to equal weights if confidence unavailable.

    Args:
        tx: Transaction dictionary
        domain_findings: Domain findings dictionary

    Returns:
        Domain score in [0,1] range
    """
    matched_scores = []
    weights = []

    # Match transaction features to domain findings
    merchant_name = tx.get("MERCHANT_NAME")
    device_id = tx.get("DEVICE_ID")
    location_code = tx.get("IP_COUNTRY_CODE")

    # Merchant domain - check entity-specific mapping first
    merchant_domain = domain_findings.get("merchant", {})
    if isinstance(merchant_domain, dict):
        score = None
        confidence = merchant_domain.get("confidence", 0.5)

        # Check for entity-specific merchant_risks mapping first
        if merchant_name:
            merchant_risks = merchant_domain.get("merchant_risks", {})
            if isinstance(merchant_risks, dict) and merchant_name in merchant_risks:
                score = merchant_risks[merchant_name]

        # Fallback to aggregate merchant risk_score if no entity-specific mapping
        if score is None:
            score = merchant_domain.get("risk_score")

        if score is not None:
            try:
                score_float = float(score)
                if 0 <= score_float <= 1.0:
                    matched_scores.append(score_float)
                    weights.append(float(confidence) if confidence is not None else 0.5)
            except (ValueError, TypeError):
                pass

    # Device domain - check entity-specific mapping first
    device_domain = domain_findings.get("device", {})
    if isinstance(device_domain, dict):
        score = None
        confidence = device_domain.get("confidence", 0.5)

        # Check for entity-specific device_risks mapping first
        if device_id:
            device_risks = device_domain.get("device_risks", {})
            if isinstance(device_risks, dict) and device_id in device_risks:
                score = device_risks[device_id]

        # Fallback to aggregate device risk_score if no entity-specific mapping
        if score is None:
            score = device_domain.get("risk_score")

        if score is not None:
            try:
                score_float = float(score)
                if 0 <= score_float <= 1.0:
                    matched_scores.append(score_float)
                    weights.append(float(confidence) if confidence is not None else 0.5)
            except (ValueError, TypeError):
                pass

    # Location/Network domain - use aggregate score (no entity-specific mappings typically)
    location_domain = domain_findings.get("location", {}) or domain_findings.get(
        "network", {}
    )
    if isinstance(location_domain, dict):
        score = location_domain.get("risk_score")
        confidence = location_domain.get("confidence", 0.5)
        if score is not None:
            try:
                score_float = float(score)
                if 0 <= score_float <= 1.0:
                    matched_scores.append(score_float)
                    weights.append(float(confidence) if confidence is not None else 0.5)
            except (ValueError, TypeError):
                pass

    # Calculate weighted average
    if not matched_scores:
        return 0.5  # Default moderate risk if no domain scores available

    total_weight = sum(weights)
    if total_weight > 0:
        weighted_avg = (
            sum(score * weight for score, weight in zip(matched_scores, weights))
            / total_weight
        )
    else:
        weighted_avg = sum(matched_scores) / len(matched_scores)

    return min(1.0, max(0.0, weighted_avg))


def _calculate_per_transaction_score(
    feature_score: float, domain_score: float
) -> float:
    """
    Calculate single transaction score using formula: tx_score = 0.6 * feature_score + 0.4 * domain_score

    Args:
        feature_score: Feature score in [0,1] range
        domain_score: Domain score in [0,1] range

    Returns:
        Transaction risk score in [0,1] range
    """
    tx_score = (0.6 * feature_score) + (0.4 * domain_score)
    return min(1.0, max(0.0, tx_score))


def _calculate_per_transaction_scores(
    facts: Dict[str, Any],
    domain_findings: Dict[str, Any],
    entity_type: Optional[str] = None,
    entity_value: Optional[str] = None,
    investigation_id: Optional[str] = None,
) -> Dict[str, float]:
    """
    Process all transactions in facts["results"], validate features, calculate scores.

    CRITICAL: Must NOT use MODEL_SCORE or NSURE_LAST_DECISION per FR-005.

    Features:
    - STREAMING BATCH PROCESSING: Process in chunks, save incrementally to database
    - Memory-efficient: Never holds all scores in memory
    - Configurable batch size (default: 5000 transactions per batch)
    - Incremental database saves prevent data loss on timeout/crash
    - Progress tracking with detailed logging
    - Advanced feature engineering (entity-scoped velocity, geovelocity, amount patterns)
    - Calibration and rule-overrides (clean-intel veto, impossible travel hard block)

    Args:
        facts: Facts dictionary containing "results" list of transactions
        domain_findings: Domain findings dictionary
        entity_type: Optional entity type for entity-scoped features
        entity_value: Optional entity value for entity-scoped features
        investigation_id: Investigation ID for saving scores to database

    Returns:
        Dictionary mapping TX_ID_KEY to risk score (float 0.0-1.0)
        NOTE: For large volumes (>10K), returns empty dict and saves directly to database
    """
    # Use module-level imports (imported at top of file)
    import os
    
    start_time = time.time()
    
    # Get batch size from environment (default: 5000 transactions per batch)
    batch_size = int(os.getenv("INVESTIGATION_SCORING_BATCH_SIZE", "5000"))
    
    # Get timeout from environment (default: 3600 seconds = 60 minutes)
    timeout_seconds = float(os.getenv("INVESTIGATION_PER_TX_SCORING_TIMEOUT", "3600"))

    if not isinstance(facts, dict) or "results" not in facts:
        logger.warning(
            "⚠️ No transaction results found in facts for per-transaction scoring"
        )
        return {}

    results = facts["results"]
    if not isinstance(results, list):
        logger.warning("⚠️ facts['results'] is not a list for per-transaction scoring")
        return {}

    if not results:
        logger.warning("⚠️ Empty transaction results list for per-transaction scoring")
        return {}
    
    # MERCHANT INVESTIGATION: Use Enhanced Risk Scorer with outlier detection
    if entity_type and entity_type.lower() in ["merchant", "merchant_name"]:
        logger.info(
            f"🎯 MERCHANT INVESTIGATION DETECTED: Using Enhanced Risk Scorer with outlier detection "
            f"for {len(results)} transactions (merchant: {entity_value or 'unknown'})"
        )
        try:
            from app.service.investigation.enhanced_risk_scorer import EnhancedRiskScorer
            
            scorer = EnhancedRiskScorer()
            result = scorer.calculate_entity_risk(
                transactions=results,
                entity_id=entity_value or "unknown",
                entity_type=entity_type,
                is_merchant_investigation=True
            )
            
            transaction_scores = result.get("transaction_scores", {})
            
            if not transaction_scores:
                logger.warning(
                    "⚠️ Enhanced Risk Scorer returned no transaction scores for merchant investigation"
                )
                # Fall through to legacy scoring
            else:
                # Save scores to database immediately
                if investigation_id:
                    from app.service.transaction_score_service import TransactionScoreService
                    TransactionScoreService.save_transaction_scores(
                        investigation_id=investigation_id,
                        transaction_scores=transaction_scores
                    )
                    logger.info(
                        f"💾 Saved {len(transaction_scores)} merchant outlier scores to database"
                    )
                
                # Return scores
                logger.info(
                    f"✅ MERCHANT OUTLIER SCORING: {len(transaction_scores)} transactions scored "
                    f"in {time.time() - start_time:.2f}s"
                )
                return transaction_scores
        except Exception as e:
            logger.error(
                f"❌ Enhanced Risk Scorer failed for merchant investigation: {e}",
                exc_info=True
            )
            logger.warning("⚠️ Falling back to legacy domain-based scoring")
            # Fall through to legacy scoring
    
    # LEGACY SCORING (for non-merchant investigations or if Enhanced Risk Scorer failed)

    total_transactions = len(results)
    
    logger.info(
        f"📊 STREAMING BATCH SCORING: {total_transactions} transactions in {batch_size}-tx batches"
    )
    logger.info(
        f"⏱️  Timeout: {timeout_seconds}s | Investigation: {investigation_id or 'N/A'}"
    )

    # FR-005 Compliance: Validate that MODEL_SCORE and NSURE_LAST_DECISION are not used
    # Check first transaction as sample - if these fields exist, log warning but continue
    # (they may exist in data but we must not use them)
    sample_tx = results[0] if results else {}
    if isinstance(sample_tx, dict):
        if "MODEL_SCORE" in sample_tx or "model_score" in sample_tx:
            logger.debug(
                "⚠️ MODEL_SCORE field detected in transaction data - will not be used per FR-005"
            )
        if "NSURE_LAST_DECISION" in sample_tx or "nsure_last_decision" in sample_tx:
            logger.debug(
                "⚠️ NSURE_LAST_DECISION field detected in transaction data - will not be used per FR-005"
            )

    # Calculate max amount for normalization
    max_amount = 0.0
    for result in results:
        if isinstance(result, dict):
            amount = result.get("PAID_AMOUNT_VALUE_IN_CURRENCY", 0.0) or 0.0
            try:
                amount_float = float(amount)
                max_amount = max(max_amount, amount_float)
            except (ValueError, TypeError):
                pass

    # Extract advanced features once for all transactions (entity-scoped features need full context)
    advanced_features = {}
    try:
        from app.service.agent.orchestration.domain_agents.advanced_features import (
            extract_all_advanced_features,
        )

        advanced_features = extract_all_advanced_features(
            results,  # Use all transactions for context
            entity_type=entity_type or "unknown",
            entity_value=entity_value or "unknown",
        )
        logger.info(f"📊 Extracted advanced features: {len(advanced_features)} metrics")
    except Exception as e:
        logger.debug(f"Failed to extract advanced features: {e}")
        advanced_features = {}

    # Run pattern recognition once for all transactions (Week 3 Phase 1 integration)
    pattern_recognition_result = {}
    all_detected_patterns = []
    try:
        from app.service.agent.orchestration.domain_agents.historical_pattern_manager import (
            HistoricalPatternManager,
        )
        from app.service.agent.orchestration.domain_agents.pattern_recognition_integration import (
            recognize_all_patterns,
        )

        # Load historical patterns for improved recognition accuracy
        historical_patterns = None
        try:
            pattern_manager = HistoricalPatternManager()
            historical_patterns = pattern_manager.load_historical_patterns(
                entity_type=entity_type
            )
            if historical_patterns:
                logger.info(
                    f"📚 Loaded {len(historical_patterns)} historical patterns for pattern learning"
                )
        except Exception as e:
            logger.debug(f"Could not load historical patterns: {e}")

        pattern_recognition_result = recognize_all_patterns(
            transactions=results,
            minimum_support=0.1,  # Aggressive high-recall strategy
            historical_patterns=historical_patterns,
        )
        if pattern_recognition_result.get("success"):
            all_detected_patterns = pattern_recognition_result.get("patterns", [])
            logger.info(
                f"🔍 Pattern recognition complete: {pattern_recognition_result.get('total_patterns', 0)} patterns detected "
                f"(max risk: +{pattern_recognition_result.get('max_risk_adjustment', 0)*100:.0f}%)"
            )

            # Save detected patterns to historical storage for future learning
            if all_detected_patterns:
                try:
                    pattern_manager.save_patterns(
                        patterns=all_detected_patterns,
                        entity_type=entity_type,
                        entity_value=entity_value,
                        investigation_id=investigation_id or "unknown",
                    )
                except Exception as e:
                    logger.debug(f"Could not save historical patterns: {e}")

            # Store pattern findings in domain_findings for LLM synthesis
            if "pattern_recognition" not in domain_findings:
                domain_findings["pattern_recognition"] = {}
            domain_findings["pattern_recognition"]["patterns"] = all_detected_patterns
            domain_findings["pattern_recognition"][
                "summary"
            ] = pattern_recognition_result
        else:
            logger.warning(
                f"⚠️ Pattern recognition failed: {pattern_recognition_result.get('error', 'unknown error')}"
            )
    except Exception as e:
        logger.debug(f"Pattern recognition failed: {e}")
        pattern_recognition_result = {}
        all_detected_patterns = []

    # STREAMING BATCH PROCESSING: Process in large batches, save to DB incrementally
    # ALWAYS use streaming when investigation_id is present to ensure confusion tables work
    # (Confusion tables require scores in database, not just in memory/state)
    use_streaming_env = os.getenv("INVESTIGATION_USE_STREAMING_SCORING", "true").lower() == "true"
    use_streaming = investigation_id and use_streaming_env
    
    if use_streaming:
        logger.info(
            f"💾 STREAMING MODE: Saving scores directly to database (investigation: {investigation_id})"
        )
        from app.service.transaction_score_service import TransactionScoreService
        # Clear any existing scores for this investigation
        TransactionScoreService.delete_transaction_scores(investigation_id)
    
    excluded_count = 0
    processed_count = 0
    batch_scores = {}  # Temporary batch storage
    start_time = time.time()  # Track processing start time for timeout

    for batch_start in range(0, total_transactions, batch_size):
        # Check timeout
        elapsed_time = time.time() - start_time
        if elapsed_time > timeout_seconds:
            # Save partial results before timeout
            if use_streaming and batch_scores:
                logger.info(f"💾 Saving partial batch ({len(batch_scores)} scores) before timeout...")
                TransactionScoreService.save_transaction_scores(investigation_id, batch_scores)
            logger.warning(
                f"⚠️ Per-transaction scoring timeout after {elapsed_time:.1f}s "
                f"(processed {processed_count}/{total_transactions} transactions). "
                f"Saved {processed_count} scores to database."
            )
            break

        batch_end = min(batch_start + batch_size, total_transactions)
        batch = results[batch_start:batch_end]
        batch_num = batch_start // batch_size + 1
        total_batches = (total_transactions + batch_size - 1) // batch_size

        logger.info(
            f"📊 Processing batch {batch_num}/{total_batches} "
            f"({len(batch)} transactions, {batch_start + 1}-{batch_end})"
        )

        # Process each transaction in batch
        for result in batch:
            try:
                if not isinstance(result, dict):
                    excluded_count += 1
                    logger.debug("⚠️ Transaction is not a dict, excluding")
                    continue

                tx_id = result.get("TX_ID_KEY")
                if not tx_id:
                    excluded_count += 1
                    logger.debug(
                        f"⚠️ Transaction missing TX_ID_KEY, excluding from per-transaction scoring"
                    )
                    continue

                # Extract features with error handling
                try:
                    features = _extract_transaction_features(result)
                except Exception as e:
                    excluded_count += 1
                    logger.warning(
                        f"⚠️ Failed to extract features for transaction {tx_id}: {e}"
                    )
                    continue

                # Validate critical features (require at least 2 of 4)
                try:
                    critical_count = _count_critical_features(features)
                    if critical_count < 2:
                        excluded_count += 1
                        logger.debug(
                            f"⚠️ Transaction {tx_id} has insufficient features ({critical_count}/4), "
                            f"excluding from per-transaction scoring"
                        )
                        continue
                except Exception as e:
                    excluded_count += 1
                    logger.warning(
                        f"⚠️ Failed to count critical features for transaction {tx_id}: {e}"
                    )
                    continue

                # Advanced features are already extracted above (shared across all transactions)
                # Normalize features with error handling
                try:
                    normalized_amount = _normalize_amount_feature(
                        features["amount"], max_amount if max_amount > 0 else 1.0
                    )
                    normalized_merchant = _normalize_merchant_feature(
                        features["merchant"], domain_findings
                    )
                    normalized_device = _normalize_device_feature(
                        features["device"], domain_findings
                    )
                    normalized_location = _normalize_location_feature(
                        features["location"], domain_findings
                    )
                except Exception as e:
                    excluded_count += 1
                    logger.warning(
                        f"⚠️ Failed to normalize features for transaction {tx_id}: {e}"
                    )
                    continue

                # Calculate feature score with error handling (includes advanced features)
                try:
                    feature_score = _calculate_feature_score(
                        normalized_amount,
                        normalized_merchant,
                        normalized_device,
                        normalized_location,
                        advanced_features=advanced_features,
                    )
                except Exception as e:
                    excluded_count += 1
                    logger.warning(
                        f"⚠️ Failed to calculate feature score for transaction {tx_id}: {e}"
                    )
                    continue

                # Calculate domain score with error handling
                try:
                    domain_score = _calculate_domain_score(result, domain_findings)
                except Exception as e:
                    excluded_count += 1
                    logger.warning(
                        f"⚠️ Failed to calculate domain score for transaction {tx_id}: {e}"
                    )
                    continue

                # Calculate per-transaction score with error handling
                try:
                    tx_score = _calculate_per_transaction_score(
                        feature_score, domain_score
                    )
                except Exception as e:
                    excluded_count += 1
                    logger.warning(
                        f"⚠️ Failed to calculate per-transaction score for transaction {tx_id}: {e}"
                    )
                    continue

                # Apply pattern-based risk adjustments (Week 3 Phase 1 integration)
                try:
                    if all_detected_patterns:
                        from app.service.agent.orchestration.domain_agents.pattern_recognition_integration import (
                            apply_pattern_adjustments,
                        )

                        pattern_adjusted_score, applied_pattern_names = (
                            apply_pattern_adjustments(
                                tx_score, all_detected_patterns, result
                            )
                        )
                        if applied_pattern_names:
                            logger.debug(
                                f"📊 Applied {len(applied_pattern_names)} pattern adjustments to {tx_id}: "
                                f"{tx_score:.3f} → {pattern_adjusted_score:.3f}"
                            )
                            tx_score = pattern_adjusted_score
                except Exception as e:
                    logger.debug(
                        f"Failed to apply pattern adjustments for transaction {tx_id}: {e}"
                    )
                    # Continue with original score if pattern adjustment fails

                # Apply Week 6 pattern-based adjustments (6 high-impact patterns)
                try:
                    from app.service.analytics.pattern_adjustments import (
                        PatternAdjustmentEngine,
                    )

                    pattern_engine = PatternAdjustmentEngine()

                    # Get historical transactions for this entity (transactions before current one)
                    current_tx_index = (
                        results.index(result) if result in results else -1
                    )
                    historical_txs = (
                        results[:current_tx_index] if current_tx_index > 0 else None
                    )

                    # Detect all 6 pattern types
                    week6_patterns = pattern_engine.detect_all_patterns(
                        transaction=result,
                        historical_transactions=historical_txs,
                        advanced_features=advanced_features,
                    )

                    if week6_patterns:
                        # Apply pattern adjustments
                        pattern_adjusted_score, applied_patterns = (
                            pattern_engine.apply_pattern_adjustments(
                                tx_score, week6_patterns
                            )
                        )

                        if applied_patterns:
                            logger.debug(
                                f"📊 Applied {len(applied_patterns)} Week 6 pattern adjustments to {tx_id}: "
                                f"{tx_score:.3f} → {pattern_adjusted_score:.3f} "
                                f"(patterns: {', '.join(applied_patterns)})"
                            )
                            tx_score = pattern_adjusted_score

                            # Store pattern findings in result for transparency
                            result["week6_patterns_detected"] = [
                                p["pattern_name"] for p in week6_patterns
                            ]
                            result["week6_pattern_adjustments"] = sum(
                                p["risk_adjustment"] for p in week6_patterns
                            )
                except Exception as e:
                    logger.debug(
                        f"Failed to apply Week 6 pattern adjustments for transaction {tx_id}: {e}"
                    )
                    # Continue with original score if pattern adjustment fails

                # Apply calibration and rule-overrides
                try:
                    from app.service.agent.orchestration.domain_agents.calibration import (
                        apply_rule_overrides,
                    )

                    # Extract IP reputation from domain findings
                    ip_reputation = None
                    location_domain = domain_findings.get(
                        "location", {}
                    ) or domain_findings.get("network", {})
                    if isinstance(location_domain, dict):
                        ip_reputation = location_domain.get(
                            "ip_reputation"
                        ) or location_domain.get("reputation")

                    # Apply rule-overrides (clean-intel veto, impossible travel hard block)
                    final_score, applied_rules = apply_rule_overrides(
                        tx_score, ip_reputation, advanced_features, domain_findings
                    )

                    if applied_rules:
                        logger.debug(
                            f"📊 Applied rule-overrides for transaction {tx_id}: "
                            f"{tx_score:.3f} → {final_score:.3f} ({', '.join(applied_rules)})"
                        )

                    tx_score = final_score
                except Exception as e:
                    logger.debug(
                        f"Failed to apply rule-overrides for transaction {tx_id}: {e}"
                    )
                    # Continue with original score if calibration fails

                # Validate score
                if not _validate_transaction_score(tx_score):
                    excluded_count += 1
                    logger.warning(
                        f"⚠️ Transaction {tx_id} has invalid score {tx_score}, excluding"
                    )
                    continue

                # Add to batch scores (not final transaction_scores yet)
                batch_scores[str(tx_id)] = tx_score
                processed_count += 1

            except Exception as e:
                # Catch-all for any unexpected errors
                excluded_count += 1
                tx_id = (
                    result.get("TX_ID_KEY", "unknown")
                    if isinstance(result, dict)
                    else "unknown"
                )
                logger.error(
                    f"❌ Unexpected error processing transaction {tx_id}: {e}",
                    exc_info=True,
                )
                continue

        # STREAMING: Save batch to database and clear memory
        if use_streaming and batch_scores:
            logger.info(f"💾 Saving batch to database ({len(batch_scores)} scores)...")
            TransactionScoreService.save_transaction_scores(investigation_id, batch_scores)
            batch_scores = {}  # Clear batch after saving
        
        # Log batch progress
        elapsed = time.time() - start_time
        logger.info(
            f"📊 Batch {batch_num}/{total_batches} complete: {processed_count}/{total_transactions} total processed, "
            f"{excluded_count} excluded ({elapsed:.1f}s elapsed)"
        )

    # Handle remaining scores in batch (if not using streaming or if it's the last partial batch)
    transaction_scores = {}
    if not use_streaming:
        # Non-streaming mode: collect all scores in memory (legacy behavior for small datasets)
        transaction_scores = batch_scores
        
        # Apply pattern-based risk adjustments after all base scoring is complete
        if transaction_scores:
            try:
                from app.service.agent.orchestration.domain_agents.pattern_based_adjustments import (
                    calculate_pattern_based_adjustments,
                )

                logger.info(
                    f"📊 Applying pattern-based risk adjustments to {len(transaction_scores)} transactions"
                )
                adjusted_scores, adjustment_reasons = calculate_pattern_based_adjustments(
                    transactions=results,
                    base_scores=transaction_scores,
                    domain_findings=domain_findings,
                )

                # Replace scores with adjusted scores
                transaction_scores = adjusted_scores

                # Log adjustment summary
                adjusted_count = len(adjustment_reasons)
                if adjusted_count > 0:
                    logger.info(
                        f"✅ Pattern adjustments applied to {adjusted_count} transactions"
                    )
                    # Log first few examples
                    for tx_id, reasons in list(adjustment_reasons.items())[:3]:
                        logger.info(f"   Example: {tx_id} - {', '.join(reasons)}")
            except Exception as e:
                logger.warning(f"⚠️ Pattern-based adjustments failed: {e}", exc_info=True)
                # Continue with base scores if pattern adjustments fail
    else:
        # Streaming mode: save any remaining scores in final batch
        if batch_scores:
            logger.info(f"💾 Saving final batch to database ({len(batch_scores)} scores)...")
            TransactionScoreService.save_transaction_scores(investigation_id, batch_scores)
        
        # Verify database save
        total_saved = TransactionScoreService.get_score_count(investigation_id)
        logger.info(
            f"💾 STREAMING COMPLETE: {total_saved} scores saved to database (investigation: {investigation_id})"
        )

    # Final summary
    elapsed_time = time.time() - start_time
    if use_streaming:
        logger.info(
            f"✅ STREAMING SCORING COMPLETE: {processed_count} transactions scored in {elapsed_time:.2f}s"
        )
        logger.info(f"   📊 {excluded_count} excluded | Saved to database: transaction_scores table")
        logger.info(f"   ⚡ Peak memory usage avoided by streaming to database")
        # Return empty dict for streaming mode (scores are in database, not in state)
        return {}
    else:
        if excluded_count > 0:
            logger.info(
                f"📊 Per-transaction scoring complete: {len(transaction_scores)} scores calculated, "
                f"{excluded_count} transactions excluded, {processed_count} processed "
                f"({elapsed_time:.2f}s elapsed)"
            )
        else:
            logger.info(
                f"📊 Per-transaction scoring complete: {len(transaction_scores)} scores calculated "
                f"({elapsed_time:.2f}s elapsed)"
            )
        return transaction_scores
