"""Chess game invite REST API routes."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.logging_config import get_logger
from app.core.security import get_current_active_user
from app.models.chess import ChessGame, GameStatus, PlayerColor
from app.models.user import User
from app.services.chess_service import chess_service

logger = get_logger(__name__)

router = APIRouter(prefix="/chess", tags=["chess"])


class InviteRequest(BaseModel):
    """Request to create a game and invite a friend by user ID."""

    friend_user_id: str
    color: PlayerColor = PlayerColor.WHITE
    time_control: Optional[int] = None


@router.post("/invite")
async def create_invite(
    request: InviteRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Create a chess game and invite a friend by user ID."""
    if request.friend_user_id == str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot invite yourself",
        )

    friend = await User.get(request.friend_user_id)
    if not friend or not friend.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    game = await chess_service.create_game(
        host_user_id=str(current_user.id),
        host_user_name=current_user.name,
        color=request.color,
        time_control=request.time_control,
    )
    game.invited_user_id = request.friend_user_id
    game.invite_status = "pending"
    await game.save()

    logger.info(
        "Chess invite created",
        extra={
            "inviter": str(current_user.id),
            "invitee": request.friend_user_id,
            "game_code": game.game_code,
        },
    )

    # Best-effort WS push (non-blocking)
    try:
        from app.services.connection_manager import connection_manager

        await connection_manager.send_to_user(
            {
                "type": "chess_invite",
                "game_code": game.game_code,
                "inviter_name": current_user.name,
                "inviter_id": str(current_user.id),
            },
            request.friend_user_id,
        )
    except Exception:
        pass

    return {"game_code": game.game_code, "game": game.model_dump(mode="json")}


@router.get("/invites/pending")
async def get_pending_invites(
    current_user: User = Depends(get_current_active_user),
):
    """Get pending chess invites for the current user."""
    games = await ChessGame.find(
        {
            "invited_user_id": str(current_user.id),
            "invite_status": "pending",
            "status": GameStatus.WAITING.value,
        }
    ).to_list()

    return {"invites": [g.model_dump(mode="json") for g in games]}


@router.post("/{game_code}/decline-invite")
async def decline_invite(
    game_code: str,
    current_user: User = Depends(get_current_active_user),
):
    """Decline a chess game invite."""
    game = await ChessGame.find_one({"game_code": game_code})
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Game not found"
        )
    if game.invited_user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not your invite"
        )
    if game.invite_status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invite already resolved",
        )

    game.invite_status = "declined"
    await game.save()

    return {"status": "declined", "game_code": game_code}
