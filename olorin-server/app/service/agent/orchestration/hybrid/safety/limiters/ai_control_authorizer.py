"""
AI Control Authorizer for Hybrid Intelligence Graph

This module determines when AI should be allowed to control investigation
routing based on confidence, safety concerns, and resource pressure.
"""

from typing import TYPE_CHECKING, List

from app.service.logging import get_bridge_logger

from ...state.enums_and_constants import AIConfidenceLevel
from ..models import SafetyConcern

if TYPE_CHECKING:
    from ...state.base_state_schema import HybridInvestigationState

logger = get_bridge_logger(__name__)


class AIControlAuthorizer:
    """
    Authorizes AI control based on confidence, safety, and resource conditions.

    AI control authorization considers:
    - Current AI confidence level and trends
    - Active safety concerns and their severity
    - Resource pressure and consumption patterns
    - Investigation phase and warmup periods
    - Override history and patterns
    """

    def __init__(self):
        """Initialize AI control authorizer"""
        # Confidence thresholds for AI control
        self.confidence_thresholds = {
            "high_confidence_pressure_limit": 0.6,  # Allow AI control up to 60% pressure with high confidence
            "medium_confidence_pressure_limit": 0.8,  # Allow AI control up to 80% pressure with medium confidence
            "unknown_warmup_pressure_limit": 0.5,  # Allow AI control during warmup up to 50% pressure
        }

        # Warmup and loop settings
        self.warmup_loop_threshold = 3  # Allow AI control during first N loops

        # Critical concern handling
        self.deny_on_critical_concerns = True
        self.consider_concern_age = True  # Consider how long concerns have been active

        # Performance tracking
        self.track_authorization_decisions = True

    def should_allow_ai_control(
        self,
        state: "HybridInvestigationState",
        concerns: List[SafetyConcern],
        resource_pressure: float,
    ) -> bool:
        """
        Determine if AI should be allowed to control investigation routing.

        Args:
            state: Current investigation state
            concerns: Active safety concerns
            resource_pressure: Current resource pressure (0.0-1.0)

        Returns:
            True if AI control should be allowed
        """
        ai_confidence = state.get("ai_confidence", 0.5)
        confidence_level = state.get("ai_confidence_level", AIConfidenceLevel.UNKNOWN)
        orchestrator_loops = state.get("orchestrator_loops", 0)

        # Step 1: Check for critical concerns (immediate denial)
        if self._has_critical_concerns(concerns):
            logger.debug(f"   🚫 AI control denied: critical safety concerns present")
            return False

        # Step 2: Check confidence-based authorization
        auth_decision = self._check_confidence_authorization(
            confidence_level, resource_pressure, orchestrator_loops
        )

        if auth_decision is not None:
            reason = "allowed" if auth_decision else "denied"
            logger.debug(
                f"   {'✅' if auth_decision else '🚫'} AI control {reason}: "
                f"confidence={confidence_level.value}, pressure={resource_pressure:.3f}, "
                f"loop={orchestrator_loops}"
            )
            return auth_decision

        # Step 3: Default fallback (should not reach here with current logic)
        logger.debug(f"   🚫 AI control denied: fallback condition")
        return False

    def _has_critical_concerns(self, concerns: List[SafetyConcern]) -> bool:
        """Check if there are any critical safety concerns"""
        if not self.deny_on_critical_concerns:
            return False

        critical_concerns = [c for c in concerns if c.severity == "critical"]
        if critical_concerns:
            concern_count = len(critical_concerns)
            logger.debug(f"   ⚠️ Found {concern_count} critical concerns")
            for concern in critical_concerns:
                age = concern.age_seconds if self.consider_concern_age else 0
                logger.debug(f"      Critical: {concern.message} (age: {age:.1f}s)")
            return True

        return False

    def _check_confidence_authorization(
        self,
        confidence_level: AIConfidenceLevel,
        resource_pressure: float,
        orchestrator_loops: int,
    ) -> bool:
        """Check authorization based on confidence level and conditions"""

        # High confidence with low-moderate resource pressure
        if confidence_level == AIConfidenceLevel.HIGH:
            if (
                resource_pressure
                < self.confidence_thresholds["high_confidence_pressure_limit"]
            ):
                return True

        # Medium confidence with reasonable resource pressure
        if confidence_level == AIConfidenceLevel.MEDIUM:
            if (
                resource_pressure
                < self.confidence_thresholds["medium_confidence_pressure_limit"]
            ):
                return True

        # UNKNOWN confidence during warmup period (first few loops)
        if confidence_level == AIConfidenceLevel.UNKNOWN:
            if (
                orchestrator_loops < self.warmup_loop_threshold
                and resource_pressure
                < self.confidence_thresholds["unknown_warmup_pressure_limit"]
            ):
                return True

        # All other cases: deny AI control
        return False

    def get_authorization_reasoning(
        self,
        state: "HybridInvestigationState",
        concerns: List[SafetyConcern],
        resource_pressure: float,
    ) -> str:
        """
        Get human-readable reasoning for authorization decision.

        Args:
            state: Current investigation state
            concerns: Active safety concerns
            resource_pressure: Current resource pressure

        Returns:
            Human-readable explanation of authorization decision
        """
        confidence_level = state.get("ai_confidence_level", AIConfidenceLevel.UNKNOWN)
        orchestrator_loops = state.get("orchestrator_loops", 0)

        # Check critical concerns first
        critical_concerns = [c for c in concerns if c.severity == "critical"]
        if critical_concerns:
            return f"AI control denied: {len(critical_concerns)} critical safety concerns active"

        # Check confidence-based reasoning
        if confidence_level == AIConfidenceLevel.HIGH:
            pressure_limit = self.confidence_thresholds[
                "high_confidence_pressure_limit"
            ]
            if resource_pressure < pressure_limit:
                return f"AI control allowed: High confidence ({confidence_level.value}) with low pressure ({resource_pressure:.2f} < {pressure_limit})"
            else:
                return f"AI control denied: High confidence but pressure too high ({resource_pressure:.2f} >= {pressure_limit})"

        if confidence_level == AIConfidenceLevel.MEDIUM:
            pressure_limit = self.confidence_thresholds[
                "medium_confidence_pressure_limit"
            ]
            if resource_pressure < pressure_limit:
                return f"AI control allowed: Medium confidence with moderate pressure ({resource_pressure:.2f} < {pressure_limit})"
            else:
                return f"AI control denied: Medium confidence but pressure too high ({resource_pressure:.2f} >= {pressure_limit})"

        if confidence_level == AIConfidenceLevel.UNKNOWN:
            if orchestrator_loops < self.warmup_loop_threshold:
                pressure_limit = self.confidence_thresholds[
                    "unknown_warmup_pressure_limit"
                ]
                if resource_pressure < pressure_limit:
                    return f"AI control allowed: Unknown confidence during warmup (loop {orchestrator_loops}/{self.warmup_loop_threshold}) with acceptable pressure"
                else:
                    return f"AI control denied: Unknown confidence during warmup but pressure too high ({resource_pressure:.2f} >= {pressure_limit})"
            else:
                return f"AI control denied: Unknown confidence after warmup period (loop {orchestrator_loops})"

        if confidence_level == AIConfidenceLevel.LOW:
            return f"AI control denied: Low confidence level"

        return f"AI control denied: Unhandled condition (confidence={confidence_level.value}, pressure={resource_pressure:.2f})"

    def get_authorization_confidence(
        self,
        state: "HybridInvestigationState",
        concerns: List[SafetyConcern],
        resource_pressure: float,
    ) -> float:
        """
        Get confidence in the authorization decision (0.0-1.0).

        Higher confidence means the decision is more certain.

        Returns:
            Confidence level in authorization decision
        """
        confidence_level = state.get("ai_confidence_level", AIConfidenceLevel.UNKNOWN)
        orchestrator_loops = state.get("orchestrator_loops", 0)

        # High confidence in denial for critical concerns
        critical_concerns = [c for c in concerns if c.severity == "critical"]
        if critical_concerns:
            return 0.95

        # Confidence based on AI confidence level
        if confidence_level == AIConfidenceLevel.HIGH:
            return 0.9  # High confidence in high AI confidence decisions
        elif confidence_level == AIConfidenceLevel.MEDIUM:
            return 0.8  # Good confidence in medium AI confidence decisions
        elif confidence_level == AIConfidenceLevel.LOW:
            return 0.85  # High confidence in denying low AI confidence
        elif confidence_level == AIConfidenceLevel.UNKNOWN:
            if orchestrator_loops < self.warmup_loop_threshold:
                return 0.7  # Moderate confidence during warmup
            else:
                return 0.85  # High confidence in denying unknown confidence post-warmup

        return 0.5  # Default moderate confidence

    def update_thresholds(
        self,
        high_confidence_pressure: float = None,
        medium_confidence_pressure: float = None,
        unknown_warmup_pressure: float = None,
        warmup_loops: int = None,
    ):
        """
        Update authorization thresholds (useful for tuning).

        Args:
            high_confidence_pressure: Pressure limit for high confidence
            medium_confidence_pressure: Pressure limit for medium confidence
            unknown_warmup_pressure: Pressure limit for unknown confidence during warmup
            warmup_loops: Number of warmup loops
        """
        if (
            high_confidence_pressure is not None
            and 0.0 <= high_confidence_pressure <= 1.0
        ):
            self.confidence_thresholds["high_confidence_pressure_limit"] = (
                high_confidence_pressure
            )
            logger.info(
                f"Updated high confidence pressure limit to {high_confidence_pressure}"
            )

        if (
            medium_confidence_pressure is not None
            and 0.0 <= medium_confidence_pressure <= 1.0
        ):
            self.confidence_thresholds["medium_confidence_pressure_limit"] = (
                medium_confidence_pressure
            )
            logger.info(
                f"Updated medium confidence pressure limit to {medium_confidence_pressure}"
            )

        if (
            unknown_warmup_pressure is not None
            and 0.0 <= unknown_warmup_pressure <= 1.0
        ):
            self.confidence_thresholds["unknown_warmup_pressure_limit"] = (
                unknown_warmup_pressure
            )
            logger.info(
                f"Updated unknown warmup pressure limit to {unknown_warmup_pressure}"
            )

        if warmup_loops is not None and warmup_loops >= 0:
            self.warmup_loop_threshold = warmup_loops
            logger.info(f"Updated warmup loop threshold to {warmup_loops}")

    def configure_authorization(
        self,
        deny_on_critical: bool = None,
        consider_age: bool = None,
        track_decisions: bool = None,
    ):
        """
        Configure authorization behavior.

        Args:
            deny_on_critical: Deny AI control when critical concerns are present
            consider_age: Consider age of concerns in decisions
            track_decisions: Track authorization decisions for analysis
        """
        if deny_on_critical is not None:
            self.deny_on_critical_concerns = deny_on_critical
            logger.info(
                f"Deny on critical concerns: {'enabled' if deny_on_critical else 'disabled'}"
            )

        if consider_age is not None:
            self.consider_concern_age = consider_age
            logger.info(
                f"Consider concern age: {'enabled' if consider_age else 'disabled'}"
            )

        if track_decisions is not None:
            self.track_authorization_decisions = track_decisions
            logger.info(
                f"Track authorization decisions: {'enabled' if track_decisions else 'disabled'}"
            )


# Global authorizer instance
_ai_control_authorizer = None


def get_ai_control_authorizer() -> AIControlAuthorizer:
    """Get the global AI control authorizer instance"""
    global _ai_control_authorizer
    if _ai_control_authorizer is None:
        _ai_control_authorizer = AIControlAuthorizer()
    return _ai_control_authorizer


def reset_ai_control_authorizer():
    """Reset the global authorizer (useful for testing)"""
    global _ai_control_authorizer
    _ai_control_authorizer = None
