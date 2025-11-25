"""
Override Reasoner for Hybrid Intelligence Graph

This module builds human-readable reasoning for safety override decisions,
explaining why AI control was denied or safety measures were triggered.
"""

from typing import TYPE_CHECKING, List

from app.service.logging import get_bridge_logger

from ..models import SafetyConcern, SafetyLevel

if TYPE_CHECKING:
    from ...state.base_state_schema import HybridInvestigationState

logger = get_bridge_logger(__name__)


class OverrideReasoner:
    """
    Builds reasoning for safety override decisions and AI control denials.

    Provides human-readable explanations for:
    - AI control authorization decisions
    - Safety override triggers
    - Resource limit enforcements
    - Investigation termination decisions
    - Safety level escalations
    """

    def __init__(self):
        """Initialize override reasoner"""
        # Reasoning configuration
        self.include_metrics = True
        self.include_thresholds = True
        self.max_reasoning_items = 10

        # Severity-based reasoning priorities
        self.severity_priorities = {"critical": 1, "high": 2, "medium": 3, "low": 4}

        # Standard reasoning templates
        self.reasoning_templates = {
            "ai_control_denied": "AI control denied due to safety concerns",
            "critical_concerns": "Critical safety concerns requiring immediate action",
            "high_resource_pressure": "High resource pressure detected",
            "loop_count_high": "High orchestrator loop count detected",
            "confidence_issues": "AI confidence issues identified",
            "time_pressure": "Investigation time pressure concerns",
        }

    def build_override_reasoning(
        self,
        state: "HybridInvestigationState",
        concerns: List[SafetyConcern],
        allows_ai_control: bool,
        resource_pressure: float = None,
        safety_level: SafetyLevel = None,
    ) -> List[str]:
        """
        Build reasoning for safety override decisions.

        Args:
            state: Current investigation state
            concerns: Active safety concerns
            allows_ai_control: Whether AI control is allowed
            resource_pressure: Current resource pressure (optional)
            safety_level: Current safety level (optional)

        Returns:
            List of reasoning statements explaining safety decisions
        """
        reasoning = []

        # AI control reasoning
        if not allows_ai_control:
            ai_reasoning = self._build_ai_control_reasoning(concerns, resource_pressure)
            reasoning.extend(ai_reasoning)

        # Safety concerns reasoning
        if concerns:
            concern_reasoning = self._build_concern_reasoning(concerns)
            reasoning.extend(concern_reasoning)

        # Resource pressure reasoning
        if resource_pressure is not None:
            pressure_reasoning = self._build_pressure_reasoning(resource_pressure)
            reasoning.extend(pressure_reasoning)

        # Investigation state reasoning
        state_reasoning = self._build_state_reasoning(state)
        reasoning.extend(state_reasoning)

        # Safety level reasoning
        if safety_level is not None:
            level_reasoning = self._build_safety_level_reasoning(safety_level, state)
            reasoning.extend(level_reasoning)

        # Remove duplicates while preserving order
        unique_reasoning = self._remove_duplicate_reasoning(reasoning)

        # Limit reasoning items and prioritize
        prioritized_reasoning = self._prioritize_reasoning(unique_reasoning, concerns)

        logger.debug(f"   📝 Built {len(prioritized_reasoning)} reasoning statements")
        for reason in prioritized_reasoning[:3]:  # Log top 3
            logger.debug(f"      • {reason}")

        return prioritized_reasoning

    def _build_ai_control_reasoning(
        self, concerns: List[SafetyConcern], resource_pressure: float = None
    ) -> List[str]:
        """Build reasoning for AI control decisions"""
        reasoning = []

        # Primary AI control denial reason
        reasoning.append(self.reasoning_templates["ai_control_denied"])

        # Add specific reasons based on concerns
        critical_concerns = [c for c in concerns if c.severity == "critical"]
        high_concerns = [c for c in concerns if c.severity == "high"]

        if critical_concerns:
            reasoning.append(
                f"Critical safety violations detected: {len(critical_concerns)} issues"
            )
        elif high_concerns:
            reasoning.append(
                f"High-priority safety concerns present: {len(high_concerns)} issues"
            )

        # Add resource pressure reasoning if provided
        if resource_pressure is not None and resource_pressure > 0.7:
            if self.include_metrics:
                reasoning.append(
                    f"Excessive resource pressure: {resource_pressure:.2f}"
                )
            else:
                reasoning.append("Excessive resource pressure detected")

        return reasoning

    def _build_concern_reasoning(self, concerns: List[SafetyConcern]) -> List[str]:
        """Build reasoning from safety concerns"""
        reasoning = []

        if not concerns:
            return reasoning

        # Group concerns by severity
        concern_groups = self._group_concerns_by_severity(concerns)

        # Add reasoning for each severity level
        for severity in ["critical", "high", "medium", "low"]:
            if severity in concern_groups:
                severity_concerns = concern_groups[severity]
                reasoning.extend(
                    self._build_severity_reasoning(severity, severity_concerns)
                )

        return reasoning

    def _group_concerns_by_severity(self, concerns: List[SafetyConcern]) -> dict:
        """Group concerns by severity level"""
        groups = {}
        for concern in concerns:
            if concern.severity not in groups:
                groups[concern.severity] = []
            groups[concern.severity].append(concern)
        return groups

    def _build_severity_reasoning(
        self, severity: str, concerns: List[SafetyConcern]
    ) -> List[str]:
        """Build reasoning for concerns of a specific severity"""
        reasoning = []

        if severity == "critical":
            reasoning.append(
                f"Critical concerns requiring immediate action: {len(concerns)}"
            )
        else:
            reasoning.append(
                f"Active safety concerns: {len(concerns)} {severity} priority"
            )

        # Add specific concern messages (limit to avoid overwhelming output)
        max_detail_concerns = 3
        for concern in concerns[:max_detail_concerns]:
            if self.include_metrics and concern.metrics:
                # Try to extract key metrics for context
                key_metric = self._extract_key_metric(concern)
                if key_metric:
                    reasoning.append(
                        f"{severity.capitalize()} concern: {concern.message} ({key_metric})"
                    )
                else:
                    reasoning.append(
                        f"{severity.capitalize()} concern: {concern.message}"
                    )
            else:
                reasoning.append(f"{severity.capitalize()} concern: {concern.message}")

        # Add summary if there are more concerns
        if len(concerns) > max_detail_concerns:
            remaining = len(concerns) - max_detail_concerns
            reasoning.append(f"Plus {remaining} additional {severity} concerns")

        return reasoning

    def _extract_key_metric(self, concern: SafetyConcern) -> str:
        """Extract key metric from concern for context"""
        if not concern.metrics:
            return ""

        # Common metric patterns
        metric_keys = [
            "current_loops",
            "pressure",
            "elapsed_minutes",
            "evidence_quality",
            "current",
            "limit",
        ]

        for key in metric_keys:
            if key in concern.metrics:
                value = concern.metrics[key]
                if isinstance(value, float):
                    return f"{key}={value:.2f}"
                else:
                    return f"{key}={value}"

        # Fallback: return first metric
        if concern.metrics:
            first_key = list(concern.metrics.keys())[0]
            first_value = concern.metrics[first_key]
            if isinstance(first_value, float):
                return f"{first_key}={first_value:.2f}"
            else:
                return f"{first_key}={first_value}"

        return ""

    def _build_pressure_reasoning(self, resource_pressure: float) -> List[str]:
        """Build reasoning for resource pressure"""
        reasoning = []

        if resource_pressure > 0.8:
            if self.include_metrics:
                reasoning.append(f"Critical resource pressure: {resource_pressure:.2f}")
            else:
                reasoning.append("Critical resource pressure detected")
        elif resource_pressure > 0.7:
            if self.include_metrics:
                reasoning.append(f"High resource pressure: {resource_pressure:.2f}")
            else:
                reasoning.append("High resource pressure detected")
        elif resource_pressure > 0.5:
            if self.include_metrics:
                reasoning.append(f"Moderate resource pressure: {resource_pressure:.2f}")
            else:
                reasoning.append("Moderate resource pressure detected")

        return reasoning

    def _build_state_reasoning(self, state: "HybridInvestigationState") -> List[str]:
        """Build reasoning from investigation state"""
        reasoning = []

        orchestrator_loops = state.get("orchestrator_loops", 0)
        safety_overrides = len(state.get("safety_overrides", []))

        # Loop count reasoning
        if orchestrator_loops > 15:
            if self.include_metrics:
                reasoning.append(f"High orchestrator loop count: {orchestrator_loops}")
            else:
                reasoning.append("High orchestrator loop count detected")
        elif orchestrator_loops > 10:
            if self.include_metrics:
                reasoning.append(
                    f"Elevated orchestrator loop count: {orchestrator_loops}"
                )
            else:
                reasoning.append("Elevated orchestrator loop count")

        # Safety override reasoning
        if safety_overrides > 2:
            if self.include_metrics:
                reasoning.append(f"Multiple safety overrides: {safety_overrides}")
            else:
                reasoning.append("Multiple safety overrides detected")
        elif safety_overrides > 0:
            if self.include_metrics:
                reasoning.append(f"Safety overrides present: {safety_overrides}")
            else:
                reasoning.append("Safety overrides detected")

        return reasoning

    def _build_safety_level_reasoning(
        self, safety_level: SafetyLevel, state: "HybridInvestigationState"
    ) -> List[str]:
        """Build reasoning for safety level decisions"""
        reasoning = []

        if safety_level == SafetyLevel.EMERGENCY:
            reasoning.append("Emergency safety level activated")
        elif safety_level == SafetyLevel.STRICT:
            reasoning.append("Strict safety enforcement enabled")
        elif safety_level == SafetyLevel.PERMISSIVE:
            reasoning.append("Permissive safety level - high confidence operation")

        return reasoning

    def _remove_duplicate_reasoning(self, reasoning: List[str]) -> List[str]:
        """Remove duplicate reasoning while preserving order"""
        seen = set()
        unique_reasoning = []

        for reason in reasoning:
            if reason not in seen:
                seen.add(reason)
                unique_reasoning.append(reason)

        return unique_reasoning

    def _prioritize_reasoning(
        self, reasoning: List[str], concerns: List[SafetyConcern]
    ) -> List[str]:
        """Prioritize reasoning statements by importance"""
        # Create priority scores for reasoning
        priority_scores = {}

        for reason in reasoning:
            score = self._calculate_reasoning_priority(reason, concerns)
            priority_scores[reason] = score

        # Sort by priority (lower score = higher priority)
        prioritized = sorted(reasoning, key=lambda r: priority_scores[r])

        # Limit to max items
        return prioritized[: self.max_reasoning_items]

    def _calculate_reasoning_priority(
        self, reason: str, concerns: List[SafetyConcern]
    ) -> int:
        """Calculate priority score for reasoning statement"""
        base_score = 50
        reason_lower = reason.lower()

        # High priority keywords
        if any(word in reason_lower for word in ["critical", "emergency", "immediate"]):
            base_score = 10
        elif any(word in reason_lower for word in ["high", "elevated", "excessive"]):
            base_score = 20
        elif any(
            word in reason_lower for word in ["ai control denied", "safety violations"]
        ):
            base_score = 15

        # Adjust based on concern severity
        critical_concerns = [c for c in concerns if c.severity == "critical"]
        if critical_concerns and "critical" in reason_lower:
            base_score -= 5  # Higher priority for critical concern reasoning

        return base_score

    def get_reasoning_summary(self, reasoning: List[str]) -> str:
        """
        Get a concise summary of the reasoning.

        Args:
            reasoning: List of reasoning statements

        Returns:
            Concise summary of main reasoning points
        """
        if not reasoning:
            return "No safety concerns identified"

        # Extract key themes
        themes = {
            "critical": 0,
            "resource": 0,
            "ai_control": 0,
            "concerns": 0,
            "loops": 0,
        }

        for reason in reasoning:
            reason_lower = reason.lower()
            if "critical" in reason_lower:
                themes["critical"] += 1
            if "resource" in reason_lower or "pressure" in reason_lower:
                themes["resource"] += 1
            if "ai control" in reason_lower:
                themes["ai_control"] += 1
            if "concern" in reason_lower:
                themes["concerns"] += 1
            if "loop" in reason_lower:
                themes["loops"] += 1

        # Build summary based on dominant themes
        summary_parts = []
        if themes["critical"] > 0:
            summary_parts.append("critical safety issues")
        if themes["ai_control"] > 0:
            summary_parts.append("AI control restrictions")
        if themes["resource"] > 0:
            summary_parts.append("resource pressure")
        if themes["loops"] > 0:
            summary_parts.append("loop count concerns")

        if summary_parts:
            return f"Safety overrides due to: {', '.join(summary_parts)}"
        else:
            return f"{len(reasoning)} safety considerations identified"

    def configure_reasoning(
        self,
        include_metrics: bool = None,
        include_thresholds: bool = None,
        max_items: int = None,
    ):
        """
        Configure reasoning output settings.

        Args:
            include_metrics: Include specific metric values in reasoning
            include_thresholds: Include threshold information
            max_items: Maximum number of reasoning items to return
        """
        if include_metrics is not None:
            self.include_metrics = include_metrics
            logger.info(
                f"Include metrics in reasoning: {'enabled' if include_metrics else 'disabled'}"
            )

        if include_thresholds is not None:
            self.include_thresholds = include_thresholds
            logger.info(
                f"Include thresholds in reasoning: {'enabled' if include_thresholds else 'disabled'}"
            )

        if max_items is not None and max_items > 0:
            self.max_reasoning_items = max_items
            logger.info(f"Maximum reasoning items set to {max_items}")


# Global reasoner instance
_override_reasoner = None


def get_override_reasoner() -> OverrideReasoner:
    """Get the global override reasoner instance"""
    global _override_reasoner
    if _override_reasoner is None:
        _override_reasoner = OverrideReasoner()
    return _override_reasoner


def reset_override_reasoner():
    """Reset the global reasoner (useful for testing)"""
    global _override_reasoner
    _override_reasoner = None
