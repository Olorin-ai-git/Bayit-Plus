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
    logger.info("[Step 5.2.2] 📱 Device agent analyzing investigation")
    
    # Get relevant data from state
    snowflake_data = state.get("snowflake_data", {})
    tool_results = state.get("tool_results", {})
    entity_id = state["entity_id"]
    entity_type = state["entity_type"]
    investigation_id = state.get('investigation_id', 'unknown')
    
    # Initialize logging and chain of thought
    DomainAgentBase.log_agent_start("device", entity_type, entity_id, False)
    DomainAgentBase.log_context_analysis(snowflake_data, tool_results, "device")
    
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
    
    # CRITICAL: Analyze evidence with LLM to generate risk scores
    from .base import analyze_evidence_with_llm
    device_findings = await analyze_evidence_with_llm(
        domain="device",
        findings=device_findings,
        snowflake_data=snowflake_data,
        entity_type=entity_type,
        entity_id=entity_id
    )
    
    # Finalize findings
    analysis_duration = time.time() - start_time
    DomainAgentBase.finalize_findings(
        device_findings, snowflake_data, tool_results, analysis_duration, "device"
    )
    
    # Complete logging
    log_agent_handover_complete("device", device_findings)
    complete_chain_of_thought(process_id, device_findings, "device")
    
    logger.info(f"[Step 5.2.2] ✅ Device analysis complete - Evidence collected: {len(device_findings['evidence'])} points")
    
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
    """Analyze ML anomaly detection and device intelligence from any tool that provides device security data."""
    
    logger.debug(f"[Step 5.2.2.2] 🔍 Category-based device analysis: Processing {len(tool_results)} tools")
    
    # Process ALL tool results, not just hardcoded ones
    for tool_name, result in tool_results.items():
        if not isinstance(result, dict):
            logger.debug(f"[Step 5.2.2.2]   ⏭️  Skipping {tool_name}: non-dict result")
            continue
            
        # Look for device intelligence indicators across any tool
        device_signals = _extract_device_signals(tool_name, result)
        
        if device_signals:
            logger.debug(f"[Step 5.2.2.2]   ✅ {tool_name}: Found {len(device_signals)} device signals")
            _process_device_signals(tool_name, device_signals, findings)
        else:
            logger.debug(f"[Step 5.2.2.2]   ➖ {tool_name}: No device intelligence signals detected")


def _extract_device_signals(tool_name: str, result: Dict[str, Any]) -> Dict[str, Any]:
    """Extract device intelligence signals from any tool result."""
    signals = {}
    
    logger.debug(f"[Step 5.2.2.2] 🔍 Extracting device signals from {tool_name} with {len(result)} top-level fields")
    
    # Common device intelligence fields (tools may use different names)
    device_indicators = [
        "bot", "is_bot", "automated", "automation", "scripted", "headless",
        "virtual", "vm", "emulator", "sandbox", "spoofed", "fingerprint",
        "device_id", "browser_consistency", "user_agent", "screen_resolution"
    ]
    
    # Anomaly score fields
    anomaly_indicators = [
        "anomaly_score", "device_anomaly", "behavior_score", "consistency_score",
        "spoofing_score", "bot_score", "automation_score"
    ]
    
    # Extract boolean device indicators
    for indicator in device_indicators:
        if indicator in result:
            signals[f"device_{indicator}"] = result[indicator]
            logger.debug(f"[Step 5.2.2.2]     → Found device indicator: {indicator} = {result[indicator]}")
    
    # Extract numeric anomaly scores
    for indicator in anomaly_indicators:
        if indicator in result:
            try:
                signals[f"score_{indicator}"] = float(result[indicator])
                logger.debug(f"[Step 5.2.2.2]     → Found anomaly score: {indicator} = {result[indicator]}")
            except (ValueError, TypeError):
                logger.debug(f"[Step 5.2.2.2]     → Skipped non-numeric score: {indicator} = {result[indicator]}")
                pass
    
    # Look for nested device data (many tools nest results)
    nested_count = 0
    for key, value in result.items():
        if isinstance(value, dict):
            nested_signals = _extract_device_signals(f"{tool_name}_{key}", value)
            signals.update(nested_signals)
            if nested_signals:
                nested_count += 1
        elif isinstance(value, list):
            # Handle arrays of device data
            for i, item in enumerate(value[:5]):  # Limit to first 5 items
                if isinstance(item, dict):
                    nested_signals = _extract_device_signals(f"{tool_name}_{key}_{i}", item)
                    signals.update(nested_signals)
                    if nested_signals:
                        nested_count += 1
    
    if nested_count > 0:
        logger.debug(f"[Step 5.2.2.2]     → Processed {nested_count} nested structures")
    
    logger.debug(f"[Step 5.2.2.2] ✅ Extracted {len(signals)} device signals from {tool_name}")
    return signals


def _process_device_signals(tool_name: str, signals: Dict[str, Any], findings: Dict[str, Any]) -> None:
    """Process extracted device signals to adjust risk score."""
    
    logger.debug(f"[Step 5.2.2.3] 🔍 Processing {len(signals)} device signals from {tool_name}")
    
    # Calculate device risk assessment from all signals
    device_risk_level = 0.0
    evidence_count = 0
    
    # Process boolean device indicators
    for key, value in signals.items():
        if key.startswith("device_") and value:
            if value is True or str(value).lower() in ["true", "yes", "1", "bot", "automated", "virtual", "spoofed"]:
                device_risk_level += 0.25
                evidence_count += 1
                findings["evidence"].append(f"{tool_name}: {key} = {value}")
    
    # Process numeric scores
    for key, value in signals.items():
        if key.startswith("score_") and isinstance(value, (int, float)):
            # Normalize different score scales to 0-1 range
            normalized_score = _normalize_device_score(key, value)
            if normalized_score > 0.7:  # High device risk
                device_risk_level += normalized_score * 0.3
                evidence_count += 1
                findings["evidence"].append(f"{tool_name}: {key} = {value} (normalized: {normalized_score:.2f})")
            elif normalized_score < 0.2:  # Low device risk (normal behavior)
                device_risk_level -= (0.2 - normalized_score) * 0.2
                findings["evidence"].append(f"{tool_name}: Normal device behavior {key} = {value}")
    
    # Apply risk adjustment based on device assessment
    if device_risk_level > 0.5:
        # High device risk detected - increase risk
        risk_multiplier = 1.0 + min(0.15, device_risk_level * 0.1)
        findings["risk_score"] = min(1.0, findings["risk_score"] * risk_multiplier)
        findings["risk_indicators"].append(f"{tool_name}: Device anomalies detected (level: {device_risk_level:.2f})")
    elif device_risk_level < -0.2:
        # Normal device behavior - reduce risk
        risk_multiplier = 1.0 + max(-0.1, device_risk_level * 0.15)  # device_risk_level is negative
        findings["risk_score"] = max(0.1, findings["risk_score"] * risk_multiplier)
        findings["evidence"].append(f"{tool_name}: Device behavior appears normal (level: {device_risk_level:.2f})")
    
    # Store aggregated metrics
    if evidence_count > 0:
        findings["metrics"][f"{tool_name}_device_risk_level"] = device_risk_level
        findings["metrics"][f"{tool_name}_evidence_count"] = evidence_count
        logger.debug(f"[Step 5.2.2.3]   ✅ {tool_name}: Processed {evidence_count} device signals, risk level: {device_risk_level:.2f}")
    else:
        logger.debug(f"[Step 5.2.2.3]   ➖ {tool_name}: No actionable device signals found")


def _normalize_device_score(score_type: str, value: float) -> float:
    """Normalize different device score scales to 0-1 range."""
    
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