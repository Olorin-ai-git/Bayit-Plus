"""
Drift Monitor
Feature: 026-llm-training-pipeline

Monitors feature drift for training data and triggers alerts.
"""

import os
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.service.logging import get_bridge_logger
from app.service.training.temporal.temporal_models import DriftAlert, TemporalWindow
from app.service.training.training_config_loader import get_training_config

logger = get_bridge_logger(__name__)

MONITORED_FEATURES = [
    "total_transactions",
    "total_gmv",
    "avg_tx_value",
    "std_tx_value",
    "ip_count",
    "device_count",
    "merchant_count",
]


class DriftMonitor:
    """Monitors feature drift and generates alerts."""

    def __init__(self):
        """Initialize drift monitor from config."""
        self._config = get_training_config()
        self._init_from_config()
        self._alerts: List[DriftAlert] = []

    def _init_from_config(self) -> None:
        """Initialize settings from configuration."""
        self._psi_threshold = float(os.getenv("LLM_DRIFT_PSI_THRESHOLD", "0.25"))
        self._check_interval_hours = int(os.getenv("LLM_DRIFT_CHECK_HOURS", "24"))

        temporal_config = getattr(self._config, "temporal", None)
        if temporal_config:
            self._psi_threshold = getattr(
                temporal_config, "drift_psi_threshold", self._psi_threshold
            )
            self._check_interval_hours = getattr(
                temporal_config, "drift_check_interval_hours", self._check_interval_hours
            )

    def check_drift(
        self,
        feature_name: str,
        baseline_values: List[float],
        current_values: List[float],
        baseline_window: Optional[TemporalWindow] = None,
        current_window: Optional[TemporalWindow] = None,
    ) -> Optional[DriftAlert]:
        """
        Check for drift in a feature between two time periods.

        Args:
            feature_name: Name of feature being checked
            baseline_values: Values from baseline period
            current_values: Values from current period
            baseline_window: Optional baseline window metadata
            current_window: Optional current window metadata

        Returns:
            DriftAlert if drift detected, None otherwise
        """
        if not baseline_values or not current_values:
            return None

        psi = self._calculate_psi(baseline_values, current_values)

        if psi > self._psi_threshold:
            severity = self._determine_severity(psi)
            alert = DriftAlert(
                alert_id=str(uuid.uuid4()),
                feature_name=feature_name,
                drift_score=psi,
                threshold=self._psi_threshold,
                detected_at=datetime.utcnow(),
                severity=severity,
                baseline_window=baseline_window,
                current_window=current_window,
                metadata={
                    "baseline_count": len(baseline_values),
                    "current_count": len(current_values),
                },
            )
            self._alerts.append(alert)
            logger.warning(
                f"Drift detected in {feature_name}: PSI={psi:.4f} "
                f"(threshold={self._psi_threshold})"
            )
            return alert

        return None

    def _calculate_psi(
        self,
        baseline: List[float],
        current: List[float],
        buckets: int = 10,
    ) -> float:
        """Calculate Population Stability Index."""
        import numpy as np

        if not baseline or not current:
            return 0.0

        baseline_arr = np.array([x for x in baseline if x is not None])
        current_arr = np.array([x for x in current if x is not None])

        if len(baseline_arr) == 0 or len(current_arr) == 0:
            return 0.0

        _, bin_edges = np.histogram(baseline_arr, bins=buckets)
        baseline_dist = np.histogram(baseline_arr, bins=bin_edges)[0]
        current_dist = np.histogram(current_arr, bins=bin_edges)[0]

        baseline_prop = baseline_dist / len(baseline_arr)
        current_prop = current_dist / len(current_arr)

        baseline_prop = np.where(baseline_prop == 0, 0.0001, baseline_prop)
        current_prop = np.where(current_prop == 0, 0.0001, current_prop)

        psi = np.sum((current_prop - baseline_prop) * np.log(current_prop / baseline_prop))
        return float(psi)

    def _determine_severity(self, psi: float) -> str:
        """Determine alert severity based on PSI value."""
        if psi > self._psi_threshold * 2:
            return "high"
        elif psi > self._psi_threshold * 1.5:
            return "medium"
        return "low"

    def check_all_features(
        self,
        baseline_data: Dict[str, List[float]],
        current_data: Dict[str, List[float]],
    ) -> List[DriftAlert]:
        """
        Check drift for all monitored features.

        Args:
            baseline_data: Feature name -> values mapping for baseline
            current_data: Feature name -> values mapping for current

        Returns:
            List of generated alerts
        """
        alerts = []
        for feature in MONITORED_FEATURES:
            baseline = baseline_data.get(feature, [])
            current = current_data.get(feature, [])
            alert = self.check_drift(feature, baseline, current)
            if alert:
                alerts.append(alert)

        logger.info(f"Drift check complete: {len(alerts)} alerts generated")
        return alerts

    def get_recent_alerts(
        self,
        since: Optional[datetime] = None,
        severity: Optional[str] = None,
    ) -> List[DriftAlert]:
        """Get recent drift alerts."""
        alerts = self._alerts
        if since:
            alerts = [a for a in alerts if a.detected_at >= since]
        if severity:
            alerts = [a for a in alerts if a.severity == severity]
        return alerts

    def has_actionable_alerts(self) -> bool:
        """Check if there are actionable alerts."""
        return any(a.is_actionable() for a in self._alerts)

    def clear_alerts(self) -> None:
        """Clear all stored alerts."""
        self._alerts = []


_drift_monitor: Optional[DriftMonitor] = None


def get_drift_monitor() -> DriftMonitor:
    """Get cached drift monitor instance."""
    global _drift_monitor
    if _drift_monitor is None:
        _drift_monitor = DriftMonitor()
    return _drift_monitor
