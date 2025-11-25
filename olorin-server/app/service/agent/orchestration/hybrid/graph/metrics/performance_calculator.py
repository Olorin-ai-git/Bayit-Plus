"""
Performance Calculator - Investigation efficiency calculation for hybrid intelligence.

This module provides comprehensive performance and efficiency calculations for
hybrid intelligence investigations, measuring time, coverage, and safety metrics.
"""

from typing import Any, Dict

from app.service.agent.orchestration.metrics.safe import safe_div
from app.service.logging import get_bridge_logger

from ...hybrid_state_schema import HybridInvestigationState

logger = get_bridge_logger(__name__)


class PerformanceCalculator:
    """
    Calculates investigation performance and efficiency metrics.

    Provides comprehensive analysis of investigation performance including
    time efficiency, coverage efficiency, and safety metrics.
    """

    def __init__(self, components: Dict[str, Any]):
        """Initialize with graph foundation components."""
        self.components = components

    def calculate_investigation_efficiency(
        self, state: HybridInvestigationState
    ) -> float:
        """
        Calculate overall investigation efficiency based on multiple factors.

        Args:
            state: Current investigation state

        Returns:
            Overall efficiency score between 0.0 and 1.0
        """
        # Base efficiency factors
        duration_ms = state.get("total_duration_ms", 0) or 0  # Handle None case
        orchestrator_loops = state.get("orchestrator_loops", 0)
        domains_completed = len(state.get("domains_completed", []))
        tools_used = len(state.get("tools_used", []))
        safety_overrides = len(state.get("safety_overrides", []))

        # Calculate individual efficiency components
        time_efficiency = self._calculate_time_efficiency(duration_ms)
        loop_efficiency = self._calculate_loop_efficiency(orchestrator_loops)
        coverage_efficiency = self._calculate_coverage_efficiency(
            domains_completed, tools_used
        )
        safety_efficiency = self._calculate_safety_efficiency(safety_overrides)

        # Overall efficiency with weighted average
        efficiency = (
            time_efficiency * 0.25
            + loop_efficiency * 0.25
            + coverage_efficiency * 0.25
            + safety_efficiency * 0.25
        )

        return min(1.0, max(0.0, efficiency))

    def _calculate_time_efficiency(self, duration_ms: int) -> float:
        """Calculate time efficiency based on investigation duration."""
        if not duration_ms or duration_ms <= 0:
            return 1.0

        ideal_time_ms = 30000  # 30 seconds ideal
        time_ratio = safe_div(duration_ms, ideal_time_ms, 1.0)

        # Efficiency decreases as we deviate from ideal time
        time_efficiency = max(0.1, min(1.0, 1.0 / (1.0 + abs(time_ratio - 1.0))))

        return time_efficiency

    def _calculate_loop_efficiency(self, orchestrator_loops: int) -> float:
        """Calculate loop efficiency based on orchestrator loop count."""
        # Fewer loops are generally better, but not too few
        loop_efficiency = max(
            0.1, min(1.0, 1.0 / (1.0 + max(0, orchestrator_loops - 8)))
        )
        return loop_efficiency

    def _calculate_coverage_efficiency(
        self, domains_completed: int, tools_used: int
    ) -> float:
        """Calculate coverage efficiency based on domains and tools."""
        # More domains and tools generally indicate better coverage
        domain_score = safe_div(domains_completed, 6.0, 0.0) * 0.7
        tool_score = min(1.0, safe_div(tools_used, 5.0, 0.0)) * 0.3

        coverage_efficiency = domain_score + tool_score
        return coverage_efficiency

    def _calculate_safety_efficiency(self, safety_overrides: int) -> float:
        """Calculate safety efficiency based on override count."""
        # Fewer safety overrides indicate more efficient operation
        safety_efficiency = max(0.5, 1.0 - (safety_overrides * 0.2))
        return safety_efficiency

    def get_detailed_performance_metrics(
        self, state: HybridInvestigationState
    ) -> Dict[str, Any]:
        """
        Get detailed performance metrics breakdown.

        Args:
            state: Current investigation state

        Returns:
            Detailed performance metrics dictionary
        """
        duration_ms = state.get("total_duration_ms", 0) or 0
        orchestrator_loops = state.get("orchestrator_loops", 0)
        domains_completed = len(state.get("domains_completed", []))
        tools_used = len(state.get("tools_used", []))
        safety_overrides = len(state.get("safety_overrides", []))

        return {
            "overall_efficiency": self.calculate_investigation_efficiency(state),
            "time_metrics": {
                "duration_ms": duration_ms,
                "duration_seconds": safe_div(
                    duration_ms, 1000.0, 0.0
                ),  # CRITICAL FIX: Safe division for duration_ms
                "time_efficiency": self._calculate_time_efficiency(duration_ms or 0),
                "ideal_time_ms": 30000,
            },
            "orchestration_metrics": {
                "orchestrator_loops": orchestrator_loops,
                "loop_efficiency": self._calculate_loop_efficiency(orchestrator_loops),
                "optimal_loop_range": "1-8",
            },
            "coverage_metrics": {
                "domains_completed": domains_completed,
                "total_domains": 6,
                "tools_used": tools_used,
                "coverage_efficiency": self._calculate_coverage_efficiency(
                    domains_completed, tools_used
                ),
                "domain_completion_percentage": safe_div(domains_completed, 6.0, 0.0)
                * 100,
            },
            "safety_metrics": {
                "safety_overrides": safety_overrides,
                "safety_efficiency": self._calculate_safety_efficiency(
                    safety_overrides
                ),
                "safety_rating": (
                    "excellent"
                    if safety_overrides == 0
                    else "good" if safety_overrides <= 2 else "needs_attention"
                ),
            },
        }

    def get_performance_benchmarks(self) -> Dict[str, Any]:
        """Get performance benchmarks for comparison."""
        return {
            "time_benchmarks": {
                "excellent": "< 30 seconds",
                "good": "30-60 seconds",
                "acceptable": "60-120 seconds",
                "slow": "> 120 seconds",
            },
            "loop_benchmarks": {
                "excellent": "1-3 loops",
                "good": "4-6 loops",
                "acceptable": "7-10 loops",
                "excessive": "> 10 loops",
            },
            "coverage_benchmarks": {
                "comprehensive": "6/6 domains + 3+ tools",
                "good": "4-5/6 domains + 2+ tools",
                "minimal": "2-3/6 domains + 1+ tools",
                "insufficient": "< 2/6 domains",
            },
            "safety_benchmarks": {
                "excellent": "0 overrides",
                "good": "1-2 overrides",
                "concerning": "3-5 overrides",
                "critical": "> 5 overrides",
            },
        }
