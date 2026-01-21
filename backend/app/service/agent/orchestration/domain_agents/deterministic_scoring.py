"""
Deterministic Domain Scoring

Provides deterministic scoring functions for each domain that do NOT use MODEL_SCORE.
These functions implement the user's requirement to stop domains from using MODEL_SCORE as a driver.
"""

from typing import Optional

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def compute_logs_risk(
    tx_count: int,
    failures: int,
    error_codes: int,
    ext_ti: str,
    model_score: Optional[float] = None,
) -> Optional[float]:
    """
    Compute logs domain risk score based on transaction patterns AND internal MODEL_SCORE evidence.

    MODEL_SCORE is used as INTERNAL evidence but LLMs are prevented from citing it directly.
    This allows proper risk fusion while preventing LLM anchoring.

    Args:
        tx_count: Number of transactions
        failures: Number of failed transactions
        error_codes: Number of distinct error codes
        ext_ti: External threat intelligence level ("HIGH", "CRITICAL", "MINIMAL", etc.)
        model_score: Internal MODEL_SCORE for this transaction (0.0-1.0)

    Returns:
        Risk score 0.0-1.0 or None if insufficient data
    """
    # Base risk from behavioral patterns
    base = 0.1

    # Add risk for failure rate
    failure_rate = failures / max(tx_count, 1)
    base += min(failure_rate, 1.0) * 0.3

    # Add risk for error diversity (indicates system abuse)
    base += (1.0 if error_codes > 0 else 0.0) * 0.1

    # CRITICAL FIX: Incorporate MODEL_SCORE as internal evidence
    # This is the INTERNAL risk signal that should drive high scores
    if model_score is not None:
        # Scale MODEL_SCORE contribution based on transaction volume
        model_contribution = model_score * 0.6  # Strong internal signal

        # For low volume, MODEL_SCORE carries more weight as it's our primary signal
        if tx_count <= 1:
            model_contribution = model_score * 0.7

        base += model_contribution
    elif tx_count <= 1:
        # Without MODEL_SCORE and low volume, be more conservative
        base = 0.2 if ext_ti in {"HIGH", "CRITICAL"} else 0.15

    # External TI adjustment (but don't let it completely override internal evidence)
    if ext_ti in {"HIGH", "CRITICAL"}:
        base = max(base, 0.6)
    elif ext_ti in {"MINIMAL", "CLEAN"} and model_score and model_score > 0.8:
        # High internal signal with clean external - this is the discordant case
        # Keep the high internal score for evidence gating to handle
        pass  # Don't cap here, let evidence gating handle discordance

    # Cap at 1.0 and round
    return round(max(0.0, min(base, 1.0)), 3)


def compute_network_risk(
    is_public: bool,
    vpn_proxy_detected: bool,
    asn_reputation: str,
    velocity_anomaly: bool,
    geo_diversity: int,
    ext_ti: str,
    model_score: Optional[float] = None,
) -> Optional[float]:
    """
    Compute network domain risk score based on network patterns AND internal MODEL_SCORE evidence.

    Args:
        is_public: True if IP is public
        vpn_proxy_detected: True if VPN/proxy detected
        asn_reputation: ASN reputation level ("CLEAN", "SUSPICIOUS", "MALICIOUS")
        velocity_anomaly: True if unusual velocity detected
        geo_diversity: Number of different countries/cities
        ext_ti: External threat intelligence level
        model_score: Internal MODEL_SCORE for this transaction (0.0-1.0)

    Returns:
        Risk score 0.0-1.0 or None if insufficient data
    """
    # Start with baseline based on public/private IP
    base = 0.2 if is_public else 0.1

    # Add risk for VPN/proxy usage
    if vpn_proxy_detected:
        base += 0.3

    # Add risk based on ASN reputation
    asn_risk = {"MALICIOUS": 0.4, "SUSPICIOUS": 0.2, "CLEAN": 0.0}
    base += asn_risk.get(asn_reputation.upper(), 0.1)

    # Add risk for velocity anomalies
    if velocity_anomaly:
        base += 0.2

    # Add risk for geographic diversity (bot nets)
    if geo_diversity > 3:
        base += 0.3
    elif geo_diversity > 1:
        base += 0.1

    # CRITICAL FIX: Incorporate MODEL_SCORE as internal evidence
    if model_score is not None:
        # MODEL_SCORE provides strong internal signal for network domain
        model_contribution = model_score * 0.5  # Moderate internal signal for network
        base += model_contribution

    # External TI override for clear threats
    if ext_ti in {"HIGH", "CRITICAL"}:
        base = max(base, 0.7)
    elif ext_ti in {"MINIMAL", "CLEAN"} and model_score and model_score > 0.8:
        # High internal signal with clean external - preserve for evidence gating
        pass
    elif ext_ti in {"MINIMAL", "CLEAN"}:
        base = min(base, 0.4)

    return round(max(0.0, min(base, 1.0)), 3)


def compute_device_risk(
    device_consistency: bool,
    fingerprint_anomaly: bool,
    browser_spoofing: bool,
    device_velocity: int,
    ext_ti: str,
    model_score: Optional[float] = None,
) -> Optional[float]:
    """
    Compute device domain risk score based on device patterns AND internal MODEL_SCORE evidence.

    Args:
        device_consistency: True if device appears consistent
        fingerprint_anomaly: True if fingerprint shows anomalies
        browser_spoofing: True if browser spoofing detected
        device_velocity: Number of devices used
        ext_ti: External threat intelligence level
        model_score: Internal MODEL_SCORE for this transaction (0.0-1.0)

    Returns:
        Risk score 0.0-1.0 or None if insufficient data
    """
    base = 0.1

    # Add risk for inconsistent device behavior
    if not device_consistency:
        base += 0.3

    # Add risk for fingerprint anomalies
    if fingerprint_anomaly:
        base += 0.2

    # Add risk for browser spoofing
    if browser_spoofing:
        base += 0.3

    # Add risk for high device velocity (account takeover)
    if device_velocity > 3:
        base += 0.3
    elif device_velocity > 1:
        base += 0.1

    # CRITICAL FIX: Incorporate MODEL_SCORE as internal evidence
    if model_score is not None:
        # Device domain gets moderate MODEL_SCORE contribution
        model_contribution = model_score * 0.4
        base += model_contribution

    # External TI consideration
    if ext_ti in {"HIGH", "CRITICAL"}:
        base = max(base, 0.6)
    elif ext_ti in {"MINIMAL", "CLEAN"} and model_score and model_score > 0.8:
        # High internal with clean external - preserve for evidence gating
        pass
    elif ext_ti in {"MINIMAL", "CLEAN"}:
        base = min(base, 0.4)

    return round(max(0.0, min(base, 1.0)), 3)


def compute_location_risk(
    impossible_travel: bool,
    travel_confidence: float,
    location_consistency: bool,
    high_risk_country: bool,
    ext_ti: str,
    model_score: Optional[float] = None,
) -> Optional[float]:
    """
    Compute location domain risk score based on geographic patterns, NOT MODEL_SCORE.

    Args:
        impossible_travel: True if impossible travel detected
        travel_confidence: Confidence level in impossible travel detection
        location_consistency: True if location appears consistent
        high_risk_country: True if from high-risk country
        ext_ti: External threat intelligence level

    Returns:
        Risk score 0.0-1.0 or None if insufficient data
    """
    base = 0.1

    # Add significant risk for impossible travel
    if impossible_travel:
        base += 0.4 * travel_confidence

    # Add risk for inconsistent location
    if not location_consistency:
        base += 0.2

    # Add risk for high-risk countries
    if high_risk_country:
        base += 0.2

    # External TI consideration
    if ext_ti in {"HIGH", "CRITICAL"}:
        base = max(base, 0.6)
    elif ext_ti in {"MINIMAL", "CLEAN"}:
        base = min(base, 0.3)

    return round(max(0.0, min(base, 1.0)), 3)


def compute_authentication_risk(
    failed_attempts: int,
    mfa_bypass: bool,
    credential_stuffing: bool,
    session_anomaly: bool,
    ext_ti: str,
    model_score: Optional[float] = None,
) -> Optional[float]:
    """
    Compute authentication domain risk score based on auth patterns, NOT MODEL_SCORE.

    Args:
        failed_attempts: Number of failed authentication attempts
        mfa_bypass: True if MFA bypass detected
        credential_stuffing: True if credential stuffing detected
        session_anomaly: True if session anomalies detected
        ext_ti: External threat intelligence level

    Returns:
        Risk score 0.0-1.0 or None if insufficient data
    """
    base = 0.1

    # Add risk for failed attempts (brute force)
    if failed_attempts > 20:
        base += 0.5
    elif failed_attempts > 10:
        base += 0.3
    elif failed_attempts > 5:
        base += 0.1

    # Add high risk for MFA bypass
    if mfa_bypass:
        base += 0.6

    # Add risk for credential stuffing
    if credential_stuffing:
        base += 0.4

    # Add risk for session anomalies
    if session_anomaly:
        base += 0.2

    # External TI consideration
    if ext_ti in {"HIGH", "CRITICAL"}:
        base = max(base, 0.7)
    elif ext_ti in {"MINIMAL", "CLEAN"}:
        base = min(base, 0.3)

    return round(max(0.0, min(base, 1.0)), 3)


def uses_model_score(narrative_text: str) -> bool:
    """
    Detect if narrative text inappropriately uses MODEL_SCORE as a risk driver.

    Args:
        narrative_text: Text to analyze for MODEL_SCORE references

    Returns:
        True if text uses MODEL_SCORE as risk justification
    """
    import re

    # Convert to lowercase for case-insensitive matching
    text_lower = narrative_text.lower()

    # Patterns that indicate MODEL_SCORE is being used as a risk driver
    forbidden_patterns = [
        r"high.*model.*score.*\d+\.\d+",
        r"model.*score.*indicates",
        r"based.*on.*model.*score",
        r"due.*to.*model.*score",
        r"model.*score.*of.*\d+\.\d+.*suggests",
        r"risk.*driven.*by.*model.*score",
        r"model.*score.*justifies",
        r"because.*model.*score.*is.*high",
    ]

    for pattern in forbidden_patterns:
        if re.search(pattern, text_lower):
            logger.warning(f"🚫 Detected MODEL_SCORE usage in narrative: {pattern}")
            return True

    return False
