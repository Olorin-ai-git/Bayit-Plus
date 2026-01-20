"""
User System Widget Model

Tracks which system widgets a user has added to their collection.
This enables the opt-in model where users browse and choose which
system widgets to display, rather than auto-pushing all system widgets.
"""

from datetime import datetime
from typing import Optional

from app.models.widget import WidgetPosition
from beanie import Document
from pydantic import BaseModel, Field


class UserSystemWidget(Document):
    """
    Tracks a user's subscription to a system widget.

    When a user adds a system widget to their collection, a document
    is created here. The widget content comes from the Widget collection,
    but user-specific preferences (position, mute state) are stored here.
    """

    # Identity
    user_id: str  # Reference to User
    widget_id: str  # Reference to Widget (system type)

    # When added
    added_at: datetime = Field(default_factory=datetime.utcnow)

    # User's custom preferences for this widget (overrides widget defaults)
    position: Optional[WidgetPosition] = None  # Custom position override
    is_muted: bool = True  # User's mute preference
    is_visible: bool = True  # User hasn't closed it

    # User's preferred order for this widget
    order: int = 0

    class Settings:
        name = "user_system_widgets"
        indexes = [
            # Unique constraint: one subscription per user per widget
            [("user_id", 1), ("widget_id", 1)],
            "user_id",
            "widget_id",
        ]


# Pydantic schemas for API requests/responses


class UserSystemWidgetResponse(BaseModel):
    """Response schema for user's system widget subscription"""

    id: str
    user_id: str
    widget_id: str
    added_at: datetime
    position: Optional[WidgetPosition] = None
    is_muted: bool
    is_visible: bool
    order: int

    class Config:
        from_attributes = True


class UserSystemWidgetPositionUpdate(BaseModel):
    """Request schema for updating user's widget position"""

    x: float
    y: float
    width: Optional[int] = None
    height: Optional[int] = None


class UserSystemWidgetPreferencesUpdate(BaseModel):
    """Request schema for updating user's widget preferences"""

    is_muted: Optional[bool] = None
    is_visible: Optional[bool] = None
    order: Optional[int] = None
