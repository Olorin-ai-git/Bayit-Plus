"""
Network Pattern Recognizer for Fraud Detection.

Implements network-based pattern detection:
1. IP reputation clustering (VPN/proxy detection)
2. Geo-impossibility detection (impossible travel)
3. ISP/ASN anomaly detection
4. IP rotation detection

Strategy: Aggressive high-recall (target >85% recall, accept 15-20% FPR)
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set
from collections import defaultdict
import ipaddress

logger = logging.getLogger(__name__)

# Network Pattern Constants (Aggressive Strategy)
GEO_IMPOSSIBILITY_SPEED_MPH = 600  # Max realistic travel speed (relaxed for flights)
IP_ROTATION_MIN_CHANGES = 3        # Minimum IP changes to detect rotation
IP_ROTATION_TIME_WINDOW_HOURS = 2  # Time window for IP rotation detection
ASN_ANOMALY_MIN_ASNS = 3           # Minimum different ASNs to trigger
PROXY_INDICATORS = ["vpn", "proxy", "hosting", "datacenter", "cloud", "tor"]

# Risk Adjustments
IP_REPUTATION_RISK = 0.18      # +18% risk adjustment
GEO_IMPOSSIBILITY_RISK = 0.25  # +25% risk adjustment (highest)
ASN_ANOMALY_RISK = 0.15        # +15% risk adjustment
IP_ROTATION_RISK = 0.20        # +20% risk adjustment


class NetworkPatternRecognizer:
    """
    Network Pattern Recognizer - Detects network-based fraud patterns.

    Patterns Detected:
    1. IP Reputation Clustering: VPN/proxy/hosting IP usage
    2. Geo-Impossibility: Impossible travel between transactions
    3. ISP/ASN Anomaly: Unusual network provider patterns
    4. IP Rotation: Rapid IP address changes
    """

    def __init__(self):
        """Initialize the network pattern recognizer."""
        logger.info("🌐 Initializing NetworkPatternRecognizer (aggressive high-recall strategy)")

    def recognize(
        self,
        processed_data: Dict[str, Any],
        minimum_support: float = 0.1,
        historical_patterns: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Recognize network patterns in transaction data.

        Args:
            processed_data: Dictionary containing transaction events
            minimum_support: Minimum support threshold (0.0-1.0)
            historical_patterns: Optional historical pattern data for comparison

        Returns:
            Dictionary containing detected patterns and confidence scores
        """
        try:
            logger.info("🌐 Starting network pattern recognition")

            events = processed_data.get("events", [])
            if not events:
                logger.warning("⚠️ No events provided for network pattern recognition")
                return self._empty_result()

            logger.info(f"🔍 Analyzing {len(events)} events for network patterns")

            # Detect all network patterns
            reputation_patterns = self._detect_ip_reputation_clustering(events)
            geo_patterns = self._detect_geo_impossibility(events)
            asn_patterns = self._detect_asn_anomalies(events)
            rotation_patterns = self._detect_ip_rotation(events)

            # Combine all patterns
            all_patterns = reputation_patterns + geo_patterns + asn_patterns + rotation_patterns

            # Calculate ensemble confidence
            confidence = self._calculate_confidence(all_patterns, len(events))

            # Pattern breakdown by type
            pattern_breakdown = {
                "ip_reputation_clustering": len(reputation_patterns),
                "geo_impossibility": len(geo_patterns),
                "asn_anomaly": len(asn_patterns),
                "ip_rotation": len(rotation_patterns)
            }

            logger.info(f"✅ Network pattern recognition complete: {len(all_patterns)} patterns detected")
            logger.info(f"📊 Pattern breakdown: {pattern_breakdown}")

            return {
                "success": True,
                "patterns": all_patterns,
                "total_patterns_detected": len(all_patterns),
                "confidence": confidence,
                "pattern_breakdown": pattern_breakdown,
                "minimum_support": minimum_support
            }

        except Exception as e:
            logger.error(f"❌ Error in network pattern recognition: {str(e)}", exc_info=True)
            return {"success": False, "error": str(e), "patterns": []}

    def _detect_ip_reputation_clustering(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Detect IP reputation clustering (VPN/proxy/hosting).

        Strategy: Check ISP names and IP metadata for proxy/VPN indicators
        """
        patterns = []

        try:
            suspicious_ips = []
            ip_metadata = {}

            for event in events:
                ip = self._extract_ip(event)
                isp = self._extract_isp(event)
                ip_type = self._extract_ip_type(event)

                if not ip:
                    continue

                # Check for proxy/VPN indicators in ISP name or IP type
                is_suspicious = False
                reason = []

                if isp:
                    isp_lower = isp.lower()
                    for indicator in PROXY_INDICATORS:
                        if indicator in isp_lower:
                            is_suspicious = True
                            reason.append(f"ISP contains '{indicator}'")
                            break

                if ip_type:
                    ip_type_lower = ip_type.lower()
                    for indicator in PROXY_INDICATORS:
                        if indicator in ip_type_lower:
                            is_suspicious = True
                            reason.append(f"IP type is '{ip_type}'")
                            break

                if is_suspicious:
                    suspicious_ips.append(ip)
                    ip_metadata[ip] = {
                        "isp": isp,
                        "ip_type": ip_type,
                        "reason": ", ".join(reason)
                    }

            # Create pattern if suspicious IPs detected
            if suspicious_ips:
                unique_suspicious = set(suspicious_ips)
                suspicious_ratio = len(suspicious_ips) / len(events)

                pattern = {
                    "pattern_type": "ip_reputation_clustering",
                    "pattern_name": "IP Reputation Clustering",
                    "description": "Detected usage of VPN/proxy/hosting IPs",
                    "confidence": min(0.90, 0.70 + suspicious_ratio * 0.5),
                    "risk_adjustment": IP_REPUTATION_RISK,
                    "affected_count": len(suspicious_ips),
                    "evidence": {
                        "suspicious_ip_count": len(unique_suspicious),
                        "total_transactions": len(events),
                        "suspicious_ratio": round(suspicious_ratio, 2),
                        "sample_ips": list(unique_suspicious)[:3],
                        "ip_metadata": {ip: ip_metadata[ip] for ip in list(unique_suspicious)[:3]}
                    }
                }
                patterns.append(pattern)
                logger.info(f"🔴 IP reputation clustering detected: {len(unique_suspicious)} suspicious IPs")

        except Exception as e:
            logger.error(f"❌ Error detecting IP reputation clustering: {str(e)}")

        return patterns

    def _detect_geo_impossibility(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Detect geo-impossibility (impossible travel).

        Strategy: Calculate required speed between consecutive geolocations
        """
        if len(events) < 2:
            return []

        patterns = []

        try:
            # Sort events by timestamp
            sorted_events = sorted(
                [e for e in events if self._extract_timestamp(e) and self._extract_location(e)],
                key=lambda x: self._extract_timestamp(x)
            )

            if len(sorted_events) < 2:
                return []

            impossible_travels = []

            for i in range(1, len(sorted_events)):
                prev_event = sorted_events[i-1]
                curr_event = sorted_events[i]

                prev_ts = self._extract_timestamp(prev_event)
                curr_ts = self._extract_timestamp(curr_event)
                prev_loc = self._extract_location(prev_event)
                curr_loc = self._extract_location(curr_event)

                if not all([prev_ts, curr_ts, prev_loc, curr_loc]):
                    continue

                # Calculate time difference (hours)
                time_diff_hours = (curr_ts - prev_ts).total_seconds() / 3600

                if time_diff_hours <= 0:
                    continue

                # Calculate distance (miles) - simplified great circle distance
                distance_miles = self._calculate_distance(prev_loc, curr_loc)

                # Calculate required speed (mph)
                required_speed_mph = distance_miles / time_diff_hours

                # Detect impossibility (relaxed threshold: 600 mph accounts for flights)
                if required_speed_mph > GEO_IMPOSSIBILITY_SPEED_MPH:
                    impossible_travels.append({
                        "from_location": prev_loc,
                        "to_location": curr_loc,
                        "distance_miles": round(distance_miles, 2),
                        "time_hours": round(time_diff_hours, 2),
                        "required_speed_mph": round(required_speed_mph, 2),
                        "from_tx_id": prev_event.get("TX_ID_KEY") or prev_event.get("transaction_id"),
                        "to_tx_id": curr_event.get("TX_ID_KEY") or curr_event.get("transaction_id")
                    })

            # Create pattern if impossible travels detected
            if impossible_travels:
                pattern = {
                    "pattern_type": "geo_impossibility",
                    "pattern_name": "Geo-Impossibility Detection",
                    "description": "Detected physically impossible travel between transactions",
                    "confidence": 0.90,  # High confidence for impossible travel
                    "risk_adjustment": GEO_IMPOSSIBILITY_RISK,
                    "affected_count": len(impossible_travels),
                    "evidence": {
                        "impossible_travel_count": len(impossible_travels),
                        "max_required_speed_mph": max(t["required_speed_mph"] for t in impossible_travels),
                        "threshold_speed_mph": GEO_IMPOSSIBILITY_SPEED_MPH,
                        "impossible_travels": impossible_travels[:3]  # Top 3
                    }
                }
                patterns.append(pattern)
                logger.info(f"🔴 Geo-impossibility detected: {len(impossible_travels)} impossible travels")

        except Exception as e:
            logger.error(f"❌ Error detecting geo-impossibility: {str(e)}")

        return patterns

    def _detect_asn_anomalies(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Detect ISP/ASN anomalies.

        Strategy: Multiple different ASNs/ISPs in short time window
        """
        if len(events) < ASN_ANOMALY_MIN_ASNS:
            return []

        patterns = []

        try:
            asns = []
            isps = []
            asn_isp_map = {}

            for event in events:
                asn = self._extract_asn(event)
                isp = self._extract_isp(event)

                if asn:
                    asns.append(asn)
                    if isp:
                        asn_isp_map[asn] = isp

                if isp and not asn:
                    isps.append(isp)

            # Use ASN if available, otherwise fall back to ISP
            unique_asns = set(asns) if asns else set()
            unique_isps = set(isps) if not asns else set()

            network_identifiers = unique_asns if unique_asns else unique_isps
            network_count = len(network_identifiers)

            # Detect anomaly: multiple different networks (relaxed for high recall)
            if network_count >= ASN_ANOMALY_MIN_ASNS:
                pattern = {
                    "pattern_type": "asn_anomaly",
                    "pattern_name": "ISP/ASN Anomaly",
                    "description": "Multiple different network providers detected",
                    "confidence": min(0.85, 0.60 + (network_count - ASN_ANOMALY_MIN_ASNS) * 0.10),
                    "risk_adjustment": ASN_ANOMALY_RISK,
                    "affected_count": len(events),
                    "evidence": {
                        "unique_network_count": network_count,
                        "threshold": ASN_ANOMALY_MIN_ASNS,
                        "network_type": "ASN" if unique_asns else "ISP",
                        "networks": list(network_identifiers)[:5],
                        "asn_isp_mapping": {asn: asn_isp_map[asn] for asn in list(unique_asns)[:5]} if unique_asns else {}
                    }
                }
                patterns.append(pattern)
                logger.info(f"🔴 ASN anomaly detected: {network_count} different networks")

        except Exception as e:
            logger.error(f"❌ Error detecting ASN anomalies: {str(e)}")

        return patterns

    def _detect_ip_rotation(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Detect IP rotation patterns.

        Strategy: Rapid IP address changes within time window
        """
        if len(events) < IP_ROTATION_MIN_CHANGES:
            return []

        patterns = []

        try:
            # Sort events by timestamp
            sorted_events = sorted(
                [e for e in events if self._extract_timestamp(e) and self._extract_ip(e)],
                key=lambda x: self._extract_timestamp(x)
            )

            if len(sorted_events) < IP_ROTATION_MIN_CHANGES:
                return []

            # Track IP changes within time windows
            for i in range(len(sorted_events) - IP_ROTATION_MIN_CHANGES + 1):
                window_events = []
                start_ts = self._extract_timestamp(sorted_events[i])

                for j in range(i, len(sorted_events)):
                    event_ts = self._extract_timestamp(sorted_events[j])
                    time_diff_hours = (event_ts - start_ts).total_seconds() / 3600

                    if time_diff_hours <= IP_ROTATION_TIME_WINDOW_HOURS:
                        window_events.append(sorted_events[j])
                    else:
                        break

                if len(window_events) < IP_ROTATION_MIN_CHANGES:
                    continue

                # Extract unique IPs in window
                window_ips = set()
                for event in window_events:
                    ip = self._extract_ip(event)
                    if ip:
                        window_ips.add(ip)

                # Detect rotation: multiple different IPs in short time
                if len(window_ips) >= IP_ROTATION_MIN_CHANGES:
                    pattern = {
                        "pattern_type": "ip_rotation",
                        "pattern_name": "IP Address Rotation",
                        "description": "Rapid IP address changes detected",
                        "confidence": min(0.85, 0.65 + (len(window_ips) - IP_ROTATION_MIN_CHANGES) * 0.05),
                        "risk_adjustment": IP_ROTATION_RISK,
                        "affected_count": len(window_events),
                        "evidence": {
                            "unique_ip_count": len(window_ips),
                            "transaction_count": len(window_events),
                            "time_window_hours": IP_ROTATION_TIME_WINDOW_HOURS,
                            "threshold": IP_ROTATION_MIN_CHANGES,
                            "sample_ips": list(window_ips)[:5]
                        }
                    }
                    patterns.append(pattern)
                    logger.info(f"🔴 IP rotation detected: {len(window_ips)} IPs in {IP_ROTATION_TIME_WINDOW_HOURS}h")
                    break  # Only detect once per dataset

        except Exception as e:
            logger.error(f"❌ Error detecting IP rotation: {str(e)}")

        return patterns

    def _calculate_distance(self, loc1: Dict[str, float], loc2: Dict[str, float]) -> float:
        """
        Calculate great circle distance between two locations (miles).

        Simplified Haversine formula.
        """
        from math import radians, sin, cos, sqrt, atan2

        lat1, lon1 = loc1.get("latitude", 0), loc1.get("longitude", 0)
        lat2, lon2 = loc2.get("latitude", 0), loc2.get("longitude", 0)

        # Earth radius in miles
        R = 3959.0

        # Convert to radians
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])

        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat / 2)**2 + cos(lat1) * cos(lat2) * sin(dlon / 2)**2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        distance = R * c

        return distance

    def _calculate_confidence(self, patterns: List[Dict[str, Any]], total_events: int) -> float:
        """
        Calculate overall confidence score with ensemble boosting.

        Multiple pattern types increase confidence (ensemble effect).
        """
        if not patterns:
            return 0.0

        # Base confidence: weighted average of individual pattern confidences
        base_confidence = sum(p["confidence"] for p in patterns) / len(patterns)

        # Ensemble boost: multiple pattern types detected
        unique_types = len(set(p["pattern_type"] for p in patterns))
        ensemble_boost = min(0.15, unique_types * 0.05)  # Up to +15% boost

        # Affected transaction ratio boost
        max_affected = max(p["affected_count"] for p in patterns)
        coverage_boost = min(0.10, (max_affected / total_events) * 0.10)  # Up to +10% boost

        final_confidence = min(1.0, base_confidence + ensemble_boost + coverage_boost)

        return round(final_confidence, 2)

    def _extract_ip(self, event: Dict[str, Any]) -> Optional[str]:
        """Extract IP address from event."""
        ip_fields = [
            "IP_ADDRESS",
            "ip_address",
            "ip",
            "client_ip",
            "remote_addr",
            "x_forwarded_for"
        ]

        for field in ip_fields:
            if field in event and event[field]:
                return str(event[field])

        return None

    def _extract_isp(self, event: Dict[str, Any]) -> Optional[str]:
        """Extract ISP name from event."""
        isp_fields = [
            "ISP",
            "isp",
            "ISP_NAME",
            "isp_name",
            "organization"
        ]

        for field in isp_fields:
            if field in event and event[field]:
                return str(event[field])

        return None

    def _extract_asn(self, event: Dict[str, Any]) -> Optional[str]:
        """Extract ASN from event."""
        asn_fields = [
            "ASN",
            "asn",
            "AS_NUMBER",
            "as_number",
            "autonomous_system"
        ]

        for field in asn_fields:
            if field in event and event[field]:
                return str(event[field])

        return None

    def _extract_ip_type(self, event: Dict[str, Any]) -> Optional[str]:
        """Extract IP type from event."""
        type_fields = [
            "IP_TYPE",
            "ip_type",
            "connection_type",
            "user_type"
        ]

        for field in type_fields:
            if field in event and event[field]:
                return str(event[field])

        return None

    def _extract_location(self, event: Dict[str, Any]) -> Optional[Dict[str, float]]:
        """Extract geographic location from event."""
        # Try structured location
        if "location" in event and isinstance(event["location"], dict):
            loc = event["location"]
            if "latitude" in loc and "longitude" in loc:
                return {"latitude": float(loc["latitude"]), "longitude": float(loc["longitude"])}

        # Try separate lat/lon fields
        lat_fields = ["LATITUDE", "latitude", "lat"]
        lon_fields = ["LONGITUDE", "longitude", "lon", "lng"]

        lat, lon = None, None

        for field in lat_fields:
            if field in event:
                try:
                    lat = float(event[field])
                    break
                except (ValueError, TypeError):
                    continue

        for field in lon_fields:
            if field in event:
                try:
                    lon = float(event[field])
                    break
                except (ValueError, TypeError):
                    continue

        if lat is not None and lon is not None:
            return {"latitude": lat, "longitude": lon}

        return None

    def _extract_timestamp(self, event: Dict[str, Any]) -> Optional[datetime]:
        """Extract timestamp from event."""
        timestamp_fields = [
            "TX_DATETIME",
            "timestamp",
            "created_at",
            "transaction_time",
            "event_time"
        ]

        for field in timestamp_fields:
            if field in event:
                ts = event[field]
                if isinstance(ts, datetime):
                    return ts
                elif isinstance(ts, str):
                    try:
                        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
                    except ValueError:
                        continue

        return None

    def _empty_result(self) -> Dict[str, Any]:
        """Return empty result structure."""
        return {
            "success": True,
            "patterns": [],
            "total_patterns_detected": 0,
            "confidence": 0.0,
            "pattern_breakdown": {
                "ip_reputation_clustering": 0,
                "geo_impossibility": 0,
                "asn_anomaly": 0,
                "ip_rotation": 0
            }
        }
