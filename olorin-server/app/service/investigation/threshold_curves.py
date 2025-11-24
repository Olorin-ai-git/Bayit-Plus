"""
Threshold Curve Calculation

Calculates precision-recall curves at different thresholds for threshold tuning.

Constitutional Compliance:
- All calculations explicit
- No hardcoded thresholds
- Handles edge cases gracefully
"""

from typing import List, Dict, Any, Tuple
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def calculate_threshold_curve(
    transactions: List[Dict[str, Any]],
    threshold_range: List[float] = None
) -> List[Dict[str, Any]]:
    """
    Calculate precision-recall curve at different thresholds.
    
    Args:
        transactions: List of transaction dicts with predicted_risk and actual_outcome
        threshold_range: List of thresholds to evaluate (default: 0.0 to 1.0 in 0.1 steps)
        
    Returns:
        List of dicts with threshold, precision, recall, f1, alerts_count, alerts_per_day
    """
    if threshold_range is None:
        threshold_range = [i / 10.0 for i in range(0, 11)]  # 0.0 to 1.0 in 0.1 steps
    
    curve_points = []
    
    for threshold in threshold_range:
        tp = fp = tn = fn = 0
        alerts_count = 0
        
        for tx in transactions:
            predicted_risk = tx.get("predicted_risk")
            actual_outcome = tx.get("actual_outcome")
            
            if predicted_risk is None:
                continue
            
            # Map actual_outcome
            if actual_outcome in ("FRAUD", 1, True):
                is_fraud = 1
            elif actual_outcome in ("NOT_FRAUD", 0, False):
                is_fraud = 0
            else:
                continue  # Skip unknown labels
            
            predicted_label = 1 if predicted_risk >= threshold else 0
            
            if predicted_label == 1:
                alerts_count += 1
            
            # Confusion matrix
            if predicted_label == 1 and is_fraud == 1:
                tp += 1
            elif predicted_label == 1 and is_fraud == 0:
                fp += 1
            elif predicted_label == 0 and is_fraud == 0:
                tn += 1
            elif predicted_label == 0 and is_fraud == 1:
                fn += 1
        
        # Calculate metrics
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        
        curve_points.append({
            "threshold": threshold,
            "precision": precision,
            "recall": recall,
            "f1": f1,
            "alerts_count": alerts_count,
            "tp": tp,
            "fp": fp,
            "tn": tn,
            "fn": fn
        })
    
    return curve_points

