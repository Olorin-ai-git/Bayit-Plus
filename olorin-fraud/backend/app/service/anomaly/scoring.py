"""
Severity Scoring Logic

This module provides logic for determining anomaly severity levels
based on scores and persistence, using configurable thresholds.
"""

from typing import Any, Dict, Optional

from app.config.anomaly_config import get_anomaly_config
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def determine_severity(
    score: float, persisted_n: int, detector_params: Optional[Dict[str, Any]] = None
) -> Optional[str]:
    """
    Determine anomaly severity based on score and persistence.

    Args:
        score: Anomaly score
        persisted_n: Number of consecutive windows anomaly has persisted
        detector_params: Optional detector-specific severity thresholds

    Returns:
        Severity level: 'info', 'warn', 'critical', or None if below thresholds
    """
    config = get_anomaly_config()

    # Get thresholds from detector params or use global defaults
    if detector_params and "severity_thresholds" in detector_params:
        thresholds = detector_params["severity_thresholds"]
        info_max = thresholds.get("info_max", config.severity_info_max)
        warn_max = thresholds.get("warn_max", config.severity_warn_max)
        critical_min = thresholds.get("critical_min", config.severity_critical_min)
    else:
        info_max = config.severity_info_max
        warn_max = config.severity_warn_max
        critical_min = config.severity_critical_min

    # Validate thresholds
    if not (info_max < warn_max < critical_min):
        logger.warning(
            f"Invalid severity thresholds: info_max={info_max}, "
            f"warn_max={warn_max}, critical_min={critical_min}. "
            "Using global defaults."
        )
        info_max = config.severity_info_max
        warn_max = config.severity_warn_max
        critical_min = config.severity_critical_min

    # Determine severity based on score
    if score >= critical_min:
        return "critical"
    elif score >= warn_max:
        return "warn"
    elif score >= info_max:
        return "info"
    else:
        return None


def normalize_score(raw_score: float, method: str = "standard") -> float:
    """
    Normalize anomaly score to consistent scale.

    Args:
        raw_score: Raw anomaly score from detector
        method: Normalization method ('standard', 'minmax', 'robust')

    Returns:
        Normalized score (typically 0-10+ range)
    """
    # For now, return raw score as-is
    # Detectors should return normalized scores
    # This function can be extended for additional normalization
    return max(0.0, raw_score)
