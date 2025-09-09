"""
Device Domain Analysis Agent

Analyzes device consistency, spoofing indicators, and browser patterns for fraud detection.
"""

import time
from typing import Dict, Any

from app.service.logging import get_bridge_logger
from app.service.agent.orchestration.state_schema import InvestigationState, add_domain_findings
from .base import DomainAgentBase, log_agent_handover_complete, complete_chain_of_thought

logger = get_bridge_logger(__name__)


async def device_agent_node(state: InvestigationState) -> Dict[str, Any]:
    """
    Device fingerprint analysis agent.
    Analyzes device consistency, spoofing indicators, and browser patterns.
    """
    start_time = time.time()
    logger.info("📱 Device agent analyzing investigation")
    
    # Get relevant data from state
    snowflake_data = state.get("snowflake_data", {})
    tool_results = state.get("tool_results", {})
    entity_id = state["entity_id"]
    entity_type = state["entity_type"]
    investigation_id = state.get('investigation_id', 'unknown')
    
    # Initialize logging and chain of thought
    DomainAgentBase.log_agent_start("device", entity_type, entity_id, False)
    DomainAgentBase.log_context_analysis(snowflake_data, tool_results)
    
    process_id = DomainAgentBase.start_chain_of_thought(
        investigation_id=investigation_id,
        agent_name="device_agent",
        domain="device",
        entity_type=entity_type,
        entity_id=entity_id,
        task_description="Device fingerprints are fundamental fraud indicators revealing device consistency "
                        "and spoofing attempts. Will analyze: (1) Device fingerprint consistency across sessions, "
                        "(2) Browser spoofing indicators and inconsistencies, (3) Device change patterns and frequency, "
                        "(4) Virtual machine and automation tool signatures"
    )
    
    # Initialize device findings
    device_findings = DomainAgentBase.initialize_findings("device")
    
    # Process Snowflake data for device patterns
    results = DomainAgentBase.process_snowflake_results(snowflake_data, "device")
    
    if results:
        # Process MODEL_SCORE
        DomainAgentBase.process_model_scores(results, device_findings, "device")
        
        # Analyze device ID patterns
        _analyze_device_id_patterns(results, device_findings)
        
        # Analyze user agent patterns
        _analyze_user_agent_patterns(results, device_findings)
        
        # Analyze browser/OS consistency
        _analyze_browser_os_patterns(results, device_findings)
    else:
        # Handle case where Snowflake data format is problematic
        if isinstance(snowflake_data, str):
            device_findings["risk_indicators"].append("Snowflake data in non-structured format")
    
    # Analyze ML anomaly detection results
    _analyze_ml_anomaly_detection(tool_results, device_findings)
    
    # Add evidence summary
    device_findings["evidence_summary"] = {
        "total_evidence_points": len(device_findings["evidence"]),
        "risk_indicators_found": len(device_findings["risk_indicators"]),
        "metrics_collected": len(device_findings["metrics"])
    }
    
    # Finalize findings
    analysis_duration = time.time() - start_time
    DomainAgentBase.finalize_findings(
        device_findings, snowflake_data, tool_results, analysis_duration, "device"
    )
    
    # Complete logging
    log_agent_handover_complete("device", device_findings)
    complete_chain_of_thought(process_id, device_findings, "device")
    
    logger.info(f"✅ Device analysis complete - Evidence collected: {len(device_findings['evidence'])} points")
    
    # Update state with findings
    return add_domain_findings(state, "device", device_findings)


def _analyze_device_id_patterns(results: list, findings: Dict[str, Any]) -> None:
    """Analyze device ID patterns for spoofing indicators."""
    device_ids = set(r.get("DEVICE_ID") for r in results if r.get("DEVICE_ID"))
    
    findings["metrics"]["unique_device_count"] = len(device_ids)
    findings["metrics"]["total_transactions"] = len(results)
    findings["evidence"].append(f"Unique devices: {len(device_ids)} across {len(results)} transactions")
    
    if len(device_ids) > 5:
        findings["risk_indicators"].append(f"Multiple device IDs detected: {len(device_ids)}")
        findings["evidence"].append(f"SUSPICIOUS: {len(device_ids)} different devices used")
    
    findings["analysis"]["unique_devices"] = len(device_ids)


def _analyze_user_agent_patterns(results: list, findings: Dict[str, Any]) -> None:
    """Analyze user agent patterns for spoofing indicators."""
    user_agents = set(r.get("USER_AGENT") for r in results if r.get("USER_AGENT"))
    
    findings["metrics"]["unique_user_agents"] = len(user_agents)
    findings["evidence"].append(f"User agent variations: {len(user_agents)}")
    
    if len(user_agents) > 10:
        findings["risk_indicators"].append(f"Excessive user agent variations: {len(user_agents)}")
        findings["evidence"].append(f"SUSPICIOUS: {len(user_agents)} different user agents detected")


def _analyze_browser_os_patterns(results: list, findings: Dict[str, Any]) -> None:
    """Analyze browser and OS patterns for consistency."""
    browsers = set(r.get("BROWSER_NAME") for r in results if r.get("BROWSER_NAME"))
    os_names = set(r.get("OS_NAME") for r in results if r.get("OS_NAME"))
    
    findings["analysis"]["unique_browsers"] = len(browsers)
    findings["analysis"]["unique_os"] = len(os_names)
    
    findings["metrics"]["unique_browsers"] = len(browsers)
    findings["metrics"]["unique_os"] = len(os_names)
    findings["evidence"].append(f"Browser diversity: {len(browsers)} browsers, {len(os_names)} operating systems")
    
    if len(browsers) > 3 or len(os_names) > 3:
        findings["risk_indicators"].append("Device fingerprint inconsistencies detected")
        findings["evidence"].append(f"SUSPICIOUS: High variation in browsers ({len(browsers)}) and OS ({len(os_names)})")


def _analyze_ml_anomaly_detection(tool_results: Dict[str, Any], findings: Dict[str, Any]) -> None:
    """Analyze ML anomaly detection results."""
    if "ml_anomaly_detection" in tool_results:
        anomaly_result = tool_results["ml_anomaly_detection"]
        if isinstance(anomaly_result, dict):
            anomaly_score = anomaly_result.get("anomaly_score", 0)
            findings["metrics"]["ml_anomaly_score"] = anomaly_score
            findings["evidence"].append(f"ML anomaly score: {anomaly_score:.2f}")
            
            if anomaly_score > 0.7:
                findings["risk_indicators"].append("ML detected device anomalies")
                findings["evidence"].append(f"HIGH RISK: ML anomaly score {anomaly_score:.2f}")