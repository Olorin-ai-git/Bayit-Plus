"""
Blindspot Heatmap Color Utilities.

Color gradient functions for visualizing confusion matrix metrics.

Feature: blindspot-analysis
"""


def get_blindspot_color(fn_rate: float) -> str:
    """Get red gradient color for blind spots based on FN rate."""
    if fn_rate >= 0.50:
        return "#991b1b"  # Dark red - 50%+ fraud missed
    elif fn_rate >= 0.25:
        return "#dc2626"  # Red - 25%+ fraud missed
    elif fn_rate >= 0.10:
        return "#ef4444"  # Light red - 10%+ fraud missed
    elif fn_rate >= 0.05:
        return "#f87171"  # Pale red - 5%+ fraud missed
    else:
        return "#fca5a5"  # Very light red - <5% fraud missed


def get_caught_color(precision: float) -> str:
    """Get green gradient color for caught zones based on precision."""
    if precision >= 0.10:
        return "#15803d"  # Dark green - good precision
    elif precision >= 0.05:
        return "#22c55e"  # Green
    elif precision >= 0.02:
        return "#4ade80"  # Light green
    else:
        return "#86efac"  # Pale green - low precision but still catching


def get_fp_color_by_intensity(intensity: float) -> str:
    """Get orange gradient color based on GMV at risk (0-1 normalized)."""
    if intensity >= 0.8:
        return "#c2410c"  # Dark orange - highest GMV at risk
    elif intensity >= 0.6:
        return "#ea580c"  # Orange
    elif intensity >= 0.4:
        return "#f97316"  # Light orange
    elif intensity >= 0.2:
        return "#fb923c"  # Pale orange
    else:
        return "#fdba74"  # Very light orange - lowest GMV at risk


def get_tn_color(intensity: float) -> str:
    """Get blue gradient color for TN zones based on volume (0-1 normalized)."""
    if intensity >= 0.8:
        return "#1e3a8a"  # Dark blue - highest volume
    elif intensity >= 0.6:
        return "#1e40af"  # Blue
    elif intensity >= 0.4:
        return "#1d4ed8"  # Medium blue
    elif intensity >= 0.2:
        return "#2563eb"  # Light blue
    else:
        return "#3b82f6"  # Very light blue - lowest volume
