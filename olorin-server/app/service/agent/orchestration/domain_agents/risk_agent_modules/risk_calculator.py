"""
Risk Calculator Module

Extracted risk calculation logic from risk_agent.py
"""

from typing import Any, Dict, List

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class RiskCalculator:
    """Handles risk score and confidence calculations"""

    def __init__(self):
        self.logger = logger

    def calculate_real_risk_score(
        self, domain_findings: Dict[str, Any], facts: Dict[str, Any]
    ) -> float:
        """
        Calculate REAL risk score based on actual domain analysis results with volume weighting.

        CRITICAL: No fraud indicators can be used during investigation to prevent data leakage.
        Only manual case outcomes can be used (if provided externally, not from Snowflake).
        """
        # Check for manual fraud determination
        if facts.get("manual_case_outcome") == "fraud":
            return 0.9

        # Extract transaction-level data for volume weighting
        transaction_data = []
        total_amount = 0.0

        if isinstance(facts, dict) and "results" in facts:
            for result in facts["results"]:
                if isinstance(result, dict):
                    # CRITICAL: Use GMV for USD-normalized amounts, not PAID_AMOUNT_VALUE_IN_CURRENCY (local currency)
                    amount = result.get("GMV", 0.0) or result.get("gmv", 0.0) or 0.0
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
            if any(
                "NULL" in str(ev)
                or "not available" in str(ev).lower()
                or "missing" in str(ev).lower()
                for ev in device_evidence
            ):
                device_penalty = 0.15  # 15% risk increase for missing device data
                self.logger.info(
                    f"🚨 Device data missing - adding {device_penalty:.3f} risk penalty"
                )

        if not weighted_scores:
            # No valid domain scores - use transaction data as fallback
            if transaction_data and total_amount > 0:
                volume_weighted_risk = (
                    sum(tx["risk"] * tx["amount"] for tx in transaction_data)
                    / total_amount
                )
                volume_weighted_risk = min(
                    1.0, max(0.0, volume_weighted_risk + device_penalty)
                )
                self.logger.warning(
                    f"⚠️ No domain scores available, using volume-weighted transaction risk: {volume_weighted_risk:.3f}"
                )
                return volume_weighted_risk
            else:
                raise ValueError(
                    "CRITICAL: Insufficient REAL data for risk calculation"
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
            volume_weighted_tx_risk = (
                sum(tx["risk"] * tx["amount"] for tx in transaction_data) / total_amount
            )
            # Blend domain-based risk with volume-weighted transaction risk (70:30 ratio)
            blended_risk = (0.7 * weighted_avg) + (0.3 * volume_weighted_tx_risk)
            self.logger.info(
                f"📊 Volume weighting: domain_risk={weighted_avg:.3f}, tx_risk={volume_weighted_tx_risk:.3f}, blended={blended_risk:.3f}"
            )
            weighted_avg = blended_risk

        # Add device penalty and ensure bounds
        final_risk = min(1.0, max(0.0, weighted_avg + device_penalty))

        return final_risk

    def calculate_real_confidence(
        self,
        domain_findings: Dict[str, Any],
        tools_used: List[str],
        state: Dict[str, Any],
    ) -> float:
        """Calculate REAL confidence based on actual analysis quality and data availability."""
        confidence_factors = []

        # Factor 1: Domain analysis quality
        domain_confidences = []
        domain_evidence_counts = []

        for domain, findings in domain_findings.items():
            if isinstance(findings, dict):
                llm_analysis = findings.get("llm_analysis", {})
                confidence_value = None

                if (
                    "confidence" in llm_analysis
                    and llm_analysis["confidence"] is not None
                ):
                    confidence_value = llm_analysis["confidence"]
                elif "confidence" in findings and findings["confidence"] is not None:
                    confidence_value = findings["confidence"]

                if confidence_value is not None:
                    domain_confidences.append(confidence_value)

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
            tool_confidence = min(1.0, len(tools_used) / 5.0)
            confidence_factors.append(tool_confidence)

        # Factor 4: Evidence volume
        total_evidence = sum(domain_evidence_counts) if domain_evidence_counts else 0
        if total_evidence > 0:
            evidence_confidence = min(1.0, total_evidence / 20.0)
            confidence_factors.append(evidence_confidence)

        if not confidence_factors:
            raise ValueError("CRITICAL: No REAL confidence factors available")

        # Calculate weighted average with emphasis on domain quality
        if len(confidence_factors) >= 2:
            weighted_confidence = confidence_factors[0] * 0.5 + sum(
                confidence_factors[1:]
            ) * 0.5 / (len(confidence_factors) - 1)
        else:
            weighted_confidence = confidence_factors[0]

        return min(1.0, max(0.0, weighted_confidence))
