"""File path utilities for incremental reports."""

import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

ARTIFACTS_DIR = Path("artifacts")


def get_incremental_file_path(window_date: Optional[datetime] = None) -> Path:
    """
    Get the incremental report file path with the 24h window date in the filename.

    Format: startup_analysis_DAILY_YYYY-MM-DD.html

    Args:
        window_date: The 24h window date being analyzed. If provided, uses this date.
                     Otherwise falls back to SELECTOR_REFERENCE_DATE env var, then current date.
    """
    if window_date:
        date_suffix = window_date.strftime("%Y-%m-%d")
    else:
        ref_date_str = os.getenv("SELECTOR_REFERENCE_DATE")
        if ref_date_str:
            try:
                if "T" in ref_date_str:
                    ref_date = datetime.fromisoformat(ref_date_str)
                else:
                    ref_date = datetime.strptime(ref_date_str, "%Y-%m-%d")
                date_suffix = ref_date.strftime("%Y-%m-%d")
            except ValueError:
                date_suffix = datetime.now().strftime("%Y-%m-%d")
        else:
            date_suffix = datetime.now().strftime("%Y-%m-%d")

    return ARTIFACTS_DIR / f"startup_analysis_DAILY_{date_suffix}.html"


def extract_window_date_from_investigations(
    investigations: List[Dict[str, Any]]
) -> Optional[datetime]:
    """
    Extract the 24h window date from selector_metadata in investigations.

    The selector_metadata contains start_time and end_time of the 24h window.
    We use the end_time (or start_time) to determine the date for the filename.
    """
    if not investigations:
        return None

    selector_metadata = investigations[0].get("selector_metadata")
    if not selector_metadata:
        return None

    time_str = selector_metadata.get("end_time") or selector_metadata.get("start_time")
    if not time_str:
        return None

    if isinstance(time_str, datetime):
        return time_str

    try:
        if isinstance(time_str, str):
            time_str = time_str.replace("Z", "+00:00")
            return datetime.fromisoformat(time_str)
    except (ValueError, TypeError):
        logger.debug(f"Could not parse window date from: {time_str}")

    return None


def filter_investigations_by_date(
    investigations: List[Dict[str, Any]], target_date: datetime
) -> List[Dict[str, Any]]:
    """Filter investigations to only include those matching the target date."""
    filtered = []
    target_day = target_date.date()

    for inv in investigations:
        inv_date = extract_window_date_from_investigations([inv])
        if inv_date and inv_date.date() == target_day:
            filtered.append(inv)

    return filtered
