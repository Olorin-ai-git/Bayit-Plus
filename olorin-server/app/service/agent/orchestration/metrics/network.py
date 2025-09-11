"""
Network metrics computation with IP validation.

This module ensures network metrics are computed correctly, especially
for IP-based investigations where the minimum unique IP count should be 1.
"""

import ipaddress
from typing import Dict, Any
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def compute_network_metrics(state: Dict[str, Any]) -> None:
    """
    Canonicalize network facts with single source of truth.
    
    Fixes inconsistencies:
    - unique_ips vs unique_ip_count 
    - is_public conflicts between providers
    - Ensures IP investigations have minimum unique count of 1
    """
    try:
        # Ensure network domain findings exist
        if "domain_findings" not in state:
            state["domain_findings"] = {}
        if "network" not in state["domain_findings"]:
            state["domain_findings"]["network"] = {}
        if "metrics" not in state["domain_findings"]["network"]:
            state["domain_findings"]["network"]["metrics"] = {}
        if "analysis" not in state["domain_findings"]["network"]:
            state["domain_findings"]["network"]["analysis"] = {}
        
        metrics = state["domain_findings"]["network"]["metrics"]
        analysis = state["domain_findings"]["network"]["analysis"]
        
        # Canonicalize network facts for IP entity investigations
        if state.get("entity_type") == "ip_address":
            entity_id = state.get("entity_id")
            if entity_id:
                try:
                    # Validate it's a real IP address
                    ip_obj = ipaddress.ip_address(entity_id)
                    
                    # CANONICAL: Set unique IP counts (fix inconsistency)
                    metrics["unique_ip_count"] = 1  # Always 1 for single IP investigation
                    analysis["unique_ips"] = 1      # Sync analysis.unique_ips
                    
                    # CANONICAL: Compute is_public locally (single source of truth)
                    is_public = not ip_obj.is_private
                    metrics["is_public"] = is_public
                    analysis["is_public"] = is_public
                    
                    # CANONICAL: Set country if available from tool results
                    tool_results = state.get("tool_results", {})
                    country = _extract_canonical_country(tool_results, entity_id)
                    if country:
                        metrics["country"] = country
                        analysis["country"] = country
                        metrics["unique_countries"] = 1
                    else:
                        metrics["unique_countries"] = 0
                    
                    logger.debug(f"Canonicalized network facts for IP {entity_id}: "
                               f"unique_ips=1, is_public={is_public}, country={country}")
                    
                except (ipaddress.AddressValueError, ValueError):
                    logger.debug(f"Entity {entity_id} is not a valid IP address, leaving metrics unchanged")
                    pass
        
        logger.debug(f"Network metrics computed: {metrics}")
        
    except Exception as e:
        logger.warning(f"Failed to compute network metrics: {e}")


def _extract_canonical_country(tool_results: Dict[str, Any], ip_address: str) -> str:
    """
    Extract canonical country from tool results with preference order.
    
    Preference: VT > AbuseIPDB (VT more reliable for geolocation)
    """
    try:
        # Try VirusTotal first (most reliable)
        vt_result = tool_results.get("virustotal_ip_analysis")
        if vt_result:
            import json
            if isinstance(vt_result, str):
                vt_data = json.loads(vt_result)
            else:
                vt_data = vt_result
                
            if vt_data.get("success") and vt_data.get("data", {}).get("network_information"):
                country = vt_data["data"]["network_information"].get("country")
                if country:
                    return country
        
        # Fallback to AbuseIPDB
        abuse_result = tool_results.get("abuseipdb_ip_reputation") 
        if abuse_result:
            import json
            if isinstance(abuse_result, str):
                abuse_data = json.loads(abuse_result)
            else:
                abuse_data = abuse_result
                
            if abuse_data.get("success") and abuse_data.get("data", {}).get("geolocation"):
                country_code = abuse_data["data"]["geolocation"].get("country_code")
                if country_code:
                    return country_code
                    
    except Exception as e:
        logger.debug(f"Failed to extract canonical country for {ip_address}: {e}")
    
    return None