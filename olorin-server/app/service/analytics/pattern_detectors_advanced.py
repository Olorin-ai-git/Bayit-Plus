"""
Advanced Pattern Detectors (Patterns 7-8).

Transaction Chaining and Refund/Chargeback Spike detection.
"""

import os
from datetime import timedelta
from typing import Any, Dict, List, Optional

from app.service.analytics.pattern_helpers import (
    extract_amount,
    extract_timestamp,
)

# Detection Thresholds (from environment variables)
def _get_float_env(key: str, default: str) -> float:
    return float(os.getenv(key, default))

def _get_int_env(key: str, default: str) -> int:
    return int(os.getenv(key, default))

# Transaction Chaining Thresholds
CHAIN_MIN_SEQUENCE_LENGTH = _get_int_env("PATTERN_CHAIN_MIN_SEQUENCE_LENGTH", "3")
CHAIN_TIME_WINDOW_MINUTES = _get_int_env("PATTERN_CHAIN_TIME_WINDOW_MINUTES", "30")
CHAIN_AMOUNT_SIMILARITY_PERCENT = _get_float_env("PATTERN_CHAIN_AMOUNT_SIMILARITY_PERCENT", "20.0")
CHAIN_ADJUSTMENT = _get_float_env("PATTERN_CHAIN_ADJUSTMENT", "0.18")

# Refund/Chargeback Spike Thresholds
REFUND_RATE_THRESHOLD_PERCENT = _get_float_env("PATTERN_REFUND_RATE_THRESHOLD_PERCENT", "20.0")
CHARGEBACK_RATE_THRESHOLD_PERCENT = _get_float_env("PATTERN_CHARGEBACK_RATE_THRESHOLD_PERCENT", "5.0")
MIN_TRANSACTIONS_FOR_RATE_CALC = _get_int_env("PATTERN_MIN_TRANSACTIONS_FOR_RATE_CALC", "10")
REFUND_SPIKE_ADJUSTMENT = _get_float_env("PATTERN_REFUND_SPIKE_ADJUSTMENT", "0.15")
CHARGEBACK_SPIKE_ADJUSTMENT = _get_float_env("PATTERN_CHARGEBACK_SPIKE_ADJUSTMENT", "0.25")


def detect_transaction_chaining(
    transaction: Dict[str, Any], historical_transactions: Optional[List[Dict[str, Any]]]
) -> Optional[Dict[str, Any]]:
    """
    Detect transaction chaining pattern.
    
    Pattern: Sequential transactions with similar amounts in short time windows,
    possibly testing limits or laundering funds.
    """
    if not historical_transactions or len(historical_transactions) < CHAIN_MIN_SEQUENCE_LENGTH - 1:
        return None
    
    tx_amount = extract_amount(transaction)
    tx_timestamp = extract_timestamp(transaction)
    
    if not tx_amount or not tx_timestamp:
        return None
    
    # Build chain including current transaction
    chain = [transaction]
    window_start = tx_timestamp - timedelta(minutes=CHAIN_TIME_WINDOW_MINUTES)
    
    for hist_tx in historical_transactions:
        hist_timestamp = extract_timestamp(hist_tx)
        hist_amount = extract_amount(hist_tx)
        
        if not hist_timestamp or not hist_amount:
            continue
        
        # Check if in time window
        if window_start <= hist_timestamp < tx_timestamp:
            # Check amount similarity
            amount_diff_percent = abs(hist_amount - tx_amount) / tx_amount * 100 if tx_amount > 0 else 100
            
            if amount_diff_percent <= CHAIN_AMOUNT_SIMILARITY_PERCENT:
                chain.append(hist_tx)
    
    if len(chain) >= CHAIN_MIN_SEQUENCE_LENGTH:
        avg_amount = sum(extract_amount(tx) or 0 for tx in chain) / len(chain)
        
        return {
            "pattern_type": "transaction_chaining",
            "pattern_name": "Transaction Chaining Detection",
            "description": f"Chain of {len(chain)} similar-amount transactions in {CHAIN_TIME_WINDOW_MINUTES} minutes",
            "risk_adjustment": CHAIN_ADJUSTMENT,
            "confidence": min(0.90, 0.70 + (len(chain) - CHAIN_MIN_SEQUENCE_LENGTH) * 0.05),
            "evidence": {
                "chain_length": len(chain),
                "avg_amount": round(avg_amount, 2),
                "time_window_minutes": CHAIN_TIME_WINDOW_MINUTES,
                "amount_similarity_threshold_percent": CHAIN_AMOUNT_SIMILARITY_PERCENT
            }
        }
    
    return None


def detect_refund_chargeback_spike(
    transaction: Dict[str, Any], historical_transactions: Optional[List[Dict[str, Any]]]
) -> Optional[Dict[str, Any]]:
    """
    Detect refund or chargeback spike pattern.
    
    Pattern: High rate of refunds or chargebacks indicating fraudulent activity.
    Uses COUNT_DISPUTES and TX_REFUND_DATETIME columns from schema.
    """
    all_transactions = [transaction] + (historical_transactions or [])
    
    if len(all_transactions) < MIN_TRANSACTIONS_FOR_RATE_CALC:
        return None
    
    refund_count = 0
    chargeback_count = 0
    
    for tx in all_transactions:
        # Check TX_REFUND_DATETIME (schema-verified column)
        if tx.get("TX_REFUND_DATETIME") is not None:
            refund_count += 1
        
        # Check COUNT_DISPUTES (schema-verified column)
        disputes = tx.get("COUNT_DISPUTES", 0)
        if disputes and int(disputes) > 0:
            chargeback_count += 1
    
    refund_rate = (refund_count / len(all_transactions)) * 100
    chargeback_rate = (chargeback_count / len(all_transactions)) * 100
    
    # Detect spikes
    refund_spike = refund_rate >= REFUND_RATE_THRESHOLD_PERCENT
    chargeback_spike = chargeback_rate >= CHARGEBACK_RATE_THRESHOLD_PERCENT
    
    if not (refund_spike or chargeback_spike):
        return None
    
    # Calculate risk adjustment
    risk_adjustment = 0.0
    description_parts = []
    
    if refund_spike:
        risk_adjustment += REFUND_SPIKE_ADJUSTMENT
        description_parts.append(f"refund rate {refund_rate:.1f}%")
    
    if chargeback_spike:
        risk_adjustment += CHARGEBACK_SPIKE_ADJUSTMENT
        description_parts.append(f"chargeback rate {chargeback_rate:.1f}%")
    
    return {
        "pattern_type": "refund_chargeback_spike",
        "pattern_name": "Refund/Chargeback Spike Detection",
        "description": f"Abnormal {' and '.join(description_parts)}",
        "risk_adjustment": risk_adjustment,
        "confidence": 0.85,
        "evidence": {
            "total_transactions": len(all_transactions),
            "refund_count": refund_count,
            "chargeback_count": chargeback_count,
            "refund_rate_percent": round(refund_rate, 2),
            "chargeback_rate_percent": round(chargeback_rate, 2),
            "refund_threshold_percent": REFUND_RATE_THRESHOLD_PERCENT,
            "chargeback_threshold_percent": CHARGEBACK_RATE_THRESHOLD_PERCENT
        }
    }

