"""
Null-Safe Formatting

Provides comprehensive null-safe formatting functions to prevent
float(NoneType) crashes as specified in the user's tight fix plan.
"""

from typing import Any, Optional, Union

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def fmt_num(x: Optional[Union[int, float]], nd: int = 2, default: str = "N/A") -> str:
    """
    Format a number safely, handling None values without crashing.

    Args:
        x: Number to format or None
        nd: Number of decimal places
        default: Default value for None inputs

    Returns:
        Formatted number string or default value
    """
    try:
        if x is None:
            return default
        return f"{float(x):.{nd}f}"
    except (ValueError, TypeError):
        return default


def safe_ratio(
    num: Optional[Union[int, float]],
    den: Optional[Union[int, float]],
    default: str = "N/A",
) -> str:
    """
    Calculate and format a ratio safely, handling None and zero values.

    Args:
        num: Numerator (can be None)
        den: Denominator (can be None)
        default: Default value for invalid inputs

    Returns:
        Formatted ratio string or default value
    """
    try:
        if num is None or den is None or den == 0:
            return default
        return f"{(float(num) / float(den)):.2f}"
    except (ValueError, TypeError, ZeroDivisionError):
        return default


def safe_percentage(
    num: Optional[Union[int, float]],
    den: Optional[Union[int, float]],
    default: str = "N/A",
) -> str:
    """
    Calculate and format a percentage safely.

    Args:
        num: Numerator (can be None)
        den: Denominator (can be None)
        default: Default value for invalid inputs

    Returns:
        Formatted percentage string or default value
    """
    try:
        if num is None or den is None or den == 0:
            return default
        return f"{(float(num) / float(den) * 100):.1f}%"
    except (ValueError, TypeError, ZeroDivisionError):
        return default


def safe_float_conversion(value: Any, default: float = 0.0) -> float:
    """
    Safely convert a value to float, with None handling.

    Args:
        value: Value to convert
        default: Default value for None/invalid inputs

    Returns:
        Float value or default
    """
    try:
        if value is None:
            return default
        return float(value)
    except (ValueError, TypeError):
        return default


def safe_int_conversion(value: Any, default: int = 0) -> int:
    """
    Safely convert a value to int, with None handling.

    Args:
        value: Value to convert
        default: Default value for None/invalid inputs

    Returns:
        Integer value or default
    """
    try:
        if value is None:
            return default
        return int(float(value))  # Convert via float first to handle strings like "1.0"
    except (ValueError, TypeError):
        return default
