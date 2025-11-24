"""
Fraud Pattern Detectors

Detects behavioral fraud patterns in transaction data that should bypass evidence gating.
These patterns are PRIMARY fraud indicators that don't require external tool validation.
"""

from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime, timedelta
from collections import defaultdict
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def detect_velocity_burst(results: List[Dict[str, Any]], time_window_minutes: int = 5, min_transactions: int = 3) -> Optional[Dict[str, Any]]:
    """
    Detect velocity bursts: multiple transactions within a short time window.
    
    Args:
        results: List of transaction records from Snowflake
        time_window_minutes: Time window to check for bursts (default: 5 minutes)
        min_transactions: Minimum transactions to consider a burst (default: 3)
    
    Returns:
        Dict with burst details if detected, None otherwise
    """
    if not results or len(results) < min_transactions:
        return None
    
    # Extract and sort transactions by datetime
    transactions = []
    for result in results:
        if isinstance(result, dict):
            datetime_str = result.get("TX_DATETIME") or result.get("tx_datetime")
            amount = result.get("PAID_AMOUNT_VALUE_IN_CURRENCY") or result.get("paid_amount_value_in_currency", 0)
            tx_id = result.get("TX_ID_KEY") or result.get("tx_id_key", "")
            
            if datetime_str:
                try:
                    tx_datetime = datetime.fromisoformat(str(datetime_str).replace('Z', '+00:00'))
                    transactions.append({
                        "datetime": tx_datetime,
                        "amount": float(amount) if amount else 0,
                        "id": tx_id
                    })
                except Exception as e:
                    logger.debug(f"Could not parse datetime {datetime_str}: {e}")
                    continue
    
    if len(transactions) < min_transactions:
        return None
    
    # Sort by datetime
    transactions.sort(key=lambda x: x["datetime"])
    
    # Check for bursts within time window
    for i in range(len(transactions) - min_transactions + 1):
        window_start = transactions[i]["datetime"]
        window_end = window_start + timedelta(minutes=time_window_minutes)
        
        # Count transactions in window
        window_transactions = [
            tx for tx in transactions[i:]
            if window_start <= tx["datetime"] <= window_end
        ]
        
        if len(window_transactions) >= min_transactions:
            # Burst detected
            amounts = [tx["amount"] for tx in window_transactions]
            total_amount = sum(amounts)
            
            return {
                "detected": True,
                "transaction_count": len(window_transactions),
                "time_window_minutes": time_window_minutes,
                "start_time": window_start.isoformat(),
                "end_time": window_end.isoformat(),
                "total_amount": total_amount,
                "amounts": amounts,
                "severity": "high" if len(window_transactions) >= 5 else "medium"
            }
    
    return None


def detect_amount_clustering(results: List[Dict[str, Any]], min_repeats: int = 2, time_window_minutes: int = 10) -> Optional[Dict[str, Any]]:
    """
    Detect identical amounts appearing in rapid succession (clustering pattern).
    
    Args:
        results: List of transaction records from Snowflake
        min_repeats: Minimum number of identical amounts to detect (default: 2)
        time_window_minutes: Time window to check for clustering (default: 10 minutes)
    
    Returns:
        Dict with clustering details if detected, None otherwise
    """
    if not results or len(results) < min_repeats:
        return None
    
    # Extract transactions with amounts
    transactions = []
    for result in results:
        if isinstance(result, dict):
            datetime_str = result.get("TX_DATETIME") or result.get("tx_datetime")
            amount = result.get("PAID_AMOUNT_VALUE_IN_CURRENCY") or result.get("paid_amount_value_in_currency", 0)
            
            if datetime_str and amount:
                try:
                    tx_datetime = datetime.fromisoformat(str(datetime_str).replace('Z', '+00:00'))
                    amount_float = float(amount)
                    transactions.append({
                        "datetime": tx_datetime,
                        "amount": amount_float
                    })
                except Exception as e:
                    logger.debug(f"Could not parse transaction: {e}")
                    continue
    
    if len(transactions) < min_repeats:
        return None
    
    # Sort by datetime
    transactions.sort(key=lambda x: x["datetime"])
    
    # Group by amount
    amount_groups = defaultdict(list)
    for tx in transactions:
        amount_groups[tx["amount"]].append(tx)
    
    # Check for clustering (same amount in rapid succession)
    clusters = []
    for amount, tx_list in amount_groups.items():
        if len(tx_list) >= min_repeats:
            # Check if they're close in time
            tx_list.sort(key=lambda x: x["datetime"])
            for i in range(len(tx_list) - min_repeats + 1):
                window_start = tx_list[i]["datetime"]
                window_end = window_start + timedelta(minutes=time_window_minutes)
                
                window_txs = [
                    tx for tx in tx_list[i:]
                    if window_start <= tx["datetime"] <= window_end
                ]
                
                if len(window_txs) >= min_repeats:
                    clusters.append({
                        "amount": amount,
                        "count": len(window_txs),
                        "time_span_minutes": (window_txs[-1]["datetime"] - window_txs[0]["datetime"]).total_seconds() / 60,
                        "start_time": window_txs[0]["datetime"].isoformat(),
                        "end_time": window_txs[-1]["datetime"].isoformat()
                    })
    
    if clusters:
        # Find most significant cluster
        max_cluster = max(clusters, key=lambda x: x["count"])
        return {
            "detected": True,
            "clusters": clusters,
            "max_cluster": max_cluster,
            "severity": "high" if max_cluster["count"] >= 3 else "medium"
        }
    
    return None


def detect_ip_rotation(results: List[Dict[str, Any]], time_window_hours: int = 4) -> Optional[Dict[str, Any]]:
    """
    Detect IP rotation: same device using multiple IPs from same subnet within short time.
    
    Args:
        results: List of transaction records from Snowflake
        time_window_hours: Time window to check for rotation (default: 4 hours)
    
    Returns:
        Dict with IP rotation details if detected, None otherwise
    """
    if not results or len(results) < 2:
        return None
    
    # Extract device-IP pairs with timestamps
    device_ip_map = defaultdict(lambda: {"ips": set(), "transactions": []})
    
    for result in results:
        if isinstance(result, dict):
            datetime_str = result.get("TX_DATETIME") or result.get("tx_datetime")
            device = result.get("DEVICE_ID") or result.get("device_id", "")
            ip = result.get("IP") or result.get("ip", "")
            
            if datetime_str and device and ip:
                try:
                    tx_datetime = datetime.fromisoformat(str(datetime_str).replace('Z', '+00:00'))
                    device_ip_map[device]["ips"].add(ip)
                    device_ip_map[device]["transactions"].append({
                        "datetime": tx_datetime,
                        "ip": ip
                    })
                except Exception as e:
                    logger.debug(f"Could not parse transaction: {e}")
                    continue
    
    # Check for devices with multiple IPs
    rotations = []
    for device, data in device_ip_map.items():
        if len(data["ips"]) >= 2 and len(data["transactions"]) >= 2:
            # Check if IPs are from same subnet (/48 for IPv6, /24 for IPv4)
            ips = list(data["ips"])
            transactions = sorted(data["transactions"], key=lambda x: x["datetime"])
            
            # Calculate time span
            time_span = (transactions[-1]["datetime"] - transactions[0]["datetime"]).total_seconds() / 3600  # hours
            
            if time_span <= time_window_hours:
                # Extract subnet (simplified - assumes IPv6 /48 or IPv4 /24)
                subnets = set()
                for ip in ips:
                    if ":" in ip:  # IPv6
                        # Extract /48 subnet (first 6 groups)
                        parts = ip.split(":")
                        if len(parts) >= 6:
                            subnet = ":".join(parts[:6])
                            subnets.add(subnet)
                    else:  # IPv4
                        # Extract /24 subnet (first 3 octets)
                        parts = ip.split(".")
                        if len(parts) >= 3:
                            subnet = ".".join(parts[:3])
                            subnets.add(subnet)
                
                if len(subnets) == 1:  # All IPs from same subnet
                    rotations.append({
                        "device": device,
                        "ip_count": len(ips),
                        "ips": ips,
                        "subnet": list(subnets)[0],
                        "time_span_hours": time_span,
                        "transaction_count": len(transactions),
                        "severity": "high" if len(ips) >= 3 else "medium"
                    })
    
    if rotations:
        # Find most significant rotation
        max_rotation = max(rotations, key=lambda x: x["ip_count"])
        return {
            "detected": True,
            "rotations": rotations,
            "max_rotation": max_rotation,
            "severity": max_rotation["severity"]
        }
    
    return None


def detect_device_ip_mismatch(results: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    Detect device-IP mismatch: single device across multiple IPs (contradiction pattern).
    
    Args:
        results: List of transaction records from Snowflake
    
    Returns:
        Dict with mismatch details if detected, None otherwise
    """
    if not results or len(results) < 2:
        return None
    
    # Group by device
    device_ips = defaultdict(set)
    
    for result in results:
        if isinstance(result, dict):
            device = result.get("DEVICE_ID") or result.get("device_id", "")
            ip = result.get("IP") or result.get("ip", "")
            
            if device and ip:
                device_ips[device].add(ip)
    
    # Find devices with multiple IPs
    mismatches = []
    for device, ips in device_ips.items():
        if len(ips) >= 2:
            mismatches.append({
                "device": device,
                "ip_count": len(ips),
                "ips": list(ips),
                "severity": "high" if len(ips) >= 3 else "medium"
            })
    
    if mismatches:
        max_mismatch = max(mismatches, key=lambda x: x["ip_count"])
        return {
            "detected": True,
            "mismatches": mismatches,
            "max_mismatch": max_mismatch,
            "severity": max_mismatch["severity"]
        }
    
    return None


def calculate_fraud_pattern_score(results: List[Dict[str, Any]]) -> Tuple[float, Dict[str, Any]]:
    """
    Calculate fraud pattern score based on detected behavioral patterns.
    
    Args:
        results: List of transaction records from Snowflake
    
    Returns:
        Tuple of (fraud_pattern_score, pattern_details)
    """
    pattern_details = {
        "velocity_burst": None,
        "amount_clustering": None,
        "ip_rotation": None,
        "device_ip_mismatch": None
    }
    
    # Detect patterns
    velocity_burst = detect_velocity_burst(results)
    amount_clustering = detect_amount_clustering(results)
    ip_rotation = detect_ip_rotation(results)
    device_ip_mismatch = detect_device_ip_mismatch(results)
    
    pattern_details["velocity_burst"] = velocity_burst
    pattern_details["amount_clustering"] = amount_clustering
    pattern_details["ip_rotation"] = ip_rotation
    pattern_details["device_ip_mismatch"] = device_ip_mismatch
    
    # Calculate scores
    velocity_score = 0.8 if velocity_burst and velocity_burst.get("severity") == "high" else \
                     0.5 if velocity_burst else 0.0
    
    clustering_score = 0.7 if amount_clustering and amount_clustering.get("severity") == "high" else \
                       0.4 if amount_clustering else 0.0
    
    rotation_score = 0.6 if ip_rotation and ip_rotation.get("severity") == "high" else \
                     0.3 if ip_rotation else 0.0
    
    mismatch_score = 0.5 if device_ip_mismatch and device_ip_mismatch.get("severity") == "high" else \
                     0.2 if device_ip_mismatch else 0.0
    
    # Weighted combination
    fraud_pattern_score = (
        velocity_score * 0.4 +
        clustering_score * 0.3 +
        rotation_score * 0.2 +
        mismatch_score * 0.1
    )
    
    return fraud_pattern_score, pattern_details


def has_strong_fraud_patterns(snowflake_data: Dict[str, Any]) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """
    Check if Snowflake data contains strong fraud patterns that should bypass evidence gating.
    
    Args:
        snowflake_data: Snowflake query results
    
    Returns:
        Tuple of (has_patterns, pattern_details)
    """
    if not snowflake_data or not isinstance(snowflake_data, dict):
        return False, None
    
    results = snowflake_data.get("results", [])
    if not results or len(results) < 3:
        return False, None
    
    # Check for substantial transaction volume
    if len(results) >= 5:
        fraud_pattern_score, pattern_details = calculate_fraud_pattern_score(results)
        
        # Strong patterns bypass evidence gating
        if fraud_pattern_score >= 0.5:
            logger.info(f"✅ Strong fraud patterns detected: score={fraud_pattern_score:.3f}")
            logger.info(f"   Patterns: velocity={pattern_details['velocity_burst'] is not None}, "
                       f"clustering={pattern_details['amount_clustering'] is not None}, "
                       f"rotation={pattern_details['ip_rotation'] is not None}")
            return True, pattern_details
    
    return False, None

