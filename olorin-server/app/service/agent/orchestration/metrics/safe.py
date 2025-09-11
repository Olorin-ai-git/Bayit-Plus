"""
Safe division utilities to prevent NoneType and zero division errors.
"""

def safe_div(n, d, default=0.0):
    """Safe division with default fallback."""
    try:
        return (n / d) if d else default
    except Exception:
        return default