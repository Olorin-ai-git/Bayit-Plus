from datetime import datetime
from typing import List, Optional

from beanie import Document
from pydantic import BaseModel, Field


class ProfileCreate(BaseModel):
    name: str
    avatar: Optional[str] = None
    avatar_color: str = "#00d9ff"
    is_kids_profile: bool = False
    kids_age_limit: Optional[int] = None
    pin: Optional[str] = None


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    avatar: Optional[str] = None
    avatar_color: Optional[str] = None
    is_kids_profile: Optional[bool] = None
    kids_age_limit: Optional[int] = None
    pin: Optional[str] = None
    preferences: Optional[dict] = None


class ProfileResponse(BaseModel):
    id: str
    user_id: str
    name: str
    avatar: Optional[str] = None
    avatar_color: str = "#00d9ff"
    is_kids_profile: bool = False
    kids_age_limit: Optional[int] = None
    has_pin: bool = False
    preferences: dict
    favorite_categories: List[str] = []
    created_at: datetime
    last_used_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Profile(Document):
    user_id: str  # Parent account ID
    name: str
    avatar: Optional[str] = None  # URL or emoji
    avatar_color: str = "#00d9ff"  # Profile theme color
    is_kids_profile: bool = False  # Enables content restrictions
    kids_age_limit: Optional[int] = None  # Max age rating for kids (e.g., 3, 7, 12)
    pin: Optional[str] = None  # Hashed PIN for profile lock

    # Profile-specific preferences
    preferences: dict = Field(
        default_factory=lambda: {
            "language": "he",
            "subtitles_enabled": True,
            "nikud_enabled": False,
            "autoplay_next": True,
            "subtitle_language": "he",
        }
    )

    # Profile-specific data
    favorite_categories: List[str] = Field(default_factory=list)

    # AI Recommendations
    taste_profile: dict = Field(default_factory=dict)  # AI-generated taste data

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_used_at: Optional[datetime] = None

    class Settings:
        name = "profiles"
        indexes = [
            "user_id",
            ("user_id", "name"),
        ]

    def to_response(self) -> ProfileResponse:
        return ProfileResponse(
            id=str(self.id),
            user_id=self.user_id,
            name=self.name,
            avatar=self.avatar,
            avatar_color=self.avatar_color,
            is_kids_profile=self.is_kids_profile,
            kids_age_limit=self.kids_age_limit,
            has_pin=self.pin is not None,
            preferences=self.preferences,
            favorite_categories=self.favorite_categories,
            created_at=self.created_at,
            last_used_at=self.last_used_at,
        )
