"""
Favorites API Routes
Manage user's favorite content items
"""

from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from beanie import Document, PydanticObjectId
from app.models.user import User
from app.models.content import Content, LiveChannel, Podcast
from app.core.security import get_current_active_user


# Favorite model
class Favorite(Document):
    user_id: str
    content_id: str
    content_type: str  # vod, live, podcast
    added_at: datetime = datetime.utcnow()

    class Settings:
        name = "favorites"
        indexes = [
            [("user_id", 1), ("content_id", 1)],
            "user_id",
        ]


class FavoriteAdd(BaseModel):
    content_id: str
    content_type: str  # vod, live, podcast


class FavoriteResponse(BaseModel):
    id: str
    content_id: str
    content_type: str
    title: Optional[str] = None
    thumbnail: Optional[str] = None
    added_at: str


router = APIRouter()


@router.get("", response_model=List[FavoriteResponse])
async def get_favorites(
    current_user: User = Depends(get_current_active_user),
):
    """Get user's favorite items."""
    favorites = await Favorite.find(
        Favorite.user_id == str(current_user.id)
    ).sort("-added_at").to_list()

    result = []
    for fav in favorites:
        content_data = {
            "id": str(fav.id),
            "content_id": fav.content_id,
            "content_type": fav.content_type,
            "added_at": fav.added_at.isoformat(),
        }

        # Fetch content details
        if fav.content_type == "vod":
            content = await Content.get(fav.content_id)
            if content:
                content_data["title"] = content.title
                content_data["thumbnail"] = content.thumbnail
        elif fav.content_type == "live":
            channel = await LiveChannel.get(fav.content_id)
            if channel:
                content_data["title"] = channel.name
                content_data["thumbnail"] = channel.thumbnail
        elif fav.content_type == "podcast":
            podcast = await Podcast.get(fav.content_id)
            if podcast:
                content_data["title"] = podcast.title
                content_data["thumbnail"] = podcast.cover

        result.append(FavoriteResponse(**content_data))

    return result


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
