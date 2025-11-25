"""
SLA Tracker for Fraud Detection System.

Monitors Service Level Agreements and tracks compliance.

Week 10 Phase 4 implementation.
"""

import logging
import os
from typing import Dict, Any, List, Optional
from datetime import datetime
from collections import deque

from app.service.monitoring.sla_calculations import (
    calculate_availability,
    calculate_latency_sla,
    calculate_accuracy_sla,
    empty_sla_metric
)

logger = logging.getLogger(__name__)


class SLATracker:
    """
    Tracks SLA metrics and compliance for fraud detection system.

    Monitors availability, response time, and prediction accuracy SLAs.
    """

    def __init__(self):
        """Initialize SLA tracker."""
        availability_target_env = os.getenv("SLA_AVAILABILITY_TARGET")
        if not availability_target_env:
            raise RuntimeError("SLA_AVAILABILITY_TARGET environment variable is required")
        self.availability_target = float(availability_target_env)

        latency_target_env = os.getenv("SLA_LATENCY_P95_TARGET_MS")
        if not latency_target_env:
            raise RuntimeError("SLA_LATENCY_P95_TARGET_MS environment variable is required")
        self.latency_p95_target_ms = float(latency_target_env)

        accuracy_target_env = os.getenv("SLA_ACCURACY_TARGET")
        if not accuracy_target_env:
            raise RuntimeError("SLA_ACCURACY_TARGET environment variable is required")
        self.accuracy_target = float(accuracy_target_env)

        window_size_env = os.getenv("SLA_WINDOW_SIZE")
        if not window_size_env:
            raise RuntimeError("SLA_WINDOW_SIZE environment variable is required")
        self.window_size = int(window_size_env)

        self.request_outcomes: deque = deque(maxlen=self.window_size)
        self.latency_samples: deque = deque(maxlen=self.window_size)
        self.prediction_results: deque = deque(maxlen=self.window_size)
        logger.info(
            f"📈 SLATracker initialized (availability={self.availability_target}, "
            f"latency_p95={self.latency_p95_target_ms}ms, accuracy={self.accuracy_target})"
        )

    def record_request(self, success: bool, latency_ms: float) -> None:
        """Record a request outcome."""
        self.request_outcomes.append({
            "success": success,
            "timestamp": datetime.utcnow()
        })
        if success:
            self.latency_samples.append(latency_ms)

    def record_prediction(self, predicted: bool, actual: Optional[bool] = None) -> None:
        """Record a prediction and actual outcome if known."""
        self.prediction_results.append({
            "predicted": predicted,
            "actual": actual,
            "timestamp": datetime.utcnow()
        })

    def get_availability_sla(self) -> Dict[str, Any]:
        """Calculate availability SLA compliance."""
        if not self.request_outcomes:
            return empty_sla_metric("availability", self.availability_target)

        total = len(self.request_outcomes)
        successful = sum(1 for r in self.request_outcomes if r["success"])
        return calculate_availability(successful, total, self.availability_target)

    def get_latency_sla(self) -> Dict[str, Any]:
        """Calculate latency SLA compliance."""
        if not self.latency_samples:
            return empty_sla_metric("latency_p95", self.latency_p95_target_ms)

        latencies = list(self.latency_samples)
        return calculate_latency_sla(latencies, self.latency_p95_target_ms)

    def get_accuracy_sla(self) -> Dict[str, Any]:
        """Calculate accuracy SLA compliance."""
        labeled_predictions = [
            p for p in self.prediction_results
            if p["actual"] is not None
        ]

        if not labeled_predictions:
            return empty_sla_metric("accuracy", self.accuracy_target)

        correct = sum(1 for p in labeled_predictions if p["predicted"] == p["actual"])
        return calculate_accuracy_sla(correct, len(labeled_predictions), self.accuracy_target)

    def get_all_slas(self) -> Dict[str, Any]:
        """Get all SLA metrics."""
        availability_sla = self.get_availability_sla()
        latency_sla = self.get_latency_sla()
        accuracy_sla = self.get_accuracy_sla()

        all_compliant = (
            availability_sla["compliant"] and
            latency_sla["compliant"] and
            accuracy_sla["compliant"]
        )

        return {
            "overall_compliant": all_compliant,
            "slas": {
                "availability": availability_sla,
                "latency": latency_sla,
                "accuracy": accuracy_sla
            },
            "measured_at": datetime.utcnow().isoformat()
        }

    def get_sla_violations(self) -> List[Dict[str, Any]]:
        """Get list of SLA violations."""
        violations: List[Dict[str, Any]] = []

        availability_sla = self.get_availability_sla()
        if not availability_sla["compliant"]:
            violations.append({
                "sla_type": "availability",
                "target": availability_sla["target"],
                "actual": availability_sla["actual"],
                "severity": "critical" if availability_sla["actual"] < availability_sla["target"] * 0.95 else "high"
            })

        latency_sla = self.get_latency_sla()
        if not latency_sla["compliant"]:
            violations.append({
                "sla_type": "latency_p95",
                "target": latency_sla["target"],
                "actual": latency_sla["actual"],
                "severity": "high" if latency_sla["actual"] > latency_sla["target"] * 1.5 else "medium"
            })

        accuracy_sla = self.get_accuracy_sla()
        if not accuracy_sla["compliant"]:
            violations.append({
                "sla_type": "accuracy",
                "target": accuracy_sla["target"],
                "actual": accuracy_sla["actual"],
                "severity": "high" if accuracy_sla["actual"] < accuracy_sla["target"] * 0.9 else "medium"
            })

        return violations

    def reset(self) -> None:
        """Reset all SLA tracking data."""
        self.request_outcomes.clear()
        self.latency_samples.clear()
        self.prediction_results.clear()
        logger.info("📈 SLATracker reset")
