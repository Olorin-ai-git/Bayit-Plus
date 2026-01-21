"""
Metrics finalization with safe operations and centralized calculations.

This module provides safe metric calculations and finalization operations
to prevent division errors and ensure consistent metric computation.
"""

from typing import Any, Dict

from .safe import safe_div


def finalize_metrics(state: Dict[str, Any]) -> None:
    """
    Finalize performance metrics with safe operations.

    Args:
        state: Investigation state to update with finalized metrics
    """
    # Ensure performance_metrics exists
    if "performance_metrics" not in state:
        state["performance_metrics"] = {}

    # Get duration safely
    dur_s = safe_div((state.get("total_duration_ms") or 0), 1000.0, 0.0)
    trail = state.get("decision_audit_trail", [])

    # Calculate decisions per second safely
    state["performance_metrics"]["decisions_per_second"] = safe_div(
        len(trail), dur_s, 0.0
    )

    # Calculate investigation velocity safely
    domains_completed = len(state.get("domains_completed", []))
    state["performance_metrics"]["investigation_velocity"] = safe_div(
        domains_completed, dur_s, 0.0
    )

    # Calculate resource efficiency safely
    orchestrator_loops = state.get("orchestrator_loops", 0)
    ideal_loops = 6  # Ideal number of loops
    loop_penalty = max(0, orchestrator_loops - ideal_loops)
    state["performance_metrics"]["resource_efficiency"] = max(
        0.0, 1.0 - (loop_penalty * 0.1)
    )


def finalize_duration_metrics(state: Dict[str, Any]) -> None:
    """
    Finalize duration-based metrics with safe operations.

    Args:
        state: Investigation state to update with duration metrics
    """
    # Ensure performance_metrics exists
    if "performance_metrics" not in state:
        state["performance_metrics"] = {}

    duration_ms = state.get("total_duration_ms", 0) or 0

    # Calculate duration in seconds safely
    duration_s = safe_div(duration_ms, 1000.0, 0.0)
    state["performance_metrics"]["duration_seconds"] = duration_s

    # Calculate time efficiency safely (optimal time is 30 seconds)
    optimal_time_s = 30.0
    time_ratio = safe_div(duration_s, optimal_time_s, 1.0)
    state["performance_metrics"]["time_efficiency"] = max(
        0.1, min(1.0, 1.0 / (1.0 + abs(time_ratio - 1.0)))
    )


def finalize_coverage_metrics(state: Dict[str, Any]) -> None:
    """
    Finalize coverage-based metrics with safe operations.

    Args:
        state: Investigation state to update with coverage metrics
    """
    # Ensure performance_metrics exists
    if "performance_metrics" not in state:
        state["performance_metrics"] = {}

    domains_completed = len(state.get("domains_completed", []))
    tools_used = len(state.get("tools_used", []))

    # Calculate domain completion percentage safely
    state["performance_metrics"]["domain_completion_percentage"] = (
        safe_div(domains_completed, 6.0, 0.0) * 100.0
    )

    # Calculate tool utilization safely
    max_tools = state.get("max_tools", 52)
    state["performance_metrics"]["tool_utilization"] = (
        safe_div(tools_used, max_tools, 0.0) * 100.0
    )


def finalize_all_metrics(state: Dict[str, Any]) -> None:
    """
    Finalize all performance metrics in one place.

    Args:
        state: Investigation state to update with all metrics
    """
    finalize_metrics(state)
    finalize_duration_metrics(state)
    finalize_coverage_metrics(state)
