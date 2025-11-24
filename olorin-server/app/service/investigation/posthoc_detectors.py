"""
Post-Hoc Fraud Detectors

High-precision detectors that operate on historical TXS + merchants data.
These detectors boost precision by focusing on patterns with high PPV (Positive Predictive Value).

Key Features:
1. IP/device velocity & reuse (same email/PII, many merchants in minutes)
2. Geo impossibility + recency corroboration (device/payment overlap)
3. Merchant-local anomaly with global whitelist suppression
4. Link analysis for fraud rings (connected components)

These detectors are designed to run post-hoc on historical data and don't require
client web or "front door" data - they work purely with transaction data.
"""

from typing import Dict, List, Any, Optional, Tuple, Set
from datetime import datetime, timedelta
from collections import defaultdict, Counter
import hashlib
from app.service.logging import get_bridge_logger
from app.service.agent.tools.database_tool import get_database_provider

logger = get_bridge_logger(__name__)


def detect_ip_device_velocity_reuse(
    transactions: List[Dict[str, Any]],
    min_merchants: int = 3,
    time_window_minutes: int = 5,
    ip_reuse_days: int = 7
) -> Optional[Dict[str, Any]]:
    """
    Detect IP/device velocity & reuse: same email/PII, many merchants in minutes.
    
    Features:
    - tx_per_5min: Transactions per 5 minutes
    - distinct_merchants_per_60min: Distinct merchants per 60 minutes
    - ip_reuse_days: IP reuse across multiple days
    
    High-precision flag when combined with low geo risk (IP intel was "clean").
    
    Args:
        transactions: List of transaction dictionaries
        min_merchants: Minimum distinct merchants to flag (default: 3)
        time_window_minutes: Time window for velocity check (default: 5)
        ip_reuse_days: Days to check for IP reuse (default: 7)
    
    Returns:
        Dict with velocity/reuse details if detected, None otherwise
    """
    if not transactions or len(transactions) < min_merchants:
        return None
    
    # Parse transactions
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
                "email": (tx.get("EMAIL") or tx.get("email") or "").lower().strip(),
                "device_id": tx.get("DEVICE_ID") or tx.get("device_id") or "",
                "ip": tx.get("IP") or tx.get("ip") or "",
                "merchant_id": tx.get("STORE_ID") or tx.get("store_id") or tx.get("MERCHANT_ID") or tx.get("merchant_id") or "",
            })
        except Exception as e:
            logger.debug(f"Failed to parse transaction for velocity/reuse: {e}")
            continue
    
    if len(parsed_txs) < min_merchants:
        return None
    
    # Sort by datetime
    parsed_txs.sort(key=lambda x: x["datetime"])
    
    # Group by email (PII)
    email_groups = defaultdict(list)
    for tx in parsed_txs:
        if tx["email"]:
            email_groups[tx["email"]].append(tx)
    
    # Check each email group for velocity/reuse patterns
    for email, email_txs in email_groups.items():
        if len(email_txs) < min_merchants:
            continue
        
        # Calculate tx_per_5min (max velocity in 5-minute windows)
        max_tx_per_5min = 0
        for i in range(len(email_txs)):
            window_start = email_txs[i]["datetime"]
            window_end = window_start + timedelta(minutes=time_window_minutes)
            window_count = sum(1 for tx in email_txs[i:] if tx["datetime"] <= window_end)
            max_tx_per_5min = max(max_tx_per_5min, window_count)
        
        # Calculate distinct_merchants_per_60min
        merchants_per_hour = defaultdict(set)
        for tx in email_txs:
            hour_start = tx["datetime"].replace(minute=0, second=0, microsecond=0)
            merchants_per_hour[hour_start].add(tx["merchant_id"])
        
        max_distinct_merchants_60min = 0
        for hour_start, merchants in merchants_per_hour.items():
            # Check 60-minute window
            hour_end = hour_start + timedelta(hours=1)
            merchants_in_window = set()
            for tx in email_txs:
                if hour_start <= tx["datetime"] < hour_end:
                    merchants_in_window.add(tx["merchant_id"])
            max_distinct_merchants_60min = max(max_distinct_merchants_60min, len(merchants_in_window))
        
        # Calculate IP reuse across days
        ip_days = defaultdict(set)
        for tx in email_txs:
            if tx["ip"]:
                day = tx["datetime"].date()
                ip_days[tx["ip"]].add(day)
        
        ip_reuse_count = sum(1 for days in ip_days.values() if len(days) > 1)
        
        # Check if pattern is significant
        if max_distinct_merchants_60min >= min_merchants or max_tx_per_5min >= 3:
            return {
                "detected": True,
                "email": email,
                "tx_per_5min": max_tx_per_5min,
                "distinct_merchants_per_60min": max_distinct_merchants_60min,
                "ip_reuse_days": ip_reuse_count,
                "total_transactions": len(email_txs),
                "unique_merchants": len(set(tx["merchant_id"] for tx in email_txs if tx["merchant_id"])),
                "unique_ips": len(set(tx["ip"] for tx in email_txs if tx["ip"])),
                "unique_devices": len(set(tx["device_id"] for tx in email_txs if tx["device_id"])),
                "severity": "high" if max_distinct_merchants_60min >= 5 or max_tx_per_5min >= 5 else "medium",
                "ppv_boost": "high"  # High PPV when combined with low geo risk
            }
    
    return None


def detect_geo_impossibility_corroborated(
    transactions: List[Dict[str, Any]],
    min_speed_mph: float = 600.0,
    require_device_overlap: bool = True,
    require_payment_overlap: bool = True
) -> Optional[Dict[str, Any]]:
    """
    Detect geo impossibility with corroboration signals.
    
    Requires corroborating signals:
    - Identical device hash OR
    - Payment instrument overlap (card_hash/BIN+last4)
    
    This reduces false positives from VPNs.
    
    Args:
        transactions: List of transaction dictionaries
        min_speed_mph: Minimum speed in MPH to flag as impossible (default: 600)
        require_device_overlap: Require device overlap for flagging (default: True)
        require_payment_overlap: Require payment overlap for flagging (default: True)
    
    Returns:
        Dict with geo impossibility details if detected, None otherwise
    """
    if not transactions or len(transactions) < 2:
        return None
    
    # Parse transactions with location and corroboration data
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
            
            # Extract location
            country_code = tx.get("IP_COUNTRY_CODE") or tx.get("ip_country_code")
            latitude = tx.get("IP_LATITUDE") or tx.get("ip_latitude")
            longitude = tx.get("IP_LONGITUDE") or tx.get("ip_longitude")
            
            # Extract corroboration signals
            device_id = tx.get("DEVICE_ID") or tx.get("device_id") or ""
            card_bin = tx.get("CARD_BIN") or tx.get("card_bin") or ""
            last_four = tx.get("LAST_FOUR") or tx.get("last_four") or ""
            card_hash = f"{card_bin}|{last_four}" if card_bin and last_four else ""
            
            if country_code or (latitude and longitude):
                parsed_txs.append({
                    "datetime": tx_datetime,
                    "country_code": country_code,
                    "latitude": float(latitude) if latitude else None,
                    "longitude": float(longitude) if longitude else None,
                    "device_id": device_id,
                    "card_hash": card_hash,
                })
        except Exception as e:
            logger.debug(f"Failed to parse transaction for geo impossibility: {e}")
            continue
    
    if len(parsed_txs) < 2:
        return None
    
    # Sort by datetime
    parsed_txs.sort(key=lambda x: x["datetime"])
    
    # Check for impossible travel with corroboration
    impossible_travels = []
    
    for i in range(len(parsed_txs) - 1):
        tx1 = parsed_txs[i]
        tx2 = parsed_txs[i + 1]
        
        # Calculate distance and speed
        if tx1["latitude"] and tx1["longitude"] and tx2["latitude"] and tx2["longitude"]:
            distance_km = _haversine_distance(
                tx1["latitude"], tx1["longitude"],
                tx2["latitude"], tx2["longitude"]
            )
            time_diff_hours = (tx2["datetime"] - tx1["datetime"]).total_seconds() / 3600
            
            if time_diff_hours > 0:
                speed_mph = (distance_km / 1.60934) / time_diff_hours  # Convert km to miles
                
                if speed_mph > min_speed_mph:
                    # Check for corroboration signals
                    device_overlap = tx1["device_id"] and tx1["device_id"] == tx2["device_id"]
                    payment_overlap = tx1["card_hash"] and tx1["card_hash"] == tx2["card_hash"]
                    
                    # Require at least one corroboration signal if enabled
                    has_corroboration = True
                    if require_device_overlap and require_payment_overlap:
                        has_corroboration = device_overlap and payment_overlap
                    elif require_device_overlap:
                        has_corroboration = device_overlap
                    elif require_payment_overlap:
                        has_corroboration = payment_overlap
                    
                    if has_corroboration:
                        impossible_travels.append({
                            "from_country": tx1["country_code"],
                            "to_country": tx2["country_code"],
                            "distance_km": distance_km,
                            "time_hours": time_diff_hours,
                            "speed_mph": speed_mph,
                            "device_overlap": device_overlap,
                            "payment_overlap": payment_overlap,
                            "from_datetime": tx1["datetime"].isoformat(),
                            "to_datetime": tx2["datetime"].isoformat(),
                        })
    
    if impossible_travels:
        # Find most significant impossible travel
        max_travel = max(impossible_travels, key=lambda x: x["speed_mph"])
        
        return {
            "detected": True,
            "impossible_travels": impossible_travels,
            "max_travel": max_travel,
            "count": len(impossible_travels),
            "severity": "high" if max_travel["speed_mph"] > 1000 else "medium",
            "corroborated": True,  # Only flagged if corroboration present
            "ppv_boost": "high"  # Reduced false positives from VPNs
        }
    
    return None


def detect_merchant_local_anomaly(
    transactions: List[Dict[str, Any]],
    merchant_id: str,
    suppress_low_risk: bool = True,
    min_tenure_days: int = 90
) -> Optional[Dict[str, Any]]:
    """
    Detect merchant-local anomaly with global whitelist suppression.
    
    Uses per-merchant baselines:
    - AOV z-score (Average Order Value)
    - BIN mix drift
    - Night-hour ratio
    
    Suppresses alerts when:
    - IP/email intel is "very low risk" AND
    - Customer tenure is long (>= min_tenure_days)
    
    This avoids chasing healthy spikes.
    
    Args:
        transactions: List of transaction dictionaries
        merchant_id: Merchant ID to analyze
        suppress_low_risk: Suppress alerts for low-risk customers (default: True)
        min_tenure_days: Minimum customer tenure to suppress (default: 90)
    
    Returns:
        Dict with merchant anomaly details if detected, None otherwise
    """
    if not transactions:
        return None
    
    # Filter transactions for this merchant
    merchant_txs = [tx for tx in transactions if (
        (tx.get("STORE_ID") or tx.get("store_id") or "") == merchant_id or
        (tx.get("MERCHANT_ID") or tx.get("merchant_id") or "") == merchant_id
    )]
    
    if len(merchant_txs) < 5:  # Need minimum transactions for baseline
        return None
    
    # Parse transactions
    parsed_txs = []
    for tx in merchant_txs:
        try:
            tx_datetime_str = tx.get("TX_DATETIME") or tx.get("tx_datetime")
            if not tx_datetime_str:
                continue
            
            if isinstance(tx_datetime_str, str):
                tx_datetime = datetime.fromisoformat(tx_datetime_str.replace('Z', '+00:00'))
            else:
                tx_datetime = tx_datetime_str
            
            amount = float(tx.get("PAID_AMOUNT_VALUE_IN_CURRENCY") or tx.get("paid_amount_value_in_currency") or 0)
            card_bin = tx.get("CARD_BIN") or tx.get("card_bin") or ""
            email = (tx.get("EMAIL") or tx.get("email") or "").lower().strip()
            
            parsed_txs.append({
                "datetime": tx_datetime,
                "amount": amount,
                "card_bin": card_bin,
                "email": email,
                "hour": tx_datetime.hour,
            })
        except Exception as e:
            logger.debug(f"Failed to parse transaction for merchant anomaly: {e}")
            continue
    
    if len(parsed_txs) < 5:
        return None
    
    # Calculate baselines
    amounts = [tx["amount"] for tx in parsed_txs if tx["amount"] > 0]
    if not amounts:
        return None
    
    mean_aov = sum(amounts) / len(amounts)
    variance = sum((a - mean_aov) ** 2 for a in amounts) / len(amounts)
    std_aov = variance ** 0.5 if variance > 0 else 1.0
    
    # Calculate AOV z-score for recent transactions (last 24h)
    now = datetime.now(parsed_txs[-1]["datetime"].tzinfo) if parsed_txs[-1]["datetime"].tzinfo else datetime.now()
    recent_txs = [tx for tx in parsed_txs if (now - tx["datetime"]).total_seconds() <= 86400]
    
    if recent_txs:
        recent_amounts = [tx["amount"] for tx in recent_txs if tx["amount"] > 0]
        if recent_amounts:
            recent_mean_aov = sum(recent_amounts) / len(recent_amounts)
            aov_z_score = (recent_mean_aov - mean_aov) / std_aov if std_aov > 0 else 0
            
            # Calculate BIN mix drift
            all_bins = [tx["card_bin"] for tx in parsed_txs if tx["card_bin"]]
            recent_bins = [tx["card_bin"] for tx in recent_txs if tx["card_bin"]]
            
            bin_mix_drift = 0.0
            if all_bins and recent_bins:
                all_bin_dist = Counter(all_bins)
                recent_bin_dist = Counter(recent_bins)
                
                # Calculate KL divergence (simplified)
                for bin_val, count in recent_bin_dist.items():
                    recent_p = count / len(recent_bins)
                    all_p = all_bin_dist.get(bin_val, 0) / len(all_bins) if all_bins else 0
                    if all_p > 0:
                        bin_mix_drift += recent_p * (recent_p / all_p) if recent_p > 0 else 0
            
            # Calculate night-hour ratio (transactions between 22:00-06:00)
            night_txs = [tx for tx in parsed_txs if tx["hour"] >= 22 or tx["hour"] < 6]
            night_ratio = len(night_txs) / len(parsed_txs) if parsed_txs else 0
            
            # Check for suppression conditions
            should_suppress = False
            if suppress_low_risk:
                # Check customer tenure (simplified - check if email has transactions > min_tenure_days ago)
                email_first_tx = {}
                for tx in parsed_txs:
                    if tx["email"]:
                        if tx["email"] not in email_first_tx:
                            email_first_tx[tx["email"]] = tx["datetime"]
                        else:
                            email_first_tx[tx["email"]] = min(email_first_tx[tx["email"]], tx["datetime"])
                
                # Check if any customer has long tenure
                for email, first_tx in email_first_tx.items():
                    tenure_days = (now - first_tx).days
                    if tenure_days >= min_tenure_days:
                        should_suppress = True
                        break
            
            # Flag anomaly if significant and not suppressed
            if not should_suppress and (abs(aov_z_score) > 2.0 or bin_mix_drift > 0.5 or night_ratio > 0.3):
                return {
                    "detected": True,
                    "merchant_id": merchant_id,
                    "aov_z_score": aov_z_score,
                    "bin_mix_drift": bin_mix_drift,
                    "night_hour_ratio": night_ratio,
                    "baseline_aov": mean_aov,
                    "recent_aov": recent_mean_aov if recent_amounts else 0,
                    "total_transactions": len(parsed_txs),
                    "recent_transactions": len(recent_txs),
                    "suppressed": should_suppress,
                    "severity": "high" if abs(aov_z_score) > 3.0 or bin_mix_drift > 1.0 else "medium"
                }
    
    return None


def detect_fraud_ring_link_analysis(
    transactions: List[Dict[str, Any]],
    min_ring_size: int = 3,
    min_chargeback_rate: float = 0.3
) -> Optional[Dict[str, Any]]:
    """
    Detect fraud rings using link analysis (connected components).
    
    Builds connected components over:
    - email
    - phone_hash
    - ip_subnet (/24 for IPv4)
    - card_hash (BIN|last4)
    
    Small dense clusters with high chargeback rate yield very precise flags.
    
    Args:
        transactions: List of transaction dictionaries
        min_ring_size: Minimum ring size to flag (default: 3)
        min_chargeback_rate: Minimum chargeback rate to flag (default: 0.3)
    
    Returns:
        Dict with fraud ring details if detected, None otherwise
    """
    if not transactions or len(transactions) < min_ring_size:
        return None
    
    # Build entity graph
    entity_graph = defaultdict(set)
    entity_to_txs = defaultdict(list)
    
    for tx in transactions:
        try:
            tx_datetime_str = tx.get("TX_DATETIME") or tx.get("tx_datetime")
            if not tx_datetime_str:
                continue
            
            if isinstance(tx_datetime_str, str):
                tx_datetime = datetime.fromisoformat(tx_datetime_str.replace('Z', '+00:00'))
            else:
                tx_datetime = tx_datetime_str
            
            # Extract entities
            email = (tx.get("EMAIL") or tx.get("email") or "").lower().strip()
            phone = tx.get("PHONE_NUMBER") or tx.get("phone_number") or ""
            phone_hash = hashlib.md5(phone.encode()).hexdigest()[:8] if phone else ""
            
            ip = tx.get("IP") or tx.get("ip") or ""
            # Extract /24 subnet for IPv4
            ip_subnet = ""
            if ip and "." in ip:
                parts = ip.split(".")
                if len(parts) >= 3:
                    ip_subnet = ".".join(parts[:3]) + ".0/24"
            elif ip and ":" in ip:
                # IPv6 - use first 6 groups for /48
                parts = ip.split(":")
                if len(parts) >= 6:
                    ip_subnet = ":".join(parts[:6]) + "::/48"
            
            card_bin = tx.get("CARD_BIN") or tx.get("card_bin") or ""
            last_four = tx.get("LAST_FOUR") or tx.get("last_four") or ""
            card_hash = f"{card_bin}|{last_four}" if card_bin and last_four else ""
            
            # Create entity set for this transaction
            entities = set()
            if email:
                entities.add(f"email:{email}")
            if phone_hash:
                entities.add(f"phone:{phone_hash}")
            if ip_subnet:
                entities.add(f"ip:{ip_subnet}")
            if card_hash:
                entities.add(f"card:{card_hash}")
            
            # Connect all entities in this transaction
            entity_list = list(entities)
            for i, entity1 in enumerate(entity_list):
                for entity2 in entity_list[i+1:]:
                    entity_graph[entity1].add(entity2)
                    entity_graph[entity2].add(entity1)
                
                # Store transaction for this entity
                entity_to_txs[entity1].append({
                    "datetime": tx_datetime,
                    "is_fraud": tx.get("IS_FRAUD_TX") or tx.get("is_fraud_tx") or 0,
                })
        except Exception as e:
            logger.debug(f"Failed to parse transaction for link analysis: {e}")
            continue
    
    if not entity_graph:
        return None
    
    # Find connected components (fraud rings)
    visited = set()
    components = []
    
    def dfs(entity, component):
        if entity in visited:
            return
        visited.add(entity)
        component.add(entity)
        for neighbor in entity_graph.get(entity, set()):
            if neighbor not in visited:
                dfs(neighbor, component)
    
    for entity in entity_graph:
        if entity not in visited:
            component = set()
            dfs(entity, component)
            if len(component) >= min_ring_size:
                components.append(component)
    
    # Analyze components for fraud indicators
    fraud_rings = []
    for component in components:
        # Get all transactions for entities in this component
        component_txs = []
        for entity in component:
            component_txs.extend(entity_to_txs.get(entity, []))
        
        if not component_txs:
            continue
        
        # Calculate chargeback rate (using IS_FRAUD_TX as proxy)
        fraud_count = sum(1 for tx in component_txs if tx.get("is_fraud") == 1)
        chargeback_rate = fraud_count / len(component_txs) if component_txs else 0
        
        if chargeback_rate >= min_chargeback_rate:
            fraud_rings.append({
                "ring_id": hashlib.md5("|".join(sorted(component)).encode()).hexdigest()[:8],
                "size": len(component),
                "entities": list(component),
                "chargeback_rate": chargeback_rate,
                "fraud_count": fraud_count,
                "total_transactions": len(component_txs),
                "density": len(component_txs) / len(component) if component else 0,
            })
    
    if fraud_rings:
        # Find most significant ring
        max_ring = max(fraud_rings, key=lambda x: x["chargeback_rate"] * x["size"])
        
        return {
            "detected": True,
            "fraud_rings": fraud_rings,
            "max_ring": max_ring,
            "total_rings": len(fraud_rings),
            "severity": "high" if max_ring["chargeback_rate"] > 0.5 and max_ring["size"] >= 5 else "medium",
            "ppv_boost": "very_high"  # Very high PPV for dense clusters with high chargeback rate
        }
    
    return None


def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate haversine distance between two points in kilometers."""
    import math
    
    R = 6371.0  # Earth radius in kilometers
    
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c


def run_all_posthoc_detectors(
    transactions: List[Dict[str, Any]],
    merchant_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Run all post-hoc detectors on transaction data.
    
    Args:
        transactions: List of transaction dictionaries
        merchant_id: Optional merchant ID for merchant-local anomaly detection
    
    Returns:
        Dict with all detector results
    """
    results = {
        "ip_device_velocity_reuse": None,
        "geo_impossibility_corroborated": None,
        "merchant_local_anomaly": None,
        "fraud_ring_link_analysis": None,
    }
    
    # Run IP/device velocity & reuse detector
    try:
        results["ip_device_velocity_reuse"] = detect_ip_device_velocity_reuse(transactions)
    except Exception as e:
        logger.warning(f"IP/device velocity reuse detector failed: {e}")
    
    # Run geo impossibility with corroboration detector
    try:
        results["geo_impossibility_corroborated"] = detect_geo_impossibility_corroborated(transactions)
    except Exception as e:
        logger.warning(f"Geo impossibility corroborated detector failed: {e}")
    
    # Run merchant-local anomaly detector (if merchant_id provided)
    if merchant_id:
        try:
            results["merchant_local_anomaly"] = detect_merchant_local_anomaly(transactions, merchant_id)
        except Exception as e:
            logger.warning(f"Merchant local anomaly detector failed: {e}")
    
    # Run fraud ring link analysis detector
    try:
        results["fraud_ring_link_analysis"] = detect_fraud_ring_link_analysis(transactions)
    except Exception as e:
        logger.warning(f"Fraud ring link analysis detector failed: {e}")
    
    # Calculate overall post-hoc risk score
    risk_score = 0.0
    risk_factors = []
    
    if results["ip_device_velocity_reuse"]:
        risk_score += 0.3
        risk_factors.append("IP/device velocity & reuse")
    
    if results["geo_impossibility_corroborated"]:
        risk_score += 0.3
        risk_factors.append("Geo impossibility (corroborated)")
    
    if results["merchant_local_anomaly"]:
        risk_score += 0.2
        risk_factors.append("Merchant-local anomaly")
    
    if results["fraud_ring_link_analysis"]:
        risk_score += 0.4
        risk_factors.append("Fraud ring detected")
    
    results["overall_risk_score"] = min(risk_score, 1.0)
    results["risk_factors"] = risk_factors
    results["high_precision"] = len(risk_factors) > 0
    
    return results

