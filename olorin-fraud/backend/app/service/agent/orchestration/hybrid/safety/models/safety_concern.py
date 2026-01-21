"""
Safety Concern Model for Hybrid Intelligence Graph

This module provides the SafetyConcern class for tracking and managing
specific safety issues during investigation execution.
"""

from datetime import datetime
from typing import Any, Dict

from app.service.logging import get_bridge_logger

from ...state.enums_and_constants import SafetyConcernType

logger = get_bridge_logger(__name__)


class SafetyConcern:
    """
    Represents a specific safety concern with detailed tracking.

    Safety concerns are generated during investigation monitoring
    to track resource usage, performance issues, and safety violations.
    """

    def __init__(
        self,
        concern_type: SafetyConcernType,
        severity: str,  # "low", "medium", "high", "critical"
        message: str,
        metrics: Dict[str, Any],
        recommended_action: str,
    ):
        self.concern_type = concern_type
        self.severity = severity
        self.message = message
        self.metrics = metrics
        self.recommended_action = recommended_action
        self.timestamp = datetime.now().isoformat()

        # Validate inputs
        self._validate_inputs()

    def _validate_inputs(self):
        """Validate concern inputs for consistency"""
        valid_severities = ["low", "medium", "high", "critical"]
        if self.severity not in valid_severities:
            logger.warning(f"Invalid severity level: {self.severity}. Using 'medium'")
            self.severity = "medium"

        if not self.message.strip():
            logger.warning("Empty concern message provided")
            self.message = f"Safety concern: {self.concern_type.value}"

        if not self.recommended_action.strip():
            logger.warning("Empty recommended action provided")
            self.recommended_action = "Monitor situation"

    @property
    def is_critical(self) -> bool:
        """Check if this concern is critical severity"""
        return self.severity == "critical"

    @property
    def is_high_priority(self) -> bool:
        """Check if this concern is high or critical priority"""
        return self.severity in ["high", "critical"]

    @property
    def age_seconds(self) -> float:
        """Get the age of this concern in seconds"""
        try:
            concern_time = datetime.fromisoformat(self.timestamp)
            return (datetime.now() - concern_time).total_seconds()
        except Exception:
            return 0.0

    def to_dict(self) -> Dict[str, Any]:
        """Convert concern to dictionary for serialization"""
        return {
            "concern_type": self.concern_type.value,
            "severity": self.severity,
            "message": self.message,
            "metrics": self.metrics,
            "recommended_action": self.recommended_action,
            "timestamp": self.timestamp,
            "is_critical": self.is_critical,
            "age_seconds": self.age_seconds,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SafetyConcern":
        """Create SafetyConcern from dictionary"""
        try:
            concern_type = SafetyConcernType(data["concern_type"])
            concern = cls(
                concern_type=concern_type,
                severity=data["severity"],
                message=data["message"],
                metrics=data.get("metrics", {}),
                recommended_action=data["recommended_action"],
            )
            # Override timestamp if provided
            if "timestamp" in data:
                concern.timestamp = data["timestamp"]
            return concern
        except Exception as e:
            logger.error(f"Failed to create SafetyConcern from dict: {e}")
            # Return a default concern
            return cls(
                concern_type=SafetyConcernType.UNKNOWN,
                severity="medium",
                message="Unknown safety concern",
                metrics={},
                recommended_action="Monitor situation",
            )

    def update_severity(self, new_severity: str, reason: str = ""):
        """Update concern severity with logging"""
        old_severity = self.severity
        self.severity = new_severity
        self._validate_inputs()  # Re-validate

        logger.info(f"Updated concern severity: {old_severity} → {self.severity}")
        if reason:
            logger.info(f"Reason: {reason}")

    def add_metric(self, key: str, value: Any):
        """Add or update a metric for this concern"""
        old_value = self.metrics.get(key)
        self.metrics[key] = value

        if old_value != value:
            logger.debug(f"Updated concern metric '{key}': {old_value} → {value}")

    def __str__(self) -> str:
        """String representation of the concern"""
        return f"SafetyConcern[{self.severity}]: {self.message}"

    def __repr__(self) -> str:
        """Detailed representation of the concern"""
        return (
            f"SafetyConcern(type={self.concern_type.value}, "
            f"severity={self.severity}, message='{self.message}')"
        )
