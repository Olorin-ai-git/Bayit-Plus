"""Beanie models for email event tracking."""

from datetime import datetime
from typing import Optional

from beanie import Document, Indexed
from pydantic import Field


class EmailEvent(Document):
    """Email event record for tracking delivery, opens, clicks, etc."""

    email_id: Indexed(str)
    event_type: Indexed(str)
    recipient: Indexed(str)
    template_name: str = ""
    subject: str = ""
    timestamp: Indexed(datetime)
    metadata: dict = Field(default_factory=dict)
    sg_message_id: str = ""
    campaign_id: Optional[Indexed(str)] = None
    user_id: Optional[str] = None

    class Settings:
        name = "email_events"
        indexes = [
            "email_id",
            "event_type",
            "recipient",
            "timestamp",
            "campaign_id",
            [
                ("campaign_id", 1),
                ("event_type", 1),
                ("timestamp", -1)
            ]
        ]
