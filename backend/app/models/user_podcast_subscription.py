"""
User Podcast Subscription Model

Tracks user subscriptions to podcasts.
Distinguishes between system-curated and user-added custom podcasts.
"""

from datetime import datetime
from typing import Optional

from beanie import Document
from pydantic import Field
from pymongo import IndexModel


class UserPodcastSubscription(Document):
    """
    User subscription to a podcast.

    Tracks which podcasts users are subscribed to and whether they added
    the podcast themselves (via RSS) or it's a system-curated podcast.
    """

    user_id: str
    podcast_id: str

    # Track whether this was user-added (vs system-curated)
    is_user_added: bool = False

    # Metadata
    subscribed_at: datetime = Field(default_factory=datetime.utcnow)

    # Soft delete
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None

    class Settings:
        name = "user_podcast_subscriptions"
        indexes = [
            "user_id",
            "podcast_id",
            ("user_id", "podcast_id"),
            ("user_id", "is_deleted"),
            ("user_id", "is_user_added", "is_deleted"),
            IndexModel(
                [("user_id", 1), ("podcast_id", 1), ("is_deleted", 1)],
                name="user_podcast_unique",
                unique=True,
            ),
        ]
