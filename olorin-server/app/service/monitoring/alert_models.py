"""
Alert Models and Enumerations.

Data structures for the alerting system.

Week 10 Phase 4 implementation.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional


class AlertSeverity(Enum):
    """Alert severity levels."""

    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class Alert:
    """Represents an alert."""

    def __init__(
        self,
        alert_type: str,
        severity: AlertSeverity,
        message: str,
        metric_name: str,
        metric_value: float,
        threshold: float,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        """Initialize alert."""
        self.alert_type = alert_type
        self.severity = severity
        self.message = message
        self.metric_name = metric_name
        self.metric_value = metric_value
        self.threshold = threshold
        self.metadata = metadata or {}
        self.timestamp = datetime.utcnow()

    def to_dict(self) -> Dict[str, Any]:
        """Convert alert to dictionary."""
        return {
            "alert_type": self.alert_type,
            "severity": self.severity.value,
            "message": self.message,
            "metric_name": self.metric_name,
            "metric_value": self.metric_value,
            "threshold": self.threshold,
            "metadata": self.metadata,
            "timestamp": self.timestamp.isoformat(),
        }
