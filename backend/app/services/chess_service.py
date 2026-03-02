"""Chess game service for game logic and state management."""

from datetime import datetime, timezone
from typing import Optional, Tuple

from app.models.chess import (BotDifficulty, ChessGame, ChessMove, ChessPlayer,
                              GameMode, GameStatus, PlayerColor)
from app.services.bot_chess_service import get_bot_name
from app.services.chess_helpers import generate_game_code


class ChessService:
    """Chess game logic service using python-chess library."""

    @staticmethod
    async def create_game(
        host_user_id: str,
        host_user_name: str,
        color: PlayerColor,
        time_control: Optional[int] = None,
        game_mode: GameMode = GameMode.PVP,
        bot_difficulty: Optional[BotDifficulty] = None,
    ) -> ChessGame:
        """Create new chess game."""
        game_code = generate_game_code()

        # Ensure unique game code
        while await ChessGame.find_one({"game_code": game_code}):
            game_code = generate_game_code()

        player = ChessPlayer(
            user_id=host_user_id,
            user_name=host_user_name,
            color=color,
            time_remaining_ms=time_control * 1000 if time_control else None,
        )

        game = ChessGame(
            game_code=game_code,
            time_control=time_control,
            game_mode=game_mode,
            bot_difficulty=bot_difficulty,
        )

        if color == PlayerColor.WHITE:
            game.white_player = player
        else:
            game.black_player = player

        # For bot games, create the bot player and start immediately
        if game_mode == GameMode.BOT and bot_difficulty:
            bot_color = (
                PlayerColor.BLACK if color == PlayerColor.WHITE else PlayerColor.WHITE
            )
            bot_player = ChessPlayer(
                user_id="BOT",
                user_name=get_bot_name(bot_difficulty),
                color=bot_color,
                is_connected=True,
                is_bot=True,
                time_remaining_ms=time_control * 1000 if time_control else None,
            )

            if bot_color == PlayerColor.WHITE:
                game.white_player = bot_player
            else:
                game.black_player = bot_player

            # Bot games start immediately since both players are present
            game.status = GameStatus.ACTIVE
            if time_control:
                game.last_move_at = datetime.now(timezone.utc)

        await game.insert()
        return game

    @staticmethod
    async def join_game(game_code: str, user_id: str, user_name: str) -> ChessGame:
        """Join existing game."""
        game = await ChessGame.find_one({"game_code": game_code})
        if not game:
            raise ValueError(f"Game {game_code} not found")

        # Determine which color to assign
        if not game.white_player:
            color = PlayerColor.WHITE
        elif not game.black_player:
            color = PlayerColor.BLACK
        else:
            raise ValueError("Game is full")

        player = ChessPlayer(
            user_id=user_id,
            user_name=user_name,
            color=color,
            time_remaining_ms=game.time_control * 1000 if game.time_control else None,
        )

        if color == PlayerColor.WHITE:
            game.white_player = player
        else:
            game.black_player = player

        # Start game if both players joined
        if game.white_player and game.black_player:
            game.status = GameStatus.ACTIVE
            if game.time_control:
                game.last_move_at = datetime.now(timezone.utc)

        if game.invited_user_id == user_id:
            game.invite_status = "accepted"

        game.updated_at = datetime.utcnow()
        await game.save()
        return game

    @staticmethod
    async def make_move(
        game_id: str,
        user_id: str,
        from_square: str,
        to_square: str,
        promotion: Optional[str] = None,
    ) -> Tuple[ChessGame, ChessMove]:
        """Execute chess move and update game state."""
        game = await ChessGame.get(game_id)
        if not game:
            raise ValueError("Game not found")
        if game.status != GameStatus.ACTIVE:
            raise ValueError("Game is not active")
        from app.services.chess_move_executor import execute_move
        return await execute_move(game, user_id, from_square, to_square, promotion)

    @staticmethod
    async def resign_game(game_id: str, user_id: str) -> ChessGame:
        """Resign from game."""
        game = await _get_validated_player_game(game_id, user_id)
        game.status = GameStatus.RESIGNED
        game.updated_at = datetime.utcnow()
        await game.save()
        from app.services.stats_service import StatsService
        await StatsService.record_game_result(game)
        return game

    @staticmethod
    async def offer_draw(game_id: str, user_id: str) -> ChessGame:
        """Offer draw (simplified - auto-accepts for now)."""
        game = await _get_validated_player_game(game_id, user_id)
        game.status = GameStatus.DRAW
        game.updated_at = datetime.utcnow()
        await game.save()
        return game


async def _get_validated_player_game(game_id: str, user_id: str) -> ChessGame:
    """Fetch game and verify user is a player."""
    game = await ChessGame.get(game_id)
    if not game:
        raise ValueError("Game not found")
    is_player = (
        (game.white_player and game.white_player.user_id == user_id)
        or (game.black_player and game.black_player.user_id == user_id)
    )
    if not is_player:
        raise ValueError("You are not in this game")
    return game


# Singleton instance
chess_service = ChessService()
