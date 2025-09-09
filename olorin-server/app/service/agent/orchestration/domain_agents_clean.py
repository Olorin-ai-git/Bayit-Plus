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
    import os
    import time
    is_test_mode = os.environ.get("TEST_MODE") == "mock"
    start_time = time.time()
    
    logger.info("🌐 Network agent analyzing investigation")
    
    # DEBUG: Agent handover logging
    logger.debug("🌐 NETWORK AGENT HANDOVER DEBUG:")
    logger.debug(f"   🤝 Agent handover: Orchestrator → Network Agent")
    logger.debug(f"   🎯 Mode: {'TEST' if is_test_mode else 'LIVE'}")
    logger.debug(f"   📋 Task: Analyze network patterns, IP reputation, geographic anomalies")
    logger.debug(f"   🏗️  Investigation ID: {state.get('investigation_id', 'N/A')}")
    logger.debug(f"   🎯 Entity: {state.get('entity_type', 'N/A')} - {state.get('entity_id', 'N/A')}")
    
    # Get relevant data from state
    snowflake_data = state.get("snowflake_data", {})
    tool_results = state.get("tool_results", {})
    entity_id = state["entity_id"]
    entity_type = state["entity_type"]
    
    # DEBUG: Context analysis
    logger.debug(f"   📊 Available data sources:")
    logger.debug(f"      Snowflake data: {'Yes' if snowflake_data else 'No'} ({len(str(snowflake_data))} chars)")
    logger.debug(f"      Tool results: {len(tool_results)} tools")
    if tool_results:
        logger.debug(f"         Tool results keys: {list(tool_results.keys())}")
    logger.debug(f"   🧠 Chain of thought: Starting network analysis with available context")
    
    # CHAIN OF THOUGHT: Initialize network agent reasoning
    from app.service.agent.chain_of_thought_logger import get_chain_of_thought_logger, ReasoningType
    cot_logger = get_chain_of_thought_logger()
    
    investigation_id = state.get('investigation_id', 'unknown')
    process_id = f"network_agent_{investigation_id}"
    
    # Start thought process for network agent
    cot_logger.start_agent_thinking(
        investigation_id=investigation_id,
        agent_name="network_agent",
        domain="network",
        initial_context={"entity_type": entity_type, "entity_id": entity_id}
    )
    
    # Log initial analysis reasoning
    cot_logger.log_reasoning_step(
        process_id=process_id,
        reasoning_type=ReasoningType.ANALYSIS,
        premise=f"Network domain analysis required for {entity_type} {entity_id}",
        reasoning="Need to analyze network patterns, IP reputation, VPN/proxy usage, geographic anomalies, and threat intelligence data to assess network-based fraud risk.",
        conclusion="Will examine Snowflake transaction data and threat intelligence results for network risk indicators",
        confidence=0.8,
        supporting_evidence=[
            {"type": "data_availability", "data": f"Snowflake data: {'available' if snowflake_data else 'missing'}"},
            {"type": "tool_results", "data": f"{len(tool_results)} tools executed"},
            {"type": "domain", "data": "network analysis specialization"}
        ],
        metadata={"agent": "network", "entity_type": entity_type, "entity_id": entity_id}
    )
    
    # Analyze network aspects
    network_findings = {
        "domain": "network",
        "risk_score": 0.0,
        "risk_indicators": [],
        "analysis": {}
    }
    
    # Analyze Snowflake data for network patterns
    # CRITICAL FIX: Handle both dictionary and string snowflake_data to prevent TypeError
    results = []
    if snowflake_data:
        if isinstance(snowflake_data, dict) and "results" in snowflake_data:
            results = snowflake_data["results"]
            logger.debug(f"   📊 Processing {len(results)} Snowflake records for network analysis")
        elif isinstance(snowflake_data, str):
            logger.warning("⚠️ Network Agent: Snowflake data is string format, cannot extract structured results")
            logger.debug(f"   String content preview: {snowflake_data[:200]}...")
            # Add risk indicator for incomplete data
            network_findings["risk_indicators"].append("Snowflake data in non-structured format")
        else:
            logger.warning(f"⚠️ Network Agent: Unexpected Snowflake data type: {type(snowflake_data)}")
            logger.debug(f"   Data content preview: {str(snowflake_data)[:200]}...")
    
    if results:
        
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

        # CRITICAL DEBUG: Log MODEL_SCORE processing
        if results:
            logger.debug(f"   📊 Processing {len(results)} records for risk calculation")
            for idx, r in enumerate(results[:3]):  # Log first 3 records
                model_score = r.get("MODEL_SCORE")
                logger.debug(f"      Record {idx+1}: MODEL_SCORE = {model_score} (type: {type(model_score)})")
                if model_score:
                    try:
                        float_score = float(model_score)
                        logger.debug(f"      Converted to float: {float_score}")
                    except (ValueError, TypeError) as e:
                        logger.error(f"      ❌ Failed to convert MODEL_SCORE to float: {e}")
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
    
    # Calculate completion time
    analysis_duration = time.time() - start_time
    
    logger.info(f"✅ Network analysis complete - Risk: {network_findings['risk_score']:.2f}")
    
    # DEBUG: Analysis completion and handover back
    logger.debug("🌐 NETWORK AGENT COMPLETION DEBUG:")
    logger.debug(f"   ⏱️  Analysis duration: {analysis_duration:.3f}s")
    logger.debug(f"   🎯 Risk score calculated: {network_findings['risk_score']:.2f}")
    logger.debug(f"   🔍 Risk indicators found: {len(network_findings['risk_indicators'])}")
    for i, indicator in enumerate(network_findings['risk_indicators'][:3]):  # Show first 3
        logger.debug(f"      Risk {i+1}: {indicator}")
    if len(network_findings['risk_indicators']) > 3:
        logger.debug(f"      ... and {len(network_findings['risk_indicators']) - 3} more")
    logger.debug(f"   📊 Confidence level: {network_findings.get('confidence', 0):.2f}")
    logger.debug(f"   🧠 Chain of thought: Analysis complete, findings generated")
    logger.debug(f"   📋 Analysis summary: {network_findings.get('analysis', {})}")
    logger.debug(f"   🤝 Agent handover: Network Agent → Orchestrator")
    logger.debug(f"   ✅ Domain completion: Adding 'network' to completed domains")
    
    return add_domain_findings(state, "network", network_findings)


async def device_agent_node(state: InvestigationState) -> Dict[str, Any]:
    """
    Device fingerprint analysis agent.
    Analyzes device consistency, spoofing indicators, and browser patterns.
    """
    logger.info("📱 Device agent analyzing investigation")
    
    # DEBUG: Detailed device agent handover logging
    investigation_id = state.get("investigation_id", "unknown")
    entity_type = state.get("entity_type", "unknown")
    entity_id = state.get("entity_id", "unknown")
    process_id = f"investigation_{investigation_id}"
    
    logger.debug("📱 DEVICE AGENT HANDOVER DEBUG:")
    logger.debug(f"   🤝 Agent handover: Orchestrator → Device Agent")
    logger.debug(f"   📋 Task: Analyze device consistency, spoofing indicators, browser patterns")
    logger.debug(f"   🎯 Target: {entity_type} - {entity_id}")
    logger.debug(f"   📊 State keys available: {list(state.keys())}")
    
    # CHAIN OF THOUGHT: Initialize reasoning for device analysis
    from app.service.agent.chain_of_thought_logger import ChainOfThoughtLogger, ReasoningType
    cot_logger = ChainOfThoughtLogger()
    
    # CHAIN OF THOUGHT: Log initial reasoning for device analysis
    cot_logger.log_reasoning_step(
        process_id=process_id,
        reasoning_type=ReasoningType.ANALYSIS,
        premise=f"Device fingerprinting analysis required for {entity_type} {entity_id} fraud investigation",
        reasoning=f"Device fingerprints are fundamental fraud indicators revealing device consistency and spoofing attempts. Will analyze: (1) Device fingerprint consistency across sessions, (2) Browser spoofing indicators and inconsistencies, (3) Device change patterns and frequency, (4) Virtual machine and automation tool signatures",
        conclusion="Initiating comprehensive device fingerprinting analysis for spoofing and consistency detection",
        confidence=0.8,
        supporting_evidence=[
            {"type": "data_availability", "data": f"Snowflake data: {'available' if state.get('snowflake_data') else 'missing'}"},
            {"type": "tool_results", "data": f"{len(state.get('tool_results', {}))} tools executed"},
            {"type": "domain", "data": "device analysis specialization"}
        ],
        metadata={"agent": "device", "entity_type": entity_type, "entity_id": entity_id}
    )
    
    snowflake_data = state.get("snowflake_data", {})
    tool_results = state.get("tool_results", {})
    
    device_findings = {
        "domain": "device",
        "risk_score": 0.0,
        "risk_indicators": [],
        "analysis": {}
    }
    
    # Analyze Snowflake data for device patterns
    # CRITICAL FIX: Handle both dictionary and string snowflake_data to prevent TypeError
    results = []
    if snowflake_data:
        if isinstance(snowflake_data, dict) and "results" in snowflake_data:
            results = snowflake_data["results"]
            logger.debug(f"   📊 Processing {len(results)} Snowflake records for device analysis")
        elif isinstance(snowflake_data, str):
            logger.warning("⚠️ Device Agent: Snowflake data is string format, cannot extract structured results")
            logger.debug(f"   String content preview: {snowflake_data[:200]}...")
            # Add risk indicator for incomplete data
            device_findings["risk_indicators"].append("Snowflake data in non-structured format")
        else:
            logger.warning(f"⚠️ Device Agent: Unexpected Snowflake data type: {type(snowflake_data)}")
            logger.debug(f"   Data content preview: {str(snowflake_data)[:200]}...")
    
    if results:
        
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
    
    # DEBUG: Detailed location agent handover logging
    investigation_id = state.get("investigation_id", "unknown")
    entity_type = state.get("entity_type", "unknown")
    entity_id = state.get("entity_id", "unknown")
    process_id = f"investigation_{investigation_id}"
    
    logger.debug("📍 LOCATION AGENT HANDOVER DEBUG:")
    logger.debug(f"   🤝 Agent handover: Orchestrator → Location Agent")
    logger.debug(f"   📋 Task: Analyze geographic patterns, impossible travel, location-based risks")
    logger.debug(f"   🎯 Target: {entity_type} - {entity_id}")
    logger.debug(f"   📊 State keys available: {list(state.keys())}")
    
    # CHAIN OF THOUGHT: Initialize reasoning for location analysis
    from app.service.agent.chain_of_thought_logger import ChainOfThoughtLogger, ReasoningType
    cot_logger = ChainOfThoughtLogger()
    
    # CHAIN OF THOUGHT: Log initial reasoning for location analysis
    cot_logger.log_reasoning_step(
        process_id=process_id,
        reasoning_type=ReasoningType.ANALYSIS,
        premise=f"Location analysis required for {entity_type} {entity_id} fraud investigation",
        reasoning=f"Geographic patterns and location-based fraud indicators are critical for comprehensive risk assessment. Will analyze: (1) Impossible travel detection between transaction locations, (2) High-risk geographic regions, (3) Location consistency patterns, (4) IP geolocation anomalies",
        conclusion="Initiating comprehensive location-based fraud analysis with impossible travel detection",
        confidence=0.8,
        supporting_evidence=[
            {"type": "data_availability", "data": f"Snowflake data: {'available' if state.get('snowflake_data') else 'missing'}"},
            {"type": "domain", "data": "location analysis specialization"}
        ],
        metadata={"agent": "location", "entity_type": entity_type, "entity_id": entity_id}
    )
    
    snowflake_data = state.get("snowflake_data", {})
    
    location_findings = {
        "domain": "location",
        "risk_score": 0.0,
        "risk_indicators": [],
        "analysis": {}
    }
    
    # Analyze Snowflake data for location patterns
    # CRITICAL FIX: Handle both dictionary and string snowflake_data to prevent TypeError
    results = []
    if snowflake_data:
        if isinstance(snowflake_data, dict) and "results" in snowflake_data:
            results = snowflake_data["results"]
            logger.debug(f"   📊 Processing {len(results)} Snowflake records for location analysis")
        elif isinstance(snowflake_data, str):
            logger.warning("⚠️ Location Agent: Snowflake data is string format, cannot extract structured results")
            logger.debug(f"   String content preview: {snowflake_data[:200]}...")
            # Add risk indicator for incomplete data
            location_findings["risk_indicators"].append("Snowflake data in non-structured format")
        else:
            logger.warning(f"⚠️ Location Agent: Unexpected Snowflake data type: {type(snowflake_data)}")
            logger.debug(f"   Data content preview: {str(snowflake_data)[:200]}...")
    
    if results:
        
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
    
    # DEBUG: Detailed logs agent handover logging
    investigation_id = state.get("investigation_id", "unknown")
    entity_type = state.get("entity_type", "unknown")
    entity_id = state.get("entity_id", "unknown")
    process_id = f"investigation_{investigation_id}"
    
    logger.debug("📝 LOGS AGENT HANDOVER DEBUG:")
    logger.debug(f"   🤝 Agent handover: Orchestrator → Logs Agent")
    logger.debug(f"   📋 Task: Analyze system logs, authentication patterns, activity timelines")
    logger.debug(f"   🎯 Target: {entity_type} - {entity_id}")
    logger.debug(f"   📊 State keys available: {list(state.keys())}")
    
    # CHAIN OF THOUGHT: Initialize reasoning for logs analysis
    from app.service.agent.chain_of_thought_logger import ChainOfThoughtLogger, ReasoningType
    cot_logger = ChainOfThoughtLogger()
    
    # CHAIN OF THOUGHT: Log initial reasoning for logs analysis
    cot_logger.log_reasoning_step(
        process_id=process_id,
        reasoning_type=ReasoningType.ANALYSIS,
        premise=f"Logs analysis required for {entity_type} {entity_id} fraud investigation",
        reasoning=f"System logs and authentication patterns provide crucial behavioral insights for fraud detection. Will analyze: (1) Failed transaction patterns and rejection reasons, (2) Rapid-fire transaction sequences, (3) Error code patterns and anomalies, (4) Splunk/SumoLogic suspicious activity indicators",
        conclusion="Initiating comprehensive logs analysis for behavioral fraud indicators",
        confidence=0.8,
        supporting_evidence=[
            {"type": "data_availability", "data": f"Snowflake data: {'available' if state.get('snowflake_data') else 'missing'}"},
            {"type": "tool_results", "data": f"{len(state.get('tool_results', {}))} tools executed"},
            {"type": "domain", "data": "logs analysis specialization"}
        ],
        metadata={"agent": "logs", "entity_type": entity_type, "entity_id": entity_id}
    )
    
    snowflake_data = state.get("snowflake_data", {})
    tool_results = state.get("tool_results", {})
    
    logs_findings = {
        "domain": "logs",
        "risk_score": 0.0,
        "risk_indicators": [],
        "analysis": {}
    }
    
    # Analyze Snowflake transaction logs
    # CRITICAL FIX: Handle both dictionary and string snowflake_data to prevent TypeError
    results = []
    if snowflake_data:
        if isinstance(snowflake_data, dict) and "results" in snowflake_data:
            results = snowflake_data["results"]
            logger.debug(f"   📊 Processing {len(results)} Snowflake records for logs analysis")
        elif isinstance(snowflake_data, str):
            logger.warning("⚠️ Logs Agent: Snowflake data is string format, cannot extract structured results")
            logger.debug(f"   String content preview: {snowflake_data[:200]}...")
            # Add risk indicator for incomplete data
            logs_findings["risk_indicators"].append("Snowflake data in non-structured format")
        else:
            logger.warning(f"⚠️ Logs Agent: Unexpected Snowflake data type: {type(snowflake_data)}")
            logger.debug(f"   Data content preview: {str(snowflake_data)[:200]}...")
    
    if results:
        
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


async def authentication_agent_node(state: InvestigationState) -> Dict[str, Any]:
    """
    Authentication analysis agent.
    Analyzes login patterns, failed attempts, MFA bypass, and authentication anomalies.
    """
    logger.info("🔐 Authentication agent analyzing investigation")
    
    # DEBUG: Detailed authentication agent handover logging
    investigation_id = state.get("investigation_id", "unknown")
    entity_type = state.get("entity_type", "unknown")
    entity_id = state.get("entity_id", "unknown")
    process_id = f"investigation_{investigation_id}"
    
    logger.debug("🔐 AUTHENTICATION AGENT HANDOVER DEBUG:")
    logger.debug(f"   🤝 Agent handover: Orchestrator → Authentication Agent")
    logger.debug(f"   📋 Task: Analyze login patterns, failed attempts, MFA bypass, authentication anomalies")
    logger.debug(f"   🎯 Target: {entity_type} - {entity_id}")
    logger.debug(f"   📊 State keys available: {list(state.keys())}")
    
    # CHAIN OF THOUGHT: Initialize reasoning for authentication analysis
    from app.service.agent.chain_of_thought_logger import ChainOfThoughtLogger, ReasoningType
    cot_logger = ChainOfThoughtLogger()
    
    # CHAIN OF THOUGHT: Log initial reasoning for authentication analysis
    cot_logger.log_reasoning_step(
        process_id=process_id,
        reasoning_type=ReasoningType.ANALYSIS,
        premise=f"Authentication analysis required for {entity_type} {entity_id} fraud investigation",
        reasoning=f"Authentication patterns are critical indicators for account takeover and fraud attempts. Will analyze: (1) Brute force attack patterns via login attempt counts, (2) Failed login ratios and failure patterns, (3) MFA bypass attempts and security circumvention, (4) Impossible travel in authentication context, (5) Credential stuffing and SIM swap indicators",
        conclusion="Initiating comprehensive authentication security analysis with multi-vector threat detection",
        confidence=0.8,
        supporting_evidence=[
            {"type": "data_availability", "data": f"Snowflake data: {'available' if state.get('snowflake_data') else 'missing'}"},
            {"type": "tool_results", "data": f"{len(state.get('tool_results', {}))} tools executed"},
            {"type": "domain", "data": "authentication analysis specialization"}
        ],
        metadata={"agent": "authentication", "entity_type": entity_type, "entity_id": entity_id}
    )
    
    snowflake_data = state.get("snowflake_data", {})
    tool_results = state.get("tool_results", {})
    
    auth_findings = {
        "domain": "authentication",
        "risk_score": 0.0,
        "risk_indicators": [],
        "analysis": {}
    }
    
    # Analyze Snowflake data for authentication patterns
    # CRITICAL FIX: Handle both dictionary and string snowflake_data to prevent TypeError
    results = []
    if snowflake_data:
        if isinstance(snowflake_data, dict) and "results" in snowflake_data:
            results = snowflake_data["results"]
            logger.debug(f"   📊 Processing {len(results)} Snowflake records for authentication analysis")
        elif isinstance(snowflake_data, str):
            logger.warning("⚠️ Authentication Agent: Snowflake data is string format, cannot extract structured results")
            logger.debug(f"   String content preview: {snowflake_data[:200]}...")
            # Add risk indicator for incomplete data
            auth_findings["risk_indicators"].append("Snowflake data in non-structured format")
        else:
            logger.warning(f"⚠️ Authentication Agent: Unexpected Snowflake data type: {type(snowflake_data)}")
            logger.debug(f"   Data content preview: {str(snowflake_data)[:200]}...")
    
    if results:
        
        # Check for failed login patterns
        login_attempts = []
        failed_ratios = []
        
        for r in results:
            if "LOGIN_ATTEMPTS_COUNT" in r:
                attempts = r.get("LOGIN_ATTEMPTS_COUNT", 0)
                if isinstance(attempts, (int, float)):
                    login_attempts.append(attempts)
                    
            if "FAILED_LOGIN_RATIO" in r:
                ratio = r.get("FAILED_LOGIN_RATIO", 0.0)
                if isinstance(ratio, (int, float)):
                    failed_ratios.append(ratio)
        
        # Analyze login attempts
        if login_attempts:
            max_attempts = max(login_attempts)
            avg_attempts = sum(login_attempts) / len(login_attempts)
            
            if max_attempts > 20:
                auth_findings["risk_indicators"].append(f"Brute force detected: {max_attempts} login attempts")
                auth_findings["risk_score"] += 0.6
            elif max_attempts > 10:
                auth_findings["risk_indicators"].append(f"High login attempts: {max_attempts}")
                auth_findings["risk_score"] += 0.3
                
            auth_findings["analysis"]["max_login_attempts"] = max_attempts
            auth_findings["analysis"]["avg_login_attempts"] = avg_attempts
        
        # Analyze failed login ratios
        if failed_ratios:
            max_failed_ratio = max(failed_ratios)
            avg_failed_ratio = sum(failed_ratios) / len(failed_ratios)
            
            if max_failed_ratio > 0.8:
                auth_findings["risk_indicators"].append(f"High failure rate: {max_failed_ratio:.1%}")
                auth_findings["risk_score"] += 0.5
            elif max_failed_ratio > 0.5:
                auth_findings["risk_indicators"].append(f"Moderate failure rate: {max_failed_ratio:.1%}")
                auth_findings["risk_score"] += 0.2
                
            auth_findings["analysis"]["max_failed_ratio"] = max_failed_ratio
            auth_findings["analysis"]["avg_failed_ratio"] = avg_failed_ratio
        
        # Check for MFA bypass attempts
        mfa_bypass_attempts = [r for r in results if r.get("MFA_BYPASS_ATTEMPT")]
        if mfa_bypass_attempts:
            auth_findings["risk_indicators"].append(f"MFA bypass attempts detected: {len(mfa_bypass_attempts)}")
            auth_findings["risk_score"] += 0.7
        
        # Check for impossible travel in authentication
        travel_scores = []
        for r in results:
            if "IMPOSSIBLE_TRAVEL_CONFIDENCE" in r:
                confidence = r.get("IMPOSSIBLE_TRAVEL_CONFIDENCE", 0.0)
                if isinstance(confidence, (int, float)) and confidence > 0.8:
                    travel_scores.append(confidence)
        
        if travel_scores:
            max_travel_score = max(travel_scores)
            auth_findings["risk_indicators"].append(f"Impossible travel detected (confidence: {max_travel_score:.2f})")
            auth_findings["risk_score"] += 0.6
        
        # Check for credential stuffing indicators
        stuffing_indicators = [r for r in results if r.get("CREDENTIAL_STUFFING_BATCH_ID")]
        if stuffing_indicators:
            auth_findings["risk_indicators"].append(f"Credential stuffing detected: {len(stuffing_indicators)} batches")
            auth_findings["risk_score"] += 0.5
        
        # Check for SIM swap indicators
        sim_swap_indicators = [r for r in results if r.get("SIM_SWAP_INDICATOR")]
        if sim_swap_indicators:
            auth_findings["risk_indicators"].append(f"SIM swap indicators: {len(sim_swap_indicators)}")
            auth_findings["risk_score"] += 0.8
    
    # Check threat intelligence for authentication threats
    threat_tools = ["abuseipdb_tool", "virustotal_tool"]
    for tool_name in threat_tools:
        if tool_name in tool_results:
            result = tool_results[tool_name]
            if isinstance(result, dict):
                if result.get("brute_force_activity", False):
                    auth_findings["risk_indicators"].append(f"{tool_name}: Brute force activity detected")
                    auth_findings["risk_score"] += 0.3
                if result.get("credential_stuffing_reports", 0) > 0:
                    auth_findings["risk_indicators"].append(f"{tool_name}: Credential stuffing reports")
                    auth_findings["risk_score"] += 0.4
    
    # Cap risk score at 1.0
    auth_findings["risk_score"] = min(1.0, auth_findings["risk_score"])
    
    # Calculate confidence based on available authentication data
    data_sources = sum([
        1 if login_attempts else 0,
        1 if failed_ratios else 0,
        1 if "abuseipdb_tool" in tool_results else 0,
        1 if mfa_bypass_attempts else 0
    ])
    auth_findings["confidence"] = min(1.0, data_sources / 4.0)
    
    logger.info(f"✅ Authentication analysis complete - Risk: {auth_findings['risk_score']:.2f}")
    
    return add_domain_findings(state, "authentication", auth_findings)


async def risk_agent_node(state: InvestigationState) -> Dict[str, Any]:
    """
    Risk assessment agent.
    Synthesizes findings from all domains and calculates final risk.
    """
    logger.info("⚠️ Risk agent performing final assessment")
    
    # DEBUG: Detailed risk agent handover logging
    investigation_id = state.get("investigation_id", "unknown")
    entity_type = state.get("entity_type", "unknown")
    entity_id = state.get("entity_id", "unknown")
    process_id = f"investigation_{investigation_id}"
    
    logger.debug("⚠️ RISK AGENT HANDOVER DEBUG:")
    logger.debug(f"   🤝 Agent handover: Orchestrator → Risk Assessment Agent")
    logger.debug(f"   📋 Task: Synthesize all domain findings and calculate final risk score")
    logger.debug(f"   🎯 Target: {entity_type} - {entity_id}")
    logger.debug(f"   📊 State keys available: {list(state.keys())}")
    
    # CHAIN OF THOUGHT: Initialize reasoning for risk assessment
    from app.service.agent.chain_of_thought_logger import ChainOfThoughtLogger, ReasoningType
    cot_logger = ChainOfThoughtLogger()
    
    # CHAIN OF THOUGHT: Log initial reasoning for risk assessment
    cot_logger.log_reasoning_step(
        process_id=process_id,
        reasoning_type=ReasoningType.SYNTHESIS,
        premise=f"Final risk assessment required for {entity_type} {entity_id} after domain analysis completion",
        reasoning=f"Risk synthesis combines insights from all domain agents to produce unified fraud assessment. Will synthesize: (1) Network analysis results and IP reputation risks, (2) Device fingerprinting and spoofing indicators, (3) Location analysis and impossible travel patterns, (4) Logs analysis and behavioral anomalies, (5) Authentication security findings and breach indicators. Final risk score will weight each domain appropriately.",
        conclusion="Initiating comprehensive risk synthesis across all investigation domains",
        confidence=0.9,
        supporting_evidence=[
            {"type": "domain_findings", "data": f"Domains analyzed: {list(state.get('domain_findings', {}).keys())}"},
            {"type": "tools_used", "data": f"{len(state.get('tools_used', []))} tools executed across domains"},
            {"type": "synthesis_capability", "data": "risk assessment synthesis specialization"}
        ],
        metadata={"agent": "risk_synthesis", "entity_type": entity_type, "entity_id": entity_id, "phase": "final_assessment"}
    )
    
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
        min(1.0, len(domain_findings) / 6.0)  # Updated to account for 6 domains including authentication
    ]
    risk_findings["confidence"] = sum(confidence_factors) / len(confidence_factors)
    
    logger.info(f"✅ Risk assessment complete - Final Risk: {final_risk_score:.2f} ({risk_findings['risk_level']})")
    
    return add_domain_findings(state, "risk", risk_findings)