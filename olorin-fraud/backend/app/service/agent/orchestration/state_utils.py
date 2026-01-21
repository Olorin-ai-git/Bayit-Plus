"""
State access utilities for safe state manipulation and access.

Provides defensive state access patterns to prevent KeyError crashes
and ensure consistent state handling across agents.
"""

from collections import defaultdict
from typing import Any, Dict, Optional


def state_get(state: Any, key: str, default: Optional[Any] = None) -> Any:
    """
    Safe state access that works with both dict and object attributes.

    Args:
        state: State object or dictionary
        key: Key to access
        default: Default value if key not found

    Returns:
        Value from state or default
    """
    try:
        # Support dict access
        if isinstance(state, dict):
            return state.get(key, default)
        # Support object attribute access
        return getattr(state, key, default)
    except Exception:
        return default


def state_set(state: Any, key: str, value: Any) -> None:
    """
    Safe state setting that works with both dict and object attributes.

    Args:
        state: State object or dictionary
        key: Key to set
        value: Value to set
    """
    try:
        if isinstance(state, dict):
            state[key] = value
        else:
            setattr(state, key, value)
    except Exception:
        pass  # Ignore setting errors


def ensure_confidence_factors(state: Any) -> Dict[str, float]:
    """
    Ensure confidence_factors exists with proper defaults.

    Args:
        state: Investigation state

    Returns:
        Confidence factors dictionary with defaults
    """
    cf = state_get(state, "confidence_factors", {}) or {}

    # Ensure all required fields exist with defaults
    defaults = {
        "data_completeness": 0.0,
        "evidence_quality": 0.0,
        "pattern_recognition": 0.0,
        "risk_indicators": 0.0,
    }

    for key, default_value in defaults.items():
        if key not in cf:
            cf[key] = default_value

    # Update state with complete confidence factors
    state_set(state, "confidence_factors", cf)

    return cf


def safe_state_access(state: Any, path: str, default: Optional[Any] = None) -> Any:
    """
    Access nested state values safely with dot notation.

    Args:
        state: State object
        path: Dot-separated path (e.g., "performance_metrics.duration")
        default: Default value

    Returns:
        Value or default
    """
    try:
        current = state
        for part in path.split("."):
            if isinstance(current, dict):
                current = current.get(part)
            else:
                current = getattr(current, part, None)
            if current is None:
                return default
        return current
    except Exception:
        return default
