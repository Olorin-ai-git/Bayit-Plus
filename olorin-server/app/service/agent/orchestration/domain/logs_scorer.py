"""
Logs Domain Scorer - Clean logs-only analysis without cross-domain pollution.

This module provides logs domain scoring that strictly uses logs-native signals
and prevents model score contamination that causes narrative/score contradictions.
"""

from typing import Dict, Any
from .domain_result import DomainResult, validate_domain
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def score_logs_domain(metrics: Dict[str, Any], facts: Dict[str, Any]) -> DomainResult:
    """
    Score logs domain using only logs-native signals.
    
    CRITICAL: This function must NOT use MODEL_SCORE or IS_FRAUD_TX as these
    are not logs domain signals and cause narrative/score contradictions.
    
    Args:
        metrics: Logs domain metrics (transaction counts, errors, etc.)
        facts: Investigation facts (used for context, not scoring)
        
    Returns:
        Validated DomainResult with consistent narrative and score
    """
    # Extract logs-native metrics only
    txn_count = metrics.get("transaction_count", 0)
    failed_count = metrics.get("failed_transaction_count", 0)
    error_count = metrics.get("error_count", 0)
    total_transaction_count = metrics.get("total_transaction_count", 0)
    
    # Build signals strictly from logs-domain evidence
    signals = []
    
    if failed_count > 0:
        signals.append(f"{failed_count} failed transactions")
    
    if error_count > 0:
        signals.append(f"{error_count} error events")
    
    # Check for suspicious patterns in logs (logs-native only)
    failure_rate = failed_count / max(txn_count, 1)
    if failure_rate > 0.5:
        signals.append(f"high failure rate: {failure_rate:.2f}")
    
    if txn_count > 10 and failed_count == 0:
        signals.append("consistent success pattern")
    
    # For single clean transaction, we have a weak but valid signal
    if txn_count == 1 and failed_count == 0 and error_count == 0:
        signals.append("single clean transaction")
    
    # CRITICAL: DO NOT use MODEL_SCORE or IS_FRAUD_TX here
    # These are not logs domain signals and pollute the scoring
    
    # Conservative scoring based strictly on logs evidence
    score = 0.10  # Conservative baseline
    
    # Negative indicators (increase risk)
    if failed_count > 0:
        score += 0.25
    
    if error_count > 0:
        score += 0.15
    
    if failure_rate > 0.3:
        score += 0.20
    
    # Positive indicators (slightly increase confidence but cap risk)
    if txn_count == 1 and failed_count == 0 and error_count == 0:
        # Single clean transaction - cap aggressively to prevent model score pollution
        score = min(score, 0.25)
        narrative_suffix = "Single successful transaction with no failures or errors observed. Logs show no inherent risk signals; monitoring recommended given limited data."
    elif txn_count > 1 and failed_count == 0 and error_count == 0:
        # Multiple clean transactions
        narrative_suffix = f"Multiple ({txn_count}) successful transactions with no failures or errors. Logs indicate normal operation pattern."
    elif failed_count > 0 or error_count > 0:
        # Some issues detected
        narrative_suffix = f"Issues detected in transaction logs: {failed_count} failures, {error_count} errors. Warrants investigation."
    else:
        narrative_suffix = "Limited logs data available for assessment."
    
    # Determine status based on available evidence
    if txn_count > 0:
        status = "OK"
        confidence = 0.35 if txn_count > 1 else 0.25
    else:
        status = "INSUFFICIENT_EVIDENCE" 
        confidence = 0.15
        narrative_suffix = "No transaction logs available for analysis."
    
    # Build narrative that aligns with score
    if status == "OK":
        if score <= 0.3:
            risk_level = "low"
        elif score <= 0.6:
            risk_level = "moderate"
        else:
            risk_level = "elevated"
        
        narrative = f"Logs analysis shows {risk_level} risk based on transaction patterns. {narrative_suffix}"
    else:
        narrative = narrative_suffix
    
    # Create and validate result
    result = DomainResult(
        name="logs",
        score=score if status == "OK" else None,
        status=status,
        signals=signals,
        confidence=confidence,
        narrative=narrative
    )
    
    validate_domain(result)
    
    logger.info(f"Logs domain scored: {result.score} with {len(result.signals)} signals (txn_count={txn_count}, failed={failed_count}, errors={error_count})")
    
    return result