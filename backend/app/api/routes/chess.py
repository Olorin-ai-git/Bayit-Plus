"""Chess game REST API routes."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.logging_config import get_logger
from app.core.security import get_current_active_user
from app.models.chess import BotDifficulty, ChessGame, GameMode, PlayerColor
from app.models.user import User
from app.services.chess_service import chess_service

logger = get_logger(__name__)

router = APIRouter(prefix="/chess", tags=["chess"])


class CreateGameRequest(BaseModel):
    color: PlayerColor
    time_control: Optional[int] = None
    game_mode: GameMode = GameMode.PVP
    bot_difficulty: Optional[BotDifficulty] = None


class JoinGameRequest(BaseModel):
    game_code: str


class MoveRequest(BaseModel):
    from_square: str
    to_square: str
    promotion: Optional[str] = None


@router.post("/create")
async def create_game(
    request: CreateGameRequest, current_user: User = Depends(get_current_active_user)
):
    """Create a new chess game."""
    if request.game_mode == GameMode.BOT and not request.bot_difficulty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bot difficulty is required for bot games",
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
        return {"game_code": game.game_code, "game": game.model_dump(mode="json")}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create game: {str(e)}",
        )


@router.post("/join")
async def join_game(
    request: JoinGameRequest, current_user: User = Depends(get_current_active_user)
):
    """Join an existing chess game by code."""
    try:
        game = await chess_service.join_game(
            game_code=request.game_code,
            user_id=str(current_user.id),
            user_name=current_user.name,
        )
        return {"game": game.model_dump(mode="json")}
    except ValueError as e:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
                if "not found" in str(e).lower()
                else status.HTTP_400_BAD_REQUEST
            ),
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to join game: {str(e)}",
        )


@router.get("/{game_code}")
async def get_game(
    game_code: str, current_user: User = Depends(get_current_active_user)
):
    """Get chess game state by code."""
    game = await ChessGame.find_one({"game_code": game_code})
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Game not found"
        )
    return game.model_dump(mode="json")


@router.post("/{game_code}/move")
async def make_move(
    game_code: str,
    request: MoveRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Make a chess move via REST."""
    game = await ChessGame.find_one({"game_code": game_code})
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Game not found"
        )

    try:
        updated_game, move_rec = await chess_service.make_move(
            game_id=str(game.id),
            user_id=str(current_user.id),
            from_square=request.from_square,
            to_square=request.to_square,
            promotion=request.promotion,
        )

        response = {
            "game": updated_game.model_dump(mode="json"),
            "move": move_rec.model_dump(mode="json"),
        }

        if updated_game.game_mode == GameMode.BOT and updated_game.status.value == "active":
            import asyncio
            asyncio.create_task(_execute_bot_move_rest(updated_game, game_code))

        return response
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )
    except Exception as e:
        logger.error("Move failed", extra={"error": str(e), "game_code": game_code})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Move failed: {str(e)}",
        )


async def _execute_bot_move_rest(game: ChessGame, game_code: str) -> None:
    """Execute bot move for REST-based games."""
    import asyncio
    from app.services.bot_chess_service import get_bot_move
    await asyncio.sleep(0.8)
    try:
        from_sq, to_sq, promo = await get_bot_move(game.board_fen, game.bot_difficulty)
        await chess_service.make_move(
            game_id=str(game.id), user_id="BOT",
            from_square=from_sq, to_square=to_sq, promotion=promo,
        )
    except Exception as exc:
        logger.error("Bot REST move failed", extra={"error": str(exc), "game_code": game_code})


@router.post("/{game_code}/resign")
async def resign_game(
    game_code: str, current_user: User = Depends(get_current_active_user)
):
    """Resign from a chess game."""
    game = await ChessGame.find_one({"game_code": game_code})
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Game not found"
        )

    try:
        game = await chess_service.resign_game(
            game_id=str(game.id), user_id=str(current_user.id)
        )
        return {"game": game.model_dump(mode="json")}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{game_code}/offer-draw")
async def offer_draw(
    game_code: str, current_user: User = Depends(get_current_active_user)
):
    """Offer a draw (currently auto-accepts)."""
    game = await ChessGame.find_one({"game_code": game_code})
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Game not found"
        )

    try:
        game = await chess_service.offer_draw(
            game_id=str(game.id), user_id=str(current_user.id)
        )
        return {"game": game.model_dump(mode="json")}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
