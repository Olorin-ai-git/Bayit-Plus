"""
Demo Feature Usage Tracking — tracks per-user, per-feature usage for the demo portal.

Registered demo users get a limited number of AI-powered feature uses
(Pause & Ask, Character Memory, Comprehension Mode) before hitting
the free-tier cap.
"""

from datetime import datetime

from beanie import Document, Indexed
from pydantic import Field


class DemoFeatureUsage(Document):
    user_id: str = Field(..., description="Authenticated user ID")
    feature: str = Field(
        ...,
        description="Feature key: pause_ask | character_memory | comprehension",
    )
    usage_count: int = Field(default=0, ge=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "demo_feature_usage"
        indexes = [
            [("user_id", 1), ("feature", 1)],
        ]
