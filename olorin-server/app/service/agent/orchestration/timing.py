"""
Bulletproof timing utilities with perf counter and UTC timestamps.
"""

from contextlib import contextmanager
from time import perf_counter
from datetime import datetime, timezone
from typing import Any

@contextmanager
def run_timer(state: Any):
    """
    Bulletproof timer using perf counter for math, UTC for display.
    
    Sets start_time and end_time as UTC ISO strings, total_duration_ms as integer milliseconds.
    Handles both dict and object state types.
    """
    start_time_iso = datetime.now(timezone.utc).isoformat()
    if isinstance(state, dict):
        state["start_time"] = start_time_iso
    else:
        state.start_time = start_time_iso
        
    t0 = perf_counter()
    try:
        yield
    finally:
        end_time_iso = datetime.now(timezone.utc).isoformat()
        duration_ms = max(int((perf_counter() - t0) * 1000), 1)
        
        if isinstance(state, dict):
            state["end_time"] = end_time_iso
            state["total_duration_ms"] = duration_ms
        else:
            state.end_time = end_time_iso
            state.total_duration_ms = duration_ms

@contextmanager
def domain_timer(state: Any, name: str):
    """Per-domain durations, not timestamps."""
    t0 = perf_counter()
    try:
        yield
    finally:
        ms = int((perf_counter() - t0) * 1000)
        
        # Handle both dict and object state
        if isinstance(state, dict):
            if "performance_metrics" not in state:
                state["performance_metrics"] = {}
            d = state["performance_metrics"].setdefault("domain_durations_ms", {})
            d[name] = ms
        else:
            if not hasattr(state, 'performance_metrics'):
                state.performance_metrics = {}
            d = state.performance_metrics.setdefault("domain_durations_ms", {})
            d[name] = ms