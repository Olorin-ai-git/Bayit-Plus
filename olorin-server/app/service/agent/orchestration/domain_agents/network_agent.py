"""
Network Domain Analysis Agent

Analyzes network patterns, IP reputation, and geographic anomalies for fraud detection.
"""

import os
import time
from typing import Dict, Any, Optional

from app.service.logging import get_bridge_logger
from app.service.agent.orchestration.state_schema import InvestigationState, add_domain_findings
from .base import DomainAgentBase, log_agent_handover_complete, complete_chain_of_thought
from app.service.agent.tools.snowflake_tool.schema_constants import IP, MAXMIND_RISK_SCORE

logger = get_bridge_logger(__name__)


async def network_agent_node(state: InvestigationState, config: Optional[Dict] = None) -> Dict[str, Any]:
    """
    Network domain analysis agent.
    Analyzes network patterns, IP reputation, and geographic anomalies.
    """
    try:
        is_test_mode = os.environ.get("TEST_MODE") == "mock"
        start_time = time.time()
        
        logger.info("[Step 5.2.1] 🌐 Network agent analyzing investigation")
        
        # Get relevant data from state
        snowflake_data = state.get("snowflake_data", {})
        tool_results = state.get("tool_results", {})
        entity_id = state["entity_id"]
        entity_type = state["entity_type"]
        investigation_id = state.get('investigation_id', 'unknown')
        
        # Initialize logging and chain of thought
        DomainAgentBase.log_agent_start("network", entity_type, entity_id, is_test_mode)
        DomainAgentBase.log_context_analysis(snowflake_data, tool_results, "network")
        
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
            # CRITICAL FIX: Apply field whitelisting to prevent cross-domain pollution
            from app.service.agent.orchestration.domain.field_whitelist import (
                filter_domain_fields, assert_no_cross_domain_pollution
            )
            
            # Extract raw metrics from Snowflake results
            raw_metrics = {}
            for record in results:
                if isinstance(record, dict):
                    for field_name, field_value in record.items():
                        if field_name not in raw_metrics and field_value is not None:
                            raw_metrics[field_name] = field_value
            
            # Apply whitelist filter - HARD BLOCK on MODEL_SCORE and cross-domain fields
            filtered_metrics = filter_domain_fields("network", raw_metrics)
            network_findings["metrics"].update(filtered_metrics)
            
            # Check for proxy/VPN indicators
            _analyze_vpn_proxy_indicators(results, network_findings)
            
            # Check for multiple countries
            _analyze_geographic_patterns(results, network_findings)
            
            # REMOVED: process_model_scores call to prevent MODEL_SCORE pollution
            # DomainAgentBase.process_model_scores(results, network_findings, "network")
            
            # Analyze IP diversity
            _analyze_ip_diversity(results, network_findings)
        else:
            # Handle case where Snowflake data format is problematic
            if isinstance(snowflake_data, str):
                network_findings["risk_indicators"].append("Snowflake data in non-structured format")
        
        # Analyze threat intelligence results
        _analyze_threat_intelligence(tool_results, network_findings)
        
        # CRITICAL: Analyze evidence with LLM to generate risk scores
        from .base import analyze_evidence_with_llm
        network_findings = await analyze_evidence_with_llm(
            domain="network",
            findings=network_findings,
            snowflake_data=snowflake_data,
            entity_type=entity_type,
            entity_id=entity_id
        )
        
        # Finalize findings
        analysis_duration = time.time() - start_time
        DomainAgentBase.finalize_findings(
            network_findings, snowflake_data, tool_results, analysis_duration, "network"
        )
        
        # CRITICAL: Assert no cross-domain pollution occurred
        from app.service.agent.orchestration.domain.field_whitelist import assert_no_cross_domain_pollution
        assert_no_cross_domain_pollution(network_findings, "network")
        
        # Complete logging
        log_agent_handover_complete("network", network_findings)
        complete_chain_of_thought(process_id, network_findings, "network")
        
        # Update state with findings
        return add_domain_findings(state, "network", network_findings)
    
    except Exception as e:
        logger.error(f"❌ Network agent failed: {str(e)}")
        
        # Record failure with circuit breaker
        from app.service.agent.orchestration.circuit_breaker import record_node_failure
        record_node_failure(state, "network_agent", e)
        
        # Return state as-is to allow investigation to continue
        return state


def _analyze_vpn_proxy_indicators(results: list, findings: Dict[str, Any]) -> None:
    """Analyze results for VPN/proxy indicators."""
    # Note: PROXY_RISK_SCORE not available in schema
    vpn_columns = ["VPN_INDICATOR", "IS_VPN", "IS_PROXY"]
    
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
    countries = set(r.get("IP_COUNTRY_CODE") for r in results if r.get("IP_COUNTRY_CODE"))
    
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
    ips = set(r.get("IP") for r in results if r.get("IP"))  # Using correct column name
    findings["analysis"]["unique_ips"] = len(ips)
    findings["metrics"]["unique_ip_count"] = len(ips)
    
    if len(ips) > 10:
        findings["risk_indicators"].append(f"High IP diversity: {len(ips)} unique IPs")
        findings["risk_score"] += 0.2
        findings["evidence"].append(f"Suspicious IP diversity pattern: {len(ips)} unique addresses")
    elif len(ips) > 5:
        findings["evidence"].append(f"Moderate IP diversity: {len(ips)} unique addresses")


def _analyze_threat_intelligence(tool_results: Dict[str, Any], findings: Dict[str, Any]) -> None:
    """Analyze threat intelligence from any tool that provides network security data."""
    
    logger.debug(f"[Step 5.2.1.2] 🔍 Category-based threat analysis: Processing {len(tool_results)} tools")
    
    # Process ALL tool results, not just hardcoded ones
    for tool_name, result in tool_results.items():
        if not isinstance(result, dict):
            logger.debug(f"[Step 5.2.1.2]   ⏭️  Skipping {tool_name}: non-dict result")
            continue
            
        # Look for threat intelligence indicators across any tool
        threat_signals = _extract_threat_signals(tool_name, result)
        
        if threat_signals:
            logger.debug(f"[Step 5.2.1.2]   ✅ {tool_name}: Found {len(threat_signals)} threat signals")
            _process_threat_signals(tool_name, threat_signals, findings)
        else:
            logger.debug(f"[Step 5.2.1.2]   ➖ {tool_name}: No network threat signals detected")


def _extract_threat_signals(tool_name: str, result: Dict[str, Any]) -> Dict[str, Any]:
    """Extract threat intelligence signals from any tool result."""
    signals = {}
    
    logger.debug(f"[Step 5.2.1.2] 🔍 Extracting threat signals from {tool_name} with {len(result)} top-level fields")
    
    # Common threat intelligence fields (tools may use different names)
    threat_indicators = [
        "malicious", "is_malicious", "threat", "blacklisted", "blocked",
        "reputation", "risk_score", "threat_score", "malware", "phishing",
        "spam", "suspicious", "dangerous", "harmful", "infected"
    ]
    
    # Numeric score fields
    score_indicators = [
        "score", "threat_score", "risk_score", "reputation_score", 
        "confidence", "severity", "rating", "level"
    ]
    
    # Extract boolean threat indicators
    for indicator in threat_indicators:
        if indicator in result:
            signals[f"threat_{indicator}"] = result[indicator]
            logger.debug(f"[Step 5.2.1.2]     → Found threat indicator: {indicator} = {result[indicator]}")
    
    # Extract numeric threat scores
    for indicator in score_indicators:
        if indicator in result:
            try:
                signals[f"score_{indicator}"] = float(result[indicator])
                logger.debug(f"[Step 5.2.1.2]     → Found score indicator: {indicator} = {result[indicator]}")
            except (ValueError, TypeError):
                logger.debug(f"[Step 5.2.1.2]     → Skipped non-numeric score: {indicator} = {result[indicator]}")
                pass
    
    # Look for nested threat data (many tools nest results)
    nested_count = 0
    for key, value in result.items():
        if isinstance(value, dict):
            nested_signals = _extract_threat_signals(f"{tool_name}_{key}", value)
            signals.update(nested_signals)
            if nested_signals:
                nested_count += 1
        elif isinstance(value, list):
            # Handle arrays of threat data
            for i, item in enumerate(value[:5]):  # Limit to first 5 items
                if isinstance(item, dict):
                    nested_signals = _extract_threat_signals(f"{tool_name}_{key}_{i}", item)
                    signals.update(nested_signals)
                    if nested_signals:
                        nested_count += 1
    
    if nested_count > 0:
        logger.debug(f"[Step 5.2.1.2]     → Processed {nested_count} nested structures")
    
    logger.debug(f"[Step 5.2.1.2] ✅ Extracted {len(signals)} threat signals from {tool_name}")
    return signals


def _process_threat_signals(tool_name: str, signals: Dict[str, Any], findings: Dict[str, Any]) -> None:
    """Process extracted threat signals to adjust risk score."""
    
    logger.debug(f"[Step 5.2.1.3] 🔍 Processing {len(signals)} threat signals from {tool_name}")
    
    # Calculate threat assessment from all signals
    threat_level = 0.0
    evidence_count = 0
    
    # Process boolean threat indicators
    for key, value in signals.items():
        if key.startswith("threat_") and value:
            if value is True or str(value).lower() in ["true", "yes", "1", "malicious", "blocked"]:
                threat_level += 0.3
                evidence_count += 1
                findings["evidence"].append(f"{tool_name}: {key} = {value}")
    
    # Process numeric scores
    for key, value in signals.items():
        if key.startswith("score_") and isinstance(value, (int, float)):
            # Normalize different score scales to 0-1 range
            normalized_score = _normalize_threat_score(key, value)
            if normalized_score > 0.5:  # High threat
                threat_level += normalized_score * 0.4
                evidence_count += 1
                findings["evidence"].append(f"{tool_name}: {key} = {value} (normalized: {normalized_score:.2f})")
            elif normalized_score < 0.2:  # Low threat (reputation positive)
                threat_level -= (0.2 - normalized_score) * 0.3
                findings["evidence"].append(f"{tool_name}: Clean reputation {key} = {value}")
    
    # Apply risk adjustment based on threat assessment
    if threat_level > 0.5:
        # High threat detected - increase risk
        risk_multiplier = 1.0 + min(0.2, threat_level * 0.1)
        findings["risk_score"] = min(1.0, findings["risk_score"] * risk_multiplier)
        findings["risk_indicators"].append(f"{tool_name}: High threat detected (level: {threat_level:.2f})")
    elif threat_level < -0.3:
        # Clean reputation - reduce risk
        risk_multiplier = 1.0 + max(-0.15, threat_level * 0.2)  # threat_level is negative
        findings["risk_score"] = max(0.1, findings["risk_score"] * risk_multiplier)
        findings["evidence"].append(f"{tool_name}: Network appears clean (level: {threat_level:.2f})")
    
    # Store aggregated metrics
    if evidence_count > 0:
        findings["metrics"][f"{tool_name}_threat_level"] = threat_level
        findings["metrics"][f"{tool_name}_evidence_count"] = evidence_count
        logger.debug(f"[Step 5.2.1.3]   ✅ {tool_name}: Processed {evidence_count} threat signals, threat level: {threat_level:.2f}")
    else:
        logger.debug(f"[Step 5.2.1.3]   ➖ {tool_name}: No actionable threat signals found")


def _normalize_threat_score(score_type: str, value: float) -> float:
    """Normalize different threat score scales to 0-1 range."""
    
    # Common score ranges for different tools
    if "100" in str(value) or value > 10:
        # Likely 0-100 scale
        return min(1.0, max(0.0, value / 100.0))
    elif value > 1.0:
        # Likely 0-10 scale or similar
        return min(1.0, max(0.0, value / 10.0))
    else:
        # Likely already 0-1 scale
        return min(1.0, max(0.0, value))