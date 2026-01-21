"""
Safe comparison, arithmetic, and formatting utilities to prevent NoneType and type errors.
"""

import math
from typing import Optional, Union


def safe_div(n, d, default=0.0):
    """Safe division with default fallback."""
    try:
        return (n / d) if d else default
    except Exception:
        return default


def safe_gt(
    a: Optional[Union[int, float]],
    b: Optional[Union[int, float]],
    default: bool = False,
) -> bool:
    """
    Safe greater-than comparison that handles None values.

    CRITICAL FIX: Prevents "'>' not supported between instances of 'NoneType' and 'float'" crashes.

    Args:
        a: First value (may be None)
        b: Second value (may be None)
        default: Default result when either value is None

    Returns:
        Boolean result of a > b, or default if either is None
    """
    try:
        if a is None or b is None:
            return default
        return float(a) > float(b)
    except (ValueError, TypeError):
        return default


def coerce_float(
    value: Optional[Union[int, float, str]], default: Optional[float] = None
) -> Optional[float]:
    """
    Safely coerce value to float with None handling.

    CRITICAL FIX: Converts None and invalid values to float safely.
    Enhanced to handle finite values only.

    Args:
        value: Value to convert (may be None)
        default: Default float value if conversion fails

    Returns:
        Float value, default, or None
    """
    # CRITICAL FIX: Check for None BEFORE calling float() to prevent TypeError
    if value is None:
        return default

    try:
        f = float(value)
        return f if math.isfinite(f) else default
    except (ValueError, TypeError):
        return default


def fmt_num(x: Optional[Union[int, float]], digits: int = 2, na: str = "N/A") -> str:
    """
    CRITICAL FIX: Bullet-proof number formatting that never crashes on None.

    Prevents "unsupported format string passed to NoneType.__format__" crashes.
    Use this instead of f"{x:.2f}" or "{:.2f}".format(x).

    Args:
        x: Value to format (may be None)
        digits: Number of decimal places
        na: String to show for None/invalid values

    Returns:
        Formatted string or N/A placeholder
    """
    f = coerce_float(x, None)
    return f"{f:.{digits}f}" if f is not None else na


def fmt_pct(x: Optional[Union[int, float]], digits: int = 1, na: str = "N/A") -> str:
    """
    CRITICAL FIX: Bullet-proof percentage formatting that never crashes on None.

    Converts decimal to percentage and formats safely.

    Args:
        x: Decimal value to format as percentage (may be None)
        digits: Number of decimal places for percentage
        na: String to show for None/invalid values

    Returns:
        Formatted percentage string or N/A placeholder
    """
    f = coerce_float(x, None)
    return f"{f*100:.{digits}f}%" if f is not None else na


def safe_ratio(
    numerator: Optional[Union[int, float]],
    denominator: Optional[Union[int, float]],
    default: float = 0.0,
) -> float:
    """
    CRITICAL FIX: Safe ratio calculation that handles None and zero values.

    Prevents division by zero and None comparison crashes in summary calculations.

    Args:
        numerator: Numerator value (may be None)
        denominator: Denominator value (may be None)
        default: Default ratio when calculation not possible

    Returns:
        Safe ratio result or default value
    """
    num = coerce_float(numerator, None)
    den = coerce_float(denominator, None)

    if num is None or den is None or den == 0.0:
        return default

    return num / den


def safe_mean(values: list, default: float = 0.0) -> float:
    """
    CRITICAL FIX: Safe mean calculation that handles None values and empty lists.

    Filters out None values before calculating mean to prevent crashes.

    Args:
        values: List of values (may contain None)
        default: Default mean when no valid values

    Returns:
        Safe mean result or default value
    """
    if not values:
        return default

    # Filter out None values and convert to float
    valid_values = []
    for val in values:
        f = coerce_float(val, None)
        if f is not None:
            valid_values.append(f)

    if not valid_values:
        return default

    return sum(valid_values) / len(valid_values)


def fmt_risk(
    risk_score: Optional[Union[int, float]],
    na: str = "N/A (blocked by evidence gating)",
) -> str:
    """
    CRITICAL FIX: Safe risk score formatting that handles None values from evidence gating.

    Prevents crashes when risk scores are None due to evidence gating blocking numeric risk publication.

    Args:
        risk_score: Risk score value (may be None due to evidence gating)
        na: String to show for None/blocked values

    Returns:
        Formatted risk score string or N/A placeholder
    """
    if risk_score is None:
        return na

    safe_risk = coerce_float(risk_score, None)
    return f"{safe_risk:.3f}" if safe_risk is not None else na
