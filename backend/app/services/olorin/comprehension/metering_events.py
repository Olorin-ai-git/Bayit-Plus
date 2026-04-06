"""Metering events for comprehension_mode capability (D-21, D-22, D-23).

Fires UsageRecord rows via the existing metering_service for both partner
API path and training-portal path. Best-effort: exceptions are logged and
swallowed so capability calls never fail because metering is unavailable.
"""
from datetime import datetime, timezone
from typing import Optional

from app.core.logging_config import get_logger
from app.services.olorin.metering_service import metering_service

logger = get_logger(__name__)

COMPREHENSION_CAPABILITY = "comprehension_mode"
EVENT_SESSION_STARTED = "comprehension.session.started"
EVENT_TURN_POSTED = "comprehension.turn.posted"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def emit_comprehension_session_started(
    partner_id: str,
    session_id: str,
    external_session_id: Optional[str],
    content_id: str,
) -> None:
    """Record a comprehension.session.started UsageRecord (D-21)."""
    metadata = {
        "event_type": EVENT_SESSION_STARTED,
        "partner_id": partner_id,
        "timestamp": _now_iso(),
        "capability": COMPREHENSION_CAPABILITY,
        "session_id": session_id,
        "external_session_id": external_session_id,
        "content_id": content_id,
    }
    try:
        await metering_service.record_usage(
            partner_id=partner_id,
            capability=COMPREHENSION_CAPABILITY,
            metadata=metadata,
        )
    except Exception as exc:  # noqa: BLE001 — metering is best-effort
        logger.warning(
            "emit_comprehension_session_started failed",
            extra={
                "partner_id": partner_id,
                "session_id": session_id,
                "error": str(exc),
            },
        )


async def emit_comprehension_turn_posted(
    partner_id: str,
    session_id: str,
    external_session_id: Optional[str],
    content_id: str,
    adapt_level: str,
    score_band: str,
) -> None:
    """Record a comprehension.turn.posted UsageRecord (D-21, D-22)."""
    metadata = {
        "event_type": EVENT_TURN_POSTED,
        "partner_id": partner_id,
        "timestamp": _now_iso(),
        "capability": COMPREHENSION_CAPABILITY,
        "session_id": session_id,
        "external_session_id": external_session_id,
        "content_id": content_id,
        "adapt_level": adapt_level,
        "score_band": score_band,
    }
    try:
        await metering_service.record_usage(
            partner_id=partner_id,
            capability=COMPREHENSION_CAPABILITY,
            metadata=metadata,
        )
    except Exception as exc:  # noqa: BLE001 — metering is best-effort
        logger.warning(
            "emit_comprehension_turn_posted failed",
            extra={
                "partner_id": partner_id,
                "session_id": session_id,
                "error": str(exc),
            },
        )
