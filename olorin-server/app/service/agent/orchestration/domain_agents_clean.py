"""
Domain Agents for Clean LangGraph Architecture

Simplified domain agents that work through state rather than direct tool execution.
"""

from typing import Dict, Any
from app.service.logging import get_bridge_logger
from app.service.agent.orchestration.state_schema import (
    InvestigationState,
    add_domain_findings
)

logger = get_bridge_logger(__name__)


async def network_agent_node(state: InvestigationState) -> Dict[str, Any]:
    """
    Network domain analysis agent.
    Analyzes network patterns, IP reputation, and geographic anomalies.
    """
    logger.info("🌐 Network agent analyzing investigation")
    
    # Get relevant data from state
    snowflake_data = state.get("snowflake_data", {})
    tool_results = state.get("tool_results", {})
    entity_id = state["entity_id"]
    entity_type = state["entity_type"]
    
    # Analyze network aspects
    network_findings = {
        "domain": "network",
        "risk_score": 0.0,
        "risk_indicators": [],
        "analysis": {}
    }
    
    # Analyze Snowflake data for network patterns
    if snowflake_data and "results" in snowflake_data:
        results = snowflake_data["results"]
        
        if results:  # Only process if we have results
            # Check for proxy/VPN indicators (multiple possible column names)
            vpn_columns = ["VPN_INDICATOR", "PROXY_RISK_SCORE", "IS_VPN", "IS_PROXY"]
            for r in results:
                for col in vpn_columns:
                    if col in r:
                        value = r[col]
                        # Check for boolean true or high score
                        if (isinstance(value, bool) and value) or (isinstance(value, (int, float)) and value > 0.5):
                            network_findings["risk_indicators"].append(f"VPN/Proxy detected ({col}: {value})")
                            network_findings["risk_score"] += 0.25
                            break
            
            # Check for multiple countries
            countries = set(r.get("IP_COUNTRY") for r in results if r.get("IP_COUNTRY"))
            if len(countries) > 3:
                network_findings["risk_indicators"].append(f"Activity from {len(countries)} different countries")
                network_findings["risk_score"] += 0.3
            elif len(countries) > 1:
                network_findings["risk_indicators"].append(f"Cross-border activity ({len(countries)} countries)")
                network_findings["risk_score"] += 0.15
            
            # Use MODEL_SCORE directly if available
            model_scores = [float(r.get("MODEL_SCORE", 0)) for r in results if "MODEL_SCORE" in r]
            if model_scores:
                avg_model_score = sum(model_scores) / len(model_scores)
                # Use the actual model score as the risk score
                network_findings["risk_score"] = max(network_findings["risk_score"], avg_model_score)
                network_findings["risk_indicators"].append(f"Model fraud score: {avg_model_score:.3f}")
            
            # Check for suspicious ISPs or IPs
            ips = set(r.get("IP_ADDRESS") for r in results if r.get("IP_ADDRESS"))
            network_findings["analysis"]["unique_ips"] = len(ips)
            
            if len(ips) > 10:
                network_findings["risk_indicators"].append(f"High IP diversity: {len(ips)} unique IPs")
                network_findings["risk_score"] += 0.2
    
    # Analyze threat intelligence results
    threat_tools = ["virustotal_tool", "abuseipdb_tool", "shodan_tool"]
    for tool_name in threat_tools:
        if tool_name in tool_results:
            result = tool_results[tool_name]
            if isinstance(result, dict):
                # Check for malicious indicators
                if result.get("malicious", False) or result.get("threat_score", 0) > 50:
                    network_findings["risk_indicators"].append(f"{tool_name}: High threat score")
                    network_findings["risk_score"] += 0.2
    
    # Cap risk score at 1.0
    network_findings["risk_score"] = min(1.0, network_findings["risk_score"])
    
    # Add confidence based on data availability
    data_sources = sum([
        1 if snowflake_data else 0,
        1 if "virustotal_tool" in tool_results else 0,
        1 if "abuseipdb_tool" in tool_results else 0,
        1 if "shodan_tool" in tool_results else 0
    ])
    network_findings["confidence"] = min(1.0, data_sources / 4.0)
    
    logger.info(f"✅ Network analysis complete - Risk: {network_findings['risk_score']:.2f}")
    
    return add_domain_findings(state, "network", network_findings)


async def device_agent_node(state: InvestigationState) -> Dict[str, Any]:
    """
    Device fingerprint analysis agent.
    Analyzes device consistency, spoofing indicators, and browser patterns.
    """
    logger.info("📱 Device agent analyzing investigation")
    
    snowflake_data = state.get("snowflake_data", {})
    tool_results = state.get("tool_results", {})
    
    device_findings = {
        "domain": "device",
        "risk_score": 0.0,
        "risk_indicators": [],
        "analysis": {}
    }
    
    # Analyze Snowflake data for device patterns
    if snowflake_data and "results" in snowflake_data:
        results = snowflake_data["results"]
        
        # Check for multiple device IDs
        device_ids = set(r.get("DEVICE_ID") for r in results if r.get("DEVICE_ID"))
        if len(device_ids) > 5:
            device_findings["risk_indicators"].append(f"Multiple device IDs detected: {len(device_ids)}")
            device_findings["risk_score"] += 0.3
        
        # Check for user agent inconsistencies
        user_agents = set(r.get("USER_AGENT") for r in results if r.get("USER_AGENT"))
        if len(user_agents) > 10:
            device_findings["risk_indicators"].append(f"Excessive user agent variations: {len(user_agents)}")
            device_findings["risk_score"] += 0.2
        
        # Check for browser/OS mismatches
        browsers = set(r.get("BROWSER_NAME") for r in results if r.get("BROWSER_NAME"))
        os_names = set(r.get("OS_NAME") for r in results if r.get("OS_NAME"))
        
        device_findings["analysis"]["unique_browsers"] = len(browsers)
        device_findings["analysis"]["unique_os"] = len(os_names)
        
        if len(browsers) > 3 or len(os_names) > 3:
            device_findings["risk_indicators"].append("Device fingerprint inconsistencies detected")
            device_findings["risk_score"] += 0.2
    
    # Check for device spoofing patterns in tool results
    if "ml_anomaly_detection" in tool_results:
        anomaly_result = tool_results["ml_anomaly_detection"]
        if isinstance(anomaly_result, dict) and anomaly_result.get("anomaly_score", 0) > 0.7:
            device_findings["risk_indicators"].append("ML detected device anomalies")
            device_findings["risk_score"] += 0.3
    
    device_findings["risk_score"] = min(1.0, device_findings["risk_score"])
    device_findings["confidence"] = 0.7  # Moderate confidence for device analysis
    
    logger.info(f"✅ Device analysis complete - Risk: {device_findings['risk_score']:.2f}")
    
    return add_domain_findings(state, "device", device_findings)


async def location_agent_node(state: InvestigationState) -> Dict[str, Any]:
    """
    Location analysis agent.
    Analyzes geographic patterns, impossible travel, and location anomalies.
    """
    logger.info("📍 Location agent analyzing investigation")
    
    snowflake_data = state.get("snowflake_data", {})
    
    location_findings = {
        "domain": "location",
        "risk_score": 0.0,
        "risk_indicators": [],
        "analysis": {}
    }
    
    # Analyze Snowflake data for location patterns
    if snowflake_data and "results" in snowflake_data:
        results = snowflake_data["results"]
        
        # Check for impossible travel
        locations_by_time = []
        for r in results:
            if r.get("TX_DATETIME") and r.get("IP_CITY"):
                locations_by_time.append({
                    "time": r["TX_DATETIME"],
                    "city": r["IP_CITY"],
                    "country": r.get("IP_COUNTRY")
                })
        
        # Sort by time and check for impossible travel
        locations_by_time.sort(key=lambda x: x["time"])
        
        for i in range(1, len(locations_by_time)):
            prev_loc = locations_by_time[i-1]
            curr_loc = locations_by_time[i]
            
            # Simple check: different countries within 1 hour
            if prev_loc["country"] != curr_loc["country"]:
                # Would need to parse timestamps properly in production
                location_findings["risk_indicators"].append("Possible impossible travel detected")
                location_findings["risk_score"] += 0.4
                break
        
        # Check for high-risk countries
        countries = set(r.get("IP_COUNTRY") for r in results if r.get("IP_COUNTRY"))
        high_risk_countries = {"XX", "YY", "ZZ"}  # Example high-risk country codes
        
        if countries & high_risk_countries:
            location_findings["risk_indicators"].append("Activity from high-risk countries")
            location_findings["risk_score"] += 0.3
        
        location_findings["analysis"]["unique_countries"] = len(countries)
        location_findings["analysis"]["unique_cities"] = len(set(r.get("IP_CITY") for r in results if r.get("IP_CITY")))
    
    location_findings["risk_score"] = min(1.0, location_findings["risk_score"])
    location_findings["confidence"] = 0.6
    
    logger.info(f"✅ Location analysis complete - Risk: {location_findings['risk_score']:.2f}")
    
    return add_domain_findings(state, "location", location_findings)


async def logs_agent_node(state: InvestigationState) -> Dict[str, Any]:
    """
    Logs analysis agent.
    Analyzes system logs, authentication patterns, and activity timelines.
    """
    logger.info("📝 Logs agent analyzing investigation")
    
    snowflake_data = state.get("snowflake_data", {})
    tool_results = state.get("tool_results", {})
    
    logs_findings = {
        "domain": "logs",
        "risk_score": 0.0,
        "risk_indicators": [],
        "analysis": {}
    }
    
    # Analyze Snowflake transaction logs
    if snowflake_data and "results" in snowflake_data:
        results = snowflake_data["results"]
        
        # Check for failed transactions
        failed_txs = [r for r in results if r.get("NSURE_LAST_DECISION") == "reject"]
        if len(failed_txs) > 5:
            logs_findings["risk_indicators"].append(f"High number of rejected transactions: {len(failed_txs)}")
            logs_findings["risk_score"] += 0.3
        
        # Check for rapid-fire transactions
        tx_times = [r.get("TX_DATETIME") for r in results if r.get("TX_DATETIME")]
        if len(tx_times) > 10:
            # In production, would calculate actual time deltas
            logs_findings["risk_indicators"].append("Potential rapid-fire transaction pattern")
            logs_findings["risk_score"] += 0.2
        
        # Check for error patterns
        error_codes = [r.get("ERROR_CODE") for r in results if r.get("ERROR_CODE")]
        if len(error_codes) > 3:
            logs_findings["risk_indicators"].append(f"Multiple error codes detected: {len(set(error_codes))}")
            logs_findings["risk_score"] += 0.1
    
    # Check Splunk/SumoLogic results
    log_tools = ["splunk_tool", "sumologic_tool"]
    for tool_name in log_tools:
        if tool_name in tool_results:
            result = tool_results[tool_name]
            if isinstance(result, dict) and result.get("suspicious_activity", False):
                logs_findings["risk_indicators"].append(f"{tool_name}: Suspicious activity detected")
                logs_findings["risk_score"] += 0.2
    
    logs_findings["risk_score"] = min(1.0, logs_findings["risk_score"])
    logs_findings["confidence"] = 0.7
    
    logger.info(f"✅ Logs analysis complete - Risk: {logs_findings['risk_score']:.2f}")
    
    return add_domain_findings(state, "logs", logs_findings)


async def risk_agent_node(state: InvestigationState) -> Dict[str, Any]:
    """
    Risk assessment agent.
    Synthesizes findings from all domains and calculates final risk.
    """
    logger.info("⚠️ Risk agent performing final assessment")
    
    from app.service.agent.orchestration.state_schema import calculate_final_risk_score
    
    domain_findings = state.get("domain_findings", {})
    tools_used = state.get("tools_used", [])
    risk_indicators = state.get("risk_indicators", [])
    
    # Calculate composite risk score
    final_risk_score = calculate_final_risk_score(state)
    
    risk_findings = {
        "domain": "risk",
        "risk_score": final_risk_score,
        "risk_indicators": [],
        "analysis": {
            "domains_analyzed": list(domain_findings.keys()),
            "tools_used_count": len(tools_used),
            "total_risk_indicators": len(risk_indicators)
        }
    }
    
    # Determine risk level and add appropriate indicators
    if final_risk_score >= 0.8:
        risk_findings["risk_indicators"].append("CRITICAL RISK - Immediate action required")
        risk_findings["risk_level"] = "CRITICAL"
    elif final_risk_score >= 0.6:
        risk_findings["risk_indicators"].append("HIGH RISK - Manual review recommended")
        risk_findings["risk_level"] = "HIGH"
    elif final_risk_score >= 0.4:
        risk_findings["risk_indicators"].append("MEDIUM RISK - Monitor closely")
        risk_findings["risk_level"] = "MEDIUM"
    elif final_risk_score >= 0.2:
        risk_findings["risk_indicators"].append("LOW RISK - Standard monitoring")
        risk_findings["risk_level"] = "LOW"
    else:
        risk_findings["risk_indicators"].append("MINIMAL RISK - No immediate concerns")
        risk_findings["risk_level"] = "MINIMAL"
    
    # Add cross-domain risk factors
    if len(domain_findings) >= 3:
        high_risk_domains = [d for d, f in domain_findings.items() 
                           if isinstance(f, dict) and f.get("risk_score", 0) > 0.6]
        if len(high_risk_domains) >= 2:
            risk_findings["risk_indicators"].append(f"Multiple high-risk domains: {', '.join(high_risk_domains)}")
    
    # Calculate confidence based on investigation completeness
    confidence_factors = [
        1.0 if state.get("snowflake_completed") else 0.0,
        min(1.0, len(tools_used) / 20.0),
        min(1.0, len(domain_findings) / 5.0)
    ]
    risk_findings["confidence"] = sum(confidence_factors) / len(confidence_factors)
    
    logger.info(f"✅ Risk assessment complete - Final Risk: {final_risk_score:.2f} ({risk_findings['risk_level']})")
    
    return add_domain_findings(state, "risk", risk_findings)