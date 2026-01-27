"""
User Audiobook Actions Model

Tracks user interactions with audiobooks: favorites, ratings, watchlist items.
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from beanie import Document
from pydantic import Field, validator


class UserAudiobookActionType(str, Enum):
    """Types of user audiobook interactions"""
    FAVORITE = "favorite"
    UNFAVORITE = "unfavorite"
    RATE = "rate"
    UNRATE = "unrate"
    ADD_TO_WATCHLIST = "add_to_watchlist"
    REMOVE_FROM_WATCHLIST = "remove_from_watchlist"


class UserAudiobook(Document):
    """
    User's interaction with an audiobook.

    Tracks favorites, ratings, and watchlist items per user.
    """

    # IDs
    user_id: str = Field(..., description="User ID")
    audiobook_id: str = Field(..., description="Audiobook ID")

    # Actions
    is_favorite: bool = Field(default=False, description="Is audiobook favorited")
    rating: Optional[int] = Field(
        default=None,
        ge=1,
        le=5,
        description="User rating (1-5 stars)"
    )
    in_watchlist: bool = Field(default=False, description="Is in watchlist")

    # Metadata
    last_action_type: UserAudiobookActionType = Field(
        default=UserAudiobookActionType.FAVORITE,
        description="Last action performed"
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @validator("user_id", "audiobook_id", pre=True)
    def validate_ids(cls, v: str) -> str:
        """Ensure IDs are non-empty strings"""
        if not v or not isinstance(v, str):
            raise ValueError("ID must be non-empty string")
        return v

    class Settings:
        """Beanie document settings"""
        name = "user_audiobooks"
        indexes = [
            ["user_id"],
            ["audiobook_id"],
            ["user_id", "audiobook_id"],
            ["user_id", "is_favorite"],
            ["user_id", "in_watchlist"],
        ]


class UserAudiobookReview(Document):
    """
    User review of an audiobook.

    Stores review text and ratings for audiobooks.
    """

    # IDs
    user_id: str = Field(..., description="User ID")
    audiobook_id: str = Field(..., description="Audiobook ID")

    # Review data
    rating: int = Field(..., ge=1, le=5, description="Star rating (1-5)")
    review_text: Optional[str] = Field(
        default=None,
        max_length=1000,
        description="Review text"
    )

    # Metadata
    helpful_count: int = Field(default=0, description="Number of helpful votes")
    unhelpful_count: int = Field(default=0, description="Number of unhelpful votes")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @validator("user_id", "audiobook_id", pre=True)
    def validate_ids(cls, v: str) -> str:
        """Ensure IDs are non-empty strings"""
        if not v or not isinstance(v, str):
            raise ValueError("ID must be non-empty string")
        return v

    class Settings:
        """Beanie document settings"""
        name = "audiobook_reviews"
        indexes = [
            ["user_id"],
            ["audiobook_id"],
            ["user_id", "audiobook_id"],
            ["created_at"],
        ]
