"""
Network Domain Analysis Agent

Analyzes network patterns, IP reputation, and geographic anomalies for fraud detection.
"""

import os
import time
from typing import Dict, Any

from app.service.logging import get_bridge_logger
from app.service.agent.orchestration.state_schema import InvestigationState, add_domain_findings
from .base import DomainAgentBase, log_agent_handover_complete, complete_chain_of_thought

logger = get_bridge_logger(__name__)


async def network_agent_node(state: InvestigationState) -> Dict[str, Any]:
    """
    Network domain analysis agent.
    Analyzes network patterns, IP reputation, and geographic anomalies.
    """
    is_test_mode = os.environ.get("TEST_MODE") == "mock"
    start_time = time.time()
    
    logger.info("🌐 Network agent analyzing investigation")
    
    # Get relevant data from state
    snowflake_data = state.get("snowflake_data", {})
    tool_results = state.get("tool_results", {})
    entity_id = state["entity_id"]
    entity_type = state["entity_type"]
    investigation_id = state.get('investigation_id', 'unknown')
    
    # Initialize logging and chain of thought
    DomainAgentBase.log_agent_start("network", entity_type, entity_id, is_test_mode)
    DomainAgentBase.log_context_analysis(snowflake_data, tool_results)
    
    process_id = DomainAgentBase.start_chain_of_thought(
        investigation_id=investigation_id,
        agent_name="network_agent",
        domain="network",
        entity_type=entity_type,
        entity_id=entity_id,
        task_description="Need to analyze network patterns, IP reputation, VPN/proxy usage, "
                        "geographic anomalies, and threat intelligence data to assess network-based fraud risk."
    )
    
    # Initialize network findings
    network_findings = DomainAgentBase.initialize_findings("network")
    
    # Process Snowflake data for network patterns
    results = DomainAgentBase.process_snowflake_results(snowflake_data, "network")
    
    if results:
        # Check for proxy/VPN indicators
        _analyze_vpn_proxy_indicators(results, network_findings)
        
        # Check for multiple countries
        _analyze_geographic_patterns(results, network_findings)
        
        # Process MODEL_SCORE
        DomainAgentBase.process_model_scores(results, network_findings, "network")
        
        # Analyze IP diversity
        _analyze_ip_diversity(results, network_findings)
    else:
        # Handle case where Snowflake data format is problematic
        if isinstance(snowflake_data, str):
            network_findings["risk_indicators"].append("Snowflake data in non-structured format")
    
    # Analyze threat intelligence results
    _analyze_threat_intelligence(tool_results, network_findings)
    
    # Finalize findings
    analysis_duration = time.time() - start_time
    DomainAgentBase.finalize_findings(
        network_findings, snowflake_data, tool_results, analysis_duration, "network"
    )
    
    # Complete logging
    log_agent_handover_complete("network", network_findings)
    complete_chain_of_thought(process_id, network_findings, "network")
    
    # Update state with findings
    return add_domain_findings(state, "network", network_findings)


def _analyze_vpn_proxy_indicators(results: list, findings: Dict[str, Any]) -> None:
    """Analyze results for VPN/proxy indicators."""
    vpn_columns = ["VPN_INDICATOR", "PROXY_RISK_SCORE", "IS_VPN", "IS_PROXY"]
    
    for r in results:
        for col in vpn_columns:
            if col in r:
                value = r[col]
                # Check for boolean true or high score
                if (isinstance(value, bool) and value) or (isinstance(value, (int, float)) and value > 0.5):
                    findings["risk_indicators"].append(f"VPN/Proxy detected ({col}: {value})")
                    findings["risk_score"] += 0.25
                    findings["evidence"].append(f"Network traffic through VPN/Proxy service: {col}={value}")
                    break


def _analyze_geographic_patterns(results: list, findings: Dict[str, Any]) -> None:
    """Analyze geographic patterns in the data."""
    countries = set(r.get("IP_COUNTRY") for r in results if r.get("IP_COUNTRY"))
    
    if len(countries) > 3:
        findings["risk_indicators"].append(f"Activity from {len(countries)} different countries")
        findings["risk_score"] += 0.3
        findings["evidence"].append(f"Cross-border activity across {len(countries)} countries: {list(countries)}")
    elif len(countries) > 1:
        findings["risk_indicators"].append(f"Cross-border activity ({len(countries)} countries)")
        findings["risk_score"] += 0.15
        findings["evidence"].append(f"Multi-country activity: {list(countries)}")
    
    # Store metrics
    findings["metrics"]["unique_countries"] = len(countries)
    findings["analysis"]["countries"] = list(countries)


def _analyze_ip_diversity(results: list, findings: Dict[str, Any]) -> None:
    """Analyze IP address diversity patterns."""
    ips = set(r.get("IP_ADDRESS") for r in results if r.get("IP_ADDRESS"))
    findings["analysis"]["unique_ips"] = len(ips)
    findings["metrics"]["unique_ip_count"] = len(ips)
    
    if len(ips) > 10:
        findings["risk_indicators"].append(f"High IP diversity: {len(ips)} unique IPs")
        findings["risk_score"] += 0.2
        findings["evidence"].append(f"Suspicious IP diversity pattern: {len(ips)} unique addresses")
    elif len(ips) > 5:
        findings["evidence"].append(f"Moderate IP diversity: {len(ips)} unique addresses")


def _analyze_threat_intelligence(tool_results: Dict[str, Any], findings: Dict[str, Any]) -> None:
    """Analyze threat intelligence tool results."""
    threat_tools = ["virustotal_tool", "abuseipdb_tool", "shodan_tool"]
    
    for tool_name in threat_tools:
        if tool_name in tool_results:
            result = tool_results[tool_name]
            if isinstance(result, dict):
                # Check for malicious indicators
                is_malicious = result.get("malicious", False)
                threat_score = result.get("threat_score", 0)
                
                if is_malicious or threat_score > 50:
                    findings["risk_indicators"].append(f"{tool_name}: High threat score")
                    findings["risk_score"] += 0.2
                    findings["evidence"].append(
                        f"Threat intelligence alert from {tool_name}: "
                        f"malicious={is_malicious}, score={threat_score}"
                    )
                
                # Store metrics
                findings["metrics"][f"{tool_name}_threat_score"] = threat_score
                findings["metrics"][f"{tool_name}_malicious"] = is_malicious