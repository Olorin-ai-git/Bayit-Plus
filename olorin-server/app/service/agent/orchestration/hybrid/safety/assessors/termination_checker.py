"""
Termination Checker for Hybrid Intelligence Graph

This module determines when an investigation should be terminated immediately
based on safety concerns, resource limits, and critical conditions.
"""

from datetime import datetime
from typing import TYPE_CHECKING, List

from app.service.logging import get_bridge_logger

from ..models import SafetyConcern, SafetyLimits

if TYPE_CHECKING:
    from ...state.base_state_schema import HybridInvestigationState

logger = get_bridge_logger(__name__)


class TerminationChecker:
    """
    Determines when immediate termination is required for safety.

    Checks for immediate termination triggers:
    - Critical safety concerns
    - Hard resource limit violations
    - Time budget exceeded
    - System instability indicators
    - Emergency safety conditions
    """

    def __init__(self):
        """Initialize termination checker"""
        # Configuration for termination triggers
        self.enable_hard_limit_termination = True
        self.enable_time_limit_termination = True
        self.enable_critical_concern_termination = True

        # Safety margins (for early termination before hard limits)
        self.loop_termination_margin = 0  # No margin - terminate at exact limit
        self.tool_termination_margin = 0  # No margin - terminate at exact limit
        self.time_termination_margin = 0  # No margin - terminate at exact limit

    def requires_immediate_termination(
        self,
        state: "HybridInvestigationState",
        concerns: List[SafetyConcern],
        limits: SafetyLimits,
    ) -> bool:
        """
        Check if investigation should be terminated immediately.

        Args:
            state: Current investigation state
            concerns: Active safety concerns
            limits: Current safety limits

        Returns:
            True if immediate termination is required
        """
        # Critical concerns require immediate termination
        if self.enable_critical_concern_termination and self._has_critical_concerns(
            concerns
        ):
            return True

        # Hard limits exceeded
        if self.enable_hard_limit_termination and self._hard_limits_exceeded(
            state, limits
        ):
            return True

        # Time limit exceeded
        if self.enable_time_limit_termination and self._time_limit_exceeded(
            state, limits
        ):
            return True

        return False

    def _has_critical_concerns(self, concerns: List[SafetyConcern]) -> bool:
        """Check if there are any critical safety concerns"""
        critical_concerns = [c for c in concerns if c.severity == "critical"]
        if critical_concerns:
            logger.warning(
                f"   🚨 Immediate termination required: {len(critical_concerns)} critical concerns"
            )
            for concern in critical_concerns:
                logger.warning(f"      Critical: {concern.message}")
            return True
        return False

    def _hard_limits_exceeded(
        self, state: "HybridInvestigationState", limits: SafetyLimits
    ) -> bool:
        """Check if hard resource limits have been exceeded"""
        # Check orchestrator loops
        orchestrator_loops = state.get("orchestrator_loops", 0)
        loop_limit = limits.max_orchestrator_loops - self.loop_termination_margin
        if orchestrator_loops >= loop_limit:
            logger.warning(
                f"   🚨 Immediate termination: orchestrator loops exceeded {loop_limit}"
            )
            return True

        # Check tool executions
        tools_used = len(state.get("tools_used", []))
        tool_limit = limits.max_tool_executions - self.tool_termination_margin
        if tools_used >= tool_limit:
            logger.warning(
                f"   🚨 Immediate termination: tool executions exceeded {tool_limit}"
            )
            return True

        # Check domain attempts (if configured)
        domains_completed = len(state.get("domains_completed", []))
        if domains_completed >= limits.max_domain_attempts:
            logger.warning(
                f"   🚨 Immediate termination: domain attempts exceeded {limits.max_domain_attempts}"
            )
            return True

        return False

    def _time_limit_exceeded(
        self, state: "HybridInvestigationState", limits: SafetyLimits
    ) -> bool:
        """Check if time limit has been exceeded"""
        start_time = state.get("start_time")
        if not start_time:
            return False

        try:
            from dateutil.parser import parse

            start_dt = parse(start_time)
            elapsed_minutes = (datetime.now() - start_dt).total_seconds() / 60.0
            time_limit = (
                limits.max_investigation_time_minutes - self.time_termination_margin
            )

            if elapsed_minutes >= time_limit:
                logger.warning(
                    f"   🚨 Immediate termination: time limit exceeded {time_limit} minutes"
                )
                return True
        except Exception:
            pass  # Skip time check if parsing fails

        return False

    def get_termination_reason(
        self,
        state: "HybridInvestigationState",
        concerns: List[SafetyConcern],
        limits: SafetyLimits,
    ) -> str:
        """
        Get human-readable reason for termination (if termination is required).

        Args:
            state: Current investigation state
            concerns: Active safety concerns
            limits: Current safety limits

        Returns:
            Detailed termination reason or empty string if no termination needed
        """
        reasons = []

        # Check critical concerns
        if self.enable_critical_concern_termination:
            critical_concerns = [c for c in concerns if c.severity == "critical"]
            if critical_concerns:
                concern_messages = [c.message for c in critical_concerns]
                reasons.append(
                    f"Critical safety concerns: {'; '.join(concern_messages)}"
                )

        # Check hard limits
        if self.enable_hard_limit_termination:
            orchestrator_loops = state.get("orchestrator_loops", 0)
            if orchestrator_loops >= limits.max_orchestrator_loops:
                reasons.append(
                    f"Orchestrator loop limit exceeded: {orchestrator_loops}/{limits.max_orchestrator_loops}"
                )

            tools_used = len(state.get("tools_used", []))
            if tools_used >= limits.max_tool_executions:
                reasons.append(
                    f"Tool execution limit exceeded: {tools_used}/{limits.max_tool_executions}"
                )

            domains_completed = len(state.get("domains_completed", []))
            if domains_completed >= limits.max_domain_attempts:
                reasons.append(
                    f"Domain attempt limit exceeded: {domains_completed}/{limits.max_domain_attempts}"
                )

        # Check time limit
        if self.enable_time_limit_termination:
            start_time = state.get("start_time")
            if start_time:
                try:
                    from dateutil.parser import parse

                    start_dt = parse(start_time)
                    elapsed_minutes = (datetime.now() - start_dt).total_seconds() / 60.0
                    if elapsed_minutes >= limits.max_investigation_time_minutes:
                        reasons.append(
                            f"Time limit exceeded: {elapsed_minutes:.1f}/{limits.max_investigation_time_minutes} minutes"
                        )
                except Exception:
                    pass

        return "; ".join(reasons)

    def should_gracefully_finalize(
        self, state: "HybridInvestigationState", limits: SafetyLimits
    ) -> tuple[bool, str]:
        """
        Check if investigation should start graceful finalization.

        This checks for budget thresholds (80% of limits) to begin
        graceful completion rather than hard termination.

        Args:
            state: Current investigation state
            limits: Current safety limits

        Returns:
            Tuple of (should_finalize: bool, reason: str)
        """
        reasons = []

        # Check orchestrator loops at 80% threshold
        orchestrator_loops = state.get("orchestrator_loops", 0)
        loop_threshold = int(limits.max_orchestrator_loops * 0.8)
        if orchestrator_loops >= loop_threshold:
            reasons.append(
                f"Orchestrator loops approaching limit: {orchestrator_loops}/{limits.max_orchestrator_loops}"
            )

        # Check tool executions at 80% threshold
        tools_used = len(state.get("tools_used", []))
        tool_threshold = int(limits.max_tool_executions * 0.8)
        if tools_used >= tool_threshold:
            reasons.append(
                f"Tool executions approaching limit: {tools_used}/{limits.max_tool_executions}"
            )

        # Check time at 80% threshold
        start_time = state.get("start_time")
        if start_time:
            try:
                from dateutil.parser import parse

                start_dt = parse(start_time)
                elapsed_minutes = (datetime.now() - start_dt).total_seconds() / 60.0
                time_threshold = limits.max_investigation_time_minutes * 0.8
                if elapsed_minutes >= time_threshold:
                    reasons.append(
                        f"Time approaching limit: {elapsed_minutes:.1f}/{limits.max_investigation_time_minutes} minutes"
                    )
            except Exception:
                pass

        # Check if we have adequate domain coverage for graceful finalization
        if reasons and not self._has_adequate_domain_coverage(state, limits):
            reasons.append("Insufficient domain coverage for graceful finalization")
            return False, "; ".join(reasons)

        should_finalize = len(reasons) > 0
        return should_finalize, (
            "; ".join(reasons) if reasons else "No finalization needed"
        )

    def _has_adequate_domain_coverage(
        self, state: "HybridInvestigationState", limits: SafetyLimits
    ) -> bool:
        """
        Check if we have completed enough domains for graceful finalization.

        Args:
            state: Current investigation state
            limits: Current safety limits

        Returns:
            True if adequate coverage achieved
        """
        domains_completed = len(state.get("domains_completed", []))
        min_domains_for_finalization = max(
            1, int(limits.max_domain_attempts * 0.5)
        )  # At least 50% coverage

        has_coverage = domains_completed >= min_domains_for_finalization
        if not has_coverage:
            logger.info(
                f"   📊 Insufficient domain coverage: {domains_completed}/{min_domains_for_finalization} minimum"
            )

        return has_coverage

    def get_finalization_recommendation(
        self,
        state: "HybridInvestigationState",
        concerns: List[SafetyConcern],
        limits: SafetyLimits,
    ) -> str:
        """
        Get recommendation for investigation finalization.

        Returns:
            "continue", "graceful_finalize", "immediate_terminate"
        """
        # Check for immediate termination first
        if self.requires_immediate_termination(state, concerns, limits):
            return "immediate_terminate"

        # Check for graceful finalization
        should_finalize, _ = self.should_gracefully_finalize(state, limits)
        if should_finalize:
            return "graceful_finalize"

        return "continue"

    def get_termination_urgency(
        self,
        state: "HybridInvestigationState",
        concerns: List[SafetyConcern],
        limits: SafetyLimits,
    ) -> str:
        """
        Get urgency level for termination.

        Returns:
            "immediate", "urgent", "moderate", or "none"
        """
        if not self.requires_immediate_termination(state, concerns, limits):
            return "none"

        # Check for immediate urgency triggers
        critical_concerns = [c for c in concerns if c.severity == "critical"]
        if critical_concerns:
            return "immediate"

        # Check for urgent triggers (hard limits exceeded)
        orchestrator_loops = state.get("orchestrator_loops", 0)
        tools_used = len(state.get("tools_used", []))

        if (
            orchestrator_loops >= limits.max_orchestrator_loops
            or tools_used >= limits.max_tool_executions
        ):
            return "urgent"

        # Moderate urgency for other termination conditions
        return "moderate"

    def configure_termination_settings(
        self,
        enable_hard_limits: bool = None,
        enable_time_limits: bool = None,
        enable_critical_concerns: bool = None,
        loop_margin: int = None,
        tool_margin: int = None,
        time_margin: int = None,
    ):
        """
        Configure termination checker settings.

        Args:
            enable_hard_limits: Enable termination on hard limit violations
            enable_time_limits: Enable termination on time limit violations
            enable_critical_concerns: Enable termination on critical concerns
            loop_margin: Safety margin for loop termination
            tool_margin: Safety margin for tool termination
            time_margin: Safety margin for time termination (minutes)
        """
        if enable_hard_limits is not None:
            self.enable_hard_limit_termination = enable_hard_limits
            logger.info(
                f"Hard limit termination: {'enabled' if enable_hard_limits else 'disabled'}"
            )

        if enable_time_limits is not None:
            self.enable_time_limit_termination = enable_time_limits
            logger.info(
                f"Time limit termination: {'enabled' if enable_time_limits else 'disabled'}"
            )

        if enable_critical_concerns is not None:
            self.enable_critical_concern_termination = enable_critical_concerns
            logger.info(
                f"Critical concern termination: {'enabled' if enable_critical_concerns else 'disabled'}"
            )

        if loop_margin is not None:
            self.loop_termination_margin = loop_margin
            logger.info(f"Loop termination margin set to {loop_margin}")

        if tool_margin is not None:
            self.tool_termination_margin = tool_margin
            logger.info(f"Tool termination margin set to {tool_margin}")

        if time_margin is not None:
            self.time_termination_margin = time_margin
            logger.info(f"Time termination margin set to {time_margin} minutes")


# Global checker instance
_termination_checker = None


def get_termination_checker() -> TerminationChecker:
    """Get the global termination checker instance"""
    global _termination_checker
    if _termination_checker is None:
        _termination_checker = TerminationChecker()
    return _termination_checker


def reset_termination_checker():
    """Reset the global checker (useful for testing)"""
    global _termination_checker
    _termination_checker = None
