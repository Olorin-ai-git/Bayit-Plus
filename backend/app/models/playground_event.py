"""Playground portal analytics event document."""

import logging
from datetime import datetime, timezone
from typing import Optional

from beanie import Document
from pymongo import IndexModel

logger = logging.getLogger(__name__)

ALLOWED_EVENT_NAMES = frozenset([
    "page_view",
    "magic_link_entry",
    "content_track_selected",
    "tour_started",
    "demo_stop_viewed",
    "demo_interaction",
    "demo_stop_completed",
    "demo_limit_reached",
    "private_code_unlocked",
    "try_own_video_started",
    "try_own_video_completed",
    "registration_started",
    "registration_completed",
    "cta_clicked",
    "tour_completed",
])


class PlaygroundEvent(Document):
    """Single analytics event from the playground portal."""

    event_name: str
    session_id: str
    user_id: Optional[str] = None
    auth_state: str  # "guest" | "registered"
    track: str  # "training" | "entertainment"
    properties: dict = {}
    timestamp: datetime
    created_at: datetime = datetime.now(timezone.utc)

    class Settings:
        name = "playground_events"
        indexes = [
            "event_name",
            "session_id",
            IndexModel(
                [("created_at", 1)],
                expireAfterSeconds=7_776_000,  # 90 days
            ),
        ]
