"""
Avatar Outfit Model.

Collectible wardrobe items that can be equipped on child avatars.
Outfits are overlay PNG assets composited via FFmpeg during rendering.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from beanie import Document, Indexed
from pydantic import BaseModel, Field
from pymongo import IndexModel


class OutfitCategory(str, Enum):
    """Outfit thematic categories."""

    ISRAELI_HERITAGE = "israeli_heritage"
    HOLIDAY = "holiday"
    SPORTS = "sports"
    FANTASY = "fantasy"
    SHOW_CHARACTER = "show_character"


class OutfitRarity(str, Enum):
    """Outfit rarity tiers affecting price and availability."""

    COMMON = "common"
    UNCOMMON = "uncommon"
    RARE = "rare"
    EPIC = "epic"
    LEGENDARY = "legendary"


class AvatarOutfit(Document):
    """
    Outfit template available in the wardrobe catalog.

    Each outfit is a PNG overlay with alpha transparency
    composited onto the avatar during mission rendering.
    """

    outfit_id: str = Field(..., description="Unique outfit identifier")
    name: str = Field(..., max_length=100)
    name_he: str = Field(..., max_length=100)
    description: str = Field(default="", max_length=300)
    description_he: str = Field(default="", max_length=300)

    category: OutfitCategory
    rarity: OutfitRarity = OutfitRarity.COMMON

    # Asset paths (GCS)
    overlay_gcs_path: str = Field(
        ..., description="PNG overlay with transparency"
    )
    thumbnail_gcs_path: str = Field(
        default="", description="Thumbnail for catalog display"
    )
    preview_gcs_path: str = Field(
        default="", description="Preview on avatar for wardrobe"
    )

    # Pricing (in shekels)
    shekel_price: int = Field(default=0, ge=0)

    # Availability
    is_active: bool = True
    is_purchasable: bool = True
    is_reward_only: bool = Field(
        default=False,
        description="Only obtainable via mission rewards",
    )
    required_mission_count: int = Field(
        default=0, ge=0,
        description="Missions needed to unlock purchase",
    )

    # Overlay positioning
    anchor_x: float = Field(default=0.5, ge=0.0, le=1.0)
    anchor_y: float = Field(default=0.3, ge=0.0, le=1.0)
    scale: float = Field(default=1.0, ge=0.1, le=3.0)

    # Metadata
    icon_name: str = Field(
        default="", description="Icon from @olorin/icons"
    )
    sort_order: int = Field(default=0)

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    class Settings:
        name = "avatar_outfits"
        indexes = [
            IndexModel([("outfit_id", 1)], unique=True),
            IndexModel([("category", 1)]),
            IndexModel([("rarity", 1)]),
            IndexModel([("is_active", 1), ("sort_order", 1)]),
        ]


class ProfileOutfitInventory(BaseModel):
    """Outfit owned by a child profile (embedded in ChildAvatar)."""

    outfit_id: str
    acquired_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    acquisition_source: str = Field(
        default="purchase",
        description="purchase, mission_reward, gift",
    )


class OutfitCatalogResponse(BaseModel):
    """API response for outfit catalog listing."""

    id: str
    outfit_id: str
    name: str
    name_he: str
    description: str
    description_he: str
    category: str
    rarity: str
    thumbnail_url: str
    shekel_price: int
    is_purchasable: bool
    is_reward_only: bool
    required_mission_count: int
    owned: bool = False

    class Config:
        from_attributes = True


class OutfitInventoryResponse(BaseModel):
    """API response for owned outfits."""

    outfits: List[OutfitCatalogResponse]
    active_outfit_id: Optional[str]
    total_owned: int
