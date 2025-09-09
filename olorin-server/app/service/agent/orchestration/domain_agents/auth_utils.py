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
    """Analyze authentication threat intelligence from any tool that provides authentication security data."""
    
    logger.debug(f"[Step 5.2.5.2] 🔍 Category-based authentication analysis: Processing {len(tool_results)} tools")
    
    # Process ALL tool results, not just hardcoded ones
    for tool_name, result in tool_results.items():
        if not isinstance(result, dict):
            logger.debug(f"[Step 5.2.5.2]   ⏭️  Skipping {tool_name}: non-dict result")
            continue
            
        # Look for authentication threat intelligence across any tool
        auth_signals = _extract_auth_signals(tool_name, result)
        
        if auth_signals:
            logger.debug(f"[Step 5.2.5.2]   ✅ {tool_name}: Found {len(auth_signals)} authentication signals")
            _process_auth_signals(tool_name, auth_signals, findings)
        else:
            logger.debug(f"[Step 5.2.5.2]   ➖ {tool_name}: No authentication intelligence signals detected")


def _extract_auth_signals(tool_name: str, result: Dict[str, Any]) -> Dict[str, Any]:
    """Extract authentication intelligence signals from any tool result."""
    signals = {}
    
    logger.debug(f"[Step 5.2.5.2] 🔍 Extracting authentication signals from {tool_name} with {len(result)} top-level fields")
    
    # Common authentication threat fields (tools may use different names)
    auth_indicators = [
        "brute_force", "brute_force_activity", "credential_stuffing", "credential_abuse",
        "login_abuse", "account_takeover", "password_spraying", "dictionary_attack",
        "mfa_bypass", "authentication_bypass", "session_hijacking", "token_abuse"
    ]
    
    # Authentication score fields
    auth_score_indicators = [
        "auth_risk_score", "login_risk_score", "brute_force_score", "stuffing_score",
        "account_takeover_score", "authentication_anomaly_score", "session_risk_score"
    ]
    
    # Extract boolean authentication indicators
    for indicator in auth_indicators:
        if indicator in result:
            signals[f"auth_{indicator}"] = result[indicator]
            logger.debug(f"[Step 5.2.5.2]     → Found auth indicator: {indicator} = {result[indicator]}")
    
    # Extract numeric authentication scores
    for indicator in auth_score_indicators:
        if indicator in result:
            try:
                signals[f"score_{indicator}"] = float(result[indicator])
                logger.debug(f"[Step 5.2.5.2]     → Found auth score: {indicator} = {result[indicator]}")
            except (ValueError, TypeError):
                logger.debug(f"[Step 5.2.5.2]     → Skipped non-numeric score: {indicator} = {result[indicator]}")
                pass
    
    # Look for nested authentication data (many tools nest results)
    nested_count = 0
    for key, value in result.items():
        if isinstance(value, dict):
            nested_signals = _extract_auth_signals(f"{tool_name}_{key}", value)
            signals.update(nested_signals)
            if nested_signals:
                nested_count += 1
        elif isinstance(value, list):
            # Handle arrays of authentication data
            for i, item in enumerate(value[:5]):  # Limit to first 5 items
                if isinstance(item, dict):
                    nested_signals = _extract_auth_signals(f"{tool_name}_{key}_{i}", item)
                    signals.update(nested_signals)
                    if nested_signals:
                        nested_count += 1
    
    if nested_count > 0:
        logger.debug(f"[Step 5.2.5.2]     → Processed {nested_count} nested structures")
    
    logger.debug(f"[Step 5.2.5.2] ✅ Extracted {len(signals)} authentication signals from {tool_name}")
    return signals


def _process_auth_signals(tool_name: str, signals: Dict[str, Any], findings: Dict[str, Any]) -> None:
    """Process extracted authentication signals to adjust risk score."""
    
    logger.debug(f"[Step 5.2.5.3] 🔍 Processing {len(signals)} authentication signals from {tool_name}")
    
    # Calculate authentication risk assessment from all signals
    auth_risk_level = 0.0
    evidence_count = 0
    
    # Process boolean authentication indicators
    for key, value in signals.items():
        if key.startswith("auth_") and value:
            if value is True or str(value).lower() in ["true", "yes", "1", "detected", "active", "confirmed"]:
                # Different risk levels based on threat type
                if any(threat in key for threat in ["brute_force", "credential_stuffing", "account_takeover"]):
                    auth_risk_level += 0.4  # High risk threats
                elif any(threat in key for threat in ["mfa_bypass", "session_hijacking", "token_abuse"]):
                    auth_risk_level += 0.5  # Critical risk threats
                else:
                    auth_risk_level += 0.3  # Standard risk threats
                evidence_count += 1
                findings["evidence"].append(f"{tool_name}: {key} = {value}")
    
    # Process numeric scores
    for key, value in signals.items():
        if key.startswith("score_") and isinstance(value, (int, float)):
            # Normalize different score scales to 0-1 range
            normalized_score = _normalize_auth_score(key, value)
            if normalized_score > 0.7:  # High authentication risk
                auth_risk_level += normalized_score * 0.3
                evidence_count += 1
                findings["evidence"].append(f"{tool_name}: {key} = {value} (normalized: {normalized_score:.2f})")
            elif normalized_score < 0.2:  # Low authentication risk (normal behavior)
                auth_risk_level -= (0.2 - normalized_score) * 0.2
                findings["evidence"].append(f"{tool_name}: Normal authentication behavior {key} = {value}")
    
    # Apply risk adjustment based on authentication assessment
    if auth_risk_level > 0.5:
        # High authentication risk detected - increase risk
        risk_multiplier = 1.0 + min(0.2, auth_risk_level * 0.12)
        findings["risk_score"] = min(1.0, findings["risk_score"] * risk_multiplier)
        findings["risk_indicators"].append(f"{tool_name}: Authentication threats detected (level: {auth_risk_level:.2f})")
    elif auth_risk_level < -0.15:
        # Normal authentication behavior - reduce risk
        risk_multiplier = 1.0 + max(-0.1, auth_risk_level * 0.15)  # auth_risk_level is negative
        findings["risk_score"] = max(0.1, findings["risk_score"] * risk_multiplier)
        findings["evidence"].append(f"{tool_name}: Authentication behavior appears normal (level: {auth_risk_level:.2f})")
    
    # Store aggregated metrics
    if evidence_count > 0:
        findings["metrics"][f"{tool_name}_auth_risk_level"] = auth_risk_level
        findings["metrics"][f"{tool_name}_evidence_count"] = evidence_count
        logger.debug(f"[Step 5.2.5.3]   ✅ {tool_name}: Processed {evidence_count} authentication signals, risk level: {auth_risk_level:.2f}")
    else:
        logger.debug(f"[Step 5.2.5.3]   ➖ {tool_name}: No actionable authentication signals found")


def _normalize_auth_score(score_type: str, value: float) -> float:
    """Normalize different authentication score scales to 0-1 range."""
    
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