"""
Pattern-Based Risk Score Adjustments

This module implements sophisticated fraud pattern detection and risk score adjustments
for patterns that traditional domain agents may underweight:

1. Repeated Amount Patterns (+15% for >50% identical amounts)
2. Velocity Burst Penalties (+10% for bursts <5 min)
3. IP Rotation Penalties (+10% for >3 IPs on single device)
4. Approval Ratio Analysis (+5% for >25% rejected)

These adjustments are applied AFTER base per-transaction scoring to catch
sophisticated fraud that evades traditional signals.
"""

from typing import Dict, List, Any, Tuple
from datetime import datetime, timedelta
from collections import Counter, defaultdict
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

# Configuration constants (from environment or default)
REPEATED_AMOUNT_THRESHOLD_PCT = 0.5  # 50% identical amounts triggers adjustment
REPEATED_AMOUNT_PENALTY = 0.15  # +15% risk score boost

VELOCITY_BURST_THRESHOLD_MIN = 5.0  # Bursts < 5 minutes are penalized
VELOCITY_BURST_PENALTY = 0.10  # +10% risk score boost

IP_ROTATION_THRESHOLD = 3  # >3 IPs for single device triggers penalty
IP_ROTATION_PENALTY = 0.10  # +10% risk score boost

APPROVAL_REJECTION_THRESHOLD_PCT = 0.25  # >25% rejection rate triggers penalty
APPROVAL_REJECTION_PENALTY = 0.05  # +5% risk score boost


def calculate_pattern_based_adjustments(
    transactions: List[Dict[str, Any]],
    base_scores: Dict[str, float],
    domain_findings: Dict[str, Any]
) -> Tuple[Dict[str, float], Dict[str, List[str]]]:
    """
    Calculate pattern-based risk score adjustments for all transactions.
    
    Args:
        transactions: List of transaction dictionaries
        base_scores: Dictionary mapping TX_ID_KEY to base risk score
        domain_findings: Domain findings dictionary for context
        
    Returns:
        Tuple of:
        - Dictionary mapping TX_ID_KEY to adjusted risk score
        - Dictionary mapping TX_ID_KEY to list of applied adjustment reasons
    """
    if not transactions or not base_scores:
        return base_scores, {}
    
    adjusted_scores = base_scores.copy()
    adjustment_reasons = defaultdict(list)
    
    # Calculate entity-level patterns
    repeated_amount_penalty = _calculate_repeated_amount_penalty(transactions)
    velocity_burst_penalty = _calculate_velocity_burst_penalty(transactions)
    ip_rotation_penalty = _calculate_ip_rotation_penalty(transactions)
    approval_ratio_penalty = _calculate_approval_ratio_penalty(transactions)
    
    # Log entity-level penalties
    if repeated_amount_penalty > 0:
        logger.info(f"📊 Repeated amount penalty: +{repeated_amount_penalty:.1%}")
    if velocity_burst_penalty > 0:
        logger.info(f"📊 Velocity burst penalty: +{velocity_burst_penalty:.1%}")
    if ip_rotation_penalty > 0:
        logger.info(f"📊 IP rotation penalty: +{ip_rotation_penalty:.1%}")
    if approval_ratio_penalty > 0:
        logger.info(f"📊 Approval ratio penalty: +{approval_ratio_penalty:.1%}")
    
    # Apply adjustments to each transaction
    for tx in transactions:
        tx_id = tx.get("TX_ID_KEY") or tx.get("tx_id_key")
        if not tx_id or tx_id not in base_scores:
            continue
        
        base_score = base_scores[tx_id]
        total_adjustment = 0.0
        reasons = []
        
        # Apply repeated amount penalty
        if repeated_amount_penalty > 0:
            total_adjustment += repeated_amount_penalty
            reasons.append(f"repeated_amounts (+{repeated_amount_penalty:.1%})")
        
        # Apply velocity burst penalty
        if velocity_burst_penalty > 0:
            total_adjustment += velocity_burst_penalty
            reasons.append(f"velocity_burst (+{velocity_burst_penalty:.1%})")
        
        # Apply IP rotation penalty
        if ip_rotation_penalty > 0:
            total_adjustment += ip_rotation_penalty
            reasons.append(f"ip_rotation (+{ip_rotation_penalty:.1%})")
        
        # Apply approval ratio penalty
        if approval_ratio_penalty > 0:
            total_adjustment += approval_ratio_penalty
            reasons.append(f"high_rejection_rate (+{approval_ratio_penalty:.1%})")
        
        # Apply adjustment and ensure bounds [0,1]
        if total_adjustment > 0:
            adjusted_score = min(1.0, base_score + total_adjustment)
            adjusted_scores[tx_id] = adjusted_score
            adjustment_reasons[tx_id] = reasons
            
            logger.debug(
                f"📊 Adjusted {tx_id}: {base_score:.3f} → {adjusted_score:.3f} "
                f"(+{total_adjustment:.3f}: {', '.join(reasons)})"
            )
    
    # Summary
    if adjustment_reasons:
        logger.info(
            f"📊 Pattern-based adjustments applied to {len(adjustment_reasons)}/{len(base_scores)} transactions"
        )
    
    return adjusted_scores, dict(adjustment_reasons)


def _calculate_repeated_amount_penalty(transactions: List[Dict[str, Any]]) -> float:
    """
    Calculate penalty for repeated amount patterns.
    
    Returns +15% if >50% of transactions have identical amounts (sophisticated templating).
    
    Args:
        transactions: List of transaction dictionaries
        
    Returns:
        Penalty value (0.0 to 0.15)
    """
    if not transactions:
        return 0.0
    
    # Extract amounts
    amounts = []
    for tx in transactions:
        amount = tx.get("PAID_AMOUNT_VALUE_IN_CURRENCY") or tx.get("paid_amount_value_in_currency")
        if amount is not None:
            try:
                amount_float = float(amount)
                # Round to 2 decimal places for clustering
                amounts.append(round(amount_float, 2))
            except (ValueError, TypeError):
                continue
    
    if len(amounts) < 2:
        return 0.0
    
    # Count frequency of each amount
    amount_counter = Counter(amounts)
    
    # Find most common amount
    most_common_amount, most_common_count = amount_counter.most_common(1)[0]
    
    # Calculate percentage of transactions with most common amount
    repeated_pct = most_common_count / len(amounts)
    
    # Apply penalty if >50% have same amount
    if repeated_pct > REPEATED_AMOUNT_THRESHOLD_PCT:
        logger.info(
            f"🚨 Repeated amount pattern detected: {most_common_count}/{len(amounts)} transactions "
            f"({repeated_pct:.1%}) have amount ${most_common_amount:.2f}"
        )
        return REPEATED_AMOUNT_PENALTY
    
    return 0.0


def _calculate_velocity_burst_penalty(transactions: List[Dict[str, Any]]) -> float:
    """
    Calculate penalty for velocity bursts (transactions <5 min apart).
    
    Returns +10% if ANY consecutive transactions are <5 min apart.
    
    Args:
        transactions: List of transaction dictionaries
        
    Returns:
        Penalty value (0.0 to 0.10)
    """
    if len(transactions) < 2:
        return 0.0
    
    # Extract timestamps
    timestamped_txs = []
    for tx in transactions:
        tx_datetime_str = tx.get("TX_DATETIME") or tx.get("tx_datetime")
        if not tx_datetime_str:
            continue
        
        try:
            if isinstance(tx_datetime_str, str):
                tx_datetime = datetime.fromisoformat(tx_datetime_str.replace('Z', '+00:00'))
            else:
                tx_datetime = tx_datetime_str
            
            timestamped_txs.append({
                "datetime": tx_datetime,
                "tx_id": tx.get("TX_ID_KEY") or tx.get("tx_id_key")
            })
        except Exception as e:
            logger.debug(f"Failed to parse transaction datetime: {e}")
            continue
    
    if len(timestamped_txs) < 2:
        return 0.0
    
    # Sort by datetime
    timestamped_txs.sort(key=lambda x: x["datetime"])
    
    # Check for bursts
    burst_detected = False
    for i in range(len(timestamped_txs) - 1):
        time_diff_minutes = (timestamped_txs[i+1]["datetime"] - timestamped_txs[i]["datetime"]).total_seconds() / 60.0
        
        if time_diff_minutes < VELOCITY_BURST_THRESHOLD_MIN:
            logger.info(
                f"🚨 Velocity burst detected: {time_diff_minutes:.1f} min between "
                f"transactions {i} and {i+1} (threshold: {VELOCITY_BURST_THRESHOLD_MIN} min)"
            )
            burst_detected = True
            break  # One burst is enough to trigger penalty
    
    return VELOCITY_BURST_PENALTY if burst_detected else 0.0


def _calculate_ip_rotation_penalty(transactions: List[Dict[str, Any]]) -> float:
    """
    Calculate penalty for IP rotation on single device.
    
    Returns +10% if ANY device is accessed from >3 different IPs.
    
    Args:
        transactions: List of transaction dictionaries
        
    Returns:
        Penalty value (0.0 to 0.10)
    """
    if not transactions:
        return 0.0
    
    # Group IPs by device
    device_ips = defaultdict(set)
    
    for tx in transactions:
        device_id = tx.get("DEVICE_ID") or tx.get("device_id")
        ip_address = tx.get("IP") or tx.get("ip") or tx.get("IP_ADDRESS") or tx.get("ip_address")
        
        if device_id and ip_address:
            device_ips[device_id].add(ip_address)
    
    if not device_ips:
        return 0.0
    
    # Check for excessive IP rotation
    for device_id, ips in device_ips.items():
        if len(ips) > IP_ROTATION_THRESHOLD:
            logger.info(
                f"🚨 IP rotation detected: device {device_id} accessed from {len(ips)} different IPs "
                f"(threshold: {IP_ROTATION_THRESHOLD}): {list(ips)}"
            )
            return IP_ROTATION_PENALTY
    
    return 0.0


def _calculate_approval_ratio_penalty(transactions: List[Dict[str, Any]]) -> float:
    """
    Calculate penalty based on approval/rejection ratio.
    
    Returns +5% if >25% of transactions were rejected.
    
    Args:
        transactions: List of transaction dictionaries
        
    Returns:
        Penalty value (0.0 to 0.05)
    """
    if not transactions:
        return 0.0
    
    total_count = 0
    rejected_count = 0
    
    for tx in transactions:
        decision = tx.get("NSURE_LAST_DECISION") or tx.get("nsure_last_decision")
        if decision:
            total_count += 1
            if decision.upper() in ["REJECTED", "REJECT", "BLOCKED", "BLOCK"]:
                rejected_count += 1
    
    if total_count == 0:
        return 0.0
    
    rejection_rate = rejected_count / total_count
    
    if rejection_rate > APPROVAL_REJECTION_THRESHOLD_PCT:
        logger.info(
            f"🚨 High rejection rate detected: {rejected_count}/{total_count} "
            f"({rejection_rate:.1%}) rejected (threshold: {APPROVAL_REJECTION_THRESHOLD_PCT:.1%})"
        )
        return APPROVAL_REJECTION_PENALTY
    
    return 0.0

