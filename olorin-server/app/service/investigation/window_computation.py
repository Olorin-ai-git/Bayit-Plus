"""
Window Computation Service

Computes time windows for investigation comparison with America/New_York timezone.
Inclusive start, exclusive end semantics.

Constitutional Compliance:
- All configuration from environment variables
- No hardcoded dates or business logic
- Proper timezone handling
"""

from datetime import datetime, timedelta
from typing import Tuple, Optional
import pytz
from app.service.logging import get_bridge_logger
from app.router.models.investigation_comparison_models import WindowPreset, WindowSpec

logger = get_bridge_logger(__name__)

# Timezone: America/New_York
NY_TZ = pytz.timezone("America/New_York")


def compute_window(
    preset: WindowPreset,
    custom_start: Optional[datetime] = None,
    custom_end: Optional[datetime] = None
) -> Tuple[datetime, datetime, str]:
    """
    Compute window start, end, and label based on preset.

    Args:
        preset: Window preset type
        custom_start: Custom start time (required if preset is CUSTOM)
        custom_end: Custom end time (required if preset is CUSTOM)

    Returns:
        Tuple of (start_datetime, end_datetime, label)

    Raises:
        ValueError: If custom window missing required parameters
    """
    now_ny = datetime.now(NY_TZ)

    if preset == WindowPreset.RECENT_14D:
        end = now_ny.replace(hour=0, minute=0, second=0, microsecond=0)
        start = end - timedelta(days=14)
        label = "Recent 14d"

    elif preset == WindowPreset.RETRO_14D_6MO_BACK:
        import os
        # Get max lookback months from environment (default: 6 months)
        max_lookback_months = int(os.getenv('ANALYTICS_MAX_LOOKBACK_MONTHS', '6'))
        max_lookback_days = max_lookback_months * 30  # Approximate months to days
        
        recent_end = now_ny.replace(hour=0, minute=0, second=0, microsecond=0)
        recent_start = recent_end - timedelta(days=14)
        retro_start = recent_start - timedelta(days=max_lookback_days)
        retro_end = retro_start + timedelta(days=14)
        start = retro_start
        end = retro_end
        label = f"Retro 14d ({max_lookback_months}mo back)"

    elif preset == WindowPreset.CUSTOM:
        if custom_start is None or custom_end is None:
            raise ValueError("custom_start and custom_end required for CUSTOM preset")
        start = custom_start
        end = custom_end
        label = f"Custom ({start.date()} to {end.date()})"

    else:
        raise ValueError(f"Unknown preset: {preset}")

    return start, end, label


def compute_windows_from_specs(
    window_a_spec: WindowSpec,
    window_b_spec: WindowSpec
) -> Tuple[Tuple[datetime, datetime, str], Tuple[datetime, datetime, str]]:
    """
    Compute both windows from specifications.

    Args:
        window_a_spec: Window A specification
        window_b_spec: Window B specification

    Returns:
        Tuple of ((start_a, end_a, label_a), (start_b, end_b, label_b))
    """
    window_a = compute_window(
        window_a_spec.preset,
        window_a_spec.start,
        window_a_spec.end
    )
    window_b = compute_window(
        window_b_spec.preset,
        window_b_spec.start,
        window_b_spec.end
    )

    label_a = window_a_spec.label or window_a[2]
    label_b = window_b_spec.label or window_b[2]

    return (
        (window_a[0], window_a[1], label_a),
        (window_b[0], window_b[1], label_b)
    )

