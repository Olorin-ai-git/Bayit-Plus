"""
Guest Demo Usage Tracking — tracks unauthenticated demo interactions by fingerprint.
"""

from datetime import datetime

from beanie import Document, Indexed
from pydantic import Field


class GuestDemoUsage(Document):
    fingerprint: Indexed(str, unique=True)  # type: ignore
    ip_address: str = ""
    interaction_count: int = Field(default=0, ge=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_interaction_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "guest_demo_usage"
        indexes = ["fingerprint"]

    def can_interact(self, max_interactions: int) -> bool:
        return self.interaction_count < max_interactions
