"""
Safety Concern Detector for Hybrid Intelligence Graph

This module identifies and tracks active safety concerns based on
investigation state, resource usage, and performance patterns.
"""

from datetime import datetime
from typing import TYPE_CHECKING, List

from app.service.logging import get_bridge_logger

from ...evidence_config import get_evidence_validator
from ...safety_threshold_config import get_safety_threshold_manager
from ...state.enums_and_constants import SafetyConcernType
from ..models import SafetyConcern, SafetyLimits

if TYPE_CHECKING:
    from ...state.base_state_schema import HybridInvestigationState

logger = get_bridge_logger(__name__)


class ConcernDetector:
    """
    Detects and creates safety concerns based on investigation patterns.

    Monitors various risk factors:
    - Resource limit violations and approaching thresholds
    - Performance degradation patterns
    - Confidence drops and instability
    - Evidence quality issues
    - Time budget pressures
    """

    def __init__(self):
        """Initialize concern detector with configurable thresholds"""
        # Loop risk thresholds
        self.loop_warning_threshold = 0.8  # Warn at 80% of limit

        # Resource pressure thresholds
        self.high_pressure_threshold = 0.8  # High pressure warning
        self.critical_pressure_threshold = 0.9  # Critical pressure warning

        # Confidence monitoring
        self.confidence_drop_threshold = 0.3  # Significant drop threshold
        self.min_confidence_history = 2  # Minimum history for trend analysis

        # Evidence quality thresholds (unified)
        self.evidence_validator = get_evidence_validator()
        self.evidence_check_min_loops = 5  # Check after N loops

        # Unified safety threshold configuration
        self.threshold_manager = get_safety_threshold_manager()
        threshold_config = self.threshold_manager.get_threshold_config()

        # Time monitoring thresholds (from unified config)
        self.time_warning_threshold = threshold_config.time_warning_threshold
        self.time_critical_threshold = threshold_config.time_critical_threshold

        # Loop monitoring thresholds (from unified config)
        self.loop_warning_threshold = threshold_config.loop_warning_threshold
        self.loop_critical_threshold = threshold_config.loop_critical_threshold

        # Resource pressure thresholds (from unified config)
        self.critical_pressure_threshold = threshold_config.critical_pressure_threshold

    def identify_safety_concerns(
        self,
        state: "HybridInvestigationState",
        limits: SafetyLimits,
        resource_pressure: float,
    ) -> List[SafetyConcern]:
        """
        Identify active safety concerns based on current state.

        Args:
            state: Current investigation state
            limits: Current safety limits
            resource_pressure: Calculated resource pressure

        Returns:
            List of identified safety concerns
        """
        concerns = []

        # Check each concern category
        concerns.extend(self._check_loop_concerns(state, limits))
        concerns.extend(
            self._check_resource_pressure_concerns(resource_pressure, limits)
        )
        concerns.extend(self._check_confidence_concerns(state))
        concerns.extend(self._check_evidence_concerns(state))
        concerns.extend(self._check_timeout_concerns(state, limits))

        logger.debug(f"   🔍 Identified {len(concerns)} safety concerns")
        for concern in concerns:
            logger.debug(f"      {concern.severity.upper()}: {concern.message}")

        return concerns

    def _check_loop_concerns(
        self, state: "HybridInvestigationState", limits: SafetyLimits
    ) -> List[SafetyConcern]:
        """Check for orchestrator loop-related concerns"""
        concerns = []
        orchestrator_loops = state.get("orchestrator_loops", 0)

        if (
            orchestrator_loops
            >= limits.max_orchestrator_loops * self.loop_warning_threshold
        ):
            severity = self.threshold_manager.get_loop_concern_severity(
                orchestrator_loops, limits.max_orchestrator_loops
            )
            concerns.append(
                SafetyConcern(
                    concern_type=SafetyConcernType.LOOP_RISK,
                    severity=severity,
                    message=f"Orchestrator loop limit approaching: {orchestrator_loops}/{limits.max_orchestrator_loops}",
                    metrics={
                        "current_loops": orchestrator_loops,
                        "limit": limits.max_orchestrator_loops,
                    },
                    recommended_action="Consider forcing progression to summary phase",
                )
            )

        return concerns

    def _check_resource_pressure_concerns(
        self, resource_pressure: float, limits: SafetyLimits
    ) -> List[SafetyConcern]:
        """Check for resource pressure-related concerns"""
        concerns = []

        if resource_pressure >= limits.resource_pressure_threshold:
            severity = self.threshold_manager.get_resource_pressure_severity(
                resource_pressure
            )
            concerns.append(
                SafetyConcern(
                    concern_type=SafetyConcernType.RESOURCE_PRESSURE,
                    severity=severity,
                    message=f"High resource pressure: {resource_pressure:.2f}",
                    metrics={
                        "pressure": resource_pressure,
                        "threshold": limits.resource_pressure_threshold,
                    },
                    recommended_action="Reduce resource consumption or force completion",
                )
            )
        elif resource_pressure >= self.threshold_manager.config.high_pressure_threshold:
            severity = self.threshold_manager.get_resource_pressure_severity(
                resource_pressure
            )
            concerns.append(
                SafetyConcern(
                    concern_type=SafetyConcernType.RESOURCE_PRESSURE,
                    severity=severity,
                    message=f"Elevated resource pressure: {resource_pressure:.2f}",
                    metrics={
                        "pressure": resource_pressure,
                        "threshold": self.threshold_manager.config.high_pressure_threshold,
                    },
                    recommended_action="Monitor resource usage closely",
                )
            )

        return concerns

    def _check_confidence_concerns(
        self, state: "HybridInvestigationState"
    ) -> List[SafetyConcern]:
        """Check for AI confidence-related concerns"""
        concerns = []
        confidence_history = state.get("confidence_evolution", [])

        if len(confidence_history) >= self.min_confidence_history:
            recent_confidence = confidence_history[-1]["confidence"]
            previous_confidence = confidence_history[-2]["confidence"]

            if recent_confidence < previous_confidence - self.confidence_drop_threshold:
                concerns.append(
                    SafetyConcern(
                        concern_type=SafetyConcernType.CONFIDENCE_DROP,
                        severity="medium",
                        message=f"Significant confidence drop: {previous_confidence:.3f} → {recent_confidence:.3f}",
                        metrics={
                            "previous": previous_confidence,
                            "current": recent_confidence,
                        },
                        recommended_action="Consider switching to safety-first mode",
                    )
                )

        return concerns

    def _check_evidence_concerns(
        self, state: "HybridInvestigationState"
    ) -> List[SafetyConcern]:
        """Check for evidence quality concerns"""
        concerns = []
        orchestrator_loops = state.get("orchestrator_loops", 0)

        # Only check evidence after sufficient loops
        if orchestrator_loops <= self.evidence_check_min_loops:
            return concerns

        evidence_quality = 0.0
        if state.get("ai_decisions"):
            evidence_quality = state["ai_decisions"][-1].evidence_quality

        if self.evidence_validator.should_trigger_safety_concerns(
            evidence_quality, orchestrator_loops
        ):
            concerns.append(
                SafetyConcern(
                    concern_type=SafetyConcernType.EVIDENCE_INSUFFICIENT,
                    severity="medium",
                    message=f"Low evidence quality after {orchestrator_loops} loops: {evidence_quality:.3f}",
                    metrics={
                        "evidence_quality": evidence_quality,
                        "loops": orchestrator_loops,
                    },
                    recommended_action="Consider comprehensive sequential analysis",
                )
            )

        return concerns

    def _check_timeout_concerns(
        self, state: "HybridInvestigationState", limits: SafetyLimits
    ) -> List[SafetyConcern]:
        """Check for timeout-related concerns"""
        concerns = []
        start_time = state.get("start_time")

        if not start_time:
            return concerns

        try:
            from dateutil.parser import parse

            start_dt = parse(start_time)
            elapsed_minutes = (datetime.now() - start_dt).total_seconds() / 60.0

            if (
                elapsed_minutes
                >= limits.max_investigation_time_minutes * self.time_warning_threshold
            ):
                severity = (
                    "critical"
                    if elapsed_minutes >= limits.max_investigation_time_minutes
                    else "high"
                )
                concerns.append(
                    SafetyConcern(
                        concern_type=SafetyConcernType.TIMEOUT_RISK,
                        severity=severity,
                        message=f"Investigation time limit approaching: {elapsed_minutes:.1f}/{limits.max_investigation_time_minutes} minutes",
                        metrics={
                            "elapsed_minutes": elapsed_minutes,
                            "limit": limits.max_investigation_time_minutes,
                        },
                        recommended_action="Force completion within time limit",
                    )
                )
        except Exception:
            pass  # Skip time check if parsing fails

        return concerns

    def get_concern_summary(self, concerns: List[SafetyConcern]) -> dict:
        """
        Get a summary of concerns by type and severity.

        Args:
            concerns: List of safety concerns

        Returns:
            Dictionary with concern counts and summaries
        """
        summary = {
            "total_concerns": len(concerns),
            "by_severity": {"low": 0, "medium": 0, "high": 0, "critical": 0},
            "by_type": {},
            "critical_concerns": [],
            "recommendations": set(),
        }

        for concern in concerns:
            # Count by severity
            summary["by_severity"][concern.severity] += 1

            # Count by type
            type_name = concern.concern_type.value
            summary["by_type"][type_name] = summary["by_type"].get(type_name, 0) + 1

            # Track critical concerns
            if concern.is_critical:
                summary["critical_concerns"].append(concern.message)

            # Collect unique recommendations
            summary["recommendations"].add(concern.recommended_action)

        # Convert recommendations set to list
        summary["recommendations"] = list(summary["recommendations"])

        return summary

    def update_thresholds(
        self,
        loop_warning: float = None,
        high_pressure: float = None,
        critical_pressure: float = None,
        confidence_drop: float = None,
        low_evidence: float = None,
        time_warning: float = None,
    ):
        """
        Update concern detection thresholds (useful for tuning).

        Args:
            loop_warning: Loop warning threshold (0.0-1.0)
            high_pressure: High pressure threshold (0.0-1.0)
            critical_pressure: Critical pressure threshold (0.0-1.0)
            confidence_drop: Confidence drop threshold (0.0-1.0)
            low_evidence: Low evidence threshold (0.0-1.0)
            time_warning: Time warning threshold (0.0-1.0)
        """
        if loop_warning is not None and 0.0 <= loop_warning <= 1.0:
            self.loop_warning_threshold = loop_warning
            logger.info(f"Updated loop warning threshold to {loop_warning}")

        if high_pressure is not None and 0.0 <= high_pressure <= 1.0:
            self.high_pressure_threshold = high_pressure
            logger.info(f"Updated high pressure threshold to {high_pressure}")

        if critical_pressure is not None and 0.0 <= critical_pressure <= 1.0:
            self.critical_pressure_threshold = critical_pressure
            logger.info(f"Updated critical pressure threshold to {critical_pressure}")

        if confidence_drop is not None and 0.0 <= confidence_drop <= 1.0:
            self.confidence_drop_threshold = confidence_drop
            logger.info(f"Updated confidence drop threshold to {confidence_drop}")

        if low_evidence is not None and 0.0 <= low_evidence <= 1.0:
            self.low_evidence_threshold = low_evidence
            logger.info(f"Updated low evidence threshold to {low_evidence}")

        if time_warning is not None and 0.0 <= time_warning <= 1.0:
            self.time_warning_threshold = time_warning
            logger.info(f"Updated time warning threshold to {time_warning}")


# Global detector instance
_concern_detector = None


def get_concern_detector() -> ConcernDetector:
    """Get the global concern detector instance"""
    global _concern_detector
    if _concern_detector is None:
        _concern_detector = ConcernDetector()
    return _concern_detector


def reset_concern_detector():
    """Reset the global detector (useful for testing)"""
    global _concern_detector
    _concern_detector = None
