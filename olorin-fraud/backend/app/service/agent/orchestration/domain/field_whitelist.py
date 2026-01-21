"""
Field Whitelisting for Cross-Domain Pollution Prevention

This module implements hard blocks on cross-domain field leakage using whitelists.
Prevents MODEL_SCORE, IS_FRAUD_TX, and other non-domain signals from polluting domain analysis.
"""

from typing import Any, Dict, List, Set

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

# CRITICAL: Domain-specific field whitelists to prevent cross-domain pollution
LOGS_ALLOWED = {
    "transaction_count",
    "failed_transaction_count",
    "error_count",
    "total_transaction_count",
    "unique_error_codes",
    "transaction_types",
    "error_patterns",
    "timing_patterns",
    "failure_sequences",
    "failure_rate",  # Added to fix logs domain whitelist warning
}

NETWORK_ALLOWED = {
    "unique_ip_count",
    "unique_countries",
    "is_public",
    "asn_reputation",
    "proxy_indicators",
    "vpn_indicators",
    "tor_indicators",
    "geo_velocity",
    "threat_intelligence_hits",
}

DEVICE_ALLOWED = {
    "unique_device_count",
    "device_consistency",
    "fingerprint_anomalies",
    "browser_spoofing",
    "device_velocity",
    "platform_patterns",
}

LOCATION_ALLOWED = {
    "impossible_travel",
    "travel_confidence",
    "location_consistency",
    "high_risk_countries",
    "geo_diversity",
    "velocity_anomalies",
}

AUTHENTICATION_ALLOWED = {
    "failed_attempts",
    "mfa_bypass_attempts",
    "credential_stuffing",
    "session_anomalies",
    "login_patterns",
    "auth_failures",
}

# Fields that should NEVER be used in domain-specific scoring
FORBIDDEN_FIELDS = {
    "MODEL_SCORE",  # Cross-domain pollution source
    "IS_FRAUD_TX",  # Should only be used in final aggregation
    "RISK_SCORE",  # Circular dependency
    "FINAL_RISK",  # Circular dependency
}

DOMAIN_WHITELISTS = {
    "logs": LOGS_ALLOWED,
    "network": NETWORK_ALLOWED,
    "device": DEVICE_ALLOWED,
    "location": LOCATION_ALLOWED,
    "authentication": AUTHENTICATION_ALLOWED,
}


def filter_domain_fields(domain: str, raw_fields: Dict[str, Any]) -> Dict[str, Any]:
    """
    Apply whitelist filtering to prevent cross-domain pollution.

    HARD BLOCK: Only allows domain-specific fields through, blocks MODEL_SCORE etc.

    Args:
        domain: Domain name (logs, network, device, etc.)
        raw_fields: Raw field data from Snowflake/tools

    Returns:
        Filtered fields dictionary with only whitelisted fields
    """
    if domain not in DOMAIN_WHITELISTS:
        logger.warning(f"Unknown domain '{domain}' - no whitelist available")
        return {}

    whitelist = DOMAIN_WHITELISTS[domain]
    filtered_fields = {}
    blocked_fields = []

    for field_name, field_value in raw_fields.items():
        # HARD BLOCK: Forbidden fields are never allowed
        if field_name in FORBIDDEN_FIELDS:
            blocked_fields.append(field_name)
            logger.debug(
                f"🚫 BLOCKED forbidden field '{field_name}' from {domain} domain"
            )
            continue

        # Allow only whitelisted fields for this domain
        if field_name in whitelist:
            filtered_fields[field_name] = field_value
        else:
            # Block non-whitelisted fields
            blocked_fields.append(field_name)

    if blocked_fields:
        logger.info(
            f"🛡️ WHITELIST FILTER ({domain}): Blocked {len(blocked_fields)} non-domain fields: {blocked_fields[:5]}"
        )

    logger.debug(
        f"✅ WHITELIST FILTER ({domain}): Allowed {len(filtered_fields)} domain-specific fields"
    )

    return filtered_fields


def validate_domain_metrics(domain: str, metrics: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate that domain metrics contain only allowed fields.

    CRITICAL: Final validation step to catch any field leakage.

    Args:
        domain: Domain name
        metrics: Metrics dictionary to validate

    Returns:
        Validated metrics with violations removed
    """
    violations = []
    clean_metrics = {}

    whitelist = DOMAIN_WHITELISTS.get(domain, set())

    for metric_name, metric_value in metrics.items():
        if metric_name in FORBIDDEN_FIELDS:
            violations.append(f"FORBIDDEN field '{metric_name}' in {domain} metrics")
            continue

        if metric_name not in whitelist:
            violations.append(
                f"Non-whitelisted field '{metric_name}' in {domain} metrics"
            )
            continue

        clean_metrics[metric_name] = metric_value

    if violations:
        logger.error(f"🚨 FIELD LEAKAGE DETECTED in {domain} domain: {violations}")
        # In production, these would be hard assertion errors

    return clean_metrics


def assert_no_cross_domain_pollution(findings: Dict[str, Any], domain: str) -> None:
    """
    Assert that domain findings contain no cross-domain pollution.

    CRITICAL: Hard assertion to catch regressions in field isolation.

    Args:
        findings: Domain findings to validate
        domain: Domain name

    Raises:
        AssertionError: If cross-domain pollution is detected
    """
    # Check metrics for forbidden fields
    metrics = findings.get("metrics", {})

    for forbidden_field in FORBIDDEN_FIELDS:
        if forbidden_field in metrics:
            raise AssertionError(
                f"CROSS-DOMAIN POLLUTION: {forbidden_field} found in {domain} metrics"
            )

    # Check that all metrics are whitelisted
    whitelist = DOMAIN_WHITELISTS.get(domain, set())

    for metric_name in metrics:
        if metric_name not in whitelist:
            logger.warning(
                f"Non-whitelisted metric '{metric_name}' in {domain} domain "
                f"(allowed: {sorted(list(whitelist))})"
            )

    # Check evidence for MODEL_SCORE mentions (soft check)
    evidence = findings.get("evidence", [])
    model_score_mentions = []

    for item in evidence:
        if isinstance(item, str) and "MODEL_SCORE" in item.upper():
            model_score_mentions.append(item[:50])

    if model_score_mentions:
        logger.warning(
            f"MODEL_SCORE mentioned in {domain} evidence: {model_score_mentions[:2]}"
        )

    logger.debug(f"✅ Cross-domain pollution check passed for {domain}")


def get_domain_whitelist(domain: str) -> Set[str]:
    """Get the whitelist for a specific domain."""
    return DOMAIN_WHITELISTS.get(domain, set())


def is_field_allowed(domain: str, field_name: str) -> bool:
    """Check if a field is allowed for a specific domain."""
    if field_name in FORBIDDEN_FIELDS:
        return False

    whitelist = DOMAIN_WHITELISTS.get(domain, set())
    return field_name in whitelist


def log_domain_field_usage(domain: str, fields_used: List[str]) -> None:
    """Log which fields were used by a domain for audit trail."""
    whitelist = DOMAIN_WHITELISTS.get(domain, set())

    allowed_used = [f for f in fields_used if f in whitelist]
    forbidden_used = [f for f in fields_used if f in FORBIDDEN_FIELDS]
    other_used = [
        f for f in fields_used if f not in whitelist and f not in FORBIDDEN_FIELDS
    ]

    logger.info(f"📊 DOMAIN FIELD USAGE ({domain}):")
    logger.info(f"   ✅ Allowed fields used: {allowed_used}")

    if forbidden_used:
        logger.error(f"   🚫 FORBIDDEN fields used: {forbidden_used}")

    if other_used:
        logger.warning(f"   ⚠️  Non-whitelisted fields used: {other_used}")
