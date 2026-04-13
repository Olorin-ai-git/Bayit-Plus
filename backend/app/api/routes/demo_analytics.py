"""Playground analytics event ingestion endpoints."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Response

from app.core.security import get_current_user
from app.models.playground_event import PlaygroundEvent
from app.models.user import User
from app.schemas.demo_analytics import (
    BeaconIngestRequest,
    EventIngestRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/demo/events", tags=["demo", "analytics"])


@router.post("", status_code=202)
async def ingest_event(
    body: EventIngestRequest,
    user: User = Depends(get_current_user),
) -> Response:
    """Ingest a single playground analytics event."""
    event = PlaygroundEvent(
        event_name=body.event_name,
        session_id=body.session_id,
        user_id=str(user.id),
        auth_state=(
            "guest"
            if user.role == "user" and "guest-" in (user.email or "")
            else "registered"
        ),
        track=body.track,
        properties=body.properties,
        timestamp=body.timestamp,
        created_at=datetime.now(timezone.utc),
    )
    await event.insert()
    return Response(status_code=202)


@router.post("/beacon", status_code=202)
async def ingest_beacon_event(body: BeaconIngestRequest) -> Response:
    """Ingest event via sendBeacon (unauthenticated fallback)."""
    event = PlaygroundEvent(
        event_name=body.event_name,
        session_id=body.session_id,
        user_id=None,
        auth_state="guest",
        track=body.track,
        properties=body.properties,
        timestamp=body.timestamp,
        created_at=datetime.now(timezone.utc),
    )
    await event.insert()
    return Response(status_code=202)
