"""
Advanced Feature Engineering for Precision Optimization

This module provides entity-scoped velocity, geovelocity, amount patterns,
device/IP stability, and merchant consistency features for improved fraud detection precision.
"""

from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from collections import defaultdict, Counter
import math
from app.service.logging import get_bridge_logger
from app.service.analytics.velocity_analyzer import VelocityAnalyzer

logger = get_bridge_logger(__name__)

# Constants
VELOCITY_WINDOW_MINUTES = 5
AMOUNT_THRESHOLD_BINS = [(998, 1000), (499, 501), (99, 101)]  # Common threshold-avoidance amounts
MAX_FEASIBLE_SPEED_MPH = 600  # Commercial aircraft speed
EARTH_RADIUS_KM = 6371.0  # Earth radius in kilometers


def calculate_entity_scoped_velocity(
    transactions: List[Dict[str, Any]],
    entity_type: str,
    entity_value: str
) -> Dict[str, float]:
    """
    Calculate entity-scoped velocity metrics (tx_per_5min by email, device_id, ip_address).
    
    Args:
        transactions: List of transaction dictionaries
        entity_type: Entity type (email, device_id, ip_address)
        entity_value: Entity value
        
    Returns:
        Dictionary with velocity metrics:
        - tx_per_5min_by_email: Transactions per 5min by email
        - tx_per_5min_by_device: Transactions per 5min by device_id
        - tx_per_5min_by_ip: Transactions per 5min by ip_address
        - merchant_local_velocity: Transactions per 5min by merchant_id
    """
    if not transactions:
        return {
            "tx_per_5min_by_email": 0.0,
            "tx_per_5min_by_device": 0.0,
            "tx_per_5min_by_ip": 0.0,
            "merchant_local_velocity": 0.0
        }
    
    # Parse transactions and extract timestamps
    parsed_txs = []
    for tx in transactions:
        try:
            tx_datetime_str = tx.get("TX_DATETIME") or tx.get("tx_datetime")
            if not tx_datetime_str:
                continue
            
            if isinstance(tx_datetime_str, str):
                tx_datetime = datetime.fromisoformat(tx_datetime_str.replace('Z', '+00:00'))
            else:
                tx_datetime = tx_datetime_str
            
            parsed_txs.append({
                "datetime": tx_datetime,
                "email": tx.get("EMAIL") or tx.get("email") or tx.get("CUSTOMER_EMAIL") or tx.get("customer_email"),
                "device_id": tx.get("DEVICE_ID") or tx.get("device_id"),
                "ip_address": tx.get("IP") or tx.get("ip") or tx.get("IP_ADDRESS") or tx.get("ip_address"),
                "merchant_id": tx.get("MERCHANT_ID") or tx.get("merchant_id") or tx.get("STORE_ID") or tx.get("store_id"),
            })
        except Exception as e:
            logger.debug(f"Failed to parse transaction for velocity: {e}")
            continue
    
    if not parsed_txs:
        return {
            "tx_per_5min_by_email": 0.0,
            "tx_per_5min_by_device": 0.0,
            "tx_per_5min_by_ip": 0.0,
            "merchant_local_velocity": 0.0
        }
    
    # Sort by datetime
    parsed_txs.sort(key=lambda x: x["datetime"])
    
    # Calculate velocity by entity
    velocity_metrics = {
        "tx_per_5min_by_email": _calculate_velocity_by_entity(parsed_txs, "email", VELOCITY_WINDOW_MINUTES),
        "tx_per_5min_by_device": _calculate_velocity_by_entity(parsed_txs, "device_id", VELOCITY_WINDOW_MINUTES),
        "tx_per_5min_by_ip": _calculate_velocity_by_entity(parsed_txs, "ip_address", VELOCITY_WINDOW_MINUTES),
        "merchant_local_velocity": _calculate_merchant_local_velocity(parsed_txs, VELOCITY_WINDOW_MINUTES),
    }
    
    return velocity_metrics


def _calculate_velocity_by_entity(
    transactions: List[Dict[str, Any]],
    entity_key: str,
    window_minutes: int
) -> float:
    """Calculate max transactions per window_minutes for a given entity."""
    if not transactions:
        return 0.0
    
    # Group by entity value
    entity_groups = defaultdict(list)
    for tx in transactions:
        entity_value = tx.get(entity_key)
        if entity_value:
            entity_groups[entity_value].append(tx["datetime"])
    
    max_velocity = 0.0
    for entity_value, timestamps in entity_groups.items():
        if len(timestamps) < 2:
            continue
        
        timestamps.sort()
        # Sliding window to find max velocity
        for i in range(len(timestamps)):
            window_end = timestamps[i] + timedelta(minutes=window_minutes)
            count = sum(1 for ts in timestamps[i:] if ts <= window_end)
            max_velocity = max(max_velocity, count)
    
    return max_velocity


def _calculate_merchant_local_velocity(
    transactions: List[Dict[str, Any]],
    window_minutes: int
) -> float:
    """Calculate max transactions per window_minutes by merchant_id."""
    merchant_groups = defaultdict(list)
    for tx in transactions:
        merchant_id = tx.get("merchant_id")
        if merchant_id:
            merchant_groups[merchant_id].append(tx["datetime"])
    
    max_velocity = 0.0
    for merchant_id, timestamps in merchant_groups.items():
        if len(timestamps) < 2:
            continue
        
        timestamps.sort()
        for i in range(len(timestamps)):
            window_end = timestamps[i] + timedelta(minutes=window_minutes)
            count = sum(1 for ts in timestamps[i:] if ts <= window_end)
            max_velocity = max(max_velocity, count)
    
    return max_velocity


def calculate_geovelocity_features(
    transactions: List[Dict[str, Any]]
) -> Dict[str, float]:
    """
    Calculate geovelocity features (numeric distance/speed instead of binary flags).
    
    Args:
        transactions: List of transaction dictionaries with location data
        
    Returns:
        Dictionary with geovelocity metrics:
        - max_travel_speed_mph: Maximum travel speed in MPH
        - avg_travel_speed_mph: Average travel speed in MPH
        - impossible_travel_count: Number of impossible travel instances
        - total_distance_km: Total distance traveled
        - distance_anomaly_score: Normalized distance anomaly score (0-1)
    """
    if not transactions:
        return {
            "max_travel_speed_mph": 0.0,
            "avg_travel_speed_mph": 0.0,
            "impossible_travel_count": 0,
            "total_distance_km": 0.0,
            "distance_anomaly_score": 0.0
        }
    
    # Extract location data
    location_data = []
    for tx in transactions:
        try:
            tx_datetime_str = tx.get("TX_DATETIME") or tx.get("tx_datetime")
            if not tx_datetime_str:
                continue
            
            if isinstance(tx_datetime_str, str):
                tx_datetime = datetime.fromisoformat(tx_datetime_str.replace('Z', '+00:00'))
            else:
                tx_datetime = tx_datetime_str
            
            country_code = tx.get("IP_COUNTRY_CODE") or tx.get("ip_country_code")
            latitude = tx.get("IP_LATITUDE") or tx.get("ip_latitude")
            longitude = tx.get("IP_LONGITUDE") or tx.get("ip_longitude")
            
            if country_code or (latitude and longitude):
                location_data.append({
                    "datetime": tx_datetime,
                    "country_code": country_code,
                    "latitude": float(latitude) if latitude else None,
                    "longitude": float(longitude) if longitude else None,
                })
        except Exception as e:
            logger.debug(f"Failed to parse location data: {e}")
            continue
    
    if len(location_data) < 2:
        return {
            "max_travel_speed_mph": 0.0,
            "avg_travel_speed_mph": 0.0,
            "impossible_travel_count": 0,
            "total_distance_km": 0.0,
            "distance_anomaly_score": 0.0
        }
    
    # Sort by datetime
    location_data.sort(key=lambda x: x["datetime"])
    
    # Calculate travel speeds
    travel_speeds = []
    distances = []
    impossible_travel_count = 0
    
    for i in range(len(location_data) - 1):
        prev = location_data[i]
        curr = location_data[i + 1]
        
        # Calculate distance
        if prev["latitude"] and prev["longitude"] and curr["latitude"] and curr["longitude"]:
            distance_km = _haversine_distance(
                prev["latitude"], prev["longitude"],
                curr["latitude"], curr["longitude"]
            )
            distances.append(distance_km)
        elif prev["country_code"] != curr["country_code"]:
            # Approximate distance between countries (rough estimate)
            distance_km = 1000.0  # Conservative estimate
            distances.append(distance_km)
        else:
            continue
        
        # Calculate time difference
        time_diff = (curr["datetime"] - prev["datetime"]).total_seconds() / 3600  # hours
        
        if time_diff > 0:
            speed_mph = (distance_km / 1.60934) / time_diff  # Convert km to miles, divide by hours
            travel_speeds.append(speed_mph)
            
            if speed_mph > MAX_FEASIBLE_SPEED_MPH:
                impossible_travel_count += 1
    
    # Calculate metrics
    max_speed = max(travel_speeds) if travel_speeds else 0.0
    avg_speed = sum(travel_speeds) / len(travel_speeds) if travel_speeds else 0.0
    total_distance = sum(distances)
    
    # Distance anomaly score: normalize max speed to [0, 1] range
    # Speed > 600 mph = 1.0, speed < 100 mph = 0.0, linear interpolation
    distance_anomaly_score = min(1.0, max(0.0, (max_speed - 100) / (MAX_FEASIBLE_SPEED_MPH - 100))) if max_speed > 100 else 0.0
    
    return {
        "max_travel_speed_mph": max_speed,
        "avg_travel_speed_mph": avg_speed,
        "impossible_travel_count": impossible_travel_count,
        "total_distance_km": total_distance,
        "distance_anomaly_score": distance_anomaly_score
    }


def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two lat/lon points using Haversine formula."""
    # Convert to radians
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    # Haversine formula
    a = math.sin(delta_lat / 2) ** 2 + \
        math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    
    return EARTH_RADIUS_KM * c


def calculate_amount_patterns(
    transactions: List[Dict[str, Any]]
) -> Dict[str, float]:
    """
    Detect amount micro-patterns (near-threshold amounts, burst-within-bin ratio).
    
    Args:
        transactions: List of transaction dictionaries
        
    Returns:
        Dictionary with amount pattern metrics:
        - near_threshold_amount_count: Count of transactions in threshold bins ($998-$1000, etc.)
        - burst_within_bin_ratio: Ratio of bursts (multiple same-amount tx within 5min) to total transactions
        - amount_clustering_score: Normalized clustering score (0-1)
    """
    if not transactions:
        return {
            "near_threshold_amount_count": 0,
            "burst_within_bin_ratio": 0.0,
            "amount_clustering_score": 0.0
        }
    
    # Extract amounts and timestamps
    amount_txs = []
    for tx in transactions:
        try:
            amount = tx.get("PAID_AMOUNT_VALUE_IN_CURRENCY") or tx.get("paid_amount_value_in_currency", 0)
            amount_float = float(amount) if amount else 0.0
            
            tx_datetime_str = tx.get("TX_DATETIME") or tx.get("tx_datetime")
            if tx_datetime_str:
                if isinstance(tx_datetime_str, str):
                    tx_datetime = datetime.fromisoformat(tx_datetime_str.replace('Z', '+00:00'))
                else:
                    tx_datetime = tx_datetime_str
            else:
                continue
            
            amount_txs.append({
                "amount": amount_float,
                "datetime": tx_datetime
            })
        except Exception as e:
            logger.debug(f"Failed to parse amount: {e}")
            continue
    
    if not amount_txs:
        return {
            "near_threshold_amount_count": 0,
            "burst_within_bin_ratio": 0.0,
            "amount_clustering_score": 0.0
        }
    
    # Count near-threshold amounts
    near_threshold_count = 0
    for tx in amount_txs:
        amount = tx["amount"]
        for min_amt, max_amt in AMOUNT_THRESHOLD_BINS:
            if min_amt <= amount <= max_amt:
                near_threshold_count += 1
                break
    
    # Detect bursts within amount bins
    amount_groups = defaultdict(list)
    for tx in amount_txs:
        # Round to nearest dollar for binning
        amount_bin = round(tx["amount"])
        amount_groups[amount_bin].append(tx)
    
    burst_count = 0
    for amount_bin, txs in amount_groups.items():
        if len(txs) < 2:
            continue
        
        # Sort by datetime
        txs.sort(key=lambda x: x["datetime"])
        
        # Check for bursts (multiple transactions within 5 minutes)
        for i in range(len(txs) - 1):
            time_diff = (txs[i+1]["datetime"] - txs[i]["datetime"]).total_seconds() / 60
            if time_diff <= VELOCITY_WINDOW_MINUTES:
                burst_count += 1
                break  # Count each bin once
    
    total_txs = len(amount_txs)
    burst_ratio = burst_count / total_txs if total_txs > 0 else 0.0
    
    # Clustering score: combination of near-threshold ratio and burst ratio
    near_threshold_ratio = near_threshold_count / total_txs if total_txs > 0 else 0.0
    clustering_score = (near_threshold_ratio * 0.5) + (burst_ratio * 0.5)
    
    return {
        "near_threshold_amount_count": near_threshold_count,
        "burst_within_bin_ratio": burst_ratio,
        "amount_clustering_score": min(1.0, max(0.0, clustering_score))
    }


def calculate_device_ip_stability(
    transactions: List[Dict[str, Any]]
) -> Dict[str, float]:
    """
    Calculate device/IP stability metrics.
    
    Args:
        transactions: List of transaction dictionaries
        
    Returns:
        Dictionary with stability metrics:
        - devices_per_email_14d: Number of unique devices per email in 14 days
        - ips_per_device_14d: Number of unique IPs per device in 14 days
        - user_agents_per_device: Number of unique user agents per device
        - device_instability_score: Normalized instability score (0-1)
    """
    if not transactions:
        return {
            "devices_per_email_14d": 0.0,
            "ips_per_device_14d": 0.0,
            "user_agents_per_device": 0.0,
            "device_instability_score": 0.0
        }
    
    # Extract data
    email_devices = defaultdict(set)
    device_ips = defaultdict(set)
    device_user_agents = defaultdict(set)
    
    # Calculate 14-day window
    if transactions:
        latest_tx = max(
            (tx.get("TX_DATETIME") or tx.get("tx_datetime") for tx in transactions if tx.get("TX_DATETIME") or tx.get("tx_datetime")),
            default=None
        )
        if latest_tx:
            if isinstance(latest_tx, str):
                latest_datetime = datetime.fromisoformat(latest_tx.replace('Z', '+00:00'))
            else:
                latest_datetime = latest_tx
            window_start = latest_datetime - timedelta(days=14)
        else:
            window_start = None
    else:
        window_start = None
    
    for tx in transactions:
        try:
            tx_datetime_str = tx.get("TX_DATETIME") or tx.get("tx_datetime")
            if tx_datetime_str:
                if isinstance(tx_datetime_str, str):
                    tx_datetime = datetime.fromisoformat(tx_datetime_str.replace('Z', '+00:00'))
                else:
                    tx_datetime = tx_datetime_str
            else:
                continue
            
            # Filter by 14-day window if available
            if window_start and tx_datetime < window_start:
                continue
            
            email = tx.get("EMAIL") or tx.get("email") or tx.get("CUSTOMER_EMAIL") or tx.get("customer_email")
            device_id = tx.get("DEVICE_ID") or tx.get("device_id")
            ip_address = tx.get("IP") or tx.get("ip") or tx.get("IP_ADDRESS") or tx.get("ip_address")
            user_agent = tx.get("USER_AGENT") or tx.get("user_agent")
            
            if email and device_id:
                email_devices[email].add(device_id)
            
            if device_id and ip_address:
                device_ips[device_id].add(ip_address)
            
            if device_id and user_agent:
                device_user_agents[device_id].add(user_agent)
        except Exception as e:
            logger.debug(f"Failed to parse device/IP data: {e}")
            continue
    
    # Calculate metrics
    devices_per_email_avg = sum(len(devices) for devices in email_devices.values()) / len(email_devices) if email_devices else 0.0
    ips_per_device_avg = sum(len(ips) for ips in device_ips.values()) / len(device_ips) if device_ips else 0.0
    user_agents_per_device_avg = sum(len(uas) for uas in device_user_agents.values()) / len(device_user_agents) if device_user_agents else 0.0
    
    # Instability score: normalize to [0, 1]
    # High device/IP rotation = high instability
    instability_score = min(1.0, (
        (devices_per_email_avg / 10.0) * 0.4 +  # Max 10 devices = 0.4
        (ips_per_device_avg / 5.0) * 0.3 +  # Max 5 IPs = 0.3
        (user_agents_per_device_avg / 3.0) * 0.3  # Max 3 UAs = 0.3
    ))
    
    return {
        "devices_per_email_14d": devices_per_email_avg,
        "ips_per_device_14d": ips_per_device_avg,
        "user_agents_per_device": user_agents_per_device_avg,
        "device_instability_score": instability_score
    }


def calculate_merchant_consistency(
    transactions: List[Dict[str, Any]]
) -> Dict[str, float]:
    """
    Calculate merchant consistency metrics.
    
    Args:
        transactions: List of transaction dictionaries
        
    Returns:
        Dictionary with merchant metrics:
        - single_merchant_concentration: Ratio of transactions to single merchant
        - unknown_decision_ratio: Ratio of UNKNOWN decisions
        - merchant_diversity_score: Normalized diversity score (0-1)
    """
    if not transactions:
        return {
            "single_merchant_concentration": 0.0,
            "unknown_decision_ratio": 0.0,
            "merchant_diversity_score": 0.0
        }
    
    merchant_counts = Counter()
    unknown_decisions = 0
    total_decisions = 0
    
    for tx in transactions:
        merchant_id = tx.get("MERCHANT_ID") or tx.get("merchant_id") or tx.get("MERCHANT_NAME") or tx.get("merchant_name") or tx.get("STORE_ID") or tx.get("store_id")
        if merchant_id:
            merchant_counts[merchant_id] += 1
        
        decision = tx.get("NSURE_LAST_DECISION") or tx.get("nsure_last_decision")
        if decision:
            total_decisions += 1
            if str(decision).upper() == "UNKNOWN":
                unknown_decisions += 1
    
    total_txs = len(transactions)
    
    # Single merchant concentration
    if merchant_counts:
        max_merchant_count = merchant_counts.most_common(1)[0][1]
        single_merchant_concentration = max_merchant_count / total_txs if total_txs > 0 else 0.0
    else:
        single_merchant_concentration = 0.0
    
    # Unknown decision ratio
    unknown_ratio = unknown_decisions / total_decisions if total_decisions > 0 else 0.0
    
    # Merchant diversity score: low concentration = high diversity
    # Single merchant (1.0) = 0.0 diversity, multiple merchants = higher diversity
    unique_merchants = len(merchant_counts)
    diversity_score = min(1.0, unique_merchants / max(total_txs, 1)) if total_txs > 0 else 0.0
    
    return {
        "single_merchant_concentration": single_merchant_concentration,
        "unknown_decision_ratio": unknown_ratio,
        "merchant_diversity_score": diversity_score
    }


def extract_all_advanced_features(
    transactions: List[Dict[str, Any]],
    entity_type: str,
    entity_value: str
) -> Dict[str, Any]:
    """
    Extract all advanced features for a transaction set.

    Args:
        transactions: List of transaction dictionaries
        entity_type: Entity type
        entity_value: Entity value

    Returns:
        Dictionary with all advanced features
    """
    features = {}

    # Entity-scoped velocity (legacy 5-minute window)
    velocity_features = calculate_entity_scoped_velocity(transactions, entity_type, entity_value)
    features.update(velocity_features)

    # Enhanced velocity analysis (Week 5 Phase 2 - multi-window)
    try:
        if transactions:
            velocity_analyzer = VelocityAnalyzer()

            current_tx = transactions[-1] if transactions else {}
            historical_txs = transactions[:-1] if len(transactions) > 1 else None

            enhanced_velocity = velocity_analyzer.analyze_transaction_velocity(
                current_tx,
                historical_txs
            )

            if enhanced_velocity.get("success"):
                features["enhanced_velocity"] = enhanced_velocity
                features["sliding_window_velocities"] = enhanced_velocity.get("sliding_windows", {})
                features["entity_velocities_enhanced"] = enhanced_velocity.get("entity_velocities", {})
                features["merchant_concentration"] = enhanced_velocity.get("merchant_concentration", {})
                features["cross_entity_correlation"] = enhanced_velocity.get("cross_entity_correlation", {})

                logger.debug(
                    f"📊 Enhanced velocity analysis complete: "
                    f"windows={list(enhanced_velocity.get('sliding_windows', {}).keys())}, "
                    f"merchant_concentration={enhanced_velocity.get('merchant_concentration', {}).get('concentration_ratio', 0):.2f}"
                )
    except Exception as e:
        logger.warning(f"⚠️ Enhanced velocity analysis failed: {e}")

    # Geovelocity features
    geovelocity_features = calculate_geovelocity_features(transactions)
    features.update(geovelocity_features)

    # Amount patterns
    amount_features = calculate_amount_patterns(transactions)
    features.update(amount_features)

    # Device/IP stability
    stability_features = calculate_device_ip_stability(transactions)
    features.update(stability_features)

    # Merchant consistency
    merchant_features = calculate_merchant_consistency(transactions)
    features.update(merchant_features)

    return features

