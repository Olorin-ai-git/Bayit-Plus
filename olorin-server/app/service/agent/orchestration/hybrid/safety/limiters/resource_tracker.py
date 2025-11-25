"""
Resource Tracker for Hybrid Intelligence Graph

This module tracks remaining resources and provides resource
consumption analysis and projections.
"""

from datetime import datetime
from typing import TYPE_CHECKING, Dict

from app.service.logging import get_bridge_logger

from ..models import SafetyLimits

if TYPE_CHECKING:
    from ...state.base_state_schema import HybridInvestigationState

logger = get_bridge_logger(__name__)


class ResourceTracker:
    """
    Tracks remaining resources and consumption patterns.

    Provides:
    - Current resource usage tracking
    - Remaining resource calculations
    - Consumption rate analysis
    - Resource depletion projections
    - Efficiency metrics
    """

    def __init__(self):
        """Initialize resource tracker"""
        # Configuration for tracking and projections
        self.track_consumption_rates = True
        self.provide_projections = True
        self.min_history_for_rates = 3  # Minimum history entries for rate calculation

    def calculate_remaining_resources(
        self, state: "HybridInvestigationState", limits: SafetyLimits
    ) -> Dict[str, int]:
        """
        Calculate estimated remaining resources based on current usage.

        Args:
            state: Current investigation state
            limits: Current safety limits

        Returns:
            Dictionary with remaining resource counts
        """
        orchestrator_loops = state.get("orchestrator_loops", 0)
        tools_used = len(state.get("tools_used", []))
        domains_completed = len(state.get("domains_completed", []))

        remaining = {
            "orchestrator_loops": max(
                0, limits.max_orchestrator_loops - orchestrator_loops
            ),
            "tool_executions": max(0, limits.max_tool_executions - tools_used),
            "domain_attempts": max(0, limits.max_domain_attempts - domains_completed),
            "time_minutes": limits.max_investigation_time_minutes,
        }

        # Calculate remaining time more accurately
        remaining["time_minutes"] = self._calculate_remaining_time(state, limits)

        logger.debug(f"   📊 Remaining resources calculated:")
        logger.debug(
            f"      Loops: {remaining['orchestrator_loops']}/{limits.max_orchestrator_loops}"
        )
        logger.debug(
            f"      Tools: {remaining['tool_executions']}/{limits.max_tool_executions}"
        )
        logger.debug(
            f"      Domains: {remaining['domain_attempts']}/{limits.max_domain_attempts}"
        )
        logger.debug(f"      Time: {remaining['time_minutes']} minutes")

        return remaining

    def _calculate_remaining_time(
        self, state: "HybridInvestigationState", limits: SafetyLimits
    ) -> int:
        """Calculate remaining time based on elapsed time"""
        start_time = state.get("start_time")
        if not start_time:
            return limits.max_investigation_time_minutes

        try:
            from dateutil.parser import parse

            start_dt = parse(start_time)
            elapsed_minutes = (datetime.now() - start_dt).total_seconds() / 60.0
            remaining_minutes = max(
                0, int(limits.max_investigation_time_minutes - elapsed_minutes)
            )
            return remaining_minutes
        except Exception:
            # If time calculation fails, return full time budget
            return limits.max_investigation_time_minutes

    def get_resource_utilization(
        self, state: "HybridInvestigationState", limits: SafetyLimits
    ) -> Dict[str, float]:
        """
        Get resource utilization percentages (0.0 - 1.0).

        Args:
            state: Current investigation state
            limits: Current safety limits

        Returns:
            Dictionary with utilization percentages
        """
        orchestrator_loops = state.get("orchestrator_loops", 0)
        tools_used = len(state.get("tools_used", []))
        domains_completed = len(state.get("domains_completed", []))

        utilization = {
            "orchestrator_loops": orchestrator_loops
            / max(1, limits.max_orchestrator_loops),
            "tool_executions": tools_used / max(1, limits.max_tool_executions),
            "domain_attempts": domains_completed / max(1, limits.max_domain_attempts),
            "time_minutes": self._calculate_time_utilization(state, limits),
        }

        # Ensure utilization values are bounded
        for key in utilization:
            utilization[key] = max(0.0, min(1.0, utilization[key]))

        return utilization

    def _calculate_time_utilization(
        self, state: "HybridInvestigationState", limits: SafetyLimits
    ) -> float:
        """Calculate time utilization percentage"""
        start_time = state.get("start_time")
        if not start_time:
            return 0.0

        try:
            from dateutil.parser import parse

            start_dt = parse(start_time)
            elapsed_minutes = (datetime.now() - start_dt).total_seconds() / 60.0
            return elapsed_minutes / max(1, limits.max_investigation_time_minutes)
        except Exception:
            return 0.0

    def get_consumption_rates(
        self, state: "HybridInvestigationState"
    ) -> Dict[str, float]:
        """
        Calculate resource consumption rates per loop.

        Args:
            state: Current investigation state

        Returns:
            Dictionary with consumption rates (resources per loop)
        """
        orchestrator_loops = state.get("orchestrator_loops", 0)
        if orchestrator_loops == 0:
            return {
                "tools_per_loop": 0.0,
                "domains_per_loop": 0.0,
                "minutes_per_loop": 0.0,
            }

        tools_used = len(state.get("tools_used", []))
        domains_completed = len(state.get("domains_completed", []))

        rates = {
            "tools_per_loop": tools_used / orchestrator_loops,
            "domains_per_loop": domains_completed / orchestrator_loops,
            "minutes_per_loop": self._calculate_time_per_loop(
                state, orchestrator_loops
            ),
        }

        logger.debug(f"   📈 Resource consumption rates:")
        logger.debug(f"      Tools per loop: {rates['tools_per_loop']:.2f}")
        logger.debug(f"      Domains per loop: {rates['domains_per_loop']:.2f}")
        logger.debug(f"      Minutes per loop: {rates['minutes_per_loop']:.2f}")

        return rates

    def _calculate_time_per_loop(
        self, state: "HybridInvestigationState", orchestrator_loops: int
    ) -> float:
        """Calculate average time consumption per loop"""
        start_time = state.get("start_time")
        if not start_time:
            return 0.0

        try:
            from dateutil.parser import parse

            start_dt = parse(start_time)
            elapsed_minutes = (datetime.now() - start_dt).total_seconds() / 60.0
            return elapsed_minutes / orchestrator_loops
        except Exception:
            return 0.0

    def get_resource_projections(
        self, state: "HybridInvestigationState", limits: SafetyLimits
    ) -> Dict[str, Dict[str, float]]:
        """
        Project resource depletion based on current consumption rates.

        Args:
            state: Current investigation state
            limits: Current safety limits

        Returns:
            Dictionary with projections for each resource type
        """
        if not self.provide_projections:
            return {}

        rates = self.get_consumption_rates(state)
        remaining = self.calculate_remaining_resources(state, limits)

        projections = {}

        # Project loops until tool exhaustion
        if rates["tools_per_loop"] > 0:
            loops_until_tool_exhaustion = (
                remaining["tool_executions"] / rates["tools_per_loop"]
            )
            projections["tool_limit"] = {
                "estimated_loops_remaining": loops_until_tool_exhaustion,
                "confidence": self._calculate_projection_confidence(state),
            }

        # Project loops until time exhaustion
        if rates["minutes_per_loop"] > 0:
            loops_until_time_exhaustion = (
                remaining["time_minutes"] / rates["minutes_per_loop"]
            )
            projections["time_limit"] = {
                "estimated_loops_remaining": loops_until_time_exhaustion,
                "confidence": self._calculate_projection_confidence(state),
            }

        # Project domain completion rate
        if rates["domains_per_loop"] > 0:
            remaining_domains = remaining["domain_attempts"]
            loops_for_remaining_domains = remaining_domains / rates["domains_per_loop"]
            projections["domain_completion"] = {
                "estimated_loops_remaining": loops_for_remaining_domains,
                "confidence": self._calculate_projection_confidence(state),
            }

        return projections

    def _calculate_projection_confidence(
        self, state: "HybridInvestigationState"
    ) -> float:
        """Calculate confidence in projections based on data history"""
        orchestrator_loops = state.get("orchestrator_loops", 0)

        if orchestrator_loops < self.min_history_for_rates:
            return 0.3  # Low confidence with insufficient history
        elif orchestrator_loops < 5:
            return 0.6  # Medium confidence with some history
        else:
            return 0.8  # High confidence with sufficient history

    def get_resource_efficiency(
        self, state: "HybridInvestigationState"
    ) -> Dict[str, float]:
        """
        Calculate resource efficiency metrics.

        Args:
            state: Current investigation state

        Returns:
            Dictionary with efficiency metrics
        """
        orchestrator_loops = state.get("orchestrator_loops", 0)
        domains_completed = len(state.get("domains_completed", []))
        tools_used = len(state.get("tools_used", []))

        if orchestrator_loops == 0:
            return {
                "domain_efficiency": 0.0,
                "tool_efficiency": 0.0,
                "overall_efficiency": 0.0,
            }

        # Domain efficiency: domains completed per loop
        domain_efficiency = domains_completed / orchestrator_loops

        # Tool efficiency: domains completed per tool used
        tool_efficiency = domains_completed / max(1, tools_used)

        # Overall efficiency (weighted combination)
        overall_efficiency = 0.6 * domain_efficiency + 0.4 * tool_efficiency

        return {
            "domain_efficiency": domain_efficiency,
            "tool_efficiency": tool_efficiency,
            "overall_efficiency": overall_efficiency,
        }

    def get_resource_summary(
        self, state: "HybridInvestigationState", limits: SafetyLimits
    ) -> str:
        """
        Get a human-readable resource status summary.

        Args:
            state: Current investigation state
            limits: Current safety limits

        Returns:
            Human-readable resource summary
        """
        remaining = self.calculate_remaining_resources(state, limits)
        utilization = self.get_resource_utilization(state, limits)
        efficiency = self.get_resource_efficiency(state)

        summary_parts = []

        # Add remaining resources
        summary_parts.append(f"Remaining: {remaining['orchestrator_loops']} loops")
        summary_parts.append(f"{remaining['tool_executions']} tools")
        summary_parts.append(f"{remaining['time_minutes']}min")

        # Add utilization for highest consumed resource
        max_util_resource = max(utilization, key=utilization.get)
        max_util_value = utilization[max_util_resource]
        summary_parts.append(f"Peak usage: {max_util_value:.0%}")

        # Add efficiency
        summary_parts.append(f"Efficiency: {efficiency['overall_efficiency']:.2f}")

        return " | ".join(summary_parts)

    def configure_tracking(
        self,
        track_rates: bool = None,
        provide_projections: bool = None,
        min_history: int = None,
    ):
        """
        Configure resource tracking settings.

        Args:
            track_rates: Enable/disable consumption rate tracking
            provide_projections: Enable/disable resource projections
            min_history: Minimum history required for rate calculations
        """
        if track_rates is not None:
            self.track_consumption_rates = track_rates
            logger.info(
                f"Consumption rate tracking: {'enabled' if track_rates else 'disabled'}"
            )

        if provide_projections is not None:
            self.provide_projections = provide_projections
            logger.info(
                f"Resource projections: {'enabled' if provide_projections else 'disabled'}"
            )

        if min_history is not None:
            self.min_history_for_rates = min_history
            logger.info(f"Minimum history for rates set to {min_history}")


# Global tracker instance
_resource_tracker = None


def get_resource_tracker() -> ResourceTracker:
    """Get the global resource tracker instance"""
    global _resource_tracker
    if _resource_tracker is None:
        _resource_tracker = ResourceTracker()
    return _resource_tracker


def reset_resource_tracker():
    """Reset the global tracker (useful for testing)"""
    global _resource_tracker
    _resource_tracker = None
