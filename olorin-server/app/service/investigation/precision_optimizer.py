"""
Precision Optimization Module

Provides precision @ k optimization and threshold tuning for confusion matrix generation.
"""

from typing import Dict, List, Any, Optional, Tuple
from collections import defaultdict
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def optimize_precision_at_k(
    transaction_scores: Dict[str, float],
    ground_truth: Dict[str, int],
    k: int = 10
) -> Dict[str, Any]:
    """
    Optimize precision @ k by selecting top-k transactions.
    
    Args:
        transaction_scores: Dictionary mapping transaction_id to risk score
        ground_truth: Dictionary mapping transaction_id to fraud label (1=fraud, 0=not_fraud)
        k: Number of top transactions to select
        
    Returns:
        Dictionary with:
        - top_k_transactions: List of top-k transaction IDs
        - precision_at_k: Precision for top-k
        - recall_at_k: Recall for top-k
        - threshold: Score threshold for top-k
    """
    if not transaction_scores:
        return {
            "top_k_transactions": [],
            "precision_at_k": 0.0,
            "recall_at_k": 0.0,
            "threshold": 0.0
        }
    
    # Sort transactions by score (descending)
    sorted_txs = sorted(
        transaction_scores.items(),
        key=lambda x: x[1],
        reverse=True
    )
    
    # Get top-k
    top_k = min(k, len(sorted_txs))
    top_k_transactions = [tx_id for tx_id, score in sorted_txs[:top_k]]
    threshold = sorted_txs[top_k - 1][1] if top_k > 0 else 0.0
    
    # Calculate precision and recall
    true_positives = sum(
        1 for tx_id in top_k_transactions
        if ground_truth.get(tx_id) == 1
    )
    
    total_fraud = sum(1 for label in ground_truth.values() if label == 1)
    
    precision_at_k = true_positives / top_k if top_k > 0 else 0.0
    recall_at_k = true_positives / total_fraud if total_fraud > 0 else 0.0
    
    return {
        "top_k_transactions": top_k_transactions,
        "precision_at_k": precision_at_k,
        "recall_at_k": recall_at_k,
        "threshold": threshold
    }


def find_optimal_threshold(
    transaction_scores: Dict[str, float],
    ground_truth: Dict[str, int],
    target_precision: float = 0.8,
    min_recall: float = 0.5
) -> Dict[str, Any]:
    """
    Find optimal threshold that maximizes precision while maintaining minimum recall.
    
    Args:
        transaction_scores: Dictionary mapping transaction_id to risk score
        ground_truth: Dictionary mapping transaction_id to fraud label (1=fraud, 0=not_fraud)
        target_precision: Target precision (default: 0.8)
        min_recall: Minimum recall requirement (default: 0.5)
        
    Returns:
        Dictionary with:
        - optimal_threshold: Best threshold value
        - precision: Precision at optimal threshold
        - recall: Recall at optimal threshold
        - f1_score: F1 score at optimal threshold
    """
    if not transaction_scores or not ground_truth:
        return {
            "optimal_threshold": 0.3,
            "precision": 0.0,
            "recall": 0.0,
            "f1_score": 0.0
        }
    
    # Get all unique scores as candidate thresholds
    unique_scores = sorted(set(transaction_scores.values()), reverse=True)
    
    best_threshold = 0.3  # Default
    best_metrics = {
        "precision": 0.0,
        "recall": 0.0,
        "f1_score": 0.0
    }
    
    for threshold in unique_scores:
        # Calculate metrics at this threshold
        tp = 0  # True positives
        fp = 0  # False positives
        fn = 0  # False negatives
        tn = 0  # True negatives
        
        for tx_id, score in transaction_scores.items():
            predicted = 1 if score >= threshold else 0
            actual = ground_truth.get(tx_id, 0)
            
            if predicted == 1 and actual == 1:
                tp += 1
            elif predicted == 1 and actual == 0:
                fp += 1
            elif predicted == 0 and actual == 1:
                fn += 1
            else:
                tn += 1
        
        # Calculate metrics
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        
        # Check if this threshold meets requirements and is better
        if recall >= min_recall:
            # Prefer thresholds that meet target precision or have best F1
            if precision >= target_precision or f1_score > best_metrics["f1_score"]:
                best_threshold = threshold
                best_metrics = {
                    "precision": precision,
                    "recall": recall,
                    "f1_score": f1_score
                }
    
    return {
        "optimal_threshold": best_threshold,
        "precision": best_metrics["precision"],
        "recall": best_metrics["recall"],
        "f1_score": best_metrics["f1_score"]
    }


def calculate_precision_recall_curve(
    transaction_scores: Dict[str, float],
    ground_truth: Dict[str, int],
    num_points: int = 20
) -> List[Dict[str, float]]:
    """
    Calculate precision-recall curve for threshold optimization.
    
    Args:
        transaction_scores: Dictionary mapping transaction_id to risk score
        ground_truth: Dictionary mapping transaction_id to fraud label
        num_points: Number of points on the curve
        
    Returns:
        List of dictionaries with threshold, precision, recall, f1_score
    """
    if not transaction_scores or not ground_truth:
        return []
    
    # Get score range
    scores = list(transaction_scores.values())
    min_score = min(scores)
    max_score = max(scores)
    
    curve_points = []
    for i in range(num_points):
        threshold = min_score + (max_score - min_score) * (i / (num_points - 1))
        
        tp = fp = fn = tn = 0
        for tx_id, score in transaction_scores.items():
            predicted = 1 if score >= threshold else 0
            actual = ground_truth.get(tx_id, 0)
            
            if predicted == 1 and actual == 1:
                tp += 1
            elif predicted == 1 and actual == 0:
                fp += 1
            elif predicted == 0 and actual == 1:
                fn += 1
            else:
                tn += 1
        
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        
        curve_points.append({
            "threshold": threshold,
            "precision": precision,
            "recall": recall,
            "f1_score": f1_score,
            "tp": tp,
            "fp": fp,
            "fn": fn,
            "tn": tn
        })
    
    return curve_points

