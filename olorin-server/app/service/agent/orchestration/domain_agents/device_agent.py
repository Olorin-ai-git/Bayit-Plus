"""
Device Domain Analysis Agent

Analyzes device consistency, spoofing indicators, and browser patterns for fraud detection.
"""

import time
from typing import Dict, Any, Optional

from app.service.logging import get_bridge_logger
from app.service.agent.orchestration.state_schema import InvestigationState, add_domain_findings
from .base import DomainAgentBase, log_agent_handover_complete, complete_chain_of_thought

logger = get_bridge_logger(__name__)


async def device_agent_node(state: InvestigationState, config: Optional[Dict] = None) -> Dict[str, Any]:
    """
    Device fingerprint analysis agent.
    Analyzes device consistency, spoofing indicators, and browser patterns.
    """
    try:
        # Initialize locals at the start to prevent UnboundLocalError
        device_findings = None
        evidence = []
        metrics = {}
        
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
        
        # CRITICAL: Analyze evidence with LLM to generate risk scores (with ALL tool results)
        from .base import analyze_evidence_with_llm
        device_findings = await analyze_evidence_with_llm(
            domain="device",
            findings=device_findings,
            snowflake_data=snowflake_data,
            tool_results=tool_results,
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
        
    except Exception as e:
        logger.error(f"❌ Device agent failed: {str(e)}")
        
        # Record failure with circuit breaker
        from app.service.agent.orchestration.circuit_breaker import record_node_failure
        record_node_failure(state, "device_agent", e)
        
        # Return state as-is to allow investigation to continue
        return state


def _analyze_device_id_patterns(results: list, findings: Dict[str, Any]) -> None:
    """Analyze device ID patterns for spoofing indicators."""
    # Support both uppercase (Snowflake) and lowercase (PostgreSQL) column names
    device_ids = set(r.get("DEVICE_ID") or r.get("device_id") for r in results if r.get("DEVICE_ID") or r.get("device_id"))

    # CRITICAL FIX: Handle NULL device data properly
    if not device_ids and results:
        # All device IDs are NULL - this means "unknown", not "zero"
        findings["metrics"]["unique_device_count"] = None  # Unknown, not zero
        findings["metrics"]["total_transactions"] = len(results)
        findings["evidence"].append(f"Device ID data not available (NULL values) across {len(results)} transactions")
        findings["evidence"].append("LIMITATION: Cannot analyze device patterns without device ID data")
        findings["analysis"]["unique_devices"] = "unknown"  # Unknown, not zero
    elif not results:
        # No results at all
        findings["metrics"]["unique_device_count"] = None
        findings["metrics"]["total_transactions"] = 0
        findings["evidence"].append("No transaction data available for device analysis")
        findings["analysis"]["unique_devices"] = "unknown"
    else:
        # We have actual device data to analyze
        findings["metrics"]["unique_device_count"] = len(device_ids)
        findings["metrics"]["total_transactions"] = len(results)
        findings["evidence"].append(f"Unique devices: {len(device_ids)} across {len(results)} transactions")

        if len(device_ids) > 5:
            findings["risk_indicators"].append(f"Multiple device IDs detected: {len(device_ids)}")
            findings["evidence"].append(f"SUSPICIOUS: {len(device_ids)} different devices used")

        findings["analysis"]["unique_devices"] = len(device_ids)


def _analyze_user_agent_patterns(results: list, findings: Dict[str, Any]) -> None:
    """Analyze user agent patterns for spoofing indicators."""
    # Support both uppercase (Snowflake) and lowercase (PostgreSQL) column names
    user_agents = set(r.get("USER_AGENT") or r.get("user_agent") for r in results if r.get("USER_AGENT") or r.get("user_agent"))
    
    findings["metrics"]["unique_user_agents"] = len(user_agents)
    findings["evidence"].append(f"User agent variations: {len(user_agents)}")
    
    if len(user_agents) > 10:
        findings["risk_indicators"].append(f"Excessive user agent variations: {len(user_agents)}")
        findings["evidence"].append(f"SUSPICIOUS: {len(user_agents)} different user agents detected")


def _analyze_browser_os_patterns(results: list, findings: Dict[str, Any]) -> None:
    """Analyze browser and OS patterns for consistency using available schema fields."""

    # Support both uppercase (Snowflake) and lowercase (PostgreSQL) column names
    device_models = set(r.get("DEVICE_MODEL") or r.get("device_model") for r in results if r.get("DEVICE_MODEL") or r.get("device_model"))
    device_os_versions = set(r.get("DEVICE_OS_VERSION") or r.get("device_os_version") for r in results if r.get("DEVICE_OS_VERSION") or r.get("device_os_version"))

    # Try to extract browser/OS info from PARSED_USER_AGENT if available
    browsers = set()
    os_names = set()

    for r in results:
        # Support both uppercase and lowercase
        parsed_ua = r.get("PARSED_USER_AGENT") or r.get("parsed_user_agent")
        if isinstance(parsed_ua, dict):
            if parsed_ua.get("browser"):
                browsers.add(parsed_ua["browser"])
            if parsed_ua.get("os"):
                os_names.add(parsed_ua["os"])

        # Fallback: Parse USER_AGENT string manually for basic browser detection
        user_agent = r.get("USER_AGENT") or r.get("user_agent") or ""
        if user_agent:
            if "Chrome" in user_agent:
                browsers.add("Chrome")
            elif "Firefox" in user_agent:
                browsers.add("Firefox")
            elif "Safari" in user_agent and "Chrome" not in user_agent:
                browsers.add("Safari")
            elif "Edge" in user_agent:
                browsers.add("Edge")

            if "Windows" in user_agent:
                os_names.add("Windows")
            elif "iPhone" in user_agent or "iPad" in user_agent:
                os_names.add("iOS")
            elif "Android" in user_agent:
                os_names.add("Android")
            elif "Mac OS" in user_agent:
                os_names.add("macOS")

    # Check what data is actually available (both uppercase and lowercase)
    has_parsed_ua = any(r.get("PARSED_USER_AGENT") or r.get("parsed_user_agent") for r in results)
    has_user_agent = any(r.get("USER_AGENT") or r.get("user_agent") for r in results)
    has_device_fields = any(r.get("DEVICE_MODEL") or r.get("device_model") for r in results) or any(r.get("DEVICE_OS_VERSION") or r.get("device_os_version") for r in results)

    # CRITICAL FIX: Handle NULL browser/OS data properly - use "unknown" instead of zero counts
    findings["analysis"]["unique_browsers"] = len(browsers) if browsers else "unknown"
    findings["analysis"]["unique_os"] = len(os_names) if os_names else "unknown"
    findings["analysis"]["unique_device_models"] = len(device_models) if device_models else "unknown"
    findings["analysis"]["unique_os_versions"] = len(device_os_versions) if device_os_versions else "unknown"

    findings["metrics"]["unique_browsers"] = len(browsers) if browsers else None
    findings["metrics"]["unique_os"] = len(os_names) if os_names else None
    findings["metrics"]["unique_device_models"] = len(device_models) if device_models else None
    findings["metrics"]["unique_os_versions"] = len(device_os_versions) if device_os_versions else None

    if not has_user_agent and not has_parsed_ua and not has_device_fields:
        # No device data available at all
        findings["evidence"].append("Device analysis data not available - USER_AGENT, PARSED_USER_AGENT, and device fields not queried")
        findings["evidence"].append("LIMITATION: Cannot analyze device consistency without device data")
    else:
        # Build evidence based on available data
        evidence_parts = []
        if len(browsers) > 0:
            evidence_parts.append(f"{len(browsers)} browsers")
        if len(os_names) > 0:
            evidence_parts.append(f"{len(os_names)} operating systems")
        if len(device_models) > 0:
            evidence_parts.append(f"{len(device_models)} device models")
        if len(device_os_versions) > 0:
            evidence_parts.append(f"{len(device_os_versions)} OS versions")

        if evidence_parts:
            findings["evidence"].append(f"Device diversity: {', '.join(evidence_parts)}")

            # Risk assessment based on diversity
            total_variations = len(browsers) + len(os_names) + len(device_models)
            if total_variations > 5:
                findings["risk_indicators"].append("High device fingerprint diversity detected")
                findings["evidence"].append(f"SUSPICIOUS: High device variation ({total_variations} unique characteristics)")
        else:
            findings["evidence"].append("Device data parsed but no browser/OS patterns identified")

        # Data source transparency
        data_sources = []
        if has_parsed_ua:
            data_sources.append("PARSED_USER_AGENT")
        if has_user_agent:
            data_sources.append("USER_AGENT")
        if has_device_fields:
            data_sources.append("DEVICE_MODEL/OS_VERSION")
        findings["evidence"].append(f"Analysis based on: {', '.join(data_sources)}")


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
    
    # CRITICAL FIX: Do NOT modify LLM risk score after LLM analysis
    # Only apply adjustments BEFORE LLM analysis (during evidence collection)
    if "llm_risk_score" in findings:
        # LLM has already analyzed - do NOT modify its score
        logger.debug(f"[Step 5.2.2.3]   ℹ️ LLM risk score already set ({findings.get('llm_risk_score', 'N/A')}), skipping device risk adjustments")
        # Still add indicators to evidence, but don't modify score
        if device_risk_level > 0.5:
            findings["risk_indicators"].append(f"{tool_name}: Device anomalies detected (level: {device_risk_level:.2f})")
        elif device_risk_level < -0.2:
            findings["evidence"].append(f"{tool_name}: Device behavior appears normal (level: {device_risk_level:.2f})")
    else:
        # Pre-LLM analysis: Apply risk adjustment based on device assessment
        # CRITICAL: Only modify risk_score if it exists (no fallback scores)
        current_score = findings.get("risk_score")
        if current_score is not None:
            if device_risk_level > 0.5:
                # High device risk detected - increase risk
                risk_multiplier = 1.0 + min(0.15, device_risk_level * 0.1)
                findings["risk_score"] = min(1.0, current_score * risk_multiplier)
                findings["risk_indicators"].append(f"{tool_name}: Device anomalies detected (level: {device_risk_level:.2f})")
            elif device_risk_level < -0.2:
                # Normal device behavior - reduce risk
                risk_multiplier = 1.0 + max(-0.1, device_risk_level * 0.15)  # device_risk_level is negative
                findings["risk_score"] = max(0.1, current_score * risk_multiplier)
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