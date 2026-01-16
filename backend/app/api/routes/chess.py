"""Chess game REST API routes."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List

from app.models.chess import ChessGame, ChessChatMessage, PlayerColor
from app.models.user import User
from app.services.chess_service import chess_service
from app.core.security import get_current_active_user


router = APIRouter(prefix="/chess", tags=["chess"])


class CreateGameRequest(BaseModel):
    """Request model for creating a new chess game."""
    color: PlayerColor
    time_control: Optional[int] = None


class JoinGameRequest(BaseModel):
    """Request model for joining an existing chess game."""
    game_code: str


@router.post("/create")
async def create_game(
    request: CreateGameRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Create a new chess game."""
    try:
        game = await chess_service.create_game(
            host_user_id=str(current_user.id),
            host_user_name=current_user.name,
            color=request.color,
            time_control=request.time_control
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
