"""
Workload-Aware Metrics Calculation

Calculates operational metrics for investigation comparison:
- Alerts per day
- Percentage of traffic alerted
- Precision@k (top-k anomalies)
- Recall at fixed alert budget

Constitutional Compliance:
- All calculations explicit
- No hardcoded thresholds
- Handles edge cases gracefully
"""

from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime, timedelta
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def calculate_workload_metrics(
    transactions: List[Dict[str, Any]],
    window_start: datetime,
    window_end: datetime,
    risk_threshold: float
) -> Dict[str, Any]:
    """
    Calculate workload-aware metrics for a window.
    
    Args:
        transactions: List of transaction dicts
        window_start: Window start time
        window_end: Window end time
        risk_threshold: Risk threshold for alerts
        
    Returns:
        Dict with workload metrics
    """
    total_transactions = len(transactions)
    over_threshold = sum(1 for tx in transactions if tx.get("predicted_risk") and tx.get("predicted_risk") >= risk_threshold)
    
    # Calculate window duration in days
    duration_days = (window_end - window_start).total_seconds() / 86400.0
    if duration_days <= 0:
        duration_days = 1.0
    
    alerts_per_day = over_threshold / duration_days if duration_days > 0 else 0.0
    pct_traffic_alerted = (over_threshold / total_transactions * 100) if total_transactions > 0 else 0.0
    
    return {
        "alerts_per_day": alerts_per_day,
        "pct_traffic_alerted": pct_traffic_alerted,
        "total_alerts": over_threshold,
        "window_duration_days": duration_days
    }


def calculate_precision_at_k(
    transactions: List[Dict[str, Any]],
    k: int,
    risk_threshold: Optional[float] = None
) -> Dict[str, Any]:
    """
    Calculate precision@k (top-k anomalies by risk score).
    
    Args:
        transactions: List of transaction dicts
        k: Number of top anomalies to consider
        risk_threshold: Optional threshold (if None, uses top-k by score)
        
    Returns:
        Dict with precision@k metrics
    """
    # Filter transactions with predicted_risk
    transactions_with_risk = [
        tx for tx in transactions 
        if tx.get("predicted_risk") is not None
    ]
    
    if len(transactions_with_risk) == 0:
        return {
            "precision_at_k": 0.0,
            "recall_at_k": 0.0,
            "k": k,
            "actual_fraud_in_top_k": 0,
            "total_fraud": 0
        }
    
    # Sort by predicted_risk descending
    transactions_with_risk.sort(key=lambda x: x.get("predicted_risk", 0), reverse=True)
    
    # Get top k
    top_k = transactions_with_risk[:k]
    
    # Count fraud in top k
    fraud_in_top_k = sum(
        1 for tx in top_k
        if tx.get("actual_outcome") in ("FRAUD", 1, True)
    )
    
    # Count total fraud
    total_fraud = sum(
        1 for tx in transactions_with_risk
        if tx.get("actual_outcome") in ("FRAUD", 1, True)
    )
    
    precision_at_k = fraud_in_top_k / k if k > 0 else 0.0
    recall_at_k = fraud_in_top_k / total_fraud if total_fraud > 0 else 0.0
    
    return {
        "precision_at_k": precision_at_k,
        "recall_at_k": recall_at_k,
        "k": k,
        "actual_fraud_in_top_k": fraud_in_top_k,
        "total_fraud": total_fraud
    }


def calculate_recall_at_budget(
    transactions: List[Dict[str, Any]],
    daily_budget: int,
    window_start: datetime,
    window_end: datetime
) -> Dict[str, Any]:
    """
    Calculate recall at a fixed daily alert budget.
    
    Args:
        transactions: List of transaction dicts
        daily_budget: Maximum alerts per day
        window_start: Window start time
        window_end: Window end time
        
    Returns:
        Dict with recall at budget metrics
    """
    duration_days = (window_end - window_start).total_seconds() / 86400.0
    if duration_days <= 0:
        duration_days = 1.0
    
    total_budget = int(daily_budget * duration_days)
    
    # Sort by predicted_risk descending
    transactions_with_risk = [
        tx for tx in transactions 
        if tx.get("predicted_risk") is not None
    ]
    transactions_with_risk.sort(key=lambda x: x.get("predicted_risk", 0), reverse=True)
    
    # Get top transactions up to budget
    top_transactions = transactions_with_risk[:total_budget]
    
    # Count fraud caught
    fraud_caught = sum(
        1 for tx in top_transactions
        if tx.get("actual_outcome") in ("FRAUD", 1, True)
    )
    
    # Count total fraud
    total_fraud = sum(
        1 for tx in transactions_with_risk
        if tx.get("actual_outcome") in ("FRAUD", 1, True)
    )
    
    recall_at_budget = fraud_caught / total_fraud if total_fraud > 0 else 0.0
    precision_at_budget = fraud_caught / len(top_transactions) if len(top_transactions) > 0 else 0.0
    
    return {
        "recall_at_budget": recall_at_budget,
        "precision_at_budget": precision_at_budget,
        "daily_budget": daily_budget,
        "total_budget": total_budget,
        "fraud_caught": fraud_caught,
        "total_fraud": total_fraud,
        "alerts_used": len(top_transactions)
    }

