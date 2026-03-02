"""Chess move execution logic — extracted from chess_service for the 200-line limit."""

from datetime import datetime, timezone
from typing import Optional, Tuple

import chess

from app.models.chess import ChessGame, ChessMove, GameStatus, PlayerColor


async def execute_move(
    game: ChessGame,
    user_id: str,
    from_square: str,
    to_square: str,
    promotion: Optional[str] = None,
) -> Tuple[ChessGame, ChessMove]:
    """Validate, apply, and persist a chess move on the given game."""
    current_player = (
        game.white_player
        if game.current_turn == PlayerColor.WHITE
        else game.black_player
    )
    if not current_player or current_player.user_id != user_id:
        raise ValueError("Not your turn")

    # Deduct elapsed time from the moving player's clock
    if game.time_control and game.last_move_at:
        elapsed_ms = int(
            (datetime.now(timezone.utc) - game.last_move_at).total_seconds() * 1000
        )
        remaining = (current_player.time_remaining_ms or 0) - elapsed_ms
        if remaining <= 0:
            current_player.time_remaining_ms = 0
            game.status = GameStatus.TIMEOUT
            game.updated_at = datetime.now(timezone.utc)
            await game.save()
            raise ValueError("Clock expired")
        current_player.time_remaining_ms = remaining

    # Validate move
    from app.services.chess_helpers import validate_move
    is_valid, error, chess_move = validate_move(game.board_fen, from_square, to_square, promotion)
    if not is_valid:
        raise ValueError(error or "Invalid move")

    # Execute move on board
    board = chess.Board(game.board_fen)
    san_notation = board.san(chess_move)
    is_castling_move = board.is_castling(chess_move)
    is_en_passant_move = board.is_en_passant(chess_move)
    is_capture_move = board.is_capture(chess_move)
    board.push(chess_move)

    moved_piece = board.piece_at(chess.parse_square(to_square))
    piece_symbol = moved_piece.symbol() if moved_piece else "?"
    captured_piece = "p" if is_capture_move else None

    move_record = ChessMove(
        from_square=from_square, to_square=to_square,
        piece=piece_symbol, captured=captured_piece,
        promotion=promotion, is_castling=is_castling_move,
        is_en_passant=is_en_passant_move, san=san_notation,
        player=game.current_turn,
    )

    game.board_fen = board.fen()
    game.move_history.append(move_record)
    game.current_turn = (
        PlayerColor.BLACK if game.current_turn == PlayerColor.WHITE else PlayerColor.WHITE
    )

    if game.time_control:
        game.last_move_at = datetime.now(timezone.utc)

    if board.is_checkmate():
        game.status = GameStatus.CHECKMATE
    elif board.is_stalemate():
        game.status = GameStatus.STALEMATE
    elif board.is_insufficient_material() or board.can_claim_draw():
        game.status = GameStatus.DRAW

    game.updated_at = datetime.utcnow()
    await game.save()

    if game.status in [GameStatus.CHECKMATE, GameStatus.DRAW, GameStatus.STALEMATE]:
        from app.services.stats_service import StatsService
        await StatsService.record_game_result(game)

    return game, move_record
