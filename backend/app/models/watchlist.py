from datetime import datetime
from typing import Optional
from beanie import Document
from pydantic import Field


class WatchlistItem(Document):
    user_id: str
    content_id: str
    content_type: str  # vod, live, podcast
    added_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "watchlist"
        indexes = [
            "user_id",
            ("user_id", "content_id"),
        ]


class WatchHistory(Document):
    user_id: str
    content_id: str
    content_type: str  # vod, live, radio, podcast

    # Progress
    position: float = 0  # seconds
    duration: float = 0  # seconds
    progress_percent: float = 0
    completed: bool = False

    # Timestamps
    started_at: datetime = Field(default_factory=datetime.utcnow)
    last_watched_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "watch_history"
        indexes = [
            "user_id",
            ("user_id", "content_id"),
            ("user_id", "last_watched_at"),
        ]


class Conversation(Document):
    user_id: str
    messages: list[dict] = Field(default_factory=list)  # {role, content, timestamp}
    context: dict = Field(default_factory=dict)  # AI context
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "conversations"
        indexes = [
            "user_id",
        ]
