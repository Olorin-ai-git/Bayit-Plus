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
    logger.info("📍 Location agent analyzing investigation")
    
    # Get relevant data from state
    snowflake_data = state.get("snowflake_data", {})
    tool_results = state.get("tool_results", {})
    entity_id = state["entity_id"]
    entity_type = state["entity_type"]
    investigation_id = state.get('investigation_id', 'unknown')
    
    # Initialize logging and chain of thought
    DomainAgentBase.log_agent_start("location", entity_type, entity_id, False)
    DomainAgentBase.log_context_analysis(snowflake_data, tool_results)
    
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
    
    # Add evidence summary
    location_findings["evidence_summary"] = {
        "total_evidence_points": len(location_findings["evidence"]),
        "risk_indicators_found": len(location_findings["risk_indicators"]),
        "metrics_collected": len(location_findings["metrics"])
    }
    
    # Finalize findings
    analysis_duration = time.time() - start_time
    DomainAgentBase.finalize_findings(
        location_findings, snowflake_data, tool_results, analysis_duration, "location"
    )
    
    # Complete logging
    log_agent_handover_complete("location", location_findings)
    complete_chain_of_thought(process_id, location_findings, "location")
    
    logger.info(f"✅ Location analysis complete - Risk: {location_findings['risk_score']:.2f}")
    
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