"""Chess game service for game logic and state management."""
import secrets
import string
from datetime import datetime
from typing import Optional, Tuple

import chess
from app.models.chess import (
    BotDifficulty,
    ChessGame,
    ChessMove,
    ChessPlayer,
    GameMode,
    GameStatus,
    PlayerColor,
)
from app.services.bot_chess_service import get_bot_name


def generate_game_code(length: int = 6) -> str:
    """Generate a random game code (uppercase letters and digits)."""
    chars = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(chars) for _ in range(length))


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
        while await ChessGame.find_one(ChessGame.game_code == game_code):
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

        await game.insert()
        return game

    @staticmethod
    async def join_game(game_code: str, user_id: str, user_name: str) -> ChessGame:
        """Join existing game."""
        game = await ChessGame.find_one(ChessGame.game_code == game_code)
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

        game.updated_at = datetime.utcnow()
        await game.save()
        return game

    @staticmethod
    def validate_move(
        board_fen: str,
        from_square: str,
        to_square: str,
        promotion: Optional[str] = None,
    ) -> Tuple[bool, Optional[str], Optional[chess.Move]]:
        """
        Validate chess move using python-chess.

        Returns:
            Tuple of (is_valid, error_message, chess_move)
        """
        try:
            board = chess.Board(board_fen)
            move = chess.Move.from_uci(f"{from_square}{to_square}{promotion or ''}")

            if move not in board.legal_moves:
                return False, "Illegal move", None

            return True, None, move
        except Exception as e:
            return False, str(e), None

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

        # Verify it's player's turn
        current_player = (
            game.white_player
            if game.current_turn == PlayerColor.WHITE
            else game.black_player
        )
        if not current_player or current_player.user_id != user_id:
            raise ValueError("Not your turn")

        # Validate move
        is_valid, error, chess_move = ChessService.validate_move(
            game.board_fen, from_square, to_square, promotion
        )
        if not is_valid:
            raise ValueError(error or "Invalid move")

        # Execute move on board
        board = chess.Board(game.board_fen)

        # IMPORTANT: Calculate SAN BEFORE pushing the move
        # SAN notation depends on the current board state, not the state after the move
        san_notation = board.san(chess_move)
        is_castling_move = board.is_castling(chess_move)
        is_en_passant_move = board.is_en_passant(chess_move)
        is_capture_move = board.is_capture(chess_move)

        # Now push the move to update the board
        board.push(chess_move)

        # Get piece that moved
        moved_piece = board.piece_at(chess.parse_square(to_square))
        piece_symbol = moved_piece.symbol() if moved_piece else "?"

        # Check if capture occurred
        captured_piece = None
        if is_capture_move:
            captured_piece = "p"  # Default to pawn, python-chess doesn't track captured piece type easily

        # Create move record
        move_record = ChessMove(
            from_square=from_square,
            to_square=to_square,
            piece=piece_symbol,
            captured=captured_piece,
            promotion=promotion,
            is_castling=is_castling_move,
            is_en_passant=is_en_passant_move,
            san=san_notation,
            player=game.current_turn,
        )

        # Update game state
        game.board_fen = board.fen()
        game.move_history.append(move_record)
        game.current_turn = (
            PlayerColor.BLACK
            if game.current_turn == PlayerColor.WHITE
            else PlayerColor.WHITE
        )

        # Check game end conditions
        if board.is_checkmate():
            game.status = GameStatus.CHECKMATE
        elif board.is_stalemate():
            game.status = GameStatus.STALEMATE
        elif board.is_insufficient_material() or board.can_claim_draw():
            game.status = GameStatus.DRAW

        game.updated_at = datetime.utcnow()
        await game.save()

        # Record game result if game ended
        if game.status in [GameStatus.CHECKMATE, GameStatus.DRAW, GameStatus.STALEMATE]:
            from app.services.stats_service import StatsService

            await StatsService.record_game_result(game)

        return game, move_record

    @staticmethod
    async def resign_game(game_id: str, user_id: str) -> ChessGame:
        """Resign from game."""
        game = await ChessGame.get(game_id)
        if not game:
            raise ValueError("Game not found")

        # Verify player is in the game
        if game.white_player and game.white_player.user_id == user_id:
            pass  # Valid
        elif game.black_player and game.black_player.user_id == user_id:
            pass  # Valid
        else:
            raise ValueError("You are not in this game")

        game.status = GameStatus.RESIGNED
        game.updated_at = datetime.utcnow()
        await game.save()

        # Record game result
        from app.services.stats_service import StatsService

        await StatsService.record_game_result(game)

        return game

    @staticmethod
    async def offer_draw(game_id: str, user_id: str) -> ChessGame:
        """Offer draw (simplified - auto-accepts for now)."""
        game = await ChessGame.get(game_id)
        if not game:
            raise ValueError("Game not found")

        # Verify player is in the game
        if game.white_player and game.white_player.user_id == user_id:
            pass  # Valid
        elif game.black_player and game.black_player.user_id == user_id:
            pass  # Valid
        else:
            raise ValueError("You are not in this game")

        game.status = GameStatus.DRAW
        game.updated_at = datetime.utcnow()
        await game.save()
        return game


# Singleton instance
chess_service = ChessService()
