"""
Agent Investigation Enhancer with MCP Integration

This module provides enhanced investigation capabilities that leverage
the MCP infrastructure for superior analysis and threat detection.
"""

import asyncio
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from app.service.logging import get_bridge_logger

from .enhanced_agent_factory import MCPToolWrapper

logger = get_bridge_logger(__name__)


@dataclass
class InvestigationFindings:
    """Enhanced investigation findings with MCP data."""

    domain: str
    key_findings: List[str]
    risk_score: float
    confidence: float
    raw_data: Optional[Dict[str, Any]] = None
    mcp_enhanced: bool = False
    threat_intelligence: Optional[Dict[str, Any]] = None
    ml_predictions: Optional[Dict[str, Any]] = None
    compliance_status: Optional[Dict[str, Any]] = None


async def investigate_with_mcp_enhancement(
    domain: str,
    mcp_tools: MCPToolWrapper,
    context: Any,
    config: Dict[str, Any],
    objectives: Optional[List[str]] = None,
) -> InvestigationFindings:
    """
    Run enhanced investigation using MCP infrastructure.

    This function orchestrates domain-specific investigations with MCP enhancement,
    providing superior analysis through external specialized services.
    """
    logger.info(f"🔍 Starting MCP-enhanced {domain} investigation")

    start_time = time.perf_counter()

    # Initialize findings
    findings = InvestigationFindings(
        domain=domain,
        key_findings=[],
        risk_score=0.0,
        confidence=0.0,
        raw_data={},
        mcp_enhanced=True,
    )

    try:
        # Domain-specific investigation logic
        if domain == "device":
            findings = await _investigate_device_with_mcp(mcp_tools, context, findings)
        elif domain == "network":
            findings = await _investigate_network_with_mcp(mcp_tools, context, findings)
        elif domain == "user_behavior":
            findings = await _investigate_user_behavior_with_mcp(
                mcp_tools, context, findings
            )
        elif domain == "location":
            findings = await _investigate_location_with_mcp(
                mcp_tools, context, findings
            )
        elif domain == "logs":
            findings = await _investigate_logs_with_mcp(mcp_tools, context, findings)
        else:
            findings = await _generic_mcp_investigation(
                mcp_tools, context, findings, domain
            )

        # Calculate final risk score and confidence
        findings.risk_score = _calculate_risk_score(findings)
        findings.confidence = _calculate_confidence(findings)

        duration = time.perf_counter() - start_time
        logger.info(
            f"✅ MCP-enhanced {domain} investigation completed in {duration:.2f}s "
            f"(risk: {findings.risk_score:.1f}, confidence: {findings.confidence:.1f})"
        )

        return findings

    except Exception as e:
        logger.error(f"❌ MCP-enhanced {domain} investigation failed: {e}")

        # Return basic findings on failure
        findings.key_findings.append(f"Investigation failed: {str(e)}")
        findings.confidence = 0.1  # Very low confidence on failure
        return findings


async def _investigate_device_with_mcp(
    mcp_tools: MCPToolWrapper, context: Any, findings: InvestigationFindings
) -> InvestigationFindings:
    """Enhanced device investigation using MCP services."""
    logger.debug("🔧 Running device investigation with MCP enhancement")

    # Get device information from context
    device_info = _extract_device_info(context)

    # Run parallel MCP calls for device analysis
    tasks = []

    # ML-based device fingerprint analysis
    if device_info:
        tasks.append(_analyze_device_with_ml(mcp_tools, device_info))

    # Threat intelligence lookup for device patterns
    tasks.append(_get_device_threat_intel(mcp_tools, device_info))

    # Execute MCP calls in parallel
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Process ML analysis results
    if len(results) > 0 and not isinstance(results[0], Exception):
        ml_result = results[0]
        if ml_result.get("success"):
            findings.ml_predictions = ml_result["data"]
            risk_indicators = ml_result["data"].get("risk_indicators", [])
            findings.key_findings.extend(
                [f"ML Analysis: {indicator}" for indicator in risk_indicators]
            )

    # Process threat intelligence results
    if len(results) > 1 and not isinstance(results[1], Exception):
        intel_result = results[1]
        if intel_result.get("success"):
            findings.threat_intelligence = intel_result["data"]
            threats = intel_result["data"].get("known_threats", [])
            findings.key_findings.extend(
                [f"Threat Intel: {threat}" for threat in threats]
            )

    # Device-specific risk analysis
    device_risk_score = _calculate_device_risk(
        device_info, findings.ml_predictions, findings.threat_intelligence
    )
    findings.raw_data["device_risk_analysis"] = {
        "device_info": device_info,
        "risk_score": device_risk_score,
        "analysis_methods": ["ml_prediction", "threat_intelligence"],
    }

    if device_risk_score > 70:
        findings.key_findings.append(
            f"High-risk device detected (score: {device_risk_score})"
        )

    logger.debug(
        f"Device investigation completed with {len(findings.key_findings)} findings"
    )
    return findings


async def _investigate_network_with_mcp(
    mcp_tools: MCPToolWrapper, context: Any, findings: InvestigationFindings
) -> InvestigationFindings:
    """Enhanced network investigation using MCP services."""
    logger.debug("🌐 Running network investigation with MCP enhancement")

    # Get network information from context
    network_info = _extract_network_info(context)

    # Run parallel MCP analysis
    tasks = []

    # Intelligence gathering for network patterns
    tasks.append(_analyze_network_intelligence(mcp_tools, network_info))

    # Compliance checking for network activity
    tasks.append(_check_network_compliance(mcp_tools, network_info))

    # Execute MCP calls
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Process intelligence results
    if len(results) > 0 and not isinstance(results[0], Exception):
        intel_result = results[0]
        if intel_result.get("success"):
            findings.threat_intelligence = intel_result["data"]
            anomalies = intel_result["data"].get("network_anomalies", [])
            findings.key_findings.extend(
                [f"Network Intel: {anomaly}" for anomaly in anomalies]
            )

    # Process compliance results
    if len(results) > 1 and not isinstance(results[1], Exception):
        compliance_result = results[1]
        if compliance_result.get("success"):
            findings.compliance_status = compliance_result["data"]
            violations = compliance_result["data"].get("violations", [])
            findings.key_findings.extend(
                [f"Compliance: {violation}" for violation in violations]
            )

    # Network-specific analysis
    network_risk_score = _calculate_network_risk(
        network_info, findings.threat_intelligence, findings.compliance_status
    )
    findings.raw_data["network_risk_analysis"] = {
        "network_info": network_info,
        "risk_score": network_risk_score,
        "analysis_methods": ["intelligence_gathering", "compliance_check"],
    }

    if network_risk_score > 60:
        findings.key_findings.append(
            f"Suspicious network activity detected (score: {network_risk_score})"
        )

    logger.debug(
        f"Network investigation completed with {len(findings.key_findings)} findings"
    )
    return findings


async def _investigate_user_behavior_with_mcp(
    mcp_tools: MCPToolWrapper, context: Any, findings: InvestigationFindings
) -> InvestigationFindings:
    """Enhanced user behavior investigation using MCP services."""
    logger.debug("👤 Running user behavior investigation with MCP enhancement")

    # Get user behavior patterns from context
    behavior_info = _extract_user_behavior_info(context)

    # Run parallel MCP analysis
    tasks = []

    # ML-based behavior analysis
    tasks.append(_analyze_behavior_with_ml(mcp_tools, behavior_info))

    # Intelligence gathering for behavior patterns
    tasks.append(_get_behavior_threat_intel(mcp_tools, behavior_info))

    # Execute MCP calls
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Process ML analysis results
    if len(results) > 0 and not isinstance(results[0], Exception):
        ml_result = results[0]
        if ml_result.get("success"):
            findings.ml_predictions = ml_result["data"]
            anomalies = ml_result["data"].get("behavioral_anomalies", [])
            findings.key_findings.extend(
                [f"Behavior ML: {anomaly}" for anomaly in anomalies]
            )

    # Process threat intelligence results
    if len(results) > 1 and not isinstance(results[1], Exception):
        intel_result = results[1]
        if intel_result.get("success"):
            findings.threat_intelligence = intel_result["data"]
            patterns = intel_result["data"].get("suspicious_patterns", [])
            findings.key_findings.extend(
                [f"Behavior Intel: {pattern}" for pattern in patterns]
            )

    # User behavior risk analysis
    behavior_risk_score = _calculate_behavior_risk(
        behavior_info, findings.ml_predictions, findings.threat_intelligence
    )
    findings.raw_data["behavior_risk_analysis"] = {
        "behavior_info": behavior_info,
        "risk_score": behavior_risk_score,
        "analysis_methods": ["ml_prediction", "threat_intelligence"],
    }

    if behavior_risk_score > 75:
        findings.key_findings.append(
            f"Anomalous user behavior detected (score: {behavior_risk_score})"
        )

    logger.debug(
        f"User behavior investigation completed with {len(findings.key_findings)} findings"
    )
    return findings


async def _investigate_location_with_mcp(
    mcp_tools: MCPToolWrapper, context: Any, findings: InvestigationFindings
) -> InvestigationFindings:
    """Enhanced location investigation using MCP services."""
    logger.debug("📍 Running location investigation with MCP enhancement")

    # Get location information from context
    location_info = _extract_location_info(context)

    # Intelligence gathering for location analysis
    intel_result = await _analyze_location_intelligence(mcp_tools, location_info)

    if intel_result.get("success"):
        findings.threat_intelligence = intel_result["data"]
        location_risks = intel_result["data"].get("location_risks", [])
        findings.key_findings.extend(
            [f"Location Intel: {risk}" for risk in location_risks]
        )

    # Location-specific risk analysis
    location_risk_score = _calculate_location_risk(
        location_info, findings.threat_intelligence
    )
    findings.raw_data["location_risk_analysis"] = {
        "location_info": location_info,
        "risk_score": location_risk_score,
        "analysis_methods": ["intelligence_gathering"],
    }

    if location_risk_score > 50:
        findings.key_findings.append(
            f"High-risk location detected (score: {location_risk_score})"
        )

    return findings


async def _investigate_logs_with_mcp(
    mcp_tools: MCPToolWrapper, context: Any, findings: InvestigationFindings
) -> InvestigationFindings:
    """Enhanced logs investigation using MCP services."""
    logger.debug("📋 Running logs investigation with MCP enhancement")

    # Get log information from context
    logs_info = _extract_logs_info(context)

    # Run parallel analysis
    tasks = []

    # ML-based log analysis
    tasks.append(_analyze_logs_with_ml(mcp_tools, logs_info))

    # Compliance checking for logs
    tasks.append(_check_logs_compliance(mcp_tools, logs_info))

    # Execute MCP calls
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Process results
    for i, result in enumerate(results):
        if not isinstance(result, Exception) and result.get("success"):
            if i == 0:  # ML analysis
                findings.ml_predictions = result["data"]
                anomalies = result["data"].get("log_anomalies", [])
                findings.key_findings.extend(
                    [f"Log ML: {anomaly}" for anomaly in anomalies]
                )
            elif i == 1:  # Compliance
                findings.compliance_status = result["data"]
                issues = result["data"].get("compliance_issues", [])
                findings.key_findings.extend(
                    [f"Log Compliance: {issue}" for issue in issues]
                )

    # Logs-specific risk analysis
    logs_risk_score = _calculate_logs_risk(
        logs_info, findings.ml_predictions, findings.compliance_status
    )
    findings.raw_data["logs_risk_analysis"] = {
        "logs_info": logs_info,
        "risk_score": logs_risk_score,
        "analysis_methods": ["ml_analysis", "compliance_check"],
    }

    if logs_risk_score > 65:
        findings.key_findings.append(
            f"Suspicious log patterns detected (score: {logs_risk_score})"
        )

    return findings


async def _generic_mcp_investigation(
    mcp_tools: MCPToolWrapper,
    context: Any,
    findings: InvestigationFindings,
    domain: str,
) -> InvestigationFindings:
    """Generic MCP investigation for unsupported domains."""
    logger.debug(f"🔍 Running generic MCP investigation for {domain}")

    # Try intelligence gathering as a fallback
    try:
        result = await mcp_tools.call_intelligence_gathering(
            {"domain": domain, "context": "generic_investigation"}
        )

        if result.get("success"):
            findings.threat_intelligence = result["data"]
            insights = result["data"].get("insights", [])
            findings.key_findings.extend(
                [f"Generic Intel: {insight}" for insight in insights]
            )

    except Exception as e:
        logger.warning(f"Generic MCP investigation failed for {domain}: {e}")
        findings.key_findings.append(f"Limited analysis available for {domain} domain")

    return findings


# Helper functions for MCP tool calls
async def _analyze_device_with_ml(
    mcp_tools: MCPToolWrapper, device_info: Dict[str, Any]
) -> Dict[str, Any]:
    """Analyze device using ML models."""
    return await mcp_tools.call_ml_models(
        {"analysis_type": "device_fingerprint", "device_data": device_info}
    )


async def _get_device_threat_intel(
    mcp_tools: MCPToolWrapper, device_info: Dict[str, Any]
) -> Dict[str, Any]:
    """Get threat intelligence for device."""
    return await mcp_tools.call_intelligence_gathering(
        {"lookup_type": "device_patterns", "device_data": device_info}
    )


async def _analyze_network_intelligence(
    mcp_tools: MCPToolWrapper, network_info: Dict[str, Any]
) -> Dict[str, Any]:
    """Analyze network using intelligence gathering."""
    return await mcp_tools.call_intelligence_gathering(
        {"analysis_type": "network_patterns", "network_data": network_info}
    )


async def _check_network_compliance(
    mcp_tools: MCPToolWrapper, network_info: Dict[str, Any]
) -> Dict[str, Any]:
    """Check network compliance."""
    return await mcp_tools.call_compliance_check(
        {"check_type": "network_activity", "network_data": network_info}
    )


async def _analyze_behavior_with_ml(
    mcp_tools: MCPToolWrapper, behavior_info: Dict[str, Any]
) -> Dict[str, Any]:
    """Analyze user behavior using ML models."""
    return await mcp_tools.call_ml_models(
        {"analysis_type": "user_behavior", "behavior_data": behavior_info}
    )


async def _get_behavior_threat_intel(
    mcp_tools: MCPToolWrapper, behavior_info: Dict[str, Any]
) -> Dict[str, Any]:
    """Get threat intelligence for user behavior."""
    return await mcp_tools.call_intelligence_gathering(
        {"lookup_type": "behavior_patterns", "behavior_data": behavior_info}
    )


async def _analyze_location_intelligence(
    mcp_tools: MCPToolWrapper, location_info: Dict[str, Any]
) -> Dict[str, Any]:
    """Analyze location using intelligence gathering."""
    return await mcp_tools.call_intelligence_gathering(
        {"analysis_type": "location_risk", "location_data": location_info}
    )


async def _analyze_logs_with_ml(
    mcp_tools: MCPToolWrapper, logs_info: Dict[str, Any]
) -> Dict[str, Any]:
    """Analyze logs using ML models."""
    return await mcp_tools.call_ml_models(
        {"analysis_type": "log_analysis", "log_data": logs_info}
    )


async def _check_logs_compliance(
    mcp_tools: MCPToolWrapper, logs_info: Dict[str, Any]
) -> Dict[str, Any]:
    """Check logs compliance."""
    return await mcp_tools.call_compliance_check(
        {"check_type": "log_compliance", "log_data": logs_info}
    )


# Context extraction functions
def _extract_device_info(context: Any) -> Dict[str, Any]:
    """Extract device information from investigation context."""
    # Mock implementation - replace with actual context extraction
    return {
        "device_id": getattr(context, "device_id", "unknown"),
        "user_agent": getattr(context, "user_agent", "unknown"),
        "ip": getattr(context, "ip", "unknown"),
    }


def _extract_network_info(context: Any) -> Dict[str, Any]:
    """Extract network information from investigation context."""
    return {
        "source_ip": getattr(context, "source_ip", "unknown"),
        "destination_ip": getattr(context, "destination_ip", "unknown"),
        "protocols": getattr(context, "protocols", []),
    }


def _extract_user_behavior_info(context: Any) -> Dict[str, Any]:
    """Extract user behavior information from investigation context."""
    return {
        "user_id": getattr(context, "user_id", "unknown"),
        "activity_patterns": getattr(context, "activity_patterns", []),
        "transaction_history": getattr(context, "transaction_history", []),
    }


def _extract_location_info(context: Any) -> Dict[str, Any]:
    """Extract location information from investigation context."""
    return {
        "latitude": getattr(context, "latitude", None),
        "longitude": getattr(context, "longitude", None),
        "country": getattr(context, "country", "unknown"),
    }


def _extract_logs_info(context: Any) -> Dict[str, Any]:
    """Extract logs information from investigation context."""
    return {
        "log_entries": getattr(context, "log_entries", []),
        "time_range": getattr(context, "time_range", {}),
        "log_sources": getattr(context, "log_sources", []),
    }


# Risk calculation functions
def _calculate_device_risk(
    device_info: Dict[str, Any],
    ml_predictions: Optional[Dict[str, Any]],
    threat_intel: Optional[Dict[str, Any]],
) -> float:
    """Calculate device risk score."""
    base_risk = 20.0

    if ml_predictions:
        ml_risk = ml_predictions.get("risk_score", 0)
        base_risk += ml_risk * 0.6

    if threat_intel:
        intel_risk = len(threat_intel.get("known_threats", []))
        base_risk += intel_risk * 15

    return min(base_risk, 100.0)


def _calculate_network_risk(
    network_info: Dict[str, Any],
    threat_intel: Optional[Dict[str, Any]],
    compliance: Optional[Dict[str, Any]],
) -> float:
    """Calculate network risk score."""
    base_risk = 15.0

    if threat_intel:
        anomaly_count = len(threat_intel.get("network_anomalies", []))
        base_risk += anomaly_count * 12

    if compliance:
        violation_count = len(compliance.get("violations", []))
        base_risk += violation_count * 20

    return min(base_risk, 100.0)


def _calculate_behavior_risk(
    behavior_info: Dict[str, Any],
    ml_predictions: Optional[Dict[str, Any]],
    threat_intel: Optional[Dict[str, Any]],
) -> float:
    """Calculate user behavior risk score."""
    base_risk = 10.0

    if ml_predictions:
        anomaly_count = len(ml_predictions.get("behavioral_anomalies", []))
        base_risk += anomaly_count * 18

    if threat_intel:
        pattern_count = len(threat_intel.get("suspicious_patterns", []))
        base_risk += pattern_count * 15

    return min(base_risk, 100.0)


def _calculate_location_risk(
    location_info: Dict[str, Any], threat_intel: Optional[Dict[str, Any]]
) -> float:
    """Calculate location risk score."""
    base_risk = 5.0

    if threat_intel:
        risk_count = len(threat_intel.get("location_risks", []))
        base_risk += risk_count * 25

    return min(base_risk, 100.0)


def _calculate_logs_risk(
    logs_info: Dict[str, Any],
    ml_predictions: Optional[Dict[str, Any]],
    compliance: Optional[Dict[str, Any]],
) -> float:
    """Calculate logs risk score."""
    base_risk = 8.0

    if ml_predictions:
        anomaly_count = len(ml_predictions.get("log_anomalies", []))
        base_risk += anomaly_count * 10

    if compliance:
        issue_count = len(compliance.get("compliance_issues", []))
        base_risk += issue_count * 12

    return min(base_risk, 100.0)


def _calculate_risk_score(findings: InvestigationFindings) -> float:
    """Calculate overall risk score for findings."""
    # Base risk from individual domain analysis
    domain_risks = []

    for key, value in findings.raw_data.items():
        if key.endswith("_risk_analysis") and isinstance(value, dict):
            domain_risk = value.get("risk_score", 0)
            domain_risks.append(domain_risk)

    if not domain_risks:
        return 0.0

    # Weighted average of domain risks
    base_risk = sum(domain_risks) / len(domain_risks)

    # Adjust based on number of findings
    finding_multiplier = 1 + (len(findings.key_findings) * 0.1)

    # Adjust based on MCP enhancement
    mcp_multiplier = 1.2 if findings.mcp_enhanced else 1.0

    final_risk = base_risk * finding_multiplier * mcp_multiplier
    return min(final_risk, 100.0)


def _calculate_confidence(findings: InvestigationFindings) -> float:
    """Calculate confidence score for findings."""
    base_confidence = 50.0

    # Increase confidence based on data sources
    if findings.ml_predictions:
        base_confidence += 20.0

    if findings.threat_intelligence:
        base_confidence += 15.0

    if findings.compliance_status:
        base_confidence += 10.0

    # Increase confidence based on number of findings
    base_confidence += len(findings.key_findings) * 3

    # MCP enhancement increases confidence
    if findings.mcp_enhanced:
        base_confidence += 10.0

    return min(base_confidence, 100.0)
