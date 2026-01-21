"""Investigation Selector - Selects and filters investigations for time windows."""

from datetime import datetime
from typing import Any, Dict, List, Optional

import pytz

from app.persistence import list_investigations
from app.service.investigation.investigation_loader import get_investigation_by_id
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def _parse_datetime(value: Any, tz: Any) -> Optional[datetime]:
    """Parse datetime ensuring timezone-aware."""
    if value is None:
        return None
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return tz.localize(value) if value.tzinfo is None else value.astimezone(tz)


def _ensure_tz_aware(dt: Optional[datetime], tz: Any) -> Optional[datetime]:
    """Ensure datetime is timezone-aware."""
    if dt is None:
        return None
    return tz.localize(dt) if dt.tzinfo is None else dt.astimezone(tz)


def get_investigations_for_time_window(
    entity_type: Optional[str] = None, entity_id: Optional[str] = None,
    window_start: Optional[datetime] = None, window_end: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    """Get investigations matching criteria and overlapping the time window."""
    all_investigations = list_investigations()
    tz = pytz.timezone("America/New_York")
    window_start = _ensure_tz_aware(window_start, tz)
    window_end = _ensure_tz_aware(window_end, tz)

    matching = []
    for inv in all_investigations:
        inv_dict = inv if isinstance(inv, dict) else (inv.__dict__ if hasattr(inv, "__dict__") else {})

        inv_id = inv_dict.get("id") or inv_dict.get("investigation_id")
        if inv_id:
            full_inv = get_investigation_by_id(inv_id)
            if full_inv:
                inv_dict.update(full_inv)

        if entity_type and inv_dict.get("entity_type") != entity_type:
            continue
        if entity_id and inv_dict.get("entity_id") != entity_id:
            continue

        inv_from = _parse_datetime(inv_dict.get("from_date"), tz)
        inv_to = _parse_datetime(inv_dict.get("to_date"), tz)
        if not inv_from or not inv_to:
            continue

        if window_start and window_end and (inv_to <= window_start or inv_from >= window_end):
            continue

        matching.append(inv_dict)
    return matching


def select_best_investigation(
    investigations: List[Dict[str, Any]], window_start: datetime, window_end: datetime,
) -> Optional[Dict[str, Any]]:
    """Select best investigation for a window (fully covering first, then largest overlap)."""
    if not investigations:
        return None

    tz = pytz.timezone("America/New_York")
    parsed = []
    for inv in investigations:
        inv_from = _parse_datetime(inv.get("from_date"), tz)
        inv_to = _parse_datetime(inv.get("to_date"), tz)
        if inv_from and inv_to:
            parsed.append({"inv": inv, "from": inv_from, "to": inv_to, "created": _parse_datetime(inv.get("created"), tz)})

    if not parsed:
        return None

    window_start = _ensure_tz_aware(window_start, tz)
    window_end = _ensure_tz_aware(window_end, tz)

    # Rule 1: Fully covering investigations
    fully_covering = [p for p in parsed if p["from"] <= window_start and p["to"] >= window_end]
    if fully_covering:
        best = max(fully_covering, key=lambda p: p["created"] or datetime.min)
        logger.debug(f"[SELECT_BEST] Selected {best['inv'].get('id', 'unknown')}")
        return best["inv"]

    # Rule 2: Largest overlap
    overlaps = []
    for p in parsed:
        overlap_start, overlap_end = max(p["from"], window_start), min(p["to"], window_end)
        if overlap_end > overlap_start:
            overlaps.append({"inv": p["inv"], "overlap": (overlap_end - overlap_start).total_seconds(), "created": p["created"]})

    if overlaps:
        overlaps.sort(key=lambda x: (x["overlap"], x["created"] or datetime.min), reverse=True)
        logger.debug(f"[SELECT_BEST] Selected {overlaps[0]['inv'].get('id', 'unknown')}")
        return overlaps[0]["inv"]

    return None
