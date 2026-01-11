"""
Widget Model

Defines the data structure for widgets - floating overlays that can display
live streams or embedded content on any page.

Widget Types:
- system: Created by admins, visible to all applicable users
- personal: Created by individual users, visible only to them
"""

from datetime import datetime
from typing import Optional, List
from enum import Enum
from beanie import Document
from pydantic import BaseModel, Field


class WidgetType(str, Enum):
    """Type of widget ownership"""
    SYSTEM = "system"      # Admin-created, visible to targeted users
    PERSONAL = "personal"  # User-created, visible only to owner


class WidgetContentType(str, Enum):
    """Type of content displayed in widget"""
    LIVE_CHANNEL = "live_channel"  # Live TV stream
    IFRAME = "iframe"              # External embed URL
    PODCAST = "podcast"            # Podcast episode
    VOD = "vod"                    # Video on demand
    RADIO = "radio"                # Radio station
    LIVE = "live"                  # Generic live content
    CUSTOM = "custom"              # Custom React component


class WidgetPosition(BaseModel):
    """Position and size of widget on screen"""
    x: float = 20.0           # Pixels from left (or right in RTL)
    y: float = 100.0          # Pixels from top
    width: int = 320          # Widget width in pixels
    height: int = 180         # Widget height in pixels (16:9 ratio default)
    z_index: int = 100        # Layering order


class WidgetContent(BaseModel):
    """Content configuration for widget"""
    content_type: WidgetContentType

    # For LIVE_CHANNEL type
    live_channel_id: Optional[str] = None

    # For PODCAST, VOD, RADIO, LIVE types
    podcast_id: Optional[str] = None
    content_id: Optional[str] = None  # Generic content ID for VOD
    station_id: Optional[str] = None

    # For IFRAME type
    iframe_url: Optional[str] = None
    iframe_title: Optional[str] = None

    # For CUSTOM type (React components)
    component_name: Optional[str] = None  # e.g., "ynet_mivzakim"


class Widget(Document):
    """
    Widget document for MongoDB storage.

    Widgets are floating overlay components that can display live streams
    or embedded content anywhere on the application.
    """

    # Identity
    type: WidgetType                          # system or personal
    user_id: Optional[str] = None             # Only for personal widgets (owner)

    # Display
    title: str
    description: Optional[str] = None
    icon: Optional[str] = None                # Icon URL or emoji

    # Content
    content: WidgetContent

    # Positioning (default values, can be overridden per-user)
    position: WidgetPosition = Field(default_factory=WidgetPosition)

    # Behavior flags
    is_active: bool = True                    # Whether widget is enabled
    is_muted: bool = True                     # Default mute state (all muted by default)
    is_visible: bool = True                   # Default visibility state
    is_closable: bool = True                  # Allow users to close
    is_draggable: bool = True                 # Allow users to reposition

    # Targeting (for system widgets)
    visible_to_roles: List[str] = Field(default_factory=lambda: ["user"])
    visible_to_subscription_tiers: List[str] = Field(default_factory=list)
    target_pages: List[str] = Field(default_factory=list)  # Empty = all pages

    # Ordering
    order: int = 0                            # Display order when multiple widgets

    # Metadata
    created_by: Optional[str] = None          # Admin user ID for system widgets
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "widgets"
        indexes = [
            "type",
            "user_id",
            "is_active",
            ("type", "is_active"),
            ("user_id", "is_active"),
            "created_at",
            "order",
        ]


# Pydantic schemas for API requests/responses

class WidgetCreateRequest(BaseModel):
    """Request schema for creating a widget"""
    title: str
    description: Optional[str] = None
    icon: Optional[str] = None
    content: WidgetContent
    position: Optional[WidgetPosition] = None
    is_muted: bool = True
    is_closable: bool = True
    is_draggable: bool = True
    # Targeting (only for system widgets)
    visible_to_roles: List[str] = Field(default_factory=lambda: ["user"])
    visible_to_subscription_tiers: List[str] = Field(default_factory=list)
    target_pages: List[str] = Field(default_factory=list)
    order: int = 0


class WidgetUpdateRequest(BaseModel):
    """Request schema for updating a widget (all fields optional)"""
    title: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    content: Optional[WidgetContent] = None
    position: Optional[WidgetPosition] = None
    is_active: Optional[bool] = None
    is_muted: Optional[bool] = None
    is_visible: Optional[bool] = None
    is_closable: Optional[bool] = None
    is_draggable: Optional[bool] = None
    visible_to_roles: Optional[List[str]] = None
    visible_to_subscription_tiers: Optional[List[str]] = None
    target_pages: Optional[List[str]] = None
    order: Optional[int] = None


class WidgetPositionUpdate(BaseModel):
    """Request schema for updating widget position only"""
    x: float
    y: float
    width: Optional[int] = None
    height: Optional[int] = None


class WidgetResponse(BaseModel):
    """Response schema for widget data"""
    id: str
    type: WidgetType
    user_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    icon: Optional[str] = None
    content: WidgetContent
    position: WidgetPosition
    is_active: bool
    is_muted: bool
    is_visible: bool
    is_closable: bool
    is_draggable: bool
    visible_to_roles: List[str]
    visible_to_subscription_tiers: List[str]
    target_pages: List[str]
    order: int
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
