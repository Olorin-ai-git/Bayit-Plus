"""
Action Recommender for Hybrid Intelligence Graph

This module generates recommended actions based on safety analysis,
concerns, and resource pressure to guide investigation behavior.
"""

from typing import TYPE_CHECKING, List, Set

from app.service.logging import get_bridge_logger

from ...state.enums_and_constants import SafetyConcernType
from ..models import SafetyConcern

if TYPE_CHECKING:
    from ...state.base_state_schema import HybridInvestigationState

logger = get_bridge_logger(__name__)


class ActionRecommender:
    """
    Generates recommended actions based on safety analysis and concerns.

    Provides context-aware recommendations for:
    - Critical safety situations
    - High resource pressure scenarios
    - Specific concern types (loops, confidence, evidence, timeout)
    - Performance optimization opportunities
    - Investigation strategy adjustments
    """

    def __init__(self):
        """Initialize action recommender"""
        # Critical action thresholds
        self.critical_pressure_threshold = 0.8
        self.high_pressure_threshold = 0.7

        # Action priority levels
        self.action_priorities = {
            "emergency": 1,
            "critical": 2,
            "high": 3,
            "medium": 4,
            "low": 5,
        }

        # Concern-specific action templates
        self.concern_actions = {
            SafetyConcernType.LOOP_RISK: [
                "Force progression to next investigation phase",
                "Implement aggressive loop prevention",
                "Switch to sequential execution mode",
            ],
            SafetyConcernType.RESOURCE_PRESSURE: [
                "Reduce resource consumption",
                "Skip non-essential analysis steps",
                "Consider switching to minimal investigation strategy",
            ],
            SafetyConcernType.CONFIDENCE_DROP: [
                "Switch to safety-first sequential execution",
                "Validate AI decisions with additional safety checks",
                "Implement conservative routing strategy",
            ],
            SafetyConcernType.EVIDENCE_INSUFFICIENT: [
                "Switch to comprehensive analysis mode",
                "Collect additional evidence before proceeding",
                "Increase evidence validation thresholds",
            ],
            SafetyConcernType.TIMEOUT_RISK: [
                "Force completion within time limit",
                "Prioritize essential analysis only",
                "Switch to rapid completion mode",
            ],
        }

    def generate_recommended_actions(
        self,
        state: "HybridInvestigationState",
        concerns: List[SafetyConcern],
        resource_pressure: float,
    ) -> List[str]:
        """
        Generate recommended actions based on safety analysis.

        Args:
            state: Current investigation state
            concerns: Active safety concerns
            resource_pressure: Current resource pressure

        Returns:
            List of recommended actions, ordered by priority
        """
        actions = set()  # Use set to avoid duplicates

        # Add actions for critical concerns (highest priority)
        critical_actions = self._get_critical_concern_actions(concerns)
        actions.update(critical_actions)

        # Add actions for high resource pressure
        pressure_actions = self._get_resource_pressure_actions(resource_pressure)
        actions.update(pressure_actions)

        # Add concern-specific actions
        concern_actions = self._get_concern_specific_actions(concerns)
        actions.update(concern_actions)

        # Add performance optimization actions
        optimization_actions = self._get_optimization_actions(state, resource_pressure)
        actions.update(optimization_actions)

        # Add default actions if no specific recommendations
        if not actions:
            actions.update(self._get_default_actions())

        # Convert to sorted list by priority
        action_list = list(actions)
        prioritized_actions = self._prioritize_actions(
            action_list, concerns, resource_pressure
        )

        logger.debug(f"   💡 Generated {len(prioritized_actions)} recommended actions")
        for i, action in enumerate(prioritized_actions[:3]):  # Log top 3 actions
            logger.debug(f"      {i+1}. {action}")

        return prioritized_actions

    def _get_critical_concern_actions(self, concerns: List[SafetyConcern]) -> Set[str]:
        """Get actions for critical safety concerns"""
        actions = set()
        critical_concerns = [c for c in concerns if c.severity == "critical"]

        if critical_concerns:
            actions.add("Force immediate investigation completion")
            actions.add("Switch to emergency safety mode")

            # Add specific actions from critical concerns
            for concern in critical_concerns:
                actions.add(concern.recommended_action)

        return actions

    def _get_resource_pressure_actions(self, resource_pressure: float) -> Set[str]:
        """Get actions for resource pressure management"""
        actions = set()

        if resource_pressure > self.critical_pressure_threshold:
            actions.add("Reduce resource consumption immediately")
            actions.add("Skip non-essential analysis steps")
            actions.add("Consider switching to minimal investigation strategy")
            actions.add("Implement aggressive resource conservation")
        elif resource_pressure > self.high_pressure_threshold:
            actions.add("Monitor resource usage closely")
            actions.add("Consider optimizing tool usage")
            actions.add("Prepare for resource conservation mode")

        return actions

    def _get_concern_specific_actions(self, concerns: List[SafetyConcern]) -> Set[str]:
        """Get actions specific to identified concern types"""
        actions = set()

        for concern in concerns:
            # Add the specific recommended action from the concern
            actions.add(concern.recommended_action)

            # Add template actions for concern type
            template_actions = self.concern_actions.get(concern.concern_type, [])
            actions.update(template_actions)

        return actions

    def _get_optimization_actions(
        self, state: "HybridInvestigationState", resource_pressure: float
    ) -> Set[str]:
        """Get performance optimization actions"""
        actions = set()

        orchestrator_loops = state.get("orchestrator_loops", 0)
        domains_completed = len(state.get("domains_completed", []))

        # Check for slow progress
        if orchestrator_loops > 5 and domains_completed < 2:
            actions.add("Analyze domain completion bottlenecks")
            actions.add("Consider switching investigation strategy")
            actions.add("Review tool selection efficiency")

        # Check for good progress with low pressure
        if resource_pressure < 0.3 and domains_completed > orchestrator_loops * 0.5:
            actions.add("Continue current investigation approach")
            actions.add("Consider expanding analysis scope")

        # Check for confidence optimization opportunities
        confidence_history = state.get("confidence_evolution", [])
        if len(confidence_history) > 3:
            recent_trend = self._calculate_confidence_trend(confidence_history[-3:])
            if recent_trend > 0.1:  # Positive trend
                actions.add("Leverage improving confidence for expanded analysis")
            elif recent_trend < -0.1:  # Negative trend
                actions.add("Investigate confidence degradation causes")

        return actions

    def _get_default_actions(self) -> Set[str]:
        """Get default actions when no specific recommendations are needed"""
        return {
            "Continue with current investigation approach",
            "Monitor safety metrics continuously",
            "Maintain current resource allocation",
        }

    def _calculate_confidence_trend(self, confidence_entries: List[dict]) -> float:
        """Calculate confidence trend from recent history"""
        if len(confidence_entries) < 2:
            return 0.0

        first_confidence = confidence_entries[0]["confidence"]
        last_confidence = confidence_entries[-1]["confidence"]
        return last_confidence - first_confidence

    def _prioritize_actions(
        self,
        actions: List[str],
        concerns: List[SafetyConcern],
        resource_pressure: float,
    ) -> List[str]:
        """Prioritize actions based on urgency and importance"""
        action_scores = {}

        for action in actions:
            score = self._calculate_action_score(action, concerns, resource_pressure)
            action_scores[action] = score

        # Sort by score (lower score = higher priority)
        prioritized = sorted(actions, key=lambda a: action_scores[a])
        return prioritized

    def _calculate_action_score(
        self, action: str, concerns: List[SafetyConcern], resource_pressure: float
    ) -> int:
        """Calculate priority score for an action (lower = higher priority)"""
        base_score = 50  # Default medium priority

        # Emergency actions
        if any(word in action.lower() for word in ["immediate", "emergency", "force"]):
            base_score = 10

        # Critical actions
        elif any(word in action.lower() for word in ["critical", "reduce", "switch"]):
            base_score = 20

        # High priority actions
        elif any(
            word in action.lower() for word in ["monitor", "validate", "implement"]
        ):
            base_score = 30

        # Adjust based on resource pressure
        if resource_pressure > self.critical_pressure_threshold:
            if "resource" in action.lower() or "minimal" in action.lower():
                base_score -= 15  # Higher priority for resource actions

        # Adjust based on critical concerns
        critical_concerns = [c for c in concerns if c.severity == "critical"]
        if critical_concerns and any(
            word in action.lower() for word in ["completion", "termination"]
        ):
            base_score -= 20  # Higher priority for completion actions

        return base_score

    def get_action_categories(self, actions: List[str]) -> dict:
        """
        Categorize actions by type for better organization.

        Args:
            actions: List of recommended actions

        Returns:
            Dictionary with actions organized by category
        """
        categories = {
            "emergency": [],
            "resource_management": [],
            "investigation_strategy": [],
            "safety_measures": [],
            "performance_optimization": [],
            "monitoring": [],
            "general": [],
        }

        for action in actions:
            action_lower = action.lower()

            if any(
                word in action_lower for word in ["immediate", "emergency", "force"]
            ):
                categories["emergency"].append(action)
            elif any(
                word in action_lower for word in ["resource", "consumption", "minimal"]
            ):
                categories["resource_management"].append(action)
            elif any(word in action_lower for word in ["strategy", "mode", "approach"]):
                categories["investigation_strategy"].append(action)
            elif any(
                word in action_lower for word in ["safety", "validation", "checks"]
            ):
                categories["safety_measures"].append(action)
            elif any(
                word in action_lower
                for word in ["optimize", "efficiency", "performance"]
            ):
                categories["performance_optimization"].append(action)
            elif any(word in action_lower for word in ["monitor", "track", "observe"]):
                categories["monitoring"].append(action)
            else:
                categories["general"].append(action)

        # Remove empty categories
        return {k: v for k, v in categories.items() if v}

    def update_thresholds(
        self, critical_pressure: float = None, high_pressure: float = None
    ):
        """
        Update action recommendation thresholds.

        Args:
            critical_pressure: Threshold for critical pressure actions
            high_pressure: Threshold for high pressure actions
        """
        if critical_pressure is not None and 0.0 <= critical_pressure <= 1.0:
            self.critical_pressure_threshold = critical_pressure
            logger.info(f"Updated critical pressure threshold to {critical_pressure}")

        if high_pressure is not None and 0.0 <= high_pressure <= 1.0:
            self.high_pressure_threshold = high_pressure
            logger.info(f"Updated high pressure threshold to {high_pressure}")

    def add_concern_actions(self, concern_type: SafetyConcernType, actions: List[str]):
        """
        Add custom actions for a concern type.

        Args:
            concern_type: Type of safety concern
            actions: List of actions to add for this concern type
        """
        if concern_type not in self.concern_actions:
            self.concern_actions[concern_type] = []

        self.concern_actions[concern_type].extend(actions)
        logger.info(
            f"Added {len(actions)} actions for concern type {concern_type.value}"
        )


# Global recommender instance
_action_recommender = None


def get_action_recommender() -> ActionRecommender:
    """Get the global action recommender instance"""
    global _action_recommender
    if _action_recommender is None:
        _action_recommender = ActionRecommender()
    return _action_recommender


def reset_action_recommender():
    """Reset the global recommender (useful for testing)"""
    global _action_recommender
    _action_recommender = None
