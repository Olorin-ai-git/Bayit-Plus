"""Cross-moment character memory for VOD interactions.

Stores a per-user-per-film running memory that is injected into character
prompts so characters can reference prior exchanges naturally.
"""
from datetime import datetime
from typing import List

from beanie import Document
from pydantic import BaseModel, Field
from pymongo import IndexModel

from app.schemas.comprehension import ExchangeType


class FilmMemoryExchange(BaseModel):
    """A single verbatim exchange retained in the recent window."""

    moment_timestamp: float = Field(..., description="Seconds into video")
    character_name: str = Field(..., description="Character addressed in this exchange")
    user_message: str = Field(..., description="User's message text")
    character_response: str = Field(..., description="Character's response text")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    exchange_type: ExchangeType = Field(
        default=ExchangeType.CHARACTER_CHAT,
        description=(
            "Distinguishes grader-origin from chat-origin exchanges (D-02). "
            "Phase 1 character LLM reads only CHARACTER_CHAT. "
            "Grader NEVER reads this field."
        ),
    )


class VODFilmMemory(Document):
    """Cross-moment character memory for one (user, profile, content) tuple.

    Lives alongside VODInteractionSession; joined at prompt-build time.
    """

    user_id: str
    profile_id: str
    content_id: str
    summary: str = Field(default="", description="Running prose narrative of older exchanges")
    recent_exchanges: List[FilmMemoryExchange] = Field(
        default_factory=list,
        description="Verbatim window of most recent exchanges",
    )
    exchange_count: int = Field(default=0, description="Total exchanges seen (analytics)")
    last_moment_timestamp: float = Field(
        default=0.0, description="Most recent moment timestamp interacted with",
    )
    version: int = Field(default=0, description="Optimistic concurrency token")
    summarizer_failure_streak: int = Field(
        default=0,
        description="Consecutive summarizer failures; circuit breaker trips at threshold",
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "vod_film_memories"
        indexes = [
            IndexModel(
                [("user_id", 1), ("profile_id", 1), ("content_id", 1)],
                unique=True,
                name="user_profile_content_unique",
            ),
            "updated_at",
        ]
