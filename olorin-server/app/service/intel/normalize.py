"""
Intel Normalization - Normalize and validate external intelligence data.

This module handles normalization of external threat intelligence sources,
correcting common data anomalies and ensuring reliable risk assessments.
"""

import ipaddress
import json
from typing import Dict, Any

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def normalize_abuseipdb(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalize AbuseIPDB response data and correct common anomalies.
    
    Known issues corrected:
    - is_public flag sometimes incorrectly reports public IPs as private
    - Missing or inconsistent metadata fields
    
    Args:
        payload: Raw AbuseIPDB API response
        
    Returns:
        Normalized payload with corrected data
    """
    try:
        # Parse if string payload
        if isinstance(payload, str):
            payload = json.loads(payload)
        
        data = payload.get("data", {})
        ip_str = data.get("ip", "")
        
        if not ip_str:
            return payload
        
        # Check actual IP classification vs reported
        try:
            ip_obj = ipaddress.ip_address(ip_str)
            actual_is_public = not ip_obj.is_private
            
            # Get reported classification
            network_info = data.setdefault("network_information", {})
            reported_is_public = network_info.get("is_public", None)
            
            # Correct classification if wrong
            if reported_is_public is False and actual_is_public:
                network_info["is_public"] = True
                
                # Add correction note
                metadata = data.setdefault("metadata", {})
                notes = metadata.setdefault("notes", [])
                notes.append("corrected_is_public_from_external")
                
                logger.info(f"Corrected AbuseIPDB is_public flag for {ip_str}: false -> true")
                
        except ValueError as e:
            logger.warning(f"Invalid IP address in AbuseIPDB response: {ip_str}: {e}")
        
        # Ensure required fields exist with defaults
        reputation_summary = data.setdefault("reputation_summary", {})
        reputation_summary.setdefault("risk_level", "MINIMAL")
        reputation_summary.setdefault("abuse_confidence", 0)
        reputation_summary.setdefault("total_reports", 0)
        
        network_info.setdefault("ip_version", 4)
        
    except Exception as e:
        logger.error(f"Failed to normalize AbuseIPDB payload: {e}")
        # Return original on error
        pass
    
    return payload


def abuseipdb_risk_component(payload: Dict[str, Any]) -> float:
    """
    Extract standardized risk score from AbuseIPDB response.
    
    Maps AbuseIPDB risk levels to standardized 0-1 risk scores:
    - MINIMAL: 0.05
    - LOW: 0.2  
    - MEDIUM: 0.5
    - HIGH: 0.8
    - CRITICAL: 0.95
    
    Args:
        payload: Normalized AbuseIPDB response
        
    Returns:
        Risk score between 0.0 and 1.0
    """
    try:
        data = payload.get("data", {}) if isinstance(payload, dict) else {}
        reputation = data.get("reputation_summary", {})
        risk_level = reputation.get("risk_level", "MINIMAL").upper()
        
        risk_mapping = {
            "MINIMAL": 0.05,
            "LOW": 0.2,
            "MEDIUM": 0.5, 
            "HIGH": 0.8,
            "CRITICAL": 0.95
        }
        
        return risk_mapping.get(risk_level, 0.3)  # Conservative default
        
    except Exception as e:
        logger.error(f"Failed to extract AbuseIPDB risk component: {e}")
        return 0.3  # Conservative default


def normalize_virustotal(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalize VirusTotal response data and correct common anomalies.
    
    Ensures consistent data structure and applies corrections for known issues.
    
    Args:
        payload: Raw VirusTotal API response
        
    Returns:
        Normalized payload with corrected data
    """
    try:
        # Parse if string payload
        if isinstance(payload, str):
            payload = json.loads(payload)
        
        data = payload.get("data", {})
        attributes = data.get("attributes", {})
        
        # Ensure required fields exist with defaults
        stats = attributes.setdefault("last_analysis_stats", {})
        stats.setdefault("malicious", 0)
        stats.setdefault("suspicious", 0)
        stats.setdefault("harmless", 0)
        stats.setdefault("undetected", 0)
        
        # Add normalized reputation summary similar to AbuseIPDB
        reputation_summary = data.setdefault("reputation_summary", {})
        
        malicious_count = stats.get("malicious", 0)
        suspicious_count = stats.get("suspicious", 0)
        total_engines = sum(stats.values())
        
        # Calculate risk level based on detection ratio
        if total_engines > 0:
            detection_ratio = (malicious_count + suspicious_count) / total_engines
            
            if detection_ratio >= 0.3:
                risk_level = "CRITICAL"
            elif detection_ratio >= 0.15:
                risk_level = "HIGH"  
            elif detection_ratio >= 0.05:
                risk_level = "MEDIUM"
            elif detection_ratio > 0:
                risk_level = "LOW"
            else:
                risk_level = "MINIMAL"
        else:
            risk_level = "MINIMAL"
        
        reputation_summary["risk_level"] = risk_level
        reputation_summary["detection_ratio"] = detection_ratio if total_engines > 0 else 0.0
        reputation_summary["malicious_detections"] = malicious_count
        reputation_summary["total_engines"] = total_engines
        
    except Exception as e:
        logger.error(f"Failed to normalize VirusTotal payload: {e}")
        # Return original on error
        pass
    
    return payload


def virustotal_risk_component(payload: Dict[str, Any]) -> float:
    """
    Extract standardized risk score from VirusTotal response.
    
    Maps VirusTotal detection ratios to standardized 0-1 risk scores:
    - MINIMAL: 0.05
    - LOW: 0.2  
    - MEDIUM: 0.5
    - HIGH: 0.8
    - CRITICAL: 0.95
    
    Args:
        payload: Normalized VirusTotal response
        
    Returns:
        Risk score between 0.0 and 1.0
    """
    try:
        data = payload.get("data", {}) if isinstance(payload, dict) else {}
        reputation = data.get("reputation_summary", {})
        risk_level = reputation.get("risk_level", "MINIMAL").upper()
        
        risk_mapping = {
            "MINIMAL": 0.05,
            "LOW": 0.2,
            "MEDIUM": 0.5, 
            "HIGH": 0.8,
            "CRITICAL": 0.95
        }
        
        return risk_mapping.get(risk_level, 0.3)  # Conservative default
        
    except Exception as e:
        logger.error(f"Failed to extract VirusTotal risk component: {e}")
        return 0.3  # Conservative default


def resolve_provider_conflicts(provider_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Resolve conflicts between threat intelligence providers using most conservative approach.
    
    User requirement: "When both report different reputations, use most conservative (highest risk)."
    
    Args:
        provider_data: Dict mapping provider names to their normalized responses
        
    Returns:
        Unified assessment with conflict resolution applied
    """
    if not provider_data:
        return {}
    
    # Extract risk scores from all providers
    provider_risks = {}
    risk_extractors = {
        'abuseipdb': abuseipdb_risk_component,
        'virustotal': virustotal_risk_component,
    }
    
    for provider, payload in provider_data.items():
        extractor = risk_extractors.get(provider.lower())
        if extractor and payload:
            provider_risks[provider] = extractor(payload)
    
    if not provider_risks:
        return {}
    
    # CRITICAL FIX: Use most conservative (highest risk) assessment
    highest_risk_provider = max(provider_risks.items(), key=lambda x: x[1])
    conservative_provider = highest_risk_provider[0]
    conservative_risk = highest_risk_provider[1]
    
    logger.info(f"🛡️ PROVIDER CONFLICT RESOLUTION: Selected {conservative_provider} "
                f"(risk: {conservative_risk:.3f}) as most conservative")
    
    if len(provider_risks) > 1:
        other_risks = {k: v for k, v in provider_risks.items() if k != conservative_provider}
        logger.debug(f"   Other provider risks: {other_risks}")
    
    # Build unified assessment based on most conservative provider
    base_payload = provider_data[conservative_provider]
    
    unified_assessment = {
        "unified_risk_score": conservative_risk,
        "consensus_provider": conservative_provider,
        "provider_risks": provider_risks,
        "conflict_resolution": "most_conservative",
        "base_data": base_payload
    }
    
    return unified_assessment


def canonical_is_public(ip: str, vt_is_malicious: bool = False, abuse_is_public: bool = None) -> bool:
    """
    Canonicalize is_public classification with local RFC check as primary source.
    
    AbuseIPDB sometimes incorrectly reports public IPs as private. This function
    applies a hierarchy: local RFC1918 check > VirusTotal context > AbuseIPDB.
    
    Args:
        ip: IP address string
        vt_is_malicious: Whether VirusTotal considers IP malicious
        abuse_is_public: AbuseIPDB's is_public classification (can be None/False)
        
    Returns:
        True if IP should be classified as public
    """
    if not ip:
        return False
    
    try:
        # RFC1918/local check first (most authoritative)
        local_public = not ip.startswith(("10.", "172.16.", "192.168.", "127.", "169.254."))
        
        # Additional private ranges
        if ip.startswith(("172.")):
            # Check 172.16.0.0/12 range more precisely
            parts = ip.split(".")
            if len(parts) >= 2:
                second_octet = int(parts[1])
                if 16 <= second_octet <= 31:
                    local_public = False
                else:
                    local_public = True
        
        # RFC1918 private IPs are ALWAYS private, regardless of threat intel
        if not local_public:
            return False
        
        # For public IPs, apply threat intel hierarchy
        # Prefer local classification and VirusTotal context
        # Treat AbuseIPDB 'is_public=false' as weak signal
        if local_public:
            return True
        elif vt_is_malicious:
            # VirusTotal malicious classification suggests public IP activity
            return True
        elif abuse_is_public is True:
            return True
        else:
            return local_public
            
    except (ValueError, IndexError):
        # Fallback for invalid IPs - assume public for conservative risk assessment
        return True


def normalize_intel_source(source: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalize intelligence data from various sources.
    
    Args:
        source: Intelligence source identifier (e.g., 'abuseipdb', 'virustotal')
        payload: Raw intelligence response
        
    Returns:
        Normalized intelligence data
    """
    normalizers = {
        'abuseipdb': normalize_abuseipdb,
        'virustotal': normalize_virustotal,
        # Add other sources as needed
        # 'shodan': normalize_shodan,
    }
    
    normalizer = normalizers.get(source.lower())
    if normalizer:
        return normalizer(payload)
    
    logger.warning(f"No normalizer available for intel source: {source}")
    return payload