"""
Profile Stats API Routes
Get user profile statistics including watchlist, favorites, and watch time
"""

from app.api.routes.favorites import Favorite
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.watchlist import WatchHistory, WatchlistItem
from fastapi import APIRouter, Depends
from pydantic import BaseModel

router = APIRouter(prefix="/profile", tags=["profile"])


class ProfileStatsResponse(BaseModel):
    watchlist_count: int
    favorites_count: int
    downloads_count: int
    watch_time_minutes: int


@router.get("/stats")
async def get_profile_stats(
    current_user: User = Depends(get_current_active_user),
) -> ProfileStatsResponse:
    """Get current user's profile statistics."""
    user_id = str(current_user.id)

    # Count watchlist items
    watchlist_count = await WatchlistItem.find(WatchlistItem.user_id == user_id).count()

    # Count favorites
    favorites_count = await Favorite.find(Favorite.user_id == user_id).count()

    # Calculate total watch time from watch history
    watch_history = await WatchHistory.find(WatchHistory.user_id == user_id).to_list()

    total_watch_seconds = sum(item.position for item in watch_history)
    watch_time_minutes = int(total_watch_seconds / 60)

    # Downloads count (placeholder - would need downloads model)
    # For now return 0 as downloads feature may not be implemented
    downloads_count = 0

    return ProfileStatsResponse(
        watchlist_count=watchlist_count,
        favorites_count=favorites_count,
        downloads_count=downloads_count,
        watch_time_minutes=watch_time_minutes,
    )
