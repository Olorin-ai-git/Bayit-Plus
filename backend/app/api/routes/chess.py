"""Chess game REST API routes."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List

from app.models.chess import ChessGame, ChessChatMessage, PlayerColor, GameMode, BotDifficulty
from app.models.user import User
from app.services.chess_service import chess_service
from app.core.security import get_current_active_user


router = APIRouter(prefix="/chess", tags=["chess"])


class CreateGameRequest(BaseModel):
    """Request model for creating a new chess game."""
    color: PlayerColor
    time_control: Optional[int] = None
    game_mode: GameMode = GameMode.PVP
    bot_difficulty: Optional[BotDifficulty] = None


class JoinGameRequest(BaseModel):
    """Request model for joining an existing chess game."""
    game_code: str


class InvitePlayerRequest(BaseModel):
    """Request model for creating a game and inviting a player."""
    friend_name: str
    color: PlayerColor = PlayerColor.WHITE
    time_control: Optional[int] = None


class GameInviteNotification(BaseModel):
    """Notification model for game invites."""
    id: str
    game_code: str
    inviter_id: str
    inviter_name: str
    invitee_id: str
    created_at: str


@router.post("/create")
async def create_game(
    request: CreateGameRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Create a new chess game."""
    # Validate bot difficulty is provided for bot games
    if request.game_mode == GameMode.BOT and not request.bot_difficulty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bot difficulty is required for bot games"
        )

    try:
        game = await chess_service.create_game(
            host_user_id=str(current_user.id),
            host_user_name=current_user.name,
            color=request.color,
            time_control=request.time_control,
            game_mode=request.game_mode,
            bot_difficulty=request.bot_difficulty,
        )
        return {
            "game_code": game.game_code,
            "game": game.dict()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create game: {str(e)}"
        )


@router.post("/join")
async def join_game(
    request: JoinGameRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Join an existing chess game by code."""
    try:
        game = await chess_service.join_game(
            game_code=request.game_code,
            user_id=str(current_user.id),
            user_name=current_user.name
        )
        return {"game": game.dict()}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND if "not found" in str(e).lower()
            else status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to join game: {str(e)}"
        )


@router.get("/{game_code}")
async def get_game(
    game_code: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get chess game state by code."""
    game = await ChessGame.find_one(ChessGame.game_code == game_code)
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game not found"
        )
    return game.dict()


@router.get("/{game_code}/chat")
async def get_chat_history(
    game_code: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get chat history for a chess game."""
    game = await ChessGame.find_one(ChessGame.game_code == game_code)
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game not found"
        )

    messages = await ChessChatMessage.find(
        ChessChatMessage.game_id == str(game.id)
    ).sort("-timestamp").to_list()

    return {
        "messages": [msg.dict() for msg in messages]
    }


@router.post("/{game_code}/resign")
async def resign_game(
    game_code: str,
    current_user: User = Depends(get_current_active_user)
):
    """Resign from a chess game."""
    game = await ChessGame.find_one(ChessGame.game_code == game_code)
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game not found"
        )

    try:
        game = await chess_service.resign_game(
            game_id=str(game.id),
            user_id=str(current_user.id)
        )
        return {"game": game.dict()}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{game_code}/offer-draw")
async def offer_draw(
    game_code: str,
    current_user: User = Depends(get_current_active_user)
):
    """Offer a draw (currently auto-accepts)."""
    game = await ChessGame.find_one(ChessGame.game_code == game_code)
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game not found"
        )

    try:
        game = await chess_service.offer_draw(
            game_id=str(game.id),
            user_id=str(current_user.id)
        )
        return {"game": game.dict()}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/invite")
async def invite_player(
    request: InvitePlayerRequest,
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a chess game and invite a friend by name.
    
    This endpoint:
    1. Searches for the user by name
    2. Creates a new chess game with the current user as host
    3. Creates an invite notification for the friend
    4. Returns the game code for immediate connection
    
    The invited player will see a notification and can join using the game code.
    """
    from datetime import datetime
    
    # Search for the friend by name
    friend = await User.find_one({
        "is_active": True,
        "name": {"$regex": request.friend_name, "$options": "i"},
    })
    
    if not friend:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{request.friend_name}' not found"
        )
    
    if str(friend.id) == str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot invite yourself to a game"
        )
    
    try:
        # Create the game
        game = await chess_service.create_game(
            host_user_id=str(current_user.id),
            host_user_name=current_user.name,
            color=request.color,
            time_control=request.time_control
        )
        
        # Create invite notification (stored in a simple format)
        # In a production app, this would be stored in a Notification model
        # and delivered via WebSocket/push notification
        invite = GameInviteNotification(
            id=f"invite-{game.game_code}",
            game_code=game.game_code,
            inviter_id=str(current_user.id),
            inviter_name=current_user.name,
            invitee_id=str(friend.id),
            created_at=datetime.utcnow().isoformat(),
        )
        
        # Log the invite (in production, send via WebSocket to the invitee)
        print(f"[CHESS] Game invite created: {current_user.name} invited {friend.name} to game {game.game_code}")
        
        # Try to send real-time notification via WebSocket if user is connected
        from app.services.connection_manager import connection_manager
        notification_sent = await connection_manager.send_to_user(
            {
                "type": "chess_invite",
                "game_code": game.game_code,
                "inviter_name": current_user.name,
                "inviter_id": str(current_user.id),
            },
            str(friend.id)
        )
        
        return {
            "success": True,
            "game_code": game.game_code,
            "game": game.dict(),
            "invite": invite.dict(),
            "friend": {
                "id": str(friend.id),
                "name": friend.name,
            },
            "notification_sent": notification_sent,
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create game invite: {str(e)}"
        )
