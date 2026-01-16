from fastapi import APIRouter, Depends
from app.api.deps import get_current_user
from app.services.stats_service import StatsService
from app.models.user import User


router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/me")
async def get_my_stats(user: User = Depends(get_current_user)):
    """Get current user's statistics"""
    stats = await StatsService.get_player_stats(str(user.id))
    return stats.dict() if stats else {}


@router.get("/user/{user_id}")
async def get_user_stats(user_id: str):
    """Get statistics for any user (public)"""
    stats = await StatsService.get_player_stats(user_id)
    return stats.dict() if stats else {}


@router.get("/history")
async def get_my_match_history(
    limit: int = 50,
    user: User = Depends(get_current_user)
):
    """Get current user's match history"""
    history = await StatsService.get_match_history(str(user.id), limit=limit)
    return {"games": [g.dict() for g in history]}


@router.get("/head-to-head/{opponent_id}")
async def get_head_to_head(
    opponent_id: str,
    user: User = Depends(get_current_user)
):
    """Get head-to-head statistics vs opponent"""
    stats = await StatsService.get_head_to_head_stats(str(user.id), opponent_id)
    return stats


@router.get("/leaderboard")
async def get_leaderboard(limit: int = 100):
    """Get top players leaderboard"""
    leaderboard = await StatsService.get_leaderboard(limit)
    return {"leaderboard": leaderboard}
