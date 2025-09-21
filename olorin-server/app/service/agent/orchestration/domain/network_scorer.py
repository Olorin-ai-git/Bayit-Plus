"""
Network Domain Scorer - Network-native signals only with deterministic is_public.

This module provides network domain scoring that only emits numeric scores when
actual network signals are present, preventing contract violations.
"""

from typing import Dict, Any, List
import ipaddress
from .domain_result import DomainResult, validate_domain
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def score_network_domain(
    ti_hits: List[Dict[str, Any]], 
    proxy_vpn: bool, 
    tor_detected: bool,
    asn_risk: bool,
    geo_anomaly: bool,
    ip_str: str,
    reputation_data: Dict[str, Any] = None
) -> DomainResult:
    """
    Score network domain using only network-native signals.
    
    CRITICAL: This function only returns a numeric score if actual network
    signals are detected. No signals = INSUFFICIENT_EVIDENCE status.
    
    Args:
        ti_hits: Threat intelligence hits from external providers
        proxy_vpn: Whether IP is detected as proxy/VPN
        tor_detected: Whether IP is detected as Tor exit node
        asn_risk: Whether ASN is considered high-risk
        geo_anomaly: Whether geographic anomalies detected
        ip_str: IP address string
        reputation_data: Additional reputation data
        
    Returns:
        DomainResult with network assessment
    """
    # Deterministic is_public computation (not provider reconciliation)
    try:
        ip = ipaddress.ip_address(ip_str)
        is_public = not (ip.is_private or ip.is_loopback or ip.is_reserved or ip.is_multicast)
    except (ipaddress.AddressValueError, ValueError):
        logger.warning(f"Invalid IP address: {ip_str}")
        is_public = None
    
    # Build network-native signals only
    signals = []
    score = 0.10  # Conservative baseline
    
    # Proxy/VPN detection
    if proxy_vpn:
        signals.append("proxy/VPN detected")
        score += 0.25
    
    # Tor detection
    if tor_detected:
        signals.append("Tor exit node")
        score += 0.35
    
    # Threat intelligence hits
    if ti_hits:
        signals.append(f"threat intel hits: {len(ti_hits)}")
        score += 0.25
        
        # Additional scoring based on TI severity
        for hit in ti_hits:
            severity = hit.get("severity", "").lower()
            if severity in ["high", "critical"]:
                score += 0.15
                break
    
    # High-risk ASN
    if asn_risk:
        signals.append("high-risk ASN")
        score += 0.15
    
    # Geographic velocity anomalies
    if geo_anomaly:
        signals.append("geographic velocity anomaly")
        score += 0.20
    
    # Additional reputation signals
    if reputation_data:
        abuse_confidence = reputation_data.get("abuse_confidence", 0)
        if abuse_confidence > 75:
            signals.append(f"high abuse confidence: {abuse_confidence}%")
            score += 0.20
        elif abuse_confidence > 25:
            signals.append(f"moderate abuse reports: {abuse_confidence}%")
            score += 0.10
    
    # CRITICAL: Only provide numeric score if we have actual network signals
    if signals:
        status = "OK"
        confidence = 0.40 if len(signals) > 1 else 0.30
        narrative = f"Network analysis identified {len(signals)} risk indicators: {', '.join(signals)}. "
        
        if score <= 0.3:
            narrative += "Network risk assessment: low to moderate."
        elif score <= 0.6:
            narrative += "Network risk assessment: moderate to elevated."
        else:
            narrative += "Network risk assessment: elevated concern warranted."
    else:
        # No network-native signals detected
        status = "INSUFFICIENT_EVIDENCE"
        confidence = 0.20
        score = None  # CRITICAL: No score without signals
        narrative = "No network reputation or behavioral signals detected. Insufficient network-specific evidence for risk assessment."
    
    # Create result
    result = DomainResult(
        name="network",
        score=score,
        status=status,
        signals=signals,
        confidence=confidence,
        narrative=narrative,
        is_public=is_public
    )
    
    validate_domain(result)
    
    logger.info(f"Network domain assessed: score={result.score}, status={result.status}, signals={len(result.signals)}, is_public={is_public}")
    
    return result


def extract_network_signals_from_tools(tool_results: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract network-native signals from tool results.
    
    Args:
        tool_results: Raw tool execution results
        
    Returns:
        Dictionary of extracted network signals
    """
    signals = {
        "ti_hits": [],
        "proxy_vpn": False,
        "tor_detected": False,
        "asn_risk": False,
        "geo_anomaly": False,
        "reputation_data": {}
    }
    
    # AbuseIPDB signals
    abuseipdb_result = tool_results.get("abuseipdb_ip_reputation")
    if abuseipdb_result:
        try:
            import json
            data = json.loads(abuseipdb_result) if isinstance(abuseipdb_result, str) else abuseipdb_result
            
            abuse_confidence = data.get("abuseConfidencePercentage", 0)
            if abuse_confidence > 0:
                signals["ti_hits"].append({
                    "provider": "AbuseIPDB",
                    "confidence": abuse_confidence,
                    "severity": "high" if abuse_confidence > 75 else "moderate"
                })
                signals["reputation_data"]["abuse_confidence"] = abuse_confidence
            
            # Check for VPN/proxy indicators
            usage_type = data.get("usageType", "").lower()
            if any(term in usage_type for term in ["proxy", "vpn", "hosting"]):
                signals["proxy_vpn"] = True
                
        except Exception as e:
            logger.warning(f"Failed to parse AbuseIPDB result: {e}")
    
    # VirusTotal signals  
    vt_result = tool_results.get("virustotal_ip_analysis")
    if vt_result:
        try:
            import json
            data = json.loads(vt_result) if isinstance(vt_result, str) else vt_result
            
            # Check for malicious votes
            stats = data.get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
            malicious = stats.get("malicious", 0)
            if malicious > 0:
                signals["ti_hits"].append({
                    "provider": "VirusTotal", 
                    "malicious_votes": malicious,
                    "severity": "high" if malicious > 3 else "moderate"
                })
                
        except Exception as e:
            logger.warning(f"Failed to parse VirusTotal result: {e}")
    
    return signals