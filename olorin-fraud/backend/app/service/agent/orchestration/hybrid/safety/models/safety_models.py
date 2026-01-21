"""
Safety Models for Hybrid Intelligence Graph

This module provides core data structures for safety management,
including safety levels, limits, and status tracking.
"""

from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class SafetyLevel(Enum):
    """Safety enforcement levels with adaptive thresholds"""

    PERMISSIVE = "permissive"  # High confidence - relaxed limits
    STANDARD = "standard"  # Normal operation limits
    STRICT = "strict"  # Low confidence - tight limits
    EMERGENCY = "emergency"  # Critical safety override


@dataclass
class SafetyLimits:
    """
    Dynamic safety limits based on context and confidence.

    These limits are calculated dynamically based on:
    - Investigation mode (test vs live)
    - AI confidence level
    - Investigation strategy
    - Current safety level
    """

    max_orchestrator_loops: int
    max_tool_executions: int
    max_domain_attempts: int
    max_investigation_time_minutes: int
    confidence_threshold_for_override: float
    resource_pressure_threshold: float

    def __post_init__(self):
        """Validate limits are reasonable"""
        if self.max_orchestrator_loops <= 0:
            logger.warning(
                f"Invalid orchestrator loops limit: {self.max_orchestrator_loops}"
            )
        if self.max_tool_executions <= 0:
            logger.warning(f"Invalid tool executions limit: {self.max_tool_executions}")
        if self.max_domain_attempts <= 0:
            logger.warning(f"Invalid domain attempts limit: {self.max_domain_attempts}")
        if not 0.0 <= self.confidence_threshold_for_override <= 1.0:
            logger.warning(
                f"Invalid confidence threshold: {self.confidence_threshold_for_override}"
            )
        if not 0.0 <= self.resource_pressure_threshold <= 1.0:
            logger.warning(
                f"Invalid resource pressure threshold: {self.resource_pressure_threshold}"
            )


@dataclass
class SafetyStatus:
    """
    Complete safety status and recommendations for investigation state.

    This comprehensive status includes all safety assessments,
    resource tracking, and recommendations for safe operation.
    """

    allows_ai_control: bool
    requires_immediate_termination: bool
    safety_level: SafetyLevel
    current_limits: SafetyLimits
    safety_concerns: List[str]
    override_reasoning: List[str]
    resource_pressure: float
    estimated_remaining_resources: Dict[str, int]
    recommended_actions: List[str]

    def __post_init__(self):
        """Validate safety status consistency"""
        # If immediate termination is required, AI control should be denied
        if self.requires_immediate_termination and self.allows_ai_control:
            logger.warning(
                "Inconsistent safety status: termination required but AI control allowed"
            )
            self.allows_ai_control = False

        # Emergency safety level should require immediate termination or deny AI control
        if self.safety_level == SafetyLevel.EMERGENCY:
            if not self.requires_immediate_termination and self.allows_ai_control:
                logger.warning(
                    "Emergency safety level but no termination required and AI control allowed"
                )

        # Resource pressure should be bounded
        if not 0.0 <= self.resource_pressure <= 1.0:
            logger.warning(f"Invalid resource pressure: {self.resource_pressure}")
            self.resource_pressure = max(0.0, min(1.0, self.resource_pressure))

    @property
    def is_safe_to_continue(self) -> bool:
        """Quick check if investigation can safely continue"""
        return (
            not self.requires_immediate_termination
            and self.safety_level != SafetyLevel.EMERGENCY
            and self.resource_pressure < self.current_limits.resource_pressure_threshold
        )

    @property
    def has_critical_concerns(self) -> bool:
        """Check if there are any critical safety concerns"""
        return any("critical" in concern.lower() for concern in self.safety_concerns)

    def get_primary_concern(self) -> str:
        """Get the most important safety concern"""
        if self.requires_immediate_termination:
            return "Immediate termination required"
        if self.has_critical_concerns:
            critical_concerns = [
                c for c in self.safety_concerns if "critical" in c.lower()
            ]
            return (
                critical_concerns[0]
                if critical_concerns
                else "Unknown critical concern"
            )
        if self.safety_concerns:
            return self.safety_concerns[0]
        return "No safety concerns"

    def get_resource_status_summary(self) -> str:
        """Get a human-readable resource status summary"""
        remaining = self.estimated_remaining_resources
        summary_parts = []

        if "orchestrator_loops" in remaining:
            summary_parts.append(f"Loops: {remaining['orchestrator_loops']}")
        if "tool_executions" in remaining:
            summary_parts.append(f"Tools: {remaining['tool_executions']}")
        if "time_minutes" in remaining:
            summary_parts.append(f"Time: {remaining['time_minutes']}min")

        return f"Remaining resources - {', '.join(summary_parts)}"
