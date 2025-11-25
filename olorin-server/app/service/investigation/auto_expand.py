"""
Auto-Expand Window Service

Automatically expands time windows until minimum support thresholds are met.

Constitutional Compliance:
- All logic configurable via config
- Respects label maturity for retro windows
- Deterministic expansion behavior
"""

import inspect
from datetime import datetime, timedelta
from typing import Any, Callable, Dict, Optional, Tuple

from app.config.eval import EVAL_DEFAULTS
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def expand_window_until_support(
    fetch_count_fn: Callable[[datetime, datetime], Dict[str, int]],
    start: datetime,
    end: datetime,
    is_retro: bool,
    today: datetime,
    max_days: Optional[int] = None,
) -> Tuple[datetime, datetime, Dict[str, Any]]:
    """
    Expand window until minimum support thresholds are met.

    Args:
        fetch_count_fn: Function that takes (start, end) and returns dict with:
            - known_transactions: int
            - actual_frauds: int
            - predicted_positives: int
        start: Initial window start
        end: Initial window end
        is_retro: True if this is a retro window (must respect label maturity)
        today: Current datetime (for label maturity calculation)
        max_days: Maximum window length in days (default from config)

    Returns:
        Tuple of (effective_start, effective_end, metadata_dict)
    """
    cfg = EVAL_DEFAULTS
    ms = cfg["min_support"]
    auto = cfg["auto_expand"]
    max_days = max_days or auto["max_days"]
    step = timedelta(days=auto["step_days"])
    label_gap = (
        timedelta(days=auto["label_maturity_days"]) if is_retro else timedelta(0)
    )

    # Initial window
    cur_start, cur_end = start, end
    reasons = []

    def meets_support(snapshot: Dict[str, int]) -> bool:
        """Check if snapshot meets minimum support requirements."""
        return (
            snapshot.get("known_transactions", 0) >= ms["min_transactions"]
            and snapshot.get("actual_frauds", 0) >= ms["min_actual_frauds"]
            and snapshot.get("predicted_positives", 0) >= ms["min_predicted_positives"]
        )

    # Check initial window
    snap = (
        await fetch_count_fn(cur_start, cur_end)
        if inspect.iscoroutinefunction(fetch_count_fn)
        else fetch_count_fn(cur_start, cur_end)
    )

    # Expand if needed
    while not meets_support(snap):
        # Calculate new window (expand backward in time)
        new_start = cur_start - step
        new_end = cur_end

        # Check bounds
        window_days = (new_end - new_start).days
        if window_days > max_days:
            reasons.append("max_days_reached")
            logger.info(f"Window expansion stopped: reached max_days={max_days}")
            break

        # For retro windows, ensure end doesn't exceed maturity boundary
        if is_retro:
            maturity_boundary = today - label_gap
            if new_end > maturity_boundary:
                new_end = maturity_boundary
                # If we can't expand further, stop
                if new_end <= cur_end:
                    reasons.append("label_maturity_boundary")
                    logger.info(
                        f"Window expansion stopped: hit label maturity boundary"
                    )
                    break

        cur_start = new_start
        cur_end = new_end

        # Fetch new snapshot
        snap = (
            await fetch_count_fn(cur_start, cur_end)
            if inspect.iscoroutinefunction(fetch_count_fn)
            else fetch_count_fn(cur_start, cur_end)
        )

        # Safety: prevent infinite loops
        if (cur_end - cur_start).days > max_days * 2:
            reasons.append("safety_limit")
            logger.warning("Window expansion stopped: safety limit reached")
            break

    expanded = cur_start != start or cur_end != end

    metadata = {
        "expanded": expanded,
        "attempts": [(end - start).days, (cur_end - cur_start).days],
        "reasons": reasons,
        "effective_support": snap,
    }

    if expanded:
        logger.info(
            f"Window expanded: {start.date()} to {end.date()} "
            f"→ {cur_start.date()} to {cur_end.date()} "
            f"(support: {snap})"
        )

    return cur_start, cur_end, metadata
