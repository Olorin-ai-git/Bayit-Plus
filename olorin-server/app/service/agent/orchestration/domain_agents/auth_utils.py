"""
Authentication Analysis Utilities

Helper functions for authentication domain analysis.
"""

from typing import Dict, Any, List

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def analyze_login_attempts(results: list, findings: Dict[str, Any]) -> None:
    """Analyze login attempt patterns for brute force detection."""
    login_attempts = []
    
    for r in results:
        if "LOGIN_ATTEMPTS_COUNT" in r:
            attempts = r.get("LOGIN_ATTEMPTS_COUNT", 0)
            if isinstance(attempts, (int, float)):
                login_attempts.append(attempts)
    
    if login_attempts:
        max_attempts = max(login_attempts)
        avg_attempts = sum(login_attempts) / len(login_attempts)
        
        findings["metrics"]["max_login_attempts"] = max_attempts
        findings["metrics"]["avg_login_attempts"] = avg_attempts
        findings["evidence"].append(f"Login attempts: max={max_attempts}, avg={avg_attempts:.1f}")
        
        if max_attempts > 20:
            findings["risk_indicators"].append(f"Brute force detected: {max_attempts} login attempts")
            findings["risk_score"] += 0.6
            findings["evidence"].append(f"CRITICAL: {max_attempts} login attempts indicates brute force attack")
        elif max_attempts > 10:
            findings["risk_indicators"].append(f"High login attempts: {max_attempts}")
            findings["risk_score"] += 0.3
            findings["evidence"].append(f"SUSPICIOUS: {max_attempts} login attempts may indicate attack")
        
        findings["analysis"]["max_login_attempts"] = max_attempts
        findings["analysis"]["avg_login_attempts"] = avg_attempts


def analyze_failed_login_ratios(results: list, findings: Dict[str, Any]) -> None:
    """Analyze failed login ratios for authentication anomalies."""
    failed_ratios = []
    
    for r in results:
        if "FAILED_LOGIN_RATIO" in r:
            ratio = r.get("FAILED_LOGIN_RATIO", 0.0)
            if isinstance(ratio, (int, float)):
                failed_ratios.append(ratio)
    
    if failed_ratios:
        max_failed_ratio = max(failed_ratios)
        avg_failed_ratio = sum(failed_ratios) / len(failed_ratios)
        
        findings["metrics"]["max_failed_ratio"] = max_failed_ratio
        findings["metrics"]["avg_failed_ratio"] = avg_failed_ratio
        findings["evidence"].append(f"Failed login ratios: max={max_failed_ratio:.1%}, avg={avg_failed_ratio:.1%}")
        
        if max_failed_ratio > 0.8:
            findings["risk_indicators"].append(f"High failure rate: {max_failed_ratio:.1%}")
            findings["risk_score"] += 0.5
            findings["evidence"].append(f"CRITICAL: {max_failed_ratio:.1%} failure rate indicates potential attack")
        elif max_failed_ratio > 0.5:
            findings["risk_indicators"].append(f"Moderate failure rate: {max_failed_ratio:.1%}")
            findings["risk_score"] += 0.2
            findings["evidence"].append(f"SUSPICIOUS: {max_failed_ratio:.1%} failure rate above normal")
        
        findings["analysis"]["max_failed_ratio"] = max_failed_ratio
        findings["analysis"]["avg_failed_ratio"] = avg_failed_ratio


def analyze_security_indicators(results: list, findings: Dict[str, Any]) -> None:
    """Analyze MFA bypass, impossible travel, credential stuffing, and SIM swap indicators."""
    # Check for MFA bypass attempts
    mfa_bypass_attempts = [r for r in results if r.get("MFA_BYPASS_ATTEMPT")]
    if mfa_bypass_attempts:
        findings["risk_indicators"].append(f"MFA bypass attempts detected: {len(mfa_bypass_attempts)}")
        findings["risk_score"] += 0.7
        findings["evidence"].append(f"CRITICAL: {len(mfa_bypass_attempts)} MFA bypass attempts detected")
        findings["metrics"]["mfa_bypass_count"] = len(mfa_bypass_attempts)
        findings["analysis"]["mfa_bypass_attempts"] = len(mfa_bypass_attempts)

    # Check for impossible travel in authentication
    travel_scores = []
    for r in results:
        if "IMPOSSIBLE_TRAVEL_CONFIDENCE" in r:
            confidence = r.get("IMPOSSIBLE_TRAVEL_CONFIDENCE", 0.0)
            if isinstance(confidence, (int, float)) and confidence > 0.8:
                travel_scores.append(confidence)
    
    if travel_scores:
        max_travel_score = max(travel_scores)
        findings["risk_indicators"].append(f"Impossible travel detected (confidence: {max_travel_score:.2f})")
        findings["risk_score"] += 0.6
        findings["evidence"].append(f"CRITICAL: Impossible travel with {max_travel_score:.2f} confidence")
        findings["metrics"]["impossible_travel_confidence"] = max_travel_score
        findings["analysis"]["impossible_travel_scores"] = travel_scores

    # Check for credential stuffing indicators
    stuffing_indicators = [r for r in results if r.get("CREDENTIAL_STUFFING_BATCH_ID")]
    if stuffing_indicators:
        findings["risk_indicators"].append(f"Credential stuffing detected: {len(stuffing_indicators)} batches")
        findings["risk_score"] += 0.5
        findings["evidence"].append(f"SUSPICIOUS: {len(stuffing_indicators)} credential stuffing batches")
        findings["metrics"]["credential_stuffing_batches"] = len(stuffing_indicators)
        findings["analysis"]["credential_stuffing_indicators"] = len(stuffing_indicators)

    # Check for SIM swap indicators
    sim_swap_indicators = [r for r in results if r.get("SIM_SWAP_INDICATOR")]
    if sim_swap_indicators:
        findings["risk_indicators"].append(f"SIM swap indicators: {len(sim_swap_indicators)}")
        findings["risk_score"] += 0.8
        findings["evidence"].append(f"CRITICAL: {len(sim_swap_indicators)} SIM swap indicators detected")
        findings["metrics"]["sim_swap_indicators"] = len(sim_swap_indicators)
        findings["analysis"]["sim_swap_count"] = len(sim_swap_indicators)


def analyze_auth_threat_intelligence(tool_results: Dict[str, Any], findings: Dict[str, Any]) -> None:
    """Analyze threat intelligence for authentication-specific threats."""
    threat_tools = ["abuseipdb_tool", "virustotal_tool"]
    
    for tool_name in threat_tools:
        if tool_name in tool_results:
            result = tool_results[tool_name]
            if isinstance(result, dict):
                brute_force = result.get("brute_force_activity", False)
                credential_stuffing = result.get("credential_stuffing_reports", 0)
                
                if brute_force:
                    findings["risk_indicators"].append(f"{tool_name}: Brute force activity detected")
                    findings["risk_score"] += 0.3
                    findings["evidence"].append(f"Threat intelligence: {tool_name} detected brute force activity")
                
                if credential_stuffing > 0:
                    findings["risk_indicators"].append(f"{tool_name}: Credential stuffing reports")
                    findings["risk_score"] += 0.4
                    findings["evidence"].append(f"Threat intelligence: {tool_name} reports {credential_stuffing} credential stuffing incidents")
                
                # Store metrics
                findings["metrics"][f"{tool_name}_brute_force"] = brute_force
                findings["metrics"][f"{tool_name}_credential_stuffing"] = credential_stuffing