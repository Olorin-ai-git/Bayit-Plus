"""
Timing utilities for investigation orchestration.

Provides context managers and safe division utilities to ensure
proper timing tracking and prevent None duration issues.
"""

import time
from contextlib import contextmanager
from datetime import datetime
from typing import Any, Dict, Optional


@contextmanager
def investigation_timer(state: Any):
    """
    Context manager to guarantee total_duration_ms is always set.

    Args:
        state: Investigation state object

    Yields:
        None - execution happens within context
    """
    start_time = datetime.utcnow()
    start_timestamp = time.time()

    # Set start time
    if isinstance(state, dict):
        state["start_time"] = start_time.isoformat()
    else:
        state.start_time = start_time.isoformat()

    try:
        yield
    finally:
        # Always ensure timing is set, even if an exception occurred
        end_time = datetime.utcnow()
        end_timestamp = time.time()
        duration_seconds = end_timestamp - start_timestamp
        duration_ms = max(int(duration_seconds * 1000), 1)  # Minimum 1ms

        if isinstance(state, dict):
            state["end_time"] = end_time.isoformat()
            state["total_duration_ms"] = duration_ms
        else:
            state.end_time = end_time.isoformat()
            state.total_duration_ms = duration_ms


def safe_divide(
    numerator: Optional[float], denominator: Optional[float], default: float = 0.0
) -> float:
    """
    Safely divide two numbers with None protection.

    Args:
        numerator: Number to divide
        denominator: Number to divide by
        default: Default value if division fails

    Returns:
        Division result or default
    """
    try:
        if numerator is None or denominator is None or denominator == 0:
            return default
        return float(numerator) / float(denominator)
    except Exception:
        return default


def safe_duration_seconds(total_duration_ms: Optional[int]) -> float:
    """
    Safely convert duration milliseconds to seconds with None protection.

    Args:
        total_duration_ms: Duration in milliseconds (could be None)

    Returns:
        Duration in seconds (minimum 0.001 if original was None)
    """
    try:
        if total_duration_ms is None:
            return 0.001  # 1ms default
        return float(total_duration_ms) / 1000.0
    except Exception:
        return 0.001


def calculate_performance_metrics(state: Any) -> Dict[str, float]:
    """
    Calculate performance metrics with safe division.

    Args:
        state: Investigation state

    Returns:
        Performance metrics dictionary
    """
    duration_ms = None
    decision_count = 0

    # Extract values safely
    if isinstance(state, dict):
        duration_ms = state.get("total_duration_ms")
        decision_count = len(state.get("decision_audit_trail", []))
    else:
        duration_ms = getattr(state, "total_duration_ms", None)
        decision_count = len(getattr(state, "decision_audit_trail", []))

    duration_seconds = safe_duration_seconds(duration_ms)

    return {
        "decisions_per_second": safe_divide(decision_count, duration_seconds, 0.0),
        "investigation_velocity": safe_divide(
            1.0, duration_seconds, 0.1
        ),  # Higher is faster
        "resource_efficiency": 1.0,  # Can be calculated based on actual resource usage
        "final_efficiency": min(
            1.0, safe_divide(60.0, duration_seconds, 0.64)
        ),  # Target 60s completion
    }


def ensure_timing_integrity(state: Any) -> None:
    """
    Ensure state has proper timing fields with valid values.

    Args:
        state: Investigation state to check and fix
    """
    current_time = datetime.utcnow().isoformat()

    if isinstance(state, dict):
        # Ensure start_time exists
        if "start_time" not in state or state["start_time"] is None:
            state["start_time"] = current_time

        # Ensure end_time exists if investigation is complete
        if state.get("current_phase") == "complete" and (
            "end_time" not in state or state["end_time"] is None
        ):
            state["end_time"] = current_time

        # Ensure total_duration_ms exists and is valid
        if "total_duration_ms" not in state or state["total_duration_ms"] is None:
            # Try to calculate from start/end times
            try:
                if "start_time" in state and "end_time" in state:
                    start = datetime.fromisoformat(
                        state["start_time"].replace("Z", "+00:00")
                    )
                    end = datetime.fromisoformat(
                        state["end_time"].replace("Z", "+00:00")
                    )
                    duration_seconds = (end - start).total_seconds()
                    state["total_duration_ms"] = max(int(duration_seconds * 1000), 1)
                else:
                    # Default to 1ms if we can't calculate
                    state["total_duration_ms"] = 1
            except Exception:
                state["total_duration_ms"] = 1
    else:
        # Handle object attributes
        if not hasattr(state, "start_time") or state.start_time is None:
            state.start_time = current_time

        if (
            hasattr(state, "current_phase")
            and state.current_phase == "complete"
            and (not hasattr(state, "end_time") or state.end_time is None)
        ):
            state.end_time = current_time

        if not hasattr(state, "total_duration_ms") or state.total_duration_ms is None:
            state.total_duration_ms = 1
