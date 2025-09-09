"""
Location Domain Analysis Agent

Analyzes geographic patterns, impossible travel, and location anomalies for fraud detection.
"""

import time
from typing import Dict, Any, List

from app.service.logging import get_bridge_logger
from app.service.agent.orchestration.state_schema import InvestigationState, add_domain_findings
from .base import DomainAgentBase, log_agent_handover_complete, complete_chain_of_thought

logger = get_bridge_logger(__name__)


async def location_agent_node(state: InvestigationState) -> Dict[str, Any]:
    """
    Location analysis agent.
    Analyzes geographic patterns, impossible travel, and location anomalies.
    """
    start_time = time.time()
    logger.info("[Step 5.2.3] 📍 Location agent analyzing investigation")
    
    # Get relevant data from state
    snowflake_data = state.get("snowflake_data", {})
    tool_results = state.get("tool_results", {})
    entity_id = state["entity_id"]
    entity_type = state["entity_type"]
    investigation_id = state.get('investigation_id', 'unknown')
    
    # Initialize logging and chain of thought
    DomainAgentBase.log_agent_start("location", entity_type, entity_id, False)
    DomainAgentBase.log_context_analysis(snowflake_data, tool_results, "location")
    
    process_id = DomainAgentBase.start_chain_of_thought(
        investigation_id=investigation_id,
        agent_name="location_agent",
        domain="location",
        entity_type=entity_type,
        entity_id=entity_id,
        task_description="Geographic patterns and location-based fraud indicators are critical for "
                        "comprehensive risk assessment. Will analyze: (1) Impossible travel detection between "
                        "transaction locations, (2) High-risk geographic regions, (3) Location consistency "
                        "patterns, (4) IP geolocation anomalies"
    )
    
    # Initialize location findings
    location_findings = DomainAgentBase.initialize_findings("location")
    
    # Process Snowflake data for location patterns
    results = DomainAgentBase.process_snowflake_results(snowflake_data, "location")
    
    if results:
        # Process MODEL_SCORE
        DomainAgentBase.process_model_scores(results, location_findings, "location")
        
        # Analyze impossible travel patterns
        _analyze_impossible_travel(results, location_findings)
        
        # Analyze high-risk countries
        _analyze_high_risk_countries(results, location_findings)
        
        # Analyze geographic diversity
        _analyze_geographic_diversity(results, location_findings)
    else:
        # Handle case where Snowflake data format is problematic
        if isinstance(snowflake_data, str):
            location_findings["risk_indicators"].append("Snowflake data in non-structured format")
    
    # Analyze geolocation and travel intelligence
    _analyze_geolocation_intelligence(tool_results, location_findings)
    
    # Add evidence summary
    location_findings["evidence_summary"] = {
        "total_evidence_points": len(location_findings["evidence"]),
        "risk_indicators_found": len(location_findings["risk_indicators"]),
        "metrics_collected": len(location_findings["metrics"])
    }
    
    # CRITICAL: Analyze evidence with LLM to generate risk scores
    from .base import analyze_evidence_with_llm
    location_findings = await analyze_evidence_with_llm(
        domain="location",
        findings=location_findings,
        snowflake_data=snowflake_data,
        entity_type=entity_type,
        entity_id=entity_id
    )
    
    # Finalize findings
    analysis_duration = time.time() - start_time
    DomainAgentBase.finalize_findings(
        location_findings, snowflake_data, tool_results, analysis_duration, "location"
    )
    
    # Complete logging
    log_agent_handover_complete("location", location_findings)
    complete_chain_of_thought(process_id, location_findings, "location")
    
    logger.info(f"[Step 5.2.3] ✅ Location analysis complete - Risk: {location_findings['risk_score']:.2f}")
    
    # Update state with findings
    return add_domain_findings(state, "location", location_findings)


def _analyze_impossible_travel(results: list, findings: Dict[str, Any]) -> None:
    """Analyze transaction locations for impossible travel patterns."""
    locations_by_time = []
    
    for r in results:
        if r.get("TX_DATETIME") and r.get("IP_CITY"):
            locations_by_time.append({
                "time": r["TX_DATETIME"],
                "city": r["IP_CITY"],
                "country": r.get("IP_COUNTRY")
            })
    
    if len(locations_by_time) < 2:
        return
    
    # Sort by time and check for impossible travel
    locations_by_time.sort(key=lambda x: x["time"])
    findings["metrics"]["location_changes"] = len(set(loc["city"] for loc in locations_by_time))
    
    for i in range(1, len(locations_by_time)):
        prev_loc = locations_by_time[i-1]
        curr_loc = locations_by_time[i]
        
        # Simple check: different countries within short timeframe
        if prev_loc["country"] != curr_loc["country"]:
            findings["risk_indicators"].append("Possible impossible travel detected")
            findings["risk_score"] = max(findings["risk_score"], 0.4)
            findings["evidence"].append(
                f"SUSPICIOUS: Travel detected from {prev_loc['city']}, {prev_loc['country']} "
                f"to {curr_loc['city']}, {curr_loc['country']}"
            )
            break


def _analyze_high_risk_countries(results: list, findings: Dict[str, Any]) -> None:
    """Analyze activity from high-risk geographic regions."""
    countries = set(r.get("IP_COUNTRY") for r in results if r.get("IP_COUNTRY"))
    
    # Example high-risk country codes (would be configurable in production)
    high_risk_countries = {"XX", "YY", "ZZ"}  # Placeholder country codes
    
    risk_countries_found = countries & high_risk_countries
    if risk_countries_found:
        findings["risk_indicators"].append("Activity from high-risk countries")
        findings["risk_score"] = max(findings["risk_score"], 0.3)
        findings["evidence"].append(f"Activity from high-risk regions: {list(risk_countries_found)}")
    
    findings["metrics"]["high_risk_countries_count"] = len(risk_countries_found)
    findings["analysis"]["high_risk_countries"] = list(risk_countries_found)


def _analyze_geographic_diversity(results: list, findings: Dict[str, Any]) -> None:
    """Analyze geographic diversity patterns."""
    countries = set(r.get("IP_COUNTRY") for r in results if r.get("IP_COUNTRY"))
    cities = set(r.get("IP_CITY") for r in results if r.get("IP_CITY"))
    
    findings["analysis"]["unique_countries"] = len(countries)
    findings["analysis"]["unique_cities"] = len(cities)
    
    findings["metrics"]["unique_countries"] = len(countries)
    findings["metrics"]["unique_cities"] = len(cities)
    
    findings["evidence"].append(f"Geographic spread: {len(cities)} cities across {len(countries)} countries")
    
    if len(countries) > 5:
        findings["risk_indicators"].append(f"High country diversity: {len(countries)} countries")
        findings["evidence"].append(f"SUSPICIOUS: Activity spans {len(countries)} different countries")
        findings["risk_score"] = max(findings["risk_score"], 0.25)
    
    if len(cities) > 10:
        findings["risk_indicators"].append(f"High city diversity: {len(cities)} cities")
        findings["evidence"].append(f"SUSPICIOUS: Activity across {len(cities)} different cities")
        findings["risk_score"] = max(findings["risk_score"], 0.2)


def _analyze_geolocation_intelligence(tool_results: Dict[str, Any], findings: Dict[str, Any]) -> None:
    """Analyze geolocation and travel intelligence from any tool that provides location data."""
    
    logger.debug(f"[Step 5.2.3.2] 🔍 Category-based location analysis: Processing {len(tool_results)} tools")
    
    # Process ALL tool results, not just hardcoded ones
    for tool_name, result in tool_results.items():
        if not isinstance(result, dict):
            logger.debug(f"[Step 5.2.3.2]   ⏭️  Skipping {tool_name}: non-dict result")
            continue
            
        # Look for geolocation intelligence indicators across any tool
        location_signals = _extract_location_signals(tool_name, result)
        
        if location_signals:
            logger.debug(f"[Step 5.2.3.2]   ✅ {tool_name}: Found {len(location_signals)} location signals")
            _process_location_signals(tool_name, location_signals, findings)
        else:
            logger.debug(f"[Step 5.2.3.2]   ➖ {tool_name}: No geolocation intelligence signals detected")


def _extract_location_signals(tool_name: str, result: Dict[str, Any]) -> Dict[str, Any]:
    """Extract geolocation intelligence signals from any tool result."""
    signals = {}
    
    logger.debug(f"[Step 5.2.3.2] 🔍 Extracting location signals from {tool_name} with {len(result)} top-level fields")
    
    # Common geolocation fields (tools may use different names)
    location_indicators = [
        "country", "city", "region", "latitude", "longitude", "timezone",
        "travel_risk", "high_risk_location", "vpn_location", "proxy_location",
        "tor_exit", "anonymous_proxy", "hosting_provider", "datacenter"
    ]
    
    # Risk score fields for locations
    location_risk_indicators = [
        "location_risk", "travel_risk_score", "geographic_risk", "country_risk",
        "region_risk_score", "distance_anomaly", "travel_velocity"
    ]
    
    # Extract location identifiers and risk indicators
    for indicator in location_indicators:
        if indicator in result:
            signals[f"location_{indicator}"] = result[indicator]
            logger.debug(f"[Step 5.2.3.2]     → Found location indicator: {indicator} = {result[indicator]}")
    
    # Extract numeric location risk scores
    for indicator in location_risk_indicators:
        if indicator in result:
            try:
                signals[f"score_{indicator}"] = float(result[indicator])
                logger.debug(f"[Step 5.2.3.2]     → Found location risk score: {indicator} = {result[indicator]}")
            except (ValueError, TypeError):
                logger.debug(f"[Step 5.2.3.2]     → Skipped non-numeric score: {indicator} = {result[indicator]}")
                pass
    
    # Look for nested location data (many tools nest results)
    nested_count = 0
    for key, value in result.items():
        if isinstance(value, dict):
            nested_signals = _extract_location_signals(f"{tool_name}_{key}", value)
            signals.update(nested_signals)
            if nested_signals:
                nested_count += 1
        elif isinstance(value, list):
            # Handle arrays of location data
            for i, item in enumerate(value[:5]):  # Limit to first 5 items
                if isinstance(item, dict):
                    nested_signals = _extract_location_signals(f"{tool_name}_{key}_{i}", item)
                    signals.update(nested_signals)
                    if nested_signals:
                        nested_count += 1
    
    if nested_count > 0:
        logger.debug(f"[Step 5.2.3.2]     → Processed {nested_count} nested structures")
    
    logger.debug(f"[Step 5.2.3.2] ✅ Extracted {len(signals)} location signals from {tool_name}")
    return signals


def _process_location_signals(tool_name: str, signals: Dict[str, Any], findings: Dict[str, Any]) -> None:
    """Process extracted location signals to adjust risk score."""
    
    logger.debug(f"[Step 5.2.3.3] 🔍 Processing {len(signals)} location signals from {tool_name}")
    
    # Calculate location risk assessment from all signals
    location_risk_level = 0.0
    evidence_count = 0
    
    # Process location risk indicators
    for key, value in signals.items():
        if key.startswith("location_") and value:
            # Check for high-risk location indicators
            if str(value).lower() in ["true", "yes", "1", "high", "risky", "anonymous", "tor", "datacenter"]:
                location_risk_level += 0.2
                evidence_count += 1
                findings["evidence"].append(f"{tool_name}: {key} = {value}")
            # Check for specific high-risk countries or regions
            elif isinstance(value, str) and any(risk_term in value.lower() for risk_term in ["tor", "proxy", "vpn", "hosting"]):
                location_risk_level += 0.15
                evidence_count += 1
                findings["evidence"].append(f"{tool_name}: Suspicious location type {key} = {value}")
    
    # Process numeric scores
    for key, value in signals.items():
        if key.startswith("score_") and isinstance(value, (int, float)):
            # Normalize different score scales to 0-1 range
            normalized_score = _normalize_location_score(key, value)
            if normalized_score > 0.6:  # High location risk
                location_risk_level += normalized_score * 0.25
                evidence_count += 1
                findings["evidence"].append(f"{tool_name}: {key} = {value} (normalized: {normalized_score:.2f})")
            elif normalized_score < 0.3:  # Low location risk (safe location)
                location_risk_level -= (0.3 - normalized_score) * 0.15
                findings["evidence"].append(f"{tool_name}: Safe location {key} = {value}")
    
    # Apply risk adjustment based on location assessment
    if location_risk_level > 0.4:
        # High location risk detected - increase risk
        risk_multiplier = 1.0 + min(0.12, location_risk_level * 0.08)
        findings["risk_score"] = min(1.0, findings["risk_score"] * risk_multiplier)
        findings["risk_indicators"].append(f"{tool_name}: High-risk location detected (level: {location_risk_level:.2f})")
    elif location_risk_level < -0.15:
        # Safe location - reduce risk
        risk_multiplier = 1.0 + max(-0.08, location_risk_level * 0.1)  # location_risk_level is negative
        findings["risk_score"] = max(0.1, findings["risk_score"] * risk_multiplier)
        findings["evidence"].append(f"{tool_name}: Location appears safe (level: {location_risk_level:.2f})")
    
    # Store aggregated metrics
    if evidence_count > 0:
        findings["metrics"][f"{tool_name}_location_risk_level"] = location_risk_level
        findings["metrics"][f"{tool_name}_evidence_count"] = evidence_count
        logger.debug(f"[Step 5.2.3.3]   ✅ {tool_name}: Processed {evidence_count} location signals, risk level: {location_risk_level:.2f}")
    else:
        logger.debug(f"[Step 5.2.3.3]   ➖ {tool_name}: No actionable location signals found")


def _normalize_location_score(score_type: str, value: float) -> float:
    """Normalize different location score scales to 0-1 range."""
    
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