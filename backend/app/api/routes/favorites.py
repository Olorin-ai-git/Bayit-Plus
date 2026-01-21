"""
Favorites API Routes
Manage user's favorite content items
"""

from datetime import datetime
from typing import List, Optional

from beanie import Document
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.security import get_current_active_user
from app.models.content import Content, LiveChannel, Podcast
from app.models.user import User


# Favorite model
class Favorite(Document):
    user_id: str
    content_id: str
    content_type: str  # vod, live, podcast, movie, series, channel, radio
    added_at: datetime = datetime.utcnow()

    class Settings:
        name = "favorites"
        indexes = [
            [("user_id", 1), ("content_id", 1)],
            "user_id",
        ]


class FavoriteAdd(BaseModel):
    content_id: str
    content_type: str  # vod, live, podcast, movie, series, channel, radio


class FavoriteItem(BaseModel):
    id: str
    type: str  # Frontend expects 'type' not 'content_type'
    title: str
    title_en: Optional[str] = None
    title_es: Optional[str] = None
    subtitle: Optional[str] = None
    subtitle_en: Optional[str] = None
    subtitle_es: Optional[str] = None
    thumbnail: Optional[str] = None


class FavoritesResponse(BaseModel):
    items: List[FavoriteItem]


router = APIRouter()


@router.get("", response_model=FavoritesResponse)
async def get_favorites(
    current_user: User = Depends(get_current_active_user),
):
    """Get user's favorite items."""
    favorites = (
        await Favorite.find(Favorite.user_id == str(current_user.id))
        .sort("-added_at")
        .to_list()
    )

    items = []
    for fav in favorites:
        item_data = {
            "id": fav.content_id,  # Use content_id as the id for routing
            "type": fav.content_type,
        }

        # Fetch content details based on type
        if fav.content_type in ("vod", "movie", "series"):
            content = await Content.get(fav.content_id)
            if content:
                item_data["title"] = content.title
                item_data["title_en"] = getattr(content, "title_en", None)
                item_data["title_es"] = getattr(content, "title_es", None)
                item_data["subtitle"] = (
                    content.description[:100] if content.description else None
                )
                item_data["thumbnail"] = content.thumbnail
                # Normalize type for frontend based on is_series field
                item_data["type"] = "series" if content.is_series else "movie"
        elif fav.content_type in ("live", "channel"):
            channel = await LiveChannel.get(fav.content_id)
            if channel:
                item_data["title"] = channel.name
                item_data["thumbnail"] = channel.thumbnail
                item_data["type"] = "channel"
        elif fav.content_type == "podcast":
            podcast = await Podcast.get(fav.content_id)
            if podcast:
                item_data["title"] = podcast.title
                item_data["subtitle"] = podcast.author
                item_data["thumbnail"] = podcast.cover
                item_data["type"] = "podcast"
        elif fav.content_type == "radio":
            # Radio stations might be stored differently
            item_data["title"] = f"Radio Station"
            item_data["type"] = "radio"

        # Only add if we have at least a title
        if item_data.get("title"):
            items.append(FavoriteItem(**item_data))

    return FavoritesResponse(items=items)


@router.post("")
async def add_favorite(
    data: FavoriteAdd,
    current_user: User = Depends(get_current_active_user),
):
    """Add content to favorites."""
    # Check if already favorited
    existing = await Favorite.find_one(
        Favorite.user_id == str(current_user.id),
        Favorite.content_id == data.content_id,
    )
    if existing:
        return {"message": "Already in favorites", "id": str(existing.id)}

    # Create favorite
    favorite = Favorite(
        user_id=str(current_user.id),
        content_id=data.content_id,
        content_type=data.content_type,
    )
    await favorite.insert()

    return {"message": "Added to favorites", "id": str(favorite.id)}


@router.delete("/{content_id}")
async def remove_favorite(
    content_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Remove content from favorites."""
    favorite = await Favorite.find_one(
        Favorite.user_id == str(current_user.id),
        Favorite.content_id == content_id,
    )

    if not favorite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favorite not found",
        )

    await favorite.delete()
    return {"message": "Removed from favorites"}


@router.get("/check/{content_id}")
async def check_favorite(
    content_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Check if content is in favorites."""
    favorite = await Favorite.find_one(
        Favorite.user_id == str(current_user.id),
        Favorite.content_id == content_id,
    )
    return {"is_favorite": favorite is not None}


@router.post("/toggle/{content_id}")
async def toggle_favorite(
    content_id: str,
    content_type: str = "vod",
    current_user: User = Depends(get_current_active_user),
):
    """Toggle favorite status for content."""
    existing = await Favorite.find_one(
        Favorite.user_id == str(current_user.id),
        Favorite.content_id == content_id,
    )

    if existing:
        await existing.delete()
        return {"is_favorite": False, "message": "Removed from favorites"}
    else:
        favorite = Favorite(
            user_id=str(current_user.id),
            content_id=content_id,
            content_type=content_type,
        )
        await favorite.insert()
        return {"is_favorite": True, "message": "Added to favorites"}
